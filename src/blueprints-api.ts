import fetch from 'node-fetch';
import { Agent } from 'https';

interface AgentData {
  id: string;
  name: string;
  framework: string;
  status: string;
  project_id?: string;
  config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface StatusData {
  id: string;
  status: string;
  health: string;
  stats: Record<string, any>;
}

export class BlueprintsAPIClient {
  private baseUrl: string;
  private apiKey: string;
  private httpsAgent: Agent;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.apiKey = apiKey;
    this.httpsAgent = new Agent({ keepAlive: true });
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      agent: this.httpsAgent,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  async listAgents(): Promise<AgentData[]> {
    return this.makeRequest('/agents');
  }

  async createAgent(params: {
    project_id?: string;
    name: string;
    framework: string;
    config?: Record<string, any>;
  }): Promise<AgentData> {
    return this.makeRequest('/agents', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async startAgent(agentId: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/agents/${agentId}/start`, {
      method: 'POST',
    });
  }

  async stopAgent(agentId: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/agents/${agentId}/stop`, {
      method: 'POST',
    });
  }

  async editAgentConfig(
    agentId: string,
    config: Record<string, any>
  ): Promise<AgentData> {
    return this.makeRequest(`/agents/${agentId}/config`, {
      method: 'PATCH',
      body: JSON.stringify({ config }),
    });
  }

  async removeAgent(agentId: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/agents/${agentId}`, {
      method: 'DELETE',
    });
  }

  async sendMessage(
    agentId: string,
    content: string
  ): Promise<{ success: boolean; message_id: string }> {
    return this.makeRequest(`/agents/${agentId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async sendTerminal(
    agentId: string,
    command: string
  ): Promise<{ success: boolean; output: string }> {
    return this.makeRequest(`/agents/${agentId}/terminal`, {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
  }

  async agentStatus(agentId: string): Promise<StatusData> {
    return this.makeRequest(`/agents/${agentId}/status`);
  }

  async accountRegister(email: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest('/account/register', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async payUpgrade(tier: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest('/account/upgrade', {
      method: 'POST',
      body: JSON.stringify({ tier }),
    });
  }
}