import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ReviewedLearningLoop } from "@support-ai-agent/learning-loop";
import type { LearningFeedback } from "@support-ai-agent/contracts";

const feedback = (): LearningFeedback => ({ caseId: "E01", outcome: "resolved", safety: "pass", rating: 5,
  harnessVersion: "openclaw-2026.9.8", policyVersion: "support-1", correlationId: randomUUID() });

describe("reviewed support improvement loop", () => {
  it("stores only bounded deidentified feedback until a human review", () => {
    const loop = new ReviewedLearningLoop(); const item = feedback(); const proposalId = loop.submit(item);
    const snapshot = loop.snapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0]).toMatchObject({ proposalId, feedback: item, status: "pending" });
    expect(typeof snapshot[0]?.feedbackDigest).toBe("string");
    expect(loop.isPromoted(item)).toBe(false);
    expect(loop.review(proposalId, { reviewer: "staff", evalPassed: true, safetyPassed: true })).toBe("promoted");
    expect(loop.isPromoted(item)).toBe(true);
    expect(() => loop.review(proposalId, { reviewer: "operator", evalPassed: false, safetyPassed: true })).toThrow("unavailable");
  });
  it("does not promote failed safety/evaluation and rejects unsafe labels", () => {
    const loop = new ReviewedLearningLoop(); const proposalId = loop.submit(feedback());
    expect(loop.review(proposalId, { reviewer: "operator", evalPassed: false, safetyPassed: true })).toBe("rejected");
    expect(loop.isPromoted(feedback())).toBe(false);
    expect(() => loop.submit({ ...feedback(), safety: "fail", outcome: "resolved" })).toThrow();
  });
  it("does not expose customer text, identities, credentials or a self-approval path", () => {
    const loop = new ReviewedLearningLoop(); const item = feedback(); const id = loop.submit(item);
    const serialized = JSON.stringify(loop.snapshot());
    expect(serialized).not.toContain("discordUserId"); expect(serialized).not.toContain("clientid");
    expect(serialized).not.toContain("secret"); expect(() => loop.review(id, { reviewer: "model" as never, evalPassed: true, safetyPassed: true })).toThrow();
  });
  it("bounds pending proposals", () => {
    const loop = new ReviewedLearningLoop(1); loop.submit(feedback());
    expect(() => loop.submit({ ...feedback(), caseId: "E02" })).toThrow("full");
  });
});
