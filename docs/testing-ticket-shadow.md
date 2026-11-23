# Discord shadow mode

Shadow mode runs the Vercel agent for explicitly admitted test tickets. It uses
the T0 tools through Support Core and posts drafts only in a private review
thread under each ticket. Staff handle customer replies separately.

1. Keep the same `TICKET_STAFF_USER_IDS` in the test launcher configuration.
   Those accounts are the reviewers and their messages in the ticket channel
   trigger human takeover.
2. In Discord, enable Developer Mode and use **Copy Channel ID** on the first
   3–5 open test ticket text channels in `TEST_TICKET_GUILD_ID`. Put those
   IDs, comma separated, in `SHADOW_TICKET_CHANNEL_IDS` in the local
   `.env.ticket-support` file. The checked-in example leaves it empty. An
   empty list exits before loading the bot.
3. Use the authorized test baseline and reviewed shared documentation. Give
   the bot permission to create and send in private threads, add staff, and
   delete its draft messages. Reviewers need access to the parent channel.
   Discord lets guild owners, administrators and members with Manage Threads
   see private threads. Reserve those privileges for trusted staff in the
   test guild. The launcher rejects a ticket owner with elevated access.
4. Run `pnpm start:ticket-support` from the repository root with the reviewed
   test configuration. Keep `MODEL_PROVIDER` set to the chosen chat provider.
   To disable shadow mode, stop the launcher and clear the allowlist.

In the private review thread, use `!draft <id> accept`,
`!draft <id> edit <replacement>`, or `!draft <id> reject`. These commands
score the draft. They never send a customer message. If staff reply in the
ticket or the ticket closes before review, pending drafts are invalidated and
the bot attempts to remove their messages. After a process restart, previous
draft IDs are inactive. Staff can remove any stale review threads left in
Discord after an abrupt stop.

The append-only file `.ticket-shadow/verdicts.jsonl` contains the timestamp,
ticket channel ID, verdict and staff ID for each completed review. It excludes
draft and replacement text. Report the three verdict counts separately. The
accept rate is the sum of both accepted counts divided by the number of logged
verdicts. Pending and discarded drafts are outside that denominator.

The launcher searches the configured Markdown knowledge folder through Support
Core. It does not rebuild the stale semantic index. Account tools depend on
verified ticket context and configured read ports. In this pilot a selected
server is unavailable, and no redacted-log or invoice provider is configured.
