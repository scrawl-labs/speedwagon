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

  it("should parse env names with underscores", () => {
    const result = parseConfig({
      MONGODB_OP_ORDERS_URI: "mongodb://localhost:27017/op",
      MONGODB_OP_ORDERS_DATABASE: "orders",
      MONGODB_DEV_ORDERS_URI: "mongodb://localhost:27017/dev",
      MONGODB_DEV_ORDERS_DATABASE: "orders_dev",
    });

    expect([...result.environments.keys()]).toContain("op_orders");
    expect([...result.environments.keys()]).toContain("dev_orders");
    expect(result.environments.get("op_orders")?.database).toBe("orders");
    expect(result.environments.get("dev_orders")?.database).toBe("orders_dev");
  });

  it("should only allow readwrite for known safe prefixes (dev, beta, staging, local, test)", () => {
    const result = parseConfig({
      MONGODB_DEV_BILLING_URI: "mongodb://localhost:27017/dev",
      MONGODB_DEV_BILLING_DATABASE: "billing_dev",
      MONGODB_BETA_BILLING_URI: "mongodb://localhost:27017/beta",
      MONGODB_BETA_BILLING_DATABASE: "billing_beta",
      MONGODB_STAGING_USERS_URI: "mongodb://localhost:27017/staging",
      MONGODB_STAGING_USERS_DATABASE: "users_staging",
      MONGODB_LOCAL_ORDERS_URI: "mongodb://localhost:27017/local",
      MONGODB_LOCAL_ORDERS_DATABASE: "orders_local",
      MONGODB_TEST_ANALYTICS_URI: "mongodb://localhost:27017/test",
      MONGODB_TEST_ANALYTICS_DATABASE: "analytics_test",
    });

    expect(result.environments.get("dev_billing")?.mode).toBe("readwrite");
    expect(result.environments.get("beta_billing")?.mode).toBe("readwrite");
    expect(result.environments.get("staging_users")?.mode).toBe("readwrite");
    expect(result.environments.get("local_orders")?.mode).toBe("readwrite");
    expect(result.environments.get("test_analytics")?.mode).toBe("readwrite");
  });

  it("should default to readonly for unrecognized prefixes", () => {
    const result = parseConfig({
      MONGODB_OP_BILLING_URI: "mongodb://localhost:27017/op",
      MONGODB_OP_BILLING_DATABASE: "billing",
      MONGODB_PROD_USERS_URI: "mongodb://localhost:27017/prod",
      MONGODB_PROD_USERS_DATABASE: "users",
      MONGODB_ANALYTICS_URI: "mongodb://localhost:27017/analytics",
      MONGODB_ANALYTICS_DATABASE: "analytics",
      MONGODB_PAYMENTS_URI: "mongodb://localhost:27017/payments",
      MONGODB_PAYMENTS_DATABASE: "payments",
    });

    expect(result.environments.get("op_billing")?.mode).toBe("readonly");
    expect(result.environments.get("prod_users")?.mode).toBe("readonly");
    expect(result.environments.get("analytics")?.mode).toBe("readonly");
    expect(result.environments.get("payments")?.mode).toBe("readonly");
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
