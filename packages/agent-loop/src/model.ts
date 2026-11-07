import type { LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

/** No automatic fallback or implicit live calls. Never log provider errors/request bodies. */
export function createLiveModel(env: NodeJS.ProcessEnv = process.env): LanguageModel {
  if (env.AGENT_LIVE_MODEL !== "1") throw new Error("Live model requires AGENT_LIVE_MODEL=1");
  const provider = (env.MODEL_PROVIDER ?? "sub2api").toLowerCase();
  const config = provider === "openai"
    ? { baseURL: "https://api.openai.com/v1", apiKey: env.OPENAI_API_KEY }
    : provider === "sub2api"
      ? { baseURL: "https://sub2api.coffeehost.net/v1", apiKey: env.SUB2API_API_KEY }
      : undefined;
  if (!config) throw new Error("MODEL_PROVIDER must be sub2api or openai");
  const apiKey = config.apiKey;
  if (!apiKey?.trim()) throw new Error("Live model API key missing");
  return createOpenAI({ baseURL: config.baseURL, apiKey }).responses(env.AGENT_LIVE_MODEL_ID || "gpt-6.1-sol");
}
