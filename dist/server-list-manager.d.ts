import { GossipServer, ServerList } from './types.js';
export declare class ServerListManager {
    private onlineServers;
    private offlineServers;
    private thisServer;
    constructor(baseUrl: string, isMonitor?: boolean);
    updateThisServerTimestamp(): void;
    mergeServerList(incomingList: ServerList): void;
    moveServerOffline(baseUrl: string): void;
    setThisServerOffline(): void;
    setThisServerOnline(): void;
    getServerList(includeOffline?: boolean): ServerList;
    getRandomOnlineServers(count: number, excludeSelf?: boolean): GossipServer[];
    getMonitorServers(): GossipServer[];
    getAllTargetServersForGossip(): GossipServer[];
    private cleanupOldOfflineServers;
    isThisServerOnline(): boolean;
    getThisServer(): GossipServer;
}
