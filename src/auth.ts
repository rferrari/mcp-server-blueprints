import { createHmac } from 'crypto';

export interface SessionData {
  id: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  scopes: string[];
  expiresAt: Date;
}

export class AuthManager {
  private sessions: Map<string, SessionData> = new Map();
  private secret: string;

  constructor(secret: string = process.env.MCP_AUTH_SECRET || 'default-secret-change-in-production') {
    this.secret = secret;
  }

  /**
   * Validates an API key against the expected format and authenticity
   */
  validateApiKey(apiKey: string): boolean {
    // Check if the API key follows the expected format (bp_sk_...)
    if (!apiKey.startsWith('bp_sk_')) {
      return false;
    }

    // Additional validation could happen here (e.g., checking against a database)
    // For this boilerplate, we'll just verify the format
    return apiKey.length > 8; // Basic length check
  }

  /**
   * Creates a new session for a validated user
   */
  createSession(userId: string, scopes: string[]): SessionData {
    const sessionId = this.generateSecureSessionId();
    const now = new Date();
    
    const session: SessionData = {
      id: sessionId,
      userId,
      createdAt: now,
      lastActivity: now,
      scopes,
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000), // 30 minutes
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Validates a session ID and checks if it's still active
   */
  validateSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    const now = new Date();
    
    // Check if session has expired
    if (now > session.expiresAt) {
      this.destroySession(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = now;
    this.sessions.set(sessionId, session);
    
    return session;
  }

  /**
   * Checks if a session has the required scope for an operation
   */
  hasScope(session: SessionData, requiredScope: string): boolean {
    // Special case: admin scope grants all permissions
    if (session.scopes.includes('admin')) {
      return true;
    }

    // Check if session has the specific required scope
    return session.scopes.includes(requiredScope);
  }

  /**
   * Destroys a session, removing it from memory
   */
  destroySession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Generates a cryptographically secure session ID
   */
  private generateSecureSessionId(): string {
    const timestamp = Date.now().toString();
    const randomPart = Math.random().toString(36).substring(2, 15) +
                      Math.random().toString(36).substring(2, 15);
    
    // Create HMAC for additional security
    const hmac = createHmac('sha256', this.secret)
                 .update(timestamp + randomPart)
                 .digest('hex');
                 
    return hmac.substring(0, 32); // Use first 32 chars for the ID
  }

  /**
   * Cleans up expired sessions periodically
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }
}