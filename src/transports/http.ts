#!/usr/bin/env node

import { BlueprintsMCPServer } from './index.js';

// Read configuration from environment variables
const baseUrl = process.env.BLUEPRINTS_BASE_URL || 'https://api.blueprints.example.com';
const apiKey = process.env.BLUEPRINTS_API_KEY;

if (!apiKey) {
  console.error('BLUEPRINTS_API_KEY environment variable is required');
  process.exit(1);
}

const config = {
  baseUrl,
  apiKey,
};

const server = new BlueprintsMCPServer(config);

// Start the HTTP server
server.startHTTP(3000)
  .then(() => {
    console.log('Blueprints MCP Server running on http://localhost:3000');
    console.log('Press Ctrl+C to stop');
  })
  .catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await server.close();
  process.exit(0);
});