import { HttpClient } from '../http-client';
import { GossipMessage, GossipServer, ServerList } from '../types';

// Mock fetch globally
global.fetch = jest.fn();

describe('HttpClient', () => {
    let httpClient: HttpClient;
    const secret = 'test-secret';

    beforeEach(() => {
        httpClient = new HttpClient(secret);
        jest.clearAllMocks();
    });

    describe('sendGossipMessage', () => {
        it('should send gossip message successfully', async () => {
            const server: GossipServer = {
                baseUrl: 'https://example.com/',
                monitor: false,
                lastUpdate: Date.now()
            };

            const message: GossipMessage = {
                message: 'gossip',
                online: [server]
            };

            const responseMessage: GossipMessage = {
                message: 'gossip',
                online: [server, { baseUrl: 'https://other.com/', monitor: false, lastUpdate: Date.now() }]
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => responseMessage
            });

            const result = await httpClient.sendGossipMessage(server, message);

            expect(global.fetch).toHaveBeenCalledWith(
                'https://example.com/clustershazbot/gossip',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': secret
                    },
                    body: JSON.stringify(message)
                })
            );

            expect(result).toEqual(responseMessage);
        });

        it('should return null on fetch error', async () => {
            const server: GossipServer = {
                baseUrl: 'https://example.com/',
                monitor: false,
                lastUpdate: Date.now()
            };

            const message: GossipMessage = {
                message: 'gossip',
                online: [server]
            };

            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            const result = await httpClient.sendGossipMessage(server, message);

            expect(result).toBeNull();
        });

        it('should return null on HTTP error', async () => {
            const server: GossipServer = {
                baseUrl: 'https://example.com/',
                monitor: false,
                lastUpdate: Date.now()
            };

            const message: GossipMessage = {
                message: 'gossip',
                online: [server]
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            });

            const result = await httpClient.sendGossipMessage(server, message);

            expect(result).toBeNull();
        });
    });

    describe('downloadMasterList', () => {
        it('should download master list successfully', async () => {
            const url = 'https://example.com/master-list';
            const serverList: ServerList = {
                online: [
                    { baseUrl: 'https://server1.com/', monitor: false, lastUpdate: Date.now() },
                    { baseUrl: 'https://server2.com/', monitor: true, lastUpdate: Date.now() }
                ]
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => serverList
            });

            const result = await httpClient.downloadMasterList(url);

            expect(global.fetch).toHaveBeenCalledWith(url, expect.objectContaining({
                method: 'GET'
            }));

            expect(result).toEqual(serverList);
        });

        it('should return null on download error', async () => {
            const url = 'https://example.com/master-list';

            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            const result = await httpClient.downloadMasterList(url);

            expect(result).toBeNull();
        });
    });

    describe('uploadMasterList', () => {
        it('should upload master list successfully', async () => {
            const updateUrl = 'https://example.com/update';
            const auth = 'Bearer token';
            const serverList: ServerList = {
                online: [
                    { baseUrl: 'https://server1.com/', monitor: false, lastUpdate: Date.now() }
                ]
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true
            });

            const result = await httpClient.uploadMasterList(updateUrl, auth, serverList);

            expect(global.fetch).toHaveBeenCalledWith(
                updateUrl,
                expect.objectContaining({
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': auth
                    },
                    body: JSON.stringify(serverList)
                })
            );

            expect(result).toBe(true);
        });

        it('should return false on upload error', async () => {
            const updateUrl = 'https://example.com/update';
            const auth = 'Bearer token';
            const serverList: ServerList = {
                online: [
                    { baseUrl: 'https://server1.com/', monitor: false, lastUpdate: Date.now() }
                ]
            };

            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            const result = await httpClient.uploadMasterList(updateUrl, auth, serverList);

            expect(result).toBe(false);
        });
    });
});
