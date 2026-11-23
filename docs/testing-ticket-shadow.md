# Discord shadow mode

Shadow mode runs the Vercel agent for admitted test tickets. It uses
the T0 tools through Support Core and posts drafts only in a private review
thread under each ticket. Staff handle customer replies separately.

1. Keep the same `TICKET_STAFF_USER_IDS` in the test launcher configuration.
   Those accounts are the reviewers and their messages in the ticket channel
   trigger human takeover.
2. Auto-admission is on by default. A new ticket text channel created in
   `TEST_TICKET_GUILD_ID` while the launcher is listening is eligible. On a
   non-bot message, the bot checks the baseline ticket record before admitting
   the channel. If the record is still being saved, a later message can retry.
   Existing channels, including reopened channels, require explicit admission
   through the allowlist.
   - Leave `SHADOW_TICKET_CHANNEL_IDS` empty to admit new tickets without copying
     IDs. Set it to a comma-separated list to restrict shadow mode to those
     channels. Listed open tickets are also admitted at startup.
   - Set `SHADOW_AUTO_ADMIT=false` in `.env.ticket-support` and restart to use
     only the explicit list. With auto-admission off and the list empty, the
     launcher exits before loading the bot.
3. Use the authorized test baseline and reviewed shared documentation. Give
   the bot permission to create and send in private threads, add staff, and
   delete its draft messages. Reviewers need access to the parent channel.
   Discord lets guild owners, administrators and members with Manage Threads
   see private threads. Reserve those privileges for trusted staff in the
   test guild. The launcher rejects a ticket owner with elevated access.
4. Run `pnpm start:ticket-support` from the repository root with the reviewed
   test configuration. Keep `MODEL_PROVIDER` set to the chosen chat provider.
   To stop drafting immediately, stop the launcher.

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
