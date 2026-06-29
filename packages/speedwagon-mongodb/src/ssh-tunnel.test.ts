import { describe, it, expect, vi, beforeEach } from "vitest";

// SSH 터널은 실제 서버 없이 유닛 테스트하기 어려우므로
// 구조 테스트 + mock 기반으로 검증
describe("ssh-tunnel", () => {
  it("should export ensureTunnel and shutdownTunnels", async () => {
    // 실제 SSH 연결 없이 모듈 구조만 검증
    const mod = await import("./ssh-tunnel.js");
    expect(typeof mod.ensureTunnel).toBe("function");
    expect(typeof mod.shutdownTunnels).toBe("function");
  });
});
