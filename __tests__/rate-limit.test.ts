import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimitAsync, RateLimitError, resetRateLimit } from "@/lib/rate-limit";

// Mock upstash/redis to test the fallback in-memory logic
vi.mock("@/lib/redis", () => ({
  redis: null,
}));

describe("Rate Limiter (In-Memory Fallback)", () => {
  beforeEach(() => {
    // Reset before each test
    resetRateLimit("auth:test-ip-1");
    resetRateLimit("api:test-ip-2");
  });

  it("should allow requests under the limit", async () => {
    const res1 = await checkRateLimitAsync("test-ip-1", "auth");
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(4);

    const res2 = await checkRateLimitAsync("test-ip-1", "auth");
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(3);
  });

  it("should block requests over the limit", async () => {
    // The "auth" limit is 5 requests per minute
    for (let i = 0; i < 5; i++) {
      await checkRateLimitAsync("test-ip-2", "auth");
    }

    // The 6th request should fail
    await expect(checkRateLimitAsync("test-ip-2", "auth")).rejects.toThrow(RateLimitError);
  });

  it("should keep limits separate per identifier and config", async () => {
    // Max out auth for test-ip-1
    for (let i = 0; i < 5; i++) {
      await checkRateLimitAsync("test-ip-1", "auth");
    }

    // Should fail for auth test-ip-1
    await expect(checkRateLimitAsync("test-ip-1", "auth")).rejects.toThrow(RateLimitError);

    // But should succeed for api test-ip-1
    const resApi = await checkRateLimitAsync("test-ip-1", "api");
    expect(resApi.success).toBe(true);

    // And should succeed for auth test-ip-other
    const resOther = await checkRateLimitAsync("test-ip-other", "auth");
    expect(resOther.success).toBe(true);
  });
});
