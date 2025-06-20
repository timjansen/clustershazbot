import { loadConfig } from './config.js';
import { HttpClient } from './http-client.js';
import { ServerListManager } from './server-list-manager.js';
class ClustershazbotEngine {
    constructor() {
        this.isShuttingDown = false;
        this.config = loadConfig();
        this.httpClient = new HttpClient(this.config.SHAZBOT_SECRET);
        this.serverListManager = new ServerListManager(this.config.SHAZBOT_BASE_URL, this.config.SHAZBOT_MONITOR);
    }
    async start() {
        // Download master list and bootstrap
        await this.bootstrapFromMasterList();
        // Start gossip interval
        this.startGossipInterval();
        // Start master list announcement interval
        this.startMasterListInterval();
        console.log('Clustershazbot engine started');
    }
    async shutdown() {
        this.isShuttingDown = true;
        // Clear intervals
        if (this.gossipInterval) {
            clearInterval(this.gossipInterval);
        }
        if (this.masterListInterval) {
            clearInterval(this.masterListInterval);
        }
        // Move this server to offline
        this.serverListManager.setThisServerOffline();
        // Send gossip messages to announce shutdown
        await this.announceShutdown();
        // Update master list if configured
        if (this.config.SHAZBOT_UPDATE_MASTER_LIST_ON_SHUTDOWN) {
            await this.updateMasterList();
        }
        console.log('Clustershazbot engine shut down');
    }
    async handleGossipRequest(authorizationHeader, body) {
        if (authorizationHeader !== this.config.SHAZBOT_SECRET) {
            throw new Error('Unauthorized: Invalid SHAZBOT_SECRET');
        }
        // Update our timestamp
        this.serverListManager.updateThisServerTimestamp();
        // Merge incoming server lists
        this.serverListManager.mergeServerList(body);
        // Return our current server list
        const serverList = this.serverListManager.getServerList(true);
        return {
            message: 'gossip',
            ...serverList
        };
    }
    async handleListRequest(authorizationHeader) {
        const includeOffline = authorizationHeader === this.config.SHAZBOT_CONTROL_SECRET;
        return this.serverListManager.getServerList(includeOffline);
    }
    async handleControlRequest(authorizationHeader, message) {
        if (authorizationHeader !== this.config.SHAZBOT_CONTROL_SECRET) {
            throw new Error('Unauthorized: Invalid SHAZBOT_CONTROL_SECRET');
        }
        if (message.online) {
            this.serverListManager.setThisServerOnline();
        }
        else {
            this.serverListManager.setThisServerOffline();
        }
    }
    getServerList(includeOffline = false) {
        return this.serverListManager.getServerList(includeOffline);
    }
    async bootstrapFromMasterList() {
        const masterList = await this.httpClient.downloadMasterList(this.config.SHAZBOT_MASTER_LIST);
        if (masterList) {
            this.serverListManager.mergeServerList(masterList);
            // Send gossip message to bootstrap servers
            const targetServers = this.serverListManager.getAllTargetServersForGossip();
            const ourList = this.serverListManager.getServerList(true);
            const gossipMessage = {
                message: 'gossip',
                ...ourList
            };
            // Send to up to 20 random servers plus all monitors
            const promises = targetServers.map(server => this.httpClient.sendGossipMessage(server, gossipMessage));
            await Promise.allSettled(promises);
        }
    }
    startGossipInterval() {
        const baseInterval = this.config.SHAZBOT_GOSSIP_INTERVAL * 1000; // Convert to ms
        const scheduleNextGossip = () => {
            // Add randomization: 0.9 to 1.1 times the base interval
            const randomFactor = 0.9 + (Math.random() * 0.2);
            const interval = baseInterval * randomFactor;
            this.gossipInterval = setTimeout(async () => {
                if (!this.isShuttingDown) {
                    await this.performGossip();
                    scheduleNextGossip();
                }
            }, interval);
        };
        scheduleNextGossip();
    }
    startMasterListInterval() {
        const scheduleNextAnnouncement = () => {
            const minTime = this.config.SHAZBOT_MASTER_ANNOUNCE_MINIMUM * 1000;
            const maxTime = this.config.SHAZBOT_MASTER_ANNOUNCE_INTERVAL * 1000;
            const interval = minTime + (Math.random() * maxTime);
            this.masterListInterval = setTimeout(async () => {
                if (!this.isShuttingDown) {
                    await this.performMasterListUpdate();
                    scheduleNextAnnouncement();
                }
            }, interval);
        };
        scheduleNextAnnouncement();
    }
    async performGossip() {
        // Update our timestamp
        this.serverListManager.updateThisServerTimestamp();
        // Get a random online server
        const randomServers = this.serverListManager.getRandomOnlineServers(1);
        if (randomServers.length === 0) {
            return; // No other servers to gossip with
        }
        const targetServer = randomServers[0];
        const ourList = this.serverListManager.getServerList(true);
        const gossipMessage = {
            message: 'gossip',
            ...ourList
        };
        // First attempt
        let response = await this.httpClient.sendGossipMessage(targetServer, gossipMessage);
        if (!response) {
            // Wait 3 seconds and try again
            await new Promise(resolve => setTimeout(resolve, 3000));
            response = await this.httpClient.sendGossipMessage(targetServer, gossipMessage);
            if (!response) {
                // Move server to offline list
                this.serverListManager.moveServerOffline(targetServer.baseUrl);
                return;
            }
        }
        // Merge the response
        this.serverListManager.mergeServerList(response);
    }
    async performMasterListUpdate() {
        // Download current master list
        const masterList = await this.httpClient.downloadMasterList(this.config.SHAZBOT_MASTER_LIST);
        if (masterList) {
            this.serverListManager.mergeServerList(masterList);
        }
        // Upload our current list
        await this.updateMasterList();
    }
    async updateMasterList() {
        const ourList = this.serverListManager.getServerList(false); // Only online servers for master list
        await this.httpClient.uploadMasterList(this.config.SHAZBOT_MASTER_LIST_UPDATE, this.config.SHAZBOT_MASTER_LIST_UPDATE_AUTH, ourList);
    }
    async announceShutdown() {
        const targetServers = this.serverListManager.getAllTargetServersForGossip();
        const ourList = this.serverListManager.getServerList(true);
        const gossipMessage = {
            message: 'gossip',
            ...ourList
        };
        const promises = targetServers.map(server => this.httpClient.sendGossipMessage(server, gossipMessage));
        await Promise.allSettled(promises);
    }
}
// Global instance
let engineInstance = null;
export async function shazbotStart() {
    if (!engineInstance) {
        engineInstance = new ClustershazbotEngine();
    }
    await engineInstance.start();
}
export async function shazbotShutDown() {
    if (engineInstance) {
        await engineInstance.shutdown();
    }
}
export async function shazbotGossipRequest(authorizationHeader, body) {
    if (!engineInstance) {
        throw new Error('Clustershazbot engine not started');
    }
    return engineInstance.handleGossipRequest(authorizationHeader, body);
}
export async function shazbotListRequest(authorizationHeader) {
    if (!engineInstance) {
        throw new Error('Clustershazbot engine not started');
    }
    return engineInstance.handleListRequest(authorizationHeader);
}
export async function shazbotControlRequest(authorizationHeader, message) {
    if (!engineInstance) {
        throw new Error('Clustershazbot engine not started');
    }
    return engineInstance.handleControlRequest(authorizationHeader, message);
}
export function shazbotGetServerList(includeOffline = false) {
    if (!engineInstance) {
        throw new Error('Clustershazbot engine not started');
    }
    return engineInstance.getServerList(includeOffline);
}
