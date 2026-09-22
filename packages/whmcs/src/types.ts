export interface WhmcsAdapterConfig {
  readonly baseUrl: string;
  readonly apiIdentifier: string;
  readonly apiSecret: string;
}

export const WHMCS_ADAPTER_NOT_IMPLEMENTED = "WHMCS adapter is not implemented" as const;
