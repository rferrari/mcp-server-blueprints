# Blueprints MCP Server

An MCP (Model Context Protocol) server for interacting with Blueprints backend services.

## Overview

This MCP server allows AI models and agents to securely interact with Blueprints backend services through the Model Context Protocol. It supports operations like managing agents, sending messages, executing terminal commands, and more.

## Features

- Full MCP 2.0 compliance
- Secure API authentication with bearer tokens
- Session management with configurable timeouts
- Role-based access control (RBAC) with scoped permissions
- HTTP transport via direct JSON over POST
- Support for all Blueprints API operations

## Prerequisites

- Node.js 18 or higher
- A Blueprints API key with appropriate scopes

## Installation

```bash
npm install -g @your-org/mcp-server-blueprints
```

## Usage

### Environment Variables

Set the following environment variables:

```bash
BLUEPRINTS_BASE_URL=https://api.your-blueprints-instance.com
BLUEPRINTS_API_KEY=bp_sk_your_api_key_here
```

### Running the Server

#### As a Binary

```bash
# After installing globally
mcp-server-blueprints
```

#### Programmatically

```javascript
import { BlueprintsMCPServer } from '@your-org/mcp-server-blueprints';

const server = new BlueprintsMCPServer({
  baseUrl: process.env.BLUEPRINTS_BASE_URL,
  apiKey: process.env.BLUEPRINTS_API_KEY,
});

await server.startHTTP(3000);
console.log('Server running on http://localhost:3000');
```

## API Reference

The server implements the following MCP tools:

### Agent Management
- `list_agents()` - Returns a list of all agents owned by the user
- `create_agent(project_id?, name, framework, config?)` - Creates a new agent
- `start_agent(agent_id)` - Starts an agent
- `stop_agent(agent_id)` - Stops an agent
- `edit_agent_config(agent_id, config)` - Updates agent configuration
- `remove_agent(agent_id)` - Deletes an agent

### Messaging & Terminal
- `send_message(agent_id, content)` - Sends a message to an agent
- `send_terminal(agent_id, command)` - Executes a command in agent's terminal

### Status & Account
- `agent_status(agent_id)` - Gets agent health and stats
- `account_register(email)` - Registers a new account
- `pay_upgrade(tier)` - Initiates a payment upgrade

## Security

This server implements role-based access control (RBAC) with the following scopes:

- `read`: View agents and their status
- `write`: Create, update, and delete agents; send messages
- `execute`: Start and stop agents
- `terminal`: Execute terminal commands in agents
- `admin`: All permissions

API keys must follow the format `bp_sk_...` and be granted appropriate scopes when created.

## Transport Protocol

The server uses direct JSON over HTTP POST transport:

- **Endpoint**: `${BASE_URL}/mcp/messages`
- **Method**: POST
- **Auth**: Bearer token in `Authorization` header
- **Session**: Managed via `mcp-session-id` header and `sessionId` query param

### Example Request

```bash
curl -X POST "http://localhost:3000/mcp/messages?sessionId=abc123" \
     -H "Authorization: Bearer bp_sk_your_key" \
     -H "Content-Type: application/json" \
     -H "mcp-session-id: abc123" \
     -d '{
       "jsonrpc": "2.0",
       "id": 1,
       "method": "list_agents",
       "params": {}
     }'
```

## Development

To contribute to this project:

1. Clone the repository
2. Install dependencies: `npm install`
3. Run in development mode: `npm run dev`

## License

MIT