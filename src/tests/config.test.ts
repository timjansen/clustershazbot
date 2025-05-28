import { loadConfig } from '../config';

describe('Config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('loadConfig', () => {
        it('should load required environment variables', () => {
            process.env.SHAZBOT_SECRET = 'test-secret';
            process.env.SHAZBOT_CONTROL_SECRET = 'control-secret';
            process.env.SHAZBOT_MASTER_LIST = 'https://example.com/master';
            process.env.SHAZBOT_MASTER_LIST_UPDATE = 'https://example.com/update';
            process.env.SHAZBOT_MASTER_LIST_UPDATE_AUTH = 'update-auth';
            process.env.SHAZBOT_BASE_URL = 'https://localhost:3000/';

            const config = loadConfig();

            expect(config.SHAZBOT_SECRET).toBe('test-secret');
            expect(config.SHAZBOT_CONTROL_SECRET).toBe('control-secret');
            expect(config.SHAZBOT_BASE_URL).toBe('https://localhost:3000/');
        });

        it('should use default values for optional numeric settings', () => {
            process.env.SHAZBOT_SECRET = 'test-secret';
            process.env.SHAZBOT_CONTROL_SECRET = 'control-secret';
            process.env.SHAZBOT_MASTER_LIST = 'https://example.com/master';
            process.env.SHAZBOT_MASTER_LIST_UPDATE = 'https://example.com/update';
            process.env.SHAZBOT_MASTER_LIST_UPDATE_AUTH = 'update-auth';
            process.env.SHAZBOT_BASE_URL = 'https://localhost:3000/';

            const config = loadConfig();

            expect(config.SHAZBOT_GOSSIP_INTERVAL).toBe(30);
            expect(config.SHAZBOT_MASTER_ANNOUNCE_MINIMUM).toBe(300);
            expect(config.SHAZBOT_MASTER_ANNOUNCE_INTERVAL).toBe(600);
        });

        it('should parse custom numeric values', () => {
            process.env.SHAZBOT_SECRET = 'test-secret';
            process.env.SHAZBOT_CONTROL_SECRET = 'control-secret';
            process.env.SHAZBOT_MASTER_LIST = 'https://example.com/master';
            process.env.SHAZBOT_MASTER_LIST_UPDATE = 'https://example.com/update';
            process.env.SHAZBOT_MASTER_LIST_UPDATE_AUTH = 'update-auth';
            process.env.SHAZBOT_BASE_URL = 'https://localhost:3000/';
            process.env.SHAZBOT_GOSSIP_INTERVAL = '60';
            process.env.SHAZBOT_MASTER_ANNOUNCE_MINIMUM = '600';

            const config = loadConfig();

            expect(config.SHAZBOT_GOSSIP_INTERVAL).toBe(60);
            expect(config.SHAZBOT_MASTER_ANNOUNCE_MINIMUM).toBe(600);
        });

        it('should parse boolean values', () => {
            process.env.SHAZBOT_SECRET = 'test-secret';
            process.env.SHAZBOT_CONTROL_SECRET = 'control-secret';
            process.env.SHAZBOT_MASTER_LIST = 'https://example.com/master';
            process.env.SHAZBOT_MASTER_LIST_UPDATE = 'https://example.com/update';
            process.env.SHAZBOT_MASTER_LIST_UPDATE_AUTH = 'update-auth';
            process.env.SHAZBOT_BASE_URL = 'https://localhost:3000/';
            process.env.SHAZBOT_MONITOR = 'true';
            process.env.SHAZBOT_UPDATE_MASTER_LIST_ON_SHUTDOWN = 'true';

            const config = loadConfig();

            expect(config.SHAZBOT_MONITOR).toBe(true);
            expect(config.SHAZBOT_UPDATE_MASTER_LIST_ON_SHUTDOWN).toBe(true);
        });

        it('should throw error for missing required variables', () => {
            process.env.SHAZBOT_SECRET = 'test-secret';
            // Missing SHAZBOT_CONTROL_SECRET

            expect(() => loadConfig()).toThrow('Environment variable SHAZBOT_CONTROL_SECRET is required');
        });
    });
});
