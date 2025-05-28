import { GossipMessage, ServerList, GossipServer } from './types.js';
export declare class HttpClient {
    private secret;
    constructor(secret: string);
    sendGossipMessage(server: GossipServer, message: GossipMessage): Promise<GossipMessage | null>;
    downloadMasterList(url: string): Promise<ServerList | null>;
    uploadMasterList(updateUrl: string, auth: string, serverList: ServerList): Promise<boolean>;
}
