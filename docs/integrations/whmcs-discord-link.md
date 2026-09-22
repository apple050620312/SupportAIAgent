# WHMCS Discord Link Integration

The existing WHMCS addon is expected to back the `CustomerIdentityResolver` port. This repository does not assume how that addon stores or exposes links.

Questions to answer before implementing the adapter:

- Does the addon expose a supported API, WHMCS hook, local table, or another integration mechanism?
- What Discord identifier format and uniqueness constraints does it use?
- Can one Discord account link to multiple WHMCS customers, and how are conflicts handled?
- How are revoked, stale, merged, or deleted links represented?
- Which authentication mechanism is supported for read-only lookup?
- What latency, rate-limit, and availability behavior should the adapter expect?
- Which fields can be logged safely, and what audit events already exist?
- Is there a versioned contract or test environment available?

Until answered, tests use an in-memory fake resolver. Any real adapter must return only the normalized `CustomerIdentity` contract and map unavailable upstream behavior to `UpstreamUnavailable` without leaking upstream responses.
