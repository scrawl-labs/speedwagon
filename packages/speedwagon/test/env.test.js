import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

describe("library import does not load .env from cwd (regression)", () => {
  // ESM imports are cached per process — re-importing dist/env.js in the
  // parent process would not re-run its side effects. A fresh child process
  // is the only reliable way to observe whether the module mutates
  // process.env on first import.
  it("does not populate process.env from a .env in the process's cwd", () => {
    const tmp = mkdtempSync(join(tmpdir(), "speedwagon-env-probe-"));
    writeFileSync(join(tmp, ".env"), "SPEEDWAGON_TEST_PROBE=loaded\n");

    // Resolve the compiled lib by URL so cwd doesn't affect the import path.
    const libUrl = new URL("../dist/env.js", import.meta.url).href;

    const script = `
      const before = process.env.SPEEDWAGON_TEST_PROBE ?? null;
      await import(${JSON.stringify(libUrl)});
      const after = process.env.SPEEDWAGON_TEST_PROBE ?? null;
      process.stdout.write(JSON.stringify({ before, after }));
    `;

    const env = { ...process.env };
    delete env.SPEEDWAGON_TEST_PROBE;

    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", script],
      { cwd: tmp, env, encoding: "utf8" },
    );

    assert.equal(
      result.status,
      0,
      `child exited non-zero. stderr: ${result.stderr}`,
    );
    let parsed;
    try {
      parsed = JSON.parse(result.stdout);
    } catch {
      assert.fail(
        `child stdout was not valid JSON. stdout: ${result.stdout}\nstderr: ${result.stderr}`,
      );
    }
    assert.equal(parsed.before, null, "probe should be unset before import");
    assert.equal(
      parsed.after,
      null,
      "library import must not populate process.env from .env in cwd",
    );
  });
});
