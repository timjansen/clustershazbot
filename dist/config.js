export function loadConfig() {
    const getEnvVar = (name, defaultValue) => {
        const value = process.env[name] || defaultValue;
        if (!value) {
            throw new Error(`Environment variable ${name} is required`);
        }
        return value;
    };
    const getEnvNumber = (name, defaultValue) => {
        const value = process.env[name];
        return value ? parseInt(value, 10) : defaultValue;
    };
    const getEnvBoolean = (name, defaultValue) => {
        const value = process.env[name];
        return value ? value.toLowerCase() === 'true' : defaultValue;
    };
    return {
        SHAZBOT_SECRET: getEnvVar('SHAZBOT_SECRET'),
        SHAZBOT_CONTROL_SECRET: getEnvVar('SHAZBOT_CONTROL_SECRET'),
        SHAZBOT_GOSSIP_INTERVAL: getEnvNumber('SHAZBOT_GOSSIP_INTERVAL', 30),
        SHAZBOT_MASTER_LIST: getEnvVar('SHAZBOT_MASTER_LIST'),
        SHAZBOT_MASTER_LIST_UPDATE: getEnvVar('SHAZBOT_MASTER_LIST_UPDATE'),
        SHAZBOT_MASTER_LIST_UPDATE_AUTH: getEnvVar('SHAZBOT_MASTER_LIST_UPDATE_AUTH'),
        SHAZBOT_MASTER_ANNOUNCE_MINIMUM: getEnvNumber('SHAZBOT_MASTER_ANNOUNCE_MINIMUM', 300),
        SHAZBOT_MASTER_ANNOUNCE_INTERVAL: getEnvNumber('SHAZBOT_MASTER_ANNOUNCE_INTERVAL', 600),
        SHAZBOT_UPDATE_MASTER_LIST_ON_SHUTDOWN: getEnvBoolean('SHAZBOT_UPDATE_MASTER_LIST_ON_SHUTDOWN', false),
        SHAZBOT_BASE_URL: getEnvVar('SHAZBOT_BASE_URL'),
        SHAZBOT_MONITOR: getEnvBoolean('SHAZBOT_MONITOR', false)
    };
}
