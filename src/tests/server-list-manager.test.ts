import { ServerListManager } from '../server-list-manager';
import { GossipServer, ServerList } from '../types';

describe('ServerListManager', () => {
    let manager: ServerListManager;
    const baseUrl = 'https://localhost:3000/';

    beforeEach(() => {
        manager = new ServerListManager(baseUrl, false);
    });

    describe('initialization', () => {
        it('should initialize with this server in online list', () => {
            const serverList = manager.getServerList();
            expect(serverList.online).toHaveLength(1);
            expect(serverList.online[0].baseUrl).toBe(baseUrl);
            expect(serverList.online[0].monitor).toBe(false);
        });

        it('should initialize as monitor server when specified', () => {
            const monitorManager = new ServerListManager(baseUrl, true);
            const serverList = monitorManager.getServerList();
            expect(serverList.online[0].monitor).toBe(true);
        });
    });

    describe('mergeServerList', () => {
        it('should merge online servers with newer timestamps', () => {
            const incomingServer: GossipServer = {
                baseUrl: 'https://other:3000/',
                monitor: false,
                lastUpdate: Date.now()
            };

            const incomingList: ServerList = {
                online: [incomingServer]
            };

            manager.mergeServerList(incomingList);
            const result = manager.getServerList();
            
            expect(result.online).toHaveLength(2);
            expect(result.online.some(s => s.baseUrl === incomingServer.baseUrl)).toBe(true);
        });

        it('should not overwrite servers with older timestamps', () => {
            const existingServer: GossipServer = {
                baseUrl: 'https://other:3000/',
                monitor: false,
                lastUpdate: Date.now()
            };

            manager.mergeServerList({ online: [existingServer] });

            const olderServer: GossipServer = {
                ...existingServer,
                lastUpdate: Date.now() - 10000 // 10 seconds older
            };

            manager.mergeServerList({ online: [olderServer] });
            const result = manager.getServerList();
            
            const foundServer = result.online.find(s => s.baseUrl === existingServer.baseUrl);
            expect(foundServer?.lastUpdate).toBe(existingServer.lastUpdate);
        });
    });

    describe('server movement', () => {
        it('should move server to offline list', () => {
            const serverUrl = 'https://other:3000/';
            const server: GossipServer = {
                baseUrl: serverUrl,
                monitor: false,
                lastUpdate: Date.now()
            };

            manager.mergeServerList({ online: [server] });
            manager.moveServerOffline(serverUrl);

            const result = manager.getServerList(true);
            expect(result.online.some(s => s.baseUrl === serverUrl)).toBe(false);
            expect(result.offline?.some(s => s.baseUrl === serverUrl)).toBe(true);
        });

        it('should set this server offline', () => {
            manager.setThisServerOffline();
            const result = manager.getServerList(true);
            
            expect(result.online.some(s => s.baseUrl === baseUrl)).toBe(false);
            expect(result.offline?.some(s => s.baseUrl === baseUrl)).toBe(true);
            expect(manager.isThisServerOnline()).toBe(false);
        });

        it('should set this server online', () => {
            manager.setThisServerOffline();
            manager.setThisServerOnline();
            
            const result = manager.getServerList(true);
            expect(result.online.some(s => s.baseUrl === baseUrl)).toBe(true);
            expect(result.offline?.some(s => s.baseUrl === baseUrl)).toBe(false);
            expect(manager.isThisServerOnline()).toBe(true);
        });
    });

    describe('random server selection', () => {
        beforeEach(() => {
            // Add some test servers
            const servers: GossipServer[] = [
                { baseUrl: 'https://server1:3000/', monitor: false, lastUpdate: Date.now() },
                { baseUrl: 'https://server2:3000/', monitor: true, lastUpdate: Date.now() },
                { baseUrl: 'https://server3:3000/', monitor: false, lastUpdate: Date.now() }
            ];
            manager.mergeServerList({ online: servers });
        });

        it('should return random servers excluding self', () => {
            const randomServers = manager.getRandomOnlineServers(2);
            expect(randomServers).toHaveLength(2);
            expect(randomServers.every(s => s.baseUrl !== baseUrl)).toBe(true);
        });

        it('should return monitor servers excluding self', () => {
            const monitorServers = manager.getMonitorServers();
            expect(monitorServers).toHaveLength(1);
            expect(monitorServers[0].baseUrl).toBe('https://server2:3000/');
            expect(monitorServers[0].monitor).toBe(true);
        });

        it('should return all target servers for gossip', () => {
            const targets = manager.getAllTargetServersForGossip();
            expect(targets.length).toBeGreaterThan(0);
            expect(targets.every(s => s.baseUrl !== baseUrl)).toBe(true);
        });
    });
});
