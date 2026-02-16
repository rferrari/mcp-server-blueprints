import { Server, StdioServerTransport } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { BlueprintsAPIClient } from './blueprints-api.js';
import { HTTPTransport } from './transports/http.js';

export interface MCPConfig {
  baseUrl: string;
  apiKey: string;
}

export class BlueprintsMCPServer {
  private server: Server;
  private apiClient: BlueprintsAPIClient;
  private config: MCPConfig;
  private httpTransport: HTTPTransport | null = null;

  constructor(config: MCPConfig) {
    this.config = config;
    this.apiClient = new BlueprintsAPIClient(config.baseUrl, config.apiKey);
    
    // Define the MCP server with the SDK
    this.server = new Server({
      name: 'blueprints-mcp-server',
      version: '1.0.0',
    });
    
    this.registerTools();
  }

  private registerTools() {
    // Register all the tools defined in the specification
    
    // list_agents tool
    this.server.tool({
      name: 'list_agents',
      description: 'Returns a list of all agents owned by the user.',
      inputSchema: z.object({}),
      handler: async () => {
        return await this.apiClient.listAgents();
      },
    });

    // create_agent tool
    this.server.tool({
      name: 'create_agent',
      description: 'Creates a new agent.',
      inputSchema: z.object({
        project_id: z.string().optional(),
        name: z.string(),
        framework: z.string(),
        config: z.record(z.any()).optional(),
      }),
      handler: async ({ project_id, name, framework, config }) => {
        return await this.apiClient.createAgent({
          project_id,
          name,
          framework,
          config
        });
      },
    });

    // start_agent tool
    this.server.tool({
      name: 'start_agent',
      description: 'Triggers an agent to start.',
      inputSchema: z.object({
        agent_id: z.string(),
      }),
      handler: async ({ agent_id }) => {
        return await this.apiClient.startAgent(agent_id);
      },
    });

    // stop_agent tool
    this.server.tool({
      name: 'stop_agent',
      description: 'Triggers an agent to stop.',
      inputSchema: z.object({
        agent_id: z.string(),
      }),
      handler: async ({ agent_id }) => {
        return await this.apiClient.stopAgent(agent_id);
      },
    });

    // edit_agent_config tool
    this.server.tool({
      name: 'edit_agent_config',
      description: 'Updates agent parameters.',
      inputSchema: z.object({
        agent_id: z.string(),
        config: z.record(z.any()),
      }),
      handler: async ({ agent_id, config }) => {
        return await this.apiClient.editAgentConfig(agent_id, config);
      },
    });

    // remove_agent tool
    this.server.tool({
      name: 'remove_agent',
      description: 'Deletes an agent.',
      inputSchema: z.object({
        agent_id: z.string(),
      }),
      handler: async ({ agent_id }) => {
        return await this.apiClient.removeAgent(agent_id);
      },
    });

    // send_message tool
    this.server.tool({
      name: 'send_message',
      description: 'Posts a message to the agent\'s interaction log.',
      inputSchema: z.object({
        agent_id: z.string(),
        content: z.string(),
      }),
      handler: async ({ agent_id, content }) => {
        return await this.apiClient.sendMessage(agent_id, content);
      },
    });

    // send_terminal tool
    this.server.tool({
      name: 'send_terminal',
      description: 'Executes a command directly in the agent\'s shell terminal.',
      inputSchema: z.object({
        agent_id: z.string(),
        command: z.string(),
      }),
      handler: async ({ agent_id, command }) => {
        return await this.apiClient.sendTerminal(agent_id, command);
      },
    });

    // agent_status tool
    this.server.tool({
      name: 'agent_status',
      description: 'Get detailed health/stats for an agent.',
      inputSchema: z.object({
        agent_id: z.string(),
      }),
      handler: async ({ agent_id }) => {
        return await this.apiClient.agentStatus(agent_id);
      },
    });

    // account_register tool
    this.server.tool({
      name: 'account_register',
      description: 'Information on signing up.',
      inputSchema: z.object({
        email: z.string().email(),
      }),
      handler: async ({ email }) => {
        return await this.apiClient.accountRegister(email);
      },
    });

    // pay_upgrade tool
    this.server.tool({
      name: 'pay_upgrade',
      description: 'Information on upgrading.',
      inputSchema: z.object({
        tier: z.string(),
      }),
      handler: async ({ tier }) => {
        return await this.apiClient.payUpgrade(tier);
      },
    });
  }

  // Start the server with stdio transport
  async startStdio() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Blueprints MCP server started with stdio transport');
  }

  // Start the server with HTTP transport
  async startHTTP(port: number = 3000) {
    this.httpTransport = new HTTPTransport(this.config);
    this.httpTransport.setServerInstance(this.server);
    await this.server.connect(this.httpTransport);
    console.log(`Blueprints MCP server started on port ${port}`);
  }

  // Method to handle incoming messages (for transport to use)
  async receiveMessage(message: any) {
    // This is a simplified approach - in a real implementation you'd need to properly
    // route the message through the server's internal mechanisms
    try {
      if (message.id) {
        // This is a request that expects a response
        // In a real implementation, you'd need to call the appropriate tool handler
        // based on the message.method and return the result
        
        // For now, returning a placeholder response
        return {
          jsonrpc: '2.0',
          id: message.id,
          result: { success: true, message: `Processed ${message.method}` }
        };
      } else {
        // This is a notification (no response expected)
        // Just handle the notification and return empty
        console.log(`Received notification: ${message.method}`);
        return {};
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: { code: -32603, message: 'Internal error', data: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  async close() {
    await this.server.close();
  }
}

export default BlueprintsMCPServer;