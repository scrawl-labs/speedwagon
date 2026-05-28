import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";

import { requiredEnv, optionalEnv } from "../dist/env.js";

const TEST_VAR = "SPEEDWAGON__TEST_VAR__";

describe("requiredEnv", () => {
  afterEach(() => {
    delete process.env[TEST_VAR];
  });

  it("returns the value when set", () => {
    process.env[TEST_VAR] = "hello";
    assert.equal(requiredEnv(TEST_VAR), "hello");
  });

  it("throws with the expected message when not set", () => {
    delete process.env[TEST_VAR];
    assert.throws(
      () => requiredEnv(TEST_VAR),
      new RegExp(`${TEST_VAR} environment variable is not set\\.`),
    );
  });
});

describe("optionalEnv", () => {
  afterEach(() => {
    delete process.env[TEST_VAR];
  });

  it("returns the value when set", () => {
    process.env[TEST_VAR] = "v";
    assert.equal(optionalEnv(TEST_VAR), "v");
  });

  it("returns the fallback when not set", () => {
    delete process.env[TEST_VAR];
    assert.equal(optionalEnv(TEST_VAR, "fb"), "fb");
  });

  it("returns undefined when not set and no fallback", () => {
    delete process.env[TEST_VAR];
    assert.equal(optionalEnv(TEST_VAR), undefined);
  });
});
