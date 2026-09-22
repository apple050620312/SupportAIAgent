# OpenClaw Hosting Plugin (future)

This workspace package will eventually expose narrow hosting-support tools through OpenClaw's official plugin SDK and native manifest. It is documentation-only in Task 1 and has no OpenClaw runtime dependency.

The plugin will call authenticated Support Core operations using shared TypeBox-compatible contracts. It must not connect directly to WHMCS or Pterodactyl, hold privileged provider credentials, accept arbitrary customer IDs/server UUIDs, or make authorization decisions. Support Core remains usable with a different agent harness.
