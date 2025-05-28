import { GossipServer, ServerList } from './types.js';

export class ServerListManager {
    private onlineServers: Map<string, GossipServer> = new Map();
    private offlineServers: Map<string, GossipServer> = new Map();
    private thisServer: GossipServer;

    constructor(baseUrl: string, isMonitor: boolean = false) {
        this.thisServer = {
            baseUrl,
            monitor: isMonitor,
            lastUpdate: Date.now()
        };
        this.onlineServers.set(baseUrl, this.thisServer);
    }

    updateThisServerTimestamp(): void {
        this.thisServer.lastUpdate = Date.now();
        this.onlineServers.set(this.thisServer.baseUrl, this.thisServer);
    }

    mergeServerList(incomingList: ServerList): void {
        // Merge online servers
        for (const server of incomingList.online) {
            const existing = this.onlineServers.get(server.baseUrl);
            if (!existing || server.lastUpdate > existing.lastUpdate) {
                this.onlineServers.set(server.baseUrl, server);
                // Remove from offline if it exists there
                this.offlineServers.delete(server.baseUrl);
            }
        }

        // Merge offline servers
        if (incomingList.offline) {
            for (const server of incomingList.offline) {
                // Don't add to offline if it's in online with newer timestamp
                const onlineServer = this.onlineServers.get(server.baseUrl);
                if (onlineServer && onlineServer.lastUpdate >= server.lastUpdate) {
                    continue;
                }

                const existing = this.offlineServers.get(server.baseUrl);
                if (!existing || server.lastUpdate > existing.lastUpdate) {
                    this.offlineServers.set(server.baseUrl, server);
                    // Remove from online if it exists there and offline is newer
                    if (onlineServer && server.lastUpdate > onlineServer.lastUpdate) {
                        this.onlineServers.delete(server.baseUrl);
                    }
                }
            }
        }

        this.cleanupOldOfflineServers();
    }

    moveServerOffline(baseUrl: string): void {
        const server = this.onlineServers.get(baseUrl);
        if (server) {
            server.lastUpdate = Date.now();
            this.offlineServers.set(baseUrl, server);
            this.onlineServers.delete(baseUrl);
        }
    }

    setThisServerOffline(): void {
        this.thisServer.lastUpdate = Date.now();
        this.offlineServers.set(this.thisServer.baseUrl, this.thisServer);
        this.onlineServers.delete(this.thisServer.baseUrl);
    }

    setThisServerOnline(): void {
        this.thisServer.lastUpdate = Date.now();
        this.onlineServers.set(this.thisServer.baseUrl, this.thisServer);
        this.offlineServers.delete(this.thisServer.baseUrl);
    }

    getServerList(includeOffline: boolean = false): ServerList {
        const result: ServerList = {
            online: Array.from(this.onlineServers.values())
        };

        if (includeOffline) {
            result.offline = Array.from(this.offlineServers.values());
        }

        return result;
    }

    getRandomOnlineServers(count: number, excludeSelf: boolean = true): GossipServer[] {
        const servers = Array.from(this.onlineServers.values());
        const filtered = excludeSelf ? servers.filter(s => s.baseUrl !== this.thisServer.baseUrl) : servers;
        
        if (filtered.length <= count) {
            return filtered;
        }

        // Fisher-Yates shuffle and take first 'count' items
        const shuffled = [...filtered];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled.slice(0, count);
    }

    getMonitorServers(): GossipServer[] {
        return Array.from(this.onlineServers.values()).filter(s => s.monitor && s.baseUrl !== this.thisServer.baseUrl);
    }

    getAllTargetServersForGossip(): GossipServer[] {
        const randomServers = this.getRandomOnlineServers(20);
        const monitorServers = this.getMonitorServers();
        
        // Combine and deduplicate
        const allServers = new Map<string, GossipServer>();
        
        for (const server of randomServers) {
            allServers.set(server.baseUrl, server);
        }
        
        for (const server of monitorServers) {
            allServers.set(server.baseUrl, server);
        }

        return Array.from(allServers.values());
    }

    private cleanupOldOfflineServers(): void {
        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        for (const [baseUrl, server] of this.offlineServers.entries()) {
            if (server.lastUpdate < twentyFourHoursAgo) {
                this.offlineServers.delete(baseUrl);
            }
        }
    }

    isThisServerOnline(): boolean {
        return this.onlineServers.has(this.thisServer.baseUrl);
    }

    getThisServer(): GossipServer {
        return this.thisServer;
    }
}