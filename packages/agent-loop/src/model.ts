import type { LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

/** No automatic fallback or implicit live calls. Never log provider errors/request bodies. */
export function createLiveModel(env: NodeJS.ProcessEnv = process.env): LanguageModel {
  if (env.AGENT_LIVE_MODEL !== "1") throw new Error("Live model requires AGENT_LIVE_MODEL=1");
  const apiKey = env.SUB2API_API_KEY || env.OPENAI_API_KEY;
  if (!apiKey?.trim()) throw new Error("Live model API key missing");
  return createOpenAI({ baseURL: "https://sub2api.coffeehost.net/v1", apiKey }).responses("gpt-6.1-sol");
}
