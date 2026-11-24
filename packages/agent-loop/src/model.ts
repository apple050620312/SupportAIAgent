import { APICallError, wrapLanguageModel, type LanguageModel, type LanguageModelMiddleware } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createDraftVerifier } from "./draft-verifier.js";

const LUNA = "gpt-6-luna";
const efforts = ["max", "xhigh", "high", "medium", "low", "none"] as const;

export function resolveAnswerModel(env: NodeJS.ProcessEnv = process.env) {
  const modelId = env.MODEL_ID || env.AGENT_LIVE_MODEL_ID || LUNA;
  return { modelId, reasoningEffort: modelId === LUNA ? efforts[0] : null, serviceTier: modelId === LUNA ? "fast" : null } as const;
}

function isEffortRejection(error: unknown): boolean {
  if (!APICallError.isInstance(error) || (error.statusCode !== 400 && error.statusCode !== 422)) return false;
  const details = [error.message, error.responseBody ?? ""].join("\n");
  return /reasoning[. _-]*effort|reasoning\.effort/iu.test(details)
    && /unsupported|not supported|invalid|must be one of|supported values/iu.test(details);
}

export function lunaAnswerOptions(): LanguageModelMiddleware {
  let accepted = 0;
  return {
    specificationVersion: "v4",
    transformParams: ({ params }) => Promise.resolve({ ...params, providerOptions: {
      ...params.providerOptions, openai: { ...params.providerOptions?.openai, serviceTier: "fast", reasoningEffort: efforts[accepted]! }
    } }),
    async wrapGenerate({ model, params }) {
      for (let candidate = accepted; ; candidate++) {
        try {
          return await model.doGenerate({ ...params, providerOptions: {
            ...params.providerOptions, openai: { ...params.providerOptions?.openai, reasoningEffort: efforts[candidate]! }
          } });
        } catch (error) {
          if (!isEffortRejection(error) || candidate + 1 === efforts.length) throw error;
          accepted = candidate + 1;
        }
      }
    }
  };
}

export function createLiveModel(env: NodeJS.ProcessEnv = process.env): LanguageModel {
  const config = resolveAnswerModel(env);
  const model = liveProvider(env).responses(config.modelId);
  return config.serviceTier ? wrapLanguageModel({ model, middleware: lunaAnswerOptions() }) : model;
}

export function createLiveDraftVerifier(env: NodeJS.ProcessEnv = process.env) {
  return createDraftVerifier(liveProvider(env).responses("gpt-6.1-sol"));
}

function liveProvider(env: NodeJS.ProcessEnv) {
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
  return createOpenAI({ baseURL: config.baseURL, apiKey });
}
