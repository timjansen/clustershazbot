import {
    shazbotStart,
    shazbotShutDown,
    shazbotGetServerList,
    shazbotGossipRequest,
    shazbotListRequest,
    shazbotControlRequest
} from '../clustershazbot';
import { GossipMessage, ControlMessage } from '../types';

// Mock the config module
jest.mock('../config', () => ({
    loadConfig: () => ({
        SHAZBOT_SECRET: 'test-secret',
        SHAZBOT_CONTROL_SECRET: 'control-secret',
        SHAZBOT_BASE_URL: 'https://localhost:3000/',
        SHAZBOT_MASTER_LIST: 'https://example.com/master',
        SHAZBOT_MASTER_LIST_UPDATE: 'https://example.com/update',
        SHAZBOT_MASTER_LIST_UPDATE_AUTH: 'update-auth',
        SHAZBOT_GOSSIP_INTERVAL: 30,
        SHAZBOT_MASTER_ANNOUNCE_MINIMUM: 300,
        SHAZBOT_MASTER_ANNOUNCE_INTERVAL: 600,
        SHAZBOT_UPDATE_MASTER_LIST_ON_SHUTDOWN: false,
        SHAZBOT_MONITOR: false
    })
}));

// Mock the http-client module
jest.mock('../http-client', () => ({
    HttpClient: jest.fn().mockImplementation(() => ({
        downloadMasterList: jest.fn().mockResolvedValue(null),
        sendGossipMessage: jest.fn().mockResolvedValue(null),
        uploadMasterList: jest.fn().mockResolvedValue(true)
    }))
}));

describe('Clustershazbot Engine', () => {
    beforeEach(async () => {
        // Reset any existing engine state
        await shazbotShutDown();
        jest.clearAllMocks();
    });

    afterEach(async () => {
        // Clean up after each test
        await shazbotShutDown();
    });

    describe('shazbotStart', () => {
        it('should start the engine successfully', async () => {
            await expect(shazbotStart()).resolves.not.toThrow();
        });

        it('should not fail when called multiple times', async () => {
            await shazbotStart();
            await expect(shazbotStart()).resolves.not.toThrow();
        });
    });

    describe('shazbotGetServerList', () => {
        it('should throw error when engine not started', () => {
            expect(() => shazbotGetServerList()).toThrow('Clustershazbot engine not started');
        });

        it('should return server list when engine is started', async () => {
            await shazbotStart();
            const serverList = shazbotGetServerList();
            
            expect(serverList).toHaveProperty('online');
            expect(Array.isArray(serverList.online)).toBe(true);
            expect(serverList.online).toHaveLength(1); // Should contain this server
            expect(serverList.online[0].baseUrl).toBe('https://localhost:3000/');
        });

        it('should include offline servers when requested', async () => {
            await shazbotStart();
            const serverList = shazbotGetServerList(true);
            
            expect(serverList).toHaveProperty('online');
            expect(serverList).toHaveProperty('offline');
        });

        it('should not include offline servers by default', async () => {
            await shazbotStart();
            const serverList = shazbotGetServerList();
            
            expect(serverList).toHaveProperty('online');
            expect(serverList.offline).toBeUndefined();
        });
    });

    describe('shazbotGossipRequest', () => {
        it('should throw error when engine not started', async () => {
            const message: GossipMessage = {
                message: 'gossip',
                online: []
            };
            
            await expect(shazbotGossipRequest('test-secret', message))
                .rejects.toThrow('Clustershazbot engine not started');
        });

        it('should handle gossip request with correct auth', async () => {
            await shazbotStart();
            
            const message: GossipMessage = {
                message: 'gossip',
                online: [{
                    baseUrl: 'https://example.com/',
                    monitor: false,
                    lastUpdate: Date.now()
                }]
            };
            
            const result = await shazbotGossipRequest('test-secret', message);
            expect(result).toHaveProperty('message', 'gossip');
            expect(result).toHaveProperty('online');
        });

        it('should reject gossip request with incorrect auth', async () => {
            await shazbotStart();
            
            const message: GossipMessage = {
                message: 'gossip',
                online: []
            };
            
            await expect(shazbotGossipRequest('wrong-secret', message))
                .rejects.toThrow('Unauthorized');
        });
    });

    describe('shazbotListRequest', () => {
        it('should throw error when engine not started', async () => {
            await expect(shazbotListRequest('test-secret'))
                .rejects.toThrow('Clustershazbot engine not started');
        });

        it('should return server list without offline servers for regular auth', async () => {
            await shazbotStart();
            
            const result = await shazbotListRequest('test-secret');
            expect(result).toHaveProperty('online');
            expect(result.offline).toBeUndefined();
        });

        it('should return server list with offline servers for control auth', async () => {
            await shazbotStart();
            
            const result = await shazbotListRequest('control-secret');
            expect(result).toHaveProperty('online');
            expect(result).toHaveProperty('offline');
        });
    });

    describe('shazbotControlRequest', () => {
        it('should throw error when engine not started', async () => {
            const message: ControlMessage = {
                message: 'control',
                online: false
            };
            
            await expect(shazbotControlRequest('control-secret', message))
                .rejects.toThrow('Clustershazbot engine not started');
        });

        it('should handle control request with correct auth', async () => {
            await shazbotStart();
            
            const message: ControlMessage = {
                message: 'control',
                online: false
            };
            
            await expect(shazbotControlRequest('control-secret', message))
                .resolves.not.toThrow();
        });

        it('should reject control request with incorrect auth', async () => {
            await shazbotStart();
            
            const message: ControlMessage = {
                message: 'control',
                online: false
            };
            
            await expect(shazbotControlRequest('wrong-secret', message))
                .rejects.toThrow('Unauthorized');
        });

        it('should set server online when requested', async () => {
            await shazbotStart();
            
            const offlineMessage: ControlMessage = {
                message: 'control',
                online: false
            };
            await shazbotControlRequest('control-secret', offlineMessage);
            
            const onlineMessage: ControlMessage = {
                message: 'control',
                online: true
            };
            await shazbotControlRequest('control-secret', onlineMessage);
            
            const serverList = shazbotGetServerList();
            expect(serverList.online).toHaveLength(1);
        });
    });

    describe('shazbotShutDown', () => {
        it('should shutdown gracefully when engine is started', async () => {
            await shazbotStart();
            await expect(shazbotShutDown()).resolves.not.toThrow();
        });

        it('should not fail when called multiple times', async () => {
            await shazbotStart();
            await shazbotShutDown();
            await expect(shazbotShutDown()).resolves.not.toThrow();
        });

        it('should not fail when engine was never started', async () => {
            await expect(shazbotShutDown()).resolves.not.toThrow();
        });
    });
});
