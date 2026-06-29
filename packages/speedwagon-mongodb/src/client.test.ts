import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock mongodb so no real connection is made
vi.mock("mongodb", () => {
  const collection = {
    insertOne: vi.fn(),
    find: vi.fn(),
  };
  const db = {
    collection: vi.fn(() => collection),
    dropCollection: vi.fn(),
    dropDatabase: vi.fn(),
    createCollection: vi.fn(),
    command: vi.fn(),
  };
  const client = {
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    db: vi.fn(() => db),
  };
  return {
    MongoClient: vi.fn(() => client),
  };
});

// Mock config
vi.mock("./config.js", () => ({
  getDefaultEnv: vi.fn(() => "dev"),
  getEnvConfig: vi.fn((name: string) => {
    const envs: Record<string, object> = {
      dev: { name: "dev", uri: "mongodb://localhost:27017", database: "devdb", mode: "readwrite" },
      op: { name: "op", uri: "mongodb://localhost:27017", database: "opdb", mode: "readonly" },
      ssh_env: {
        name: "ssh_env",
        uri: "mongodb://localhost:{tunnel_port}/sshdb",
        database: "sshdb",
        mode: "readwrite",
        ssh: { remoteHost: "remote.host", remotePort: 27017 },
      },
    };
    const cfg = envs[name];
    if (!cfg) throw new Error(`Unknown environment "${name}"`);
    return cfg;
  }),
}));

// Mock ssh-tunnel
vi.mock("./ssh-tunnel.js", () => ({
  ensureTunnel: vi.fn().mockResolvedValue(12345),
  shutdownTunnels: vi.fn().mockResolvedValue(undefined),
}));

describe("client - getDb", () => {
  beforeEach(async () => {
    // Reset module state between tests by re-importing after clearing cache
    vi.resetModules();
  });

  it("should return db and mode for default env (readwrite)", async () => {
    const { getDb } = await import("./client.js");
    const result = await getDb();
    expect(result).toHaveProperty("db");
    expect(result).toHaveProperty("mode");
    expect(result.mode).toBe("readwrite");
  });

  it("should return mode=readonly for op env", async () => {
    const { getDb } = await import("./client.js");
    const result = await getDb("op");
    expect(result.mode).toBe("readonly");
  });

  it("should cache client on second call for same env", async () => {
    const { MongoClient } = await import("mongodb");
    vi.clearAllMocks();
    const { getDb } = await import("./client.js");

    await getDb("dev");
    await getDb("dev");

    // MongoClient constructor should be called only once for the same env
    expect(MongoClient).toHaveBeenCalledTimes(1);
  });

  it("should apply readonly proxy for op env — block insertOne", async () => {
    const { getDb } = await import("./client.js");
    const { db } = await getDb("op");

    const col = db.collection("users");
    const insertOne = (col as unknown as Record<string, unknown>)["insertOne"] as (() => void) | undefined;
    expect(() => insertOne?.()).toThrow(
      /read-only mode/
    );
  });

  it("should apply readonly proxy for op env — block dropCollection", async () => {
    const { getDb } = await import("./client.js");
    const { db } = await getDb("op");

    const dropCollection = (db as unknown as Record<string, unknown>)["dropCollection"] as (() => void) | undefined;
    expect(() => dropCollection?.()).toThrow(
      /read-only mode/
    );
  });

  it("should NOT block reads for readonly env", async () => {
    const { getDb } = await import("./client.js");
    const { db } = await getDb("op");

    // collection() accessor should work fine (returns a proxy, not throw)
    expect(() => db.collection("test")).not.toThrow();
  });

  it("should NOT apply readonly proxy for readwrite env", async () => {
    const { getDb } = await import("./client.js");
    const { db } = await getDb("dev");

    // insertOne should be callable (it's a mock fn, not blocked)
    const col = db.collection("users") as unknown as Record<string, unknown>;
    expect(typeof col["insertOne"]).toBe("function");
    // Should not throw (the proxy is not applied)
    expect(() => (col["insertOne"] as () => void)()).not.toThrow();
  });

  it("should call ensureTunnel and replace {tunnel_port} in URI for SSH env", async () => {
    const { ensureTunnel } = await import("./ssh-tunnel.js");
    const { MongoClient } = await import("mongodb");
    const { getDb } = await import("./client.js");

    await getDb("ssh_env");

    expect(ensureTunnel).toHaveBeenCalledWith("remote.host", 27017);
    // URI passed to MongoClient should have port replaced
    expect(MongoClient).toHaveBeenCalledWith(
      "mongodb://localhost:12345/sshdb",
      expect.any(Object)
    );
  });
});

describe("client - closeAll", () => {
  it("should close all clients and call shutdownTunnels", async () => {
    const { getDb, closeAll } = await import("./client.js");
    const { shutdownTunnels } = await import("./ssh-tunnel.js");
    const { MongoClient } = await import("mongodb");

    await getDb("dev");
    await closeAll();

    // The mock client's close() should have been called
    const mockClientInstance = (MongoClient as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(mockClientInstance?.close).toHaveBeenCalled();
    expect(shutdownTunnels).toHaveBeenCalled();
  });
});
