import { describe, it, expect } from "vitest";
import { parseConfig } from "./config.js";

describe("config - multi-env parsing", () => {
  it("should parse MONGODB_{ENV}_URI pattern into environments", () => {
    const result = parseConfig({
      MONGODB_OP_URI: "mongodb://localhost:27017/op",
      MONGODB_OP_DATABASE: "op-db",
      MONGODB_DEV_URI: "mongodb://localhost:27017/dev",
      MONGODB_DEV_DATABASE: "dev-db",
    });

    expect([...result.environments.keys()]).toContain("op");
    expect([...result.environments.keys()]).toContain("dev");
  });

  it("should classify 'op' as readonly", () => {
    const result = parseConfig({
      MONGODB_OP_URI: "mongodb://localhost:27017/op",
      MONGODB_OP_DATABASE: "op-db",
    });

    expect(result.environments.get("op")?.mode).toBe("readonly");
  });

  it("should classify 'dev' and 'beta' as readwrite", () => {
    const result = parseConfig({
      MONGODB_DEV_URI: "mongodb://localhost:27017/dev",
      MONGODB_DEV_DATABASE: "dev-db",
      MONGODB_BETA_URI: "mongodb://localhost:27017/beta",
      MONGODB_BETA_DATABASE: "beta-db",
    });

    expect(result.environments.get("dev")?.mode).toBe("readwrite");
    expect(result.environments.get("beta")?.mode).toBe("readwrite");
  });

  it("should detect SSH config when SSH_REMOTE_HOST is present per-env", () => {
    const result = parseConfig({
      MONGODB_OP_URI: "mongodb://localhost:{tunnel_port}/op",
      MONGODB_OP_DATABASE: "op-db",
      MONGODB_OP_SSH_REMOTE_HOST: "mongo.example.com",
      MONGODB_OP_SSH_REMOTE_PORT: "27017",
    });

    expect(result.environments.get("op")?.ssh).toEqual({
      remoteHost: "mongo.example.com",
      remotePort: 27017,
    });
  });

  it("should fall back to legacy MONGODB_URI + MONGODB_DATABASE", () => {
    const result = parseConfig({
      MONGODB_URI: "mongodb://localhost:27017/legacy",
      MONGODB_DATABASE: "legacy-db",
    });

    const cfg = result.environments.get("default");
    expect(cfg?.uri).toBe("mongodb://localhost:27017/legacy");
    expect(cfg?.mode).toBe("readwrite");
  });

  it("should return empty environments for unknown key", () => {
    const result = parseConfig({
      MONGODB_DEV_URI: "mongodb://localhost:27017/dev",
      MONGODB_DEV_DATABASE: "dev-db",
    });

    expect(result.environments.get("unknown")).toBeUndefined();
  });

  it("should default env to dev when dev env exists", () => {
    const result = parseConfig({
      MONGODB_DEV_URI: "mongodb://localhost:27017/dev",
      MONGODB_DEV_DATABASE: "dev-db",
    });

    expect(result.defaultEnv).toBe("dev");
  });

  it("should default env to 'default' for legacy fallback", () => {
    const result = parseConfig({
      MONGODB_URI: "mongodb://localhost:27017/legacy",
      MONGODB_DATABASE: "legacy-db",
    });

    expect(result.defaultEnv).toBe("default");
  });

  it("should parse SSH global config", () => {
    const result = parseConfig({
      SSH_HOST: "bastion.example.com",
      SSH_PORT: "22",
      SSH_USERNAME: "user",
      SSH_PASSWORD: "pass",
      MONGODB_OP_URI: "mongodb://localhost/op",
      MONGODB_OP_DATABASE: "op-db",
      MONGODB_OP_SSH_REMOTE_HOST: "mongo.internal",
    });

    expect(result.sshConfig).toEqual({
      host: "bastion.example.com",
      port: 22,
      username: "user",
      password: "pass",
    });
  });

  it("should return null sshConfig when SSH_HOST is absent", () => {
    const result = parseConfig({
      MONGODB_DEV_URI: "mongodb://localhost:27017/dev",
      MONGODB_DEV_DATABASE: "dev-db",
    });

    expect(result.sshConfig).toBeNull();
  });

  it("should respect MONGODB_DEFAULT_ENV override", () => {
    const result = parseConfig({
      MONGODB_DEFAULT_ENV: "op",
      MONGODB_OP_URI: "mongodb://localhost:27017/op",
      MONGODB_OP_DATABASE: "op-db",
      MONGODB_DEV_URI: "mongodb://localhost:27017/dev",
      MONGODB_DEV_DATABASE: "dev-db",
    });

    expect(result.defaultEnv).toBe("op");
  });

  it("should skip env entries missing DATABASE", () => {
    const result = parseConfig({
      MONGODB_DEV_URI: "mongodb://localhost:27017/dev",
      // MONGODB_DEV_DATABASE intentionally omitted
    });

    expect(result.environments.size).toBe(0);
  });
});
