export interface GossipServer {
    baseUrl: string;  // typically: https://<server>:<port>/
    monitor: boolean;
    lastUpdate: number; // ms since epoch
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