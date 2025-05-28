# Clustershazbot

A TypeScript library for gossip-style coordination of backend service clusters, such as those written with Express or Nest.js.

## Installation

```bash
npm install clustershazbot
```

## Environment Variables

The following environment variables must be configured:

- `SHAZBOT_SECRET`: Shared secret for gossip message authentication
- `SHAZBOT_CONTROL_SECRET`: Secret for control operations  
- `SHAZBOT_BASE_URL`: Base URL of this server (e.g., `https://localhost:3000/`)
- `SHAZBOT_MASTER_LIST`: URL to download the master server list
- `SHAZBOT_MASTER_LIST_UPDATE`: URL to upload updated master server list
- `SHAZBOT_MASTER_LIST_UPDATE_AUTH`: Authentication header for master list updates

Optional environment variables:

- `SHAZBOT_GOSSIP_INTERVAL`: Gossip interval in seconds (default: 30)
- `SHAZBOT_MASTER_ANNOUNCE_MINIMUM`: Minimum seconds before master list announcement (default: 300)
- `SHAZBOT_MASTER_ANNOUNCE_INTERVAL`: Maximum additional seconds for master list announcement (default: 600)
- `SHAZBOT_MONITOR`: Whether this server is a monitor server (default: false)
- `SHAZBOT_UPDATE_MASTER_LIST_ON_SHUTDOWN`: Update master list when shutting down (default: false)

## Usage

### Express.js Example

```typescript
import express from 'express';
import {
    shazbotStart,
    shazbotShutDown,
    shazbotGossipRequest,
    shazbotListRequest,
    shazbotControlRequest,
    GossipMessage,
    ControlMessage
} from 'clustershazbot';

const app = express();
app.use(express.json());

// Initialize clustershazbot
shazbotStart().catch(console.error);

// Gossip endpoint
app.post('/clustershazbot/gossip', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const result = await shazbotGossipRequest(auth, req.body as GossipMessage);
        res.json(result);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

// List endpoint
app.get('/clustershazbot/list', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const result = await shazbotListRequest(auth);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Control endpoint
app.post('/clustershazbot/control', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        await shazbotControlRequest(auth, req.body as ControlMessage);
        res.json({ success: true });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await shazbotShutDown();
    process.exit(0);
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

For more comprehensive examples including error handling, NestJS integration, Docker setup, and production best practices, see [EXAMPLES.md](./EXAMPLES.md).

### Nest.js Example

```typescript
import { Controller, Post, Get, Body, Headers, Injectable } from '@nestjs/common';
import { 
    shazbotGossipRequest, 
    shazbotListRequest, 
    shazbotControlRequest,
    GossipMessage,
    ControlMessage 
} from 'clustershazbot';

@Controller('clustershazbot')
export class ClustershazbotController {
    @Post('gossip')
    async gossip(
        @Headers('authorization') auth: string,
        @Body() body: GossipMessage
    ) {
        return await shazbotGossipRequest(auth || '', body);
    }

    @Get('list')
    async list(@Headers('authorization') auth: string) {
        return await shazbotListRequest(auth || '');
    }

    @Post('control')
    async control(
        @Headers('authorization') auth: string,
        @Body() body: ControlMessage
    ) {
        await shazbotControlRequest(auth || '', body);
        return { success: true };
    }
}

@Injectable()
export class ClustershazbotService {
    async onModuleInit() {
        await shazbotStart();
    }

    async onModuleDestroy() {
        await shazbotShutDown();
    }
}
```

## API Reference

### Functions

#### `shazbotStart(): Promise<void>`
Starts the clustershazbot engine. This initializes gossip intervals and downloads the master server list.

#### `shazbotShutDown(): Promise<void>`
Prepares the clustershazbot engine for shutdown. Moves this server to offline status and announces shutdown to other servers.

#### `shazbotGossipRequest(authorizationHeader: string, body: GossipMessage): Promise<GossipMessage>`
Handles incoming gossip requests. Must be called for POST requests to `/clustershazbot/gossip`.

#### `shazbotListRequest(authorizationHeader: string): Promise<ServerList>`
Handles server list requests. Must be called for GET requests to `/clustershazbot/list`.

#### `shazbotControlRequest(authorizationHeader: string, message: ControlMessage): Promise<void>`
Handles control requests to bring server online/offline. Must be called for POST requests to `/clustershazbot/control`.

### Types

#### `GossipServer`
```typescript
interface GossipServer {
    baseUrl: string;  // typically: https://<server>:<port>/
    monitor: boolean;
    lastUpdate: number; // ms since epoch
}
```

#### `ServerList`
```typescript
interface ServerList {
    online: GossipServer[];
    offline?: GossipServer[];
}
```

#### `GossipMessage`
```typescript
interface GossipMessage extends ServerList {
    message: 'gossip';
}
```

#### `ControlMessage`
```typescript
interface ControlMessage {
    message: 'control';
    online: boolean;
}
```

## How It Works

1. **Server List Management**: Each server maintains lists of online and offline servers with timestamps
2. **Gossip Protocol**: Servers periodically exchange server lists with random peers to maintain consistency
3. **Master List Bootstrap**: New servers bootstrap by downloading a master server list
4. **Monitor Servers**: Special servers marked as monitors are preferred for gossip exchanges
5. **Automatic Cleanup**: Offline servers older than 24 hours are automatically removed

## License

MIT
