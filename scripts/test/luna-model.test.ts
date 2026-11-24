import { APICallError, generateText, wrapLanguageModel } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { lunaAnswerOptions, resolveAnswerModel } from "../../packages/agent-loop/dist/model.js";
import { mockText } from "../lib/vercel-agent-demo.js";

describe("Luna answering model", () => {
  it("defaults through production model configuration and permits MODEL_ID overrides", () => {
    expect(resolveAnswerModel({})).toEqual({ modelId: "gpt-6-luna", serviceTier: "fast", reasoningEffort: "max" });
    expect(resolveAnswerModel({ MODEL_ID: "gpt-6.1-sol" })).toEqual({ modelId: "gpt-6.1-sol", serviceTier: null, reasoningEffort: null });
  });

  it("requests Fast and falls back only after an explicit effort rejection", async () => {
    const core = new MockLanguageModelV4({ doGenerate: ({ providerOptions }) => {
      if (providerOptions?.openai?.reasoningEffort === "max") return Promise.reject(new APICallError({
        url: "https://synthetic.example.invalid/responses", requestBodyValues: {}, statusCode: 400, message: "Unsupported reasoning.effort value max"
      }));
      return Promise.resolve(mockText("ok"));
    } });
    const model = wrapLanguageModel({ model: core, middleware: lunaAnswerOptions() });
    await generateText({ model, prompt: "test", providerOptions: { openai: { store: false } }, maxRetries: 0 });
    await generateText({ model, prompt: "test again", providerOptions: { openai: { store: false } }, maxRetries: 0 });
    expect(core.doGenerateCalls.map(call => call.providerOptions?.openai)).toEqual([
      { reasoningEffort: "max", serviceTier: "fast", store: false },
      { reasoningEffort: "xhigh", serviceTier: "fast", store: false },
      { reasoningEffort: "xhigh", serviceTier: "fast", store: false },
    ]);
  });
});
