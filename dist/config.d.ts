export interface Config {
    SHAZBOT_SECRET: string;
    SHAZBOT_CONTROL_SECRET: string;
    SHAZBOT_GOSSIP_INTERVAL: number;
    SHAZBOT_MASTER_LIST: string;
    SHAZBOT_MASTER_LIST_UPDATE: string;
    SHAZBOT_MASTER_LIST_UPDATE_AUTH: string;
    SHAZBOT_MASTER_ANNOUNCE_MINIMUM: number;
    SHAZBOT_MASTER_ANNOUNCE_INTERVAL: number;
    SHAZBOT_UPDATE_MASTER_LIST_ON_SHUTDOWN: boolean;
    SHAZBOT_BASE_URL: string;
    SHAZBOT_MONITOR: boolean;
}
export declare function loadConfig(): Config;
