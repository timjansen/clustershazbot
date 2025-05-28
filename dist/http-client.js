export class HttpClient {
    constructor(secret) {
        this.secret = secret;
    }
    async sendGossipMessage(server, message) {
        try {
            const response = await fetch(`${server.baseUrl}clustershazbot/gossip`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.secret
                },
                body: JSON.stringify(message),
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const result = await response.json();
            return result;
        }
        catch (error) {
            console.error(`Failed to send gossip message to ${server.baseUrl}:`, error);
            return null;
        }
    }
    async downloadMasterList(url) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const result = await response.json();
            return result;
        }
        catch (error) {
            console.error(`Failed to download master list from ${url}:`, error);
            return null;
        }
    }
    async uploadMasterList(updateUrl, auth, serverList) {
        try {
            const response = await fetch(updateUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': auth
                },
                body: JSON.stringify(serverList),
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return true;
        }
        catch (error) {
            console.error(`Failed to upload master list to ${updateUrl}:`, error);
            return false;
        }
    }
}
