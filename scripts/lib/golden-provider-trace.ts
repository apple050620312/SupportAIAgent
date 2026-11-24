import { APICallError } from 'ai';

export const observedTier = (value: unknown) => typeof value === 'string' && ['fast', 'priority', 'default', 'auto', 'flex', 'ultrafast', 'scale'].includes(value) ? value : null;
export const observedEffort = (value: unknown) => typeof value === 'string' && ['max', 'xhigh', 'high', 'medium', 'low', 'none', 'minimal'].includes(value) ? value : null;
export const requestId = (value: string | undefined) => value && /^[a-z0-9_-]{8,128}$/iu.test(value) ? value : null;
export const observedModel = (value: unknown) => typeof value === 'string' && /^gpt-[a-z0-9._-]{1,80}$/iu.test(value) ? value : null;

const errorField = (value: unknown, scrub: (text: string) => string) => {
  const cleaned = typeof value === 'string' ? scrub(value) : '';
  return /^[a-z0-9_.-]{1,80}$/iu.test(cleaned) ? cleaned : null;
};

export function providerFailure(error: unknown, stage: 'draft' | 'review', scrub: (text: string) => string) {
  const api = APICallError.isInstance(error) ? error : undefined;
  const message = error instanceof Error ? error.message : '';
  const storeContinuation = /store.{0,30}false|previous.{0,30}response|rs_[a-z0-9]+.{0,30}not found/iu.test(message);
  const knownNames = ['AI_APICallError', 'AbortError', 'TimeoutError', 'AI_NoOutputGeneratedError'];
  const name = error instanceof Error && knownNames.includes(error.name) ? error.name : 'OtherModelError';
  const data = api?.data as { error?: { code?: unknown; param?: unknown; model?: unknown } } | undefined;
  const cause = api?.cause as { code?: unknown } | undefined;
  const detail = scrub(message)
    .replace(/\bBearer +[^\s,;]+|\bsk-[a-z0-9_-]+/giu, '[REDACTED]')
    .replace(/[\r\n\t]+/gu, ' ')
    .slice(0, 400) || null;
  return {
    stage, name: storeContinuation ? 'StoreContinuationError' : name, status: api?.statusCode ?? null,
    providerCode: errorField(data?.error?.code, scrub), parameter: errorField(data?.error?.param, scrub),
    causeCode: errorField(cause?.code, scrub), detail,
    responseModel: observedModel(data?.error?.model ?? detail?.match(/\b(gpt-[a-z0-9._-]+)\b/iu)?.[1]),
    responseRequestId: requestId(api?.responseHeaders?.['x-request-id']),
    retryable: api?.isRetryable === true || storeContinuation || name === 'TimeoutError' || name === 'AbortError',
  };
}

export type ModelFailure = ReturnType<typeof providerFailure>;
