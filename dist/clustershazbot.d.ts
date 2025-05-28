import { GossipMessage, ControlMessage, ServerList } from './types.js';
export declare function shazbotStart(): Promise<void>;
export declare function shazbotShutDown(): Promise<void>;
export declare function shazbotGossipRequest(authorizationHeader: string, body: GossipMessage): Promise<GossipMessage>;
export declare function shazbotListRequest(authorizationHeader: string): Promise<ServerList>;
export declare function shazbotControlRequest(authorizationHeader: string, message: ControlMessage): Promise<void>;
export declare function shazbotGetServerList(includeOffline?: boolean): ServerList;
