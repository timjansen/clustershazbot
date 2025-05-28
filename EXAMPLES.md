# Express.js Integration Examples

This guide provides comprehensive examples for integrating Clustershazbot with Express.js applications.

## Quick Start Example

Here's a minimal Express.js application with Clustershazbot integration:

### Basic Setup

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

// Clustershazbot endpoints
app.post('/clustershazbot/gossip', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const result = await shazbotGossipRequest(auth, req.body as GossipMessage);
        res.json(result);
    } catch (error: any) {
        res.status(401).json({ error: error.message });
    }
});

app.get('/clustershazbot/list', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const result = await shazbotListRequest(auth);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/clustershazbot/control', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        await shazbotControlRequest(auth, req.body as ControlMessage);
        res.json({ success: true });
    } catch (error: any) {
        res.status(401).json({ error: error.message });
    }
});

// Graceful shutdown
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
```

## Environment Configuration

Create a `.env` file in your project root:

```bash
# Server configuration
CLUSTERSHAZBOT_HOST=localhost
CLUSTERSHAZBOT_PORT=3000

# Gossip protocol settings
CLUSTERSHAZBOT_GOSSIP_INTERVAL=30000
CLUSTERSHAZBOT_GOSSIP_FANOUT=3
CLUSTERSHAZBOT_MAX_RETRIES=3

# Authentication
CLUSTERSHAZBOT_GOSSIP_SECRET=your-gossip-secret-here
CLUSTERSHAZBOT_CONTROL_SECRET=your-control-secret-here

# Master list synchronization
CLUSTERSHAZBOT_MASTER_URL=https://master.example.com/servers
CLUSTERSHAZBOT_MASTER_SECRET=your-master-secret-here
CLUSTERSHAZBOT_MASTER_SYNC_INTERVAL=300000

# Server management
CLUSTERSHAZBOT_TTL=300000
CLUSTERSHAZBOT_MAX_SERVERS=100
```

## Advanced Express.js Integration

For production applications, you might want more sophisticated error handling and middleware:

### Enhanced Error Handling

```typescript
import express, { Request, Response, NextFunction } from 'express';
import { shazbotStart, shazbotShutDown } from 'clustershazbot';

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// Initialize clustershazbot with error handling
async function initializeClustershazbot() {
    try {
        await shazbotStart();
        console.log('Clustershazbot initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Clustershazbot:', error);
        process.exit(1);
    }
}

initializeClustershazbot();

// Enhanced gossip endpoint with detailed error handling
app.post('/clustershazbot/gossip', async (req: Request, res: Response) => {
    try {
        const auth = req.headers.authorization;
        if (!auth) {
            return res.status(401).json({ 
                error: 'Authorization header required',
                code: 'MISSING_AUTH'
            });
        }

        const gossipMessage = req.body;
        if (!gossipMessage || typeof gossipMessage !== 'object') {
            return res.status(400).json({ 
                error: 'Invalid gossip message format',
                code: 'INVALID_MESSAGE'
            });
        }

        const result = await shazbotGossipRequest(auth, gossipMessage);
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Gossip request error:', error);
        res.status(error.message.includes('unauthorized') ? 401 : 500).json({ 
            error: error.message,
            code: 'GOSSIP_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

// Enhanced list endpoint with pagination support
app.get('/clustershazbot/list', async (req: Request, res: Response) => {
    try {
        const auth = req.headers.authorization;
        if (!auth) {
            return res.status(401).json({ 
                error: 'Authorization header required',
                code: 'MISSING_AUTH'
            });
        }

        const result = await shazbotListRequest(auth);
        
        // Optional pagination
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        const paginatedServers = result.servers.slice(startIndex, endIndex);
        
        res.json({
            success: true,
            data: {
                ...result,
                servers: paginatedServers
            },
            pagination: {
                page,
                limit,
                total: result.servers.length,
                totalPages: Math.ceil(result.servers.length / limit)
            },
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('List request error:', error);
        res.status(500).json({ 
            error: error.message,
            code: 'LIST_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

// Enhanced control endpoint with operation validation
app.post('/clustershazbot/control', async (req: Request, res: Response) => {
    try {
        const auth = req.headers.authorization;
        if (!auth) {
            return res.status(401).json({ 
                error: 'Authorization header required',
                code: 'MISSING_AUTH'
            });
        }

        const controlMessage = req.body;
        const validOperations = ['add', 'remove', 'update'];
        
        if (!controlMessage || !validOperations.includes(controlMessage.operation)) {
            return res.status(400).json({ 
                error: 'Invalid control operation',
                code: 'INVALID_OPERATION',
                validOperations
            });
        }

        await shazbotControlRequest(auth, controlMessage);
        res.json({ 
            success: true,
            operation: controlMessage.operation,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Control request error:', error);
        res.status(error.message.includes('unauthorized') ? 401 : 500).json({ 
            error: error.message,
            code: 'CONTROL_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        service: 'clustershazbot-enabled-app',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown with timeout
let shutdownInProgress = false;

async function gracefulShutdown(signal: string) {
    if (shutdownInProgress) return;
    shutdownInProgress = true;
    
    console.log(`Received ${signal}, starting graceful shutdown...`);
    
    const shutdownTimeout = setTimeout(() => {
        console.error('Shutdown timeout exceeded, forcing exit');
        process.exit(1);
    }, 10000);
    
    try {
        await shazbotShutDown();
        console.log('Clustershazbot shutdown complete');
        clearTimeout(shutdownTimeout);
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        clearTimeout(shutdownTimeout);
        process.exit(1);
    }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

const port = process.env.CLUSTERSHAZBOT_PORT || process.env.PORT || 3000;
const host = process.env.CLUSTERSHAZBOT_HOST || 'localhost';

app.listen(port, () => {
    console.log(`Server running on http://${host}:${port}`);
    console.log('Clustershazbot integration active');
});
```

## NestJS Integration

For NestJS applications, you can create a module and service:

### Clustershazbot Module

```typescript
// clustershazbot.module.ts
import { Module } from '@nestjs/common';
import { ClustershazbotService } from './clustershazbot.service';
import { ClustershazbotController } from './clustershazbot.controller';

@Module({
  providers: [ClustershazbotService],
  controllers: [ClustershazbotController],
  exports: [ClustershazbotService],
})
export class ClustershazbotModule {}
```

### Clustershazbot Service

```typescript
// clustershazbot.service.ts
import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import {
    shazbotStart,
    shazbotShutDown,
    shazbotGossipRequest,
    shazbotListRequest,
    shazbotControlRequest,
    GossipMessage,
    ControlMessage
} from 'clustershazbot';

@Injectable()
export class ClustershazbotService implements OnApplicationBootstrap, OnApplicationShutdown {
    
    async onApplicationBootstrap() {
        try {
            await shazbotStart();
            console.log('Clustershazbot service started');
        } catch (error) {
            console.error('Failed to start Clustershazbot:', error);
            throw error;
        }
    }
    
    async onApplicationShutdown() {
        try {
            await shazbotShutDown();
            console.log('Clustershazbot service stopped');
        } catch (error) {
            console.error('Error stopping Clustershazbot:', error);
        }
    }
    
    async handleGossip(auth: string, message: GossipMessage) {
        return await shazbotGossipRequest(auth, message);
    }
    
    async getServerList(auth: string) {
        return await shazbotListRequest(auth);
    }
    
    async handleControl(auth: string, message: ControlMessage) {
        return await shazbotControlRequest(auth, message);
    }
}
```

### Clustershazbot Controller

```typescript
// clustershazbot.controller.ts
import { Controller, Post, Get, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { ClustershazbotService } from './clustershazbot.service';
import { GossipMessage, ControlMessage } from 'clustershazbot';

@Controller('clustershazbot')
export class ClustershazbotController {
    constructor(private readonly clustershazbotService: ClustershazbotService) {}
    
    @Post('gossip')
    async gossip(@Headers('authorization') auth: string, @Body() message: GossipMessage) {
        try {
            if (!auth) {
                throw new HttpException('Authorization required', HttpStatus.UNAUTHORIZED);
            }
            return await this.clustershazbotService.handleGossip(auth, message);
        } catch (error: any) {
            throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
        }
    }
    
    @Get('list')
    async list(@Headers('authorization') auth: string) {
        try {
            if (!auth) {
                throw new HttpException('Authorization required', HttpStatus.UNAUTHORIZED);
            }
            return await this.clustershazbotService.getServerList(auth);
        } catch (error: any) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    @Post('control')
    async control(@Headers('authorization') auth: string, @Body() message: ControlMessage) {
        try {
            if (!auth) {
                throw new HttpException('Authorization required', HttpStatus.UNAUTHORIZED);
            }
            await this.clustershazbotService.handleControl(auth, message);
            return { success: true };
        } catch (error: any) {
            throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
        }
    }
}
```

## Testing Your Integration

### Unit Tests

```typescript
// clustershazbot.test.ts
import request from 'supertest';
import app from './your-app';

describe('Clustershazbot Integration', () => {
    test('should handle gossip requests', async () => {
        const response = await request(app)
            .post('/clustershazbot/gossip')
            .set('Authorization', 'Bearer your-gossip-secret')
            .send({
                serverId: 'test-server',
                servers: []
            });
        
        expect(response.status).toBe(200);
    });
    
    test('should reject unauthorized gossip requests', async () => {
        const response = await request(app)
            .post('/clustershazbot/gossip')
            .send({
                serverId: 'test-server',
                servers: []
            });
        
        expect(response.status).toBe(401);
    });
    
    test('should return server list', async () => {
        const response = await request(app)
            .get('/clustershazbot/list')
            .set('Authorization', 'Bearer your-gossip-secret');
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('servers');
    });
});
```

## Docker Integration

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  app1:
    build: .
    ports:
      - "3001:3000"
    environment:
      - CLUSTERSHAZBOT_HOST=app1
      - CLUSTERSHAZBOT_PORT=3000
      - CLUSTERSHAZBOT_GOSSIP_SECRET=shared-gossip-secret
      - CLUSTERSHAZBOT_CONTROL_SECRET=shared-control-secret
    networks:
      - cluster-network
  
  app2:
    build: .
    ports:
      - "3002:3000"
    environment:
      - CLUSTERSHAZBOT_HOST=app2
      - CLUSTERSHAZBOT_PORT=3000
      - CLUSTERSHAZBOT_GOSSIP_SECRET=shared-gossip-secret
      - CLUSTERSHAZBOT_CONTROL_SECRET=shared-control-secret
    networks:
      - cluster-network

networks:
  cluster-network:
    driver: bridge
```

## Best Practices

1. **Environment Variables**: Always use environment variables for configuration
2. **Error Handling**: Implement comprehensive error handling for all endpoints
3. **Authentication**: Use strong secrets and rotate them regularly
4. **Monitoring**: Add logging and monitoring for gossip activity
5. **Graceful Shutdown**: Always implement graceful shutdown to clean up resources
6. **Health Checks**: Include health check endpoints for load balancers
7. **Rate Limiting**: Consider rate limiting for control endpoints
8. **Validation**: Validate all incoming messages and parameters

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check that the target server is running and accessible
2. **Authentication Errors**: Verify that secrets match across all servers
3. **High Memory Usage**: Monitor server list size and implement cleanup
4. **Network Timeouts**: Adjust retry settings and timeout values

### Debug Logging

Enable debug logging by setting the environment variable:

```bash
DEBUG=clustershazbot:* npm start
```

This will provide detailed logs about gossip operations, server list changes, and HTTP requests.
