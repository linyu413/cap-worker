import { DurableObject } from "cloudflare:workers";
import Cap from "@cap.js/server";

// Utility function to hash token
async function hashToken(token: string): Promise<string> {
  const [id, rawToken] = token.split(":");
  if (!id || !rawToken) throw new Error("Invalid token format");
  const encoder = new TextEncoder();
  const data = encoder.encode(rawToken);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${id}:${hash}`;
}

interface Challenge {
  challenge: {
    c: number;
    s: number;
    d: number;
  };
  token: string;
  expires: number;
}

interface StoredToken {
    expires: number;
}

const ERR_NOT_FOUND = "NOT_FOUND" as const;
const ERR_EXPIRED = "EXPIRED" as const;

const API_BASE = "/api";
const CHALLENGE_PATH = `${API_BASE}/challenge`;
const REDEEM_PATH = `${API_BASE}/redeem`;
const VALIDATE_PATH = `${API_BASE}/validate`;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute


// Storage Durable Object implementation that hosts a single Cap instance
export class CapStorageDurableObject extends DurableObject {
  private initializing: Promise<void>;

  constructor(private readonly state: DurableObjectState, env: Env) {
    super(state, env);

    this.initializing = (async () => {
      // Set up periodic cleanup (every 1 minute)
      const existingAlarm = await this.state.storage.getAlarm();
      if (!existingAlarm) {
        await this.state.storage.setAlarm(Date.now() + CLEANUP_INTERVAL_MS);
      }
    })();
  }

  async alarm() {
    try {
      const now = Date.now();
      
      // Clean expired challenges
      const challenges = await this.state.storage.list<Challenge>({ prefix: "challenge:" });
      for (const [key, challenge] of challenges) {
        if (challenge.expires < now) {
          await this.state.storage.delete(key);
        }
      }

      // Clean expired tokens
      const tokens = await this.state.storage.list<StoredToken>({ prefix: "token:" });
      for (const [key, token] of tokens) {
        if (token.expires < now) {
          await this.state.storage.delete(key);
        }
      }

      await this.state.storage.setAlarm(Date.now() + CLEANUP_INTERVAL_MS);
    } catch (error) {
      console.error('Storage cleanup failed:', error);
      await this.state.storage.setAlarm(Date.now() + CLEANUP_INTERVAL_MS);
    }
  }

  // Storage methods
  async storeChallenge(token: string, challengeData: Challenge) {
    await this.state.storage.put(`challenge:${token}`, challengeData);
  }

  async getChallenge(token: string): Promise<Challenge | undefined> {
    return await this.state.storage.get<Challenge>(`challenge:${token}`);
  }

  /**
   * Atomically delete a redeemed challenge and persist its corresponding token.
   * This guarantees that no concurrent request can re-redeem the same challenge
   */
  async finalizeRedeem(
    token: string,
    tokenHash: string,
    tokenData: StoredToken,
  ) {
    await this.state.storage.transaction(async (txn: DurableObjectTransaction) => {
      const existing = await txn.get<Challenge>(`challenge:${token}`);
      if (!existing) {
        throw new Error(ERR_NOT_FOUND);
      }

      const now = Date.now();
      if (existing.expires < now) {
        // Clean up expired challenge
        await txn.delete(`challenge:${token}`);
        throw new Error(ERR_EXPIRED);
      }
      // Ensure the challenge is removed exactly once (idempotent delete).
      await txn.delete(`challenge:${token}`);
      await txn.put(`token:${tokenHash}`, tokenData);
    });
  }

  /**
   * Atomically validate a token and optionally consume (delete) it.
   * Returns true when valid, throws string error otherwise.
   */
  async validateAndConsumeToken(tokenHash: string, keepToken?: boolean) {
    await this.state.storage.transaction(async (txn: DurableObjectTransaction) => {
      const tokenData = await txn.get<StoredToken>(`token:${tokenHash}`);
      if (!tokenData) throw new Error(ERR_NOT_FOUND);

      const now = Date.now();
      if (tokenData.expires < now) {
        await txn.delete(`token:${tokenHash}`);
        throw new Error(ERR_EXPIRED);
      }

      if (!keepToken) {
        await txn.delete(`token:${tokenHash}`);
      }
    });
  }
}

// Create a cap instance
function createCapInstance() {
  return new Cap({
    noFSState: true,
  });
}

function createChallenge(options?: any) {
  const cap = createCapInstance();
  return cap.createChallenge(options);
}

async function verifyChallengeSolution(challenge: Challenge, solutions: number[]) {
  const cap = createCapInstance();
  cap.config.state = {
    challengesList: {
      [challenge.token]: {
        ...challenge,
        expires: challenge.expires,
      },
    },
    tokensList: {},
  };

  return await cap.redeemChallenge({
    token: challenge.token,
    solutions,
  });
}

// Environment bindings
interface Env {
  CAP_STORAGE: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Get storage instance (single instance)
    const storageId = env.CAP_STORAGE.idFromName("cap-storage");
    const storageStub = env.CAP_STORAGE.get(storageId) as unknown as CapStorageDurableObject;

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Route: POST /api/challenge
    if (request.method === "POST" && url.pathname === CHALLENGE_PATH) {
      // Create challenge directly in Worker
      const challenge = createChallenge();
      
      // Store challenge in storage instance (check if token exists)
      if (challenge.token) {
        await storageStub.storeChallenge(challenge.token, challenge as Challenge);
      }
      
      return new Response(JSON.stringify(challenge), {
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // Route: POST /api/redeem
    if (request.method === "POST" && url.pathname === REDEEM_PATH) {
      let body: { token?: string; solutions?: number[] };
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ success: false, error: "Invalid request body" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      }

      const { token, solutions } = body ?? {};
      if (!token || !solutions || !Array.isArray(solutions)) {
        return new Response(JSON.stringify({ success: false, error: "Missing token or solutions" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      }

      // Get challenge from storage
      const challenge = await storageStub.getChallenge(token);
      if (!challenge) {
        return new Response(JSON.stringify({ success: false, error: "Challenge not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      }

      // Verify directly in Worker
      const result = await verifyChallengeSolution(challenge, solutions);

      if (result.success && result.token && result.expires) {
        // Use transaction to ensure atomicity
        const tokenHash = await hashToken(result.token);

        try {
          await storageStub.finalizeRedeem(token, tokenHash, {
            expires: result.expires,
          });
        } catch (err: unknown) {
          if (err instanceof Error) {
            const msg = err.message;
            if (msg === ERR_EXPIRED) {
              return new Response(
                JSON.stringify({ success: false, error: "Challenge expired" }),
                { status: 410, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
              );
            }
          }
          // Any other error, including ERR_NOT_FOUND, implies a concurrent request
          // already redeemed the challenge, since we check for existence beforehand.
          return new Response(
            JSON.stringify({ success: false, error: "Challenge already redeemed" }),
            { status: 409, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
          );
        }
      }

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // Route: POST /api/validate
    if (request.method === "POST" && url.pathname === VALIDATE_PATH) {
      let body: { token?: string, keepToken?: boolean };
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ success: false, error: "Invalid request body" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      }

      const { token, keepToken } = body ?? {};
      if (!token) {
        return new Response(JSON.stringify({ success: false, error: "Missing token" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      }

      // Hash token & atomic validation in DO
      const tokenHash = await hashToken(token);

      try {
        await storageStub.validateAndConsumeToken(tokenHash, keepToken);
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      } catch (err: unknown) {
        if (err instanceof Error) {
          const msg = err.message;
          if (msg === ERR_NOT_FOUND) {
            return new Response(JSON.stringify({ success: false, error: "Token not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json", ...CORS_HEADERS },
            });
          }
          if (msg === ERR_EXPIRED) {
            return new Response(JSON.stringify({ success: false, error: "Token expired" }), {
              status: 410,
              headers: { "Content-Type": "application/json", ...CORS_HEADERS },
            });
          }
        }

        return new Response(
          JSON.stringify({ success: false, error: "Token already consumed" }),
          { status: 409, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
        );
      }
    }

    return new Response("Not Found", {
      status: 404,
      headers: CORS_HEADERS,
    });
  },
} satisfies ExportedHandler<Env>;
