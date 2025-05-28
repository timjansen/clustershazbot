import { GossipServer, ServerList, GossipMessage, ControlMessage } from '../types';

describe('Types', () => {
    it('should create a GossipServer', () => {
        const server: GossipServer = {
            baseUrl: 'https://localhost:3000/',
            monitor: false,
            lastUpdate: Date.now()
        };
        
        expect(server.baseUrl).toBe('https://localhost:3000/');
        expect(server.monitor).toBe(false);
        expect(typeof server.lastUpdate).toBe('number');
    });

    it('should create a ServerList', () => {
        const server: GossipServer = {
            baseUrl: 'https://localhost:3000/',
            monitor: false,
            lastUpdate: Date.now()
        };

        const serverList: ServerList = {
            online: [server],
            offline: []
        };

        expect(serverList.online).toHaveLength(1);
        expect(serverList.offline).toHaveLength(0);
    });

    it('should create a GossipMessage', () => {
        const server: GossipServer = {
            baseUrl: 'https://localhost:3000/',
            monitor: false,
            lastUpdate: Date.now()
        };

        const message: GossipMessage = {
            message: 'gossip',
            online: [server]
        };

        expect(message.message).toBe('gossip');
        expect(message.online).toHaveLength(1);
    });

    it('should create a ControlMessage', () => {
        const message: ControlMessage = {
            message: 'control',
            online: true
        };

        expect(message.message).toBe('control');
        expect(message.online).toBe(true);
    });
});
