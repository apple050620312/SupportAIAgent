export interface PterodactylAdapterConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
}

export const PTERODACTYL_ADAPTER_NOT_IMPLEMENTED =
  "Pterodactyl adapter is not implemented" as const;
