import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BlueprintsMCPServer } from './src/index';

describe('BlueprintsMCPServer', () => {
  let server: BlueprintsMCPServer;

  beforeEach(() => {
    server = new BlueprintsMCPServer({
      baseUrl: 'https://api.example.com',
      apiKey: 'bp_sk_test_key'
    });
  });

  afterEach(async () => {
    await server.close();
  });

  it('should initialize correctly', () => {
    expect(server).toBeDefined();
  });

  // Add more tests as needed
});