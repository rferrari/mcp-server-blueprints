import { ServerTransport, Message } from '@modelcontextprotocol/sdk';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { Readable } from 'stream';
import { MCPConfig } from './index.js';
import { AuthManager, SessionData } from './auth.js';

export class HTTPTransport implements ServerTransport {
  private server: ReturnType<typeof createServer>;
  private authManager: AuthManager;
  private config: MCPConfig;
  private serverInstance: any; // Will hold reference to the actual server

  constructor(config: MCPConfig) {
    this.config = config;
    this.authManager = new AuthManager();
    this.server = createServer(this.handleRequest.bind(this));
  }

  // Method to set the server instance so we can route messages to it
  setServerInstance(server: any) {
    this.serverInstance = server;
  }

  async connect(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(3000, () => {
        console.log('HTTP transport listening on port 3000');
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(`http://${req.headers.host}${req.url}`);
    
    // Only accept POST requests to /mcp/messages
    if (req.method !== 'POST' || url.pathname !== '/mcp/messages') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    // Extract session ID from query parameter and header
    const sessionIdFromQuery = url.searchParams.get('sessionId');
    const sessionIdFromHeader = req.headers['mcp-session-id'] as string;
    
    // Validate session
    let sessionId: string | undefined;
    if (sessionIdFromQuery && sessionIdFromHeader) {
      if (sessionIdFromQuery === sessionIdFromHeader) {
        sessionId = sessionIdFromQuery;
      }
    }

    // Check for authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing or invalid authorization header' }));
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Validate API key format
    if (!this.authManager.validateApiKey(token)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid API key format' }));
      return;
    }

    // If this is an initialization request and no session exists yet
    if (!sessionId) {
      // Handle initialization request
      const body = await this.readRequestBody(req);
      const message: Message = JSON.parse(body);
      
      if (message.method === 'initialize') {
        // Create a new session for this user (in a real app, you'd extract user info from the token)
        // For this demo, we'll use a placeholder user ID
        const session = this.authManager.createSession('demo-user', ['read', 'write']);
        sessionId = session.id;
        
        // Send successful initialization response
        const response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            serverInfo: {
              name: 'blueprints-mcp-server',
              version: '1.0.0'
            }
          }
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('mcp-session-id', session.id);
        res.writeHead(200);
        res.end(JSON.stringify(response));
        return;
      } else {
        // If not initialization and no session, reject the request
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Session required for this request' }));
        return;
      }
    }

    // Validate the session
    const session = this.authManager.validateSession(sessionId);
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid or expired session' }));
      return;
    }

    try {
      // Read request body
      const body = await this.readRequestBody(req);
      const message: Message = JSON.parse(body);

      // Handle initialized notification
      if (message.method === 'notifications/initialized') {
        // Just acknowledge the initialized notification
        res.writeHead(200);
        res.end();
        return;
      }

      // Determine the required scope based on the method
      const requiredScope = this.getRequiredScope(message.method);
      if (requiredScope && !this.authManager.hasScope(session, requiredScope)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Insufficient permissions. Required scope: ${requiredScope}` }));
        return;
      }

      // Forward the message to the actual server instance
      if (this.serverInstance && typeof this.serverInstance.receiveMessage === 'function') {
        // Process the message using the server instance
        const response = await this.serverInstance.receiveMessage(message);
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('mcp-session-id', sessionId);
        res.writeHead(200);
        res.end(JSON.stringify(response));
      } else {
        // Fallback: return a generic response
        if (message.id) {
          const response = {
            jsonrpc: '2.0',
            id: message.id,
            result: { success: true, message: `Processed ${message.method}` }
          };
          
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('mcp-session-id', sessionId);
          res.writeHead(200);
          res.end(JSON.stringify(response));
        } else {
          // For notifications (no id), just return nothing
          res.writeHead(200);
          res.end();
        }
      }
    } catch (error: any) {
      console.error('Error processing request:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message || 'Internal server error' }));
    }
  }

  private async readRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve(body);
      });
    });
  }

  private getRequiredScope(method: string): string | null {
    // Map MCP methods to required scopes based on the specification
    const scopeMap: { [key: string]: string } = {
      'tools/list_agents': 'read',
      'tools/create_agent': 'write',
      'tools/start_agent': 'execute',
      'tools/stop_agent': 'execute',
      'tools/edit_agent_config': 'write',
      'tools/remove_agent': 'write',
      'tools/send_message': 'write',
      'tools/send_terminal': 'terminal',
      'tools/agent_status': 'read',
      'tools/account_register': 'read',
      'tools/pay_upgrade': 'read',
      // Direct method names (without tools/ prefix)
      'list_agents': 'read',
      'create_agent': 'write',
      'start_agent': 'execute',
      'stop_agent': 'execute',
      'edit_agent_config': 'write',
      'remove_agent': 'write',
      'send_message': 'write',
      'send_terminal': 'terminal',
      'agent_status': 'read',
      'account_register': 'read',
      'pay_upgrade': 'read',
    };

    return scopeMap[method] || null;
  }

  async sendMessage(message: Message): Promise<void> {
    // In a real implementation, this would send a message back to the client
    // For HTTP transport, this is typically not used since communication is request-response
    console.log('Sending message:', message);
  }

  setOnMessage(handler: (message: Message) => void): void {
    // For HTTP transport, message handling is done in the request handler
    // This is more relevant for persistent connection transports
  }
}