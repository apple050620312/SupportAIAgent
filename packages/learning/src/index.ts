import { createHash, randomUUID } from "node:crypto";
import { Value } from "@sinclair/typebox/value";
import { LearningFeedbackSchema, type LearningFeedback } from "@support-ai-agent/contracts";

export interface LearningProposal {
  readonly proposalId: string;
  readonly feedbackDigest: string;
  readonly feedback: LearningFeedback;
  readonly status: "pending" | "promoted" | "rejected";
}

export interface LearningReview {
  readonly reviewer: "staff" | "operator";
  readonly evalPassed: boolean;
  readonly safetyPassed: boolean;
}

/**
 * Bounded review queue for deidentified feedback. The host may discard this
 * process-local queue on restart. It never edits OpenClaw tools, permissions or
 * prompts and has no model-facing approval method.
 */
export class ReviewedLearningLoop {
  #pending = new Map<string, LearningProposal>();
  #promoted = new Set<string>();
  constructor(private readonly maxPending = 1000) {}

  submit(feedback: LearningFeedback): string {
    if (!Value.Check(LearningFeedbackSchema, feedback) || feedback.safety === "fail" && feedback.outcome === "resolved") {
      throw new Error("Invalid learning feedback");
    }
    if (this.#pending.size >= this.maxPending) throw new Error("Learning review queue full");
    const proposalId = randomUUID();
    const feedbackDigest = createHash("sha256").update(JSON.stringify(feedback)).digest("hex");
    this.#pending.set(proposalId, { proposalId, feedbackDigest, feedback: { ...feedback }, status: "pending" });
    return proposalId;
  }

  review(proposalId: string, review: LearningReview): "promoted" | "rejected" {
    const proposal = this.#pending.get(proposalId);
    if (!proposal || proposal.status !== "pending" || (review.reviewer !== "staff" && review.reviewer !== "operator")) {
      throw new Error("Learning review unavailable");
    }
    const status = review.evalPassed && review.safetyPassed ? "promoted" : "rejected";
    this.#pending.set(proposalId, { ...proposal, status });
    if (status === "promoted") this.#promoted.add(proposal.feedbackDigest);
    return status;
  }

  snapshot(): readonly LearningProposal[] {
    return [...this.#pending.values()].map((proposal) => ({ ...proposal, feedback: { ...proposal.feedback } }));
  }

  isPromoted(feedback: LearningFeedback): boolean {
    if (!Value.Check(LearningFeedbackSchema, feedback)) return false;
    const digest = createHash("sha256").update(JSON.stringify(feedback)).digest("hex");
    return this.#promoted.has(digest);
  }
}
