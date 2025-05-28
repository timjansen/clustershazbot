# Express.js Integration Example

This example demonstrates how to integrate Clustershazbot with an Express.js server to enable gossip-style coordination between backend service instances.

## Prerequisites

Make sure you have the required environment variables configured:

```bash
# Required environment variables
SHAZBOT_SECRET=your-shared-secret-here
SHAZBOT_CONTROL_SECRET=your-control-secret-here
SHAZBOT_BASE_URL=https://your-server.com:3000/
SHAZBOT_MASTER_LIST=https://your-storage.com/master-list.json
SHAZBOT_MASTER_LIST_UPDATE=https://your-storage.com/master-list.json
SHAZBOT_MASTER_LIST_UPDATE_AUTH=Bearer your-storage-auth-token

# Optional environment variables (with defaults)
SHAZBOT_GOSSIP_INTERVAL=30
SHAZBOT_MONITOR=false
SHAZBOT_UPDATE_MASTER_LIST_ON_SHUTDOWN=false
PORT=3000
```

## Basic Express.js Integration

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

// Initialize clustershazbot engine
shazbotStart().catch(console.error);

// Gossip endpoint - handles inter-server communication
app.post('/clustershazbot/gossip', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const result = await shazbotGossipRequest(auth, req.body as GossipMessage);
        res.json(result);
    } catch (error: any) {
        res.status(401).json({ error: error.message });
    }
});

// List endpoint - returns current server list
app.get('/clustershazbot/list', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const result = await shazbotListRequest(auth);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Control endpoint - brings server online/offline
app.post('/clustershazbot/control', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        await shazbotControlRequest(auth, req.body as ControlMessage);
        res.json({ success: true });
    } catch (error: any) {
        res.status(401).json({ error: error.message });
    }
});

// Graceful shutdown handler
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await shazbotShutDown();
    process.exit(0);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log('Clustershazbot engine started');
});

export default app;
```

## API Endpoints

### 1. Gossip Endpoint (`POST /clustershazbot/gossip`)

**Purpose**: Handles gossip messages between servers for coordination.

**Headers**:
- `Authorization`: Must contain `SHAZBOT_SECRET`
- `Content-Type`: `application/json`

**Request Body**:
```typescript
{
    "message": "gossip",
    "online": [
        {
            "baseUrl": "https://server1:3000/",
            "monitor": false,
            "lastUpdate": 1640995200000
        }
    ],
    "offline": [
        {
            "baseUrl": "https://server2:3000/",
            "monitor": false,
            "lastUpdate": 1640995100000
        }
    ]
}
```

**Response**: Returns the current server's server list in the same format.

### 2. List Endpoint (`GET /clustershazbot/list`)

**Purpose**: Returns the current list of online servers.

**Headers**:
- `Authorization`: Optional. Use `SHAZBOT_CONTROL_SECRET` to include offline servers.

**Response**:
```typescript
{
    "online": [
        {
            "baseUrl": "https://server1:3000/",
            "monitor": false,
            "lastUpdate": 1640995200000
        }
    ],
    "offline": [  // Only included if SHAZBOT_CONTROL_SECRET is provided
        {
            "baseUrl": "https://server2:3000/",
            "monitor": false,
            "lastUpdate": 1640995100000
        }
    ]
}
```

### 3. Control Endpoint (`POST /clustershazbot/control`)

**Purpose**: Controls the online/offline status of the current server.

**Headers**:
- `Authorization`: Must contain `SHAZBOT_CONTROL_SECRET`
- `Content-Type`: `application/json`

**Request Body**:
```typescript
{
    "message": "control",
    "online": true  // true to bring online, false to take offline
}
```

**Response**:
```typescript
{
    "success": true
}
```

## Usage Examples

### Starting the Server

```bash
# Set environment variables
export SHAZBOT_SECRET="my-shared-secret"
export SHAZBOT_CONTROL_SECRET="my-control-secret"
export SHAZBOT_BASE_URL="https://localhost:3000/"
export SHAZBOT_MASTER_LIST="https://example.com/master-list.json"
export SHAZBOT_MASTER_LIST_UPDATE="https://example.com/master-list.json"
export SHAZBOT_MASTER_LIST_UPDATE_AUTH="Bearer my-token"

# Start the server
npm start
```

### Testing the Endpoints

```bash
# Get server list (public view)
curl http://localhost:3000/clustershazbot/list

# Get server list with offline servers (admin view)
curl -H "Authorization: my-control-secret" \
     http://localhost:3000/clustershazbot/list

# Take server offline
curl -X POST \
     -H "Authorization: my-control-secret" \
     -H "Content-Type: application/json" \
     -d '{"message": "control", "online": false}' \
     http://localhost:3000/clustershazbot/control

# Bring server online
curl -X POST \
     -H "Authorization: my-control-secret" \
     -H "Content-Type: application/json" \
     -d '{"message": "control", "online": true}' \
     http://localhost:3000/clustershazbot/control
```

## How It Works

1. **Initialization**: When the server starts, `shazbotStart()` initializes the gossip engine
2. **Bootstrap**: The engine downloads the master server list and announces itself to other servers
3. **Gossip Protocol**: Every 30 seconds (configurable), the server exchanges server lists with random peers
4. **Health Monitoring**: Servers that don't respond to gossip messages are moved to the offline list
5. **Master List Updates**: Periodically, the server updates the shared master list with current online servers
6. **Graceful Shutdown**: When the server shuts down, it announces its offline status to other servers

## Error Handling

The example includes proper error handling:

- **401 Unauthorized**: Invalid authentication secrets
- **500 Internal Server Error**: Engine or network errors
- **Network Failures**: Automatically handled by the gossip protocol with retries

## Security Considerations

- Use different secrets for `SHAZBOT_SECRET` and `SHAZBOT_CONTROL_SECRET`
- Store secrets securely (environment variables, secret management systems)
- The control secret provides administrative access to server lists
- Regular gossip messages only use the shared gossip secret

## Next Steps

For a more complete example with additional features, see `example-complete.ts` which includes:
- Health check endpoints
- Cluster status information
- Enhanced error handling
- Startup error handling
- More detailed logging
