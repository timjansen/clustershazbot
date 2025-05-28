export interface GossipServer {
    baseUrl: string;
    monitor: boolean;
    lastUpdate: number;
}
export interface ServerList {
    online: GossipServer[];
    offline?: GossipServer[];
}
export interface GossipMessage extends ServerList {
    message: 'gossip';
}
export interface ControlMessage {
    message: 'control';
    online: boolean;
}
