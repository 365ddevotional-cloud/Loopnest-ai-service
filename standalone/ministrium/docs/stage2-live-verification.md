# Stage 2 live verification — 2026-10-29

The owner explicitly approved the immediate usage cost of a new Ministrium app, dedicated PostgreSQL database and persistent volume. This supersedes the earlier no-activation hold for these three resources. The owner applied the prepared Railway changes in the dashboard after ChatGPT deployment approvals repeatedly failed.

## Live environment

- URL: https://ministrium-production.up.railway.app/
- Railway project: welcoming-harmony, `1c363e1e-47ae-46a5-8d47-808d3fc413f9`.
- Production environment: `fb9313bf-5f27-4c7f-b49b-a3262bae43a1`.
- App: `b9b8e527-d777-410f-bbcf-0c13275f4c16`.
- PostgreSQL: `8f6f7caa-e137-4344-8e36-77547a08c859`.
- Volume: `1072e921-dcdd-45e6-b15f-b4594545b491`, 512 MB.
- Firebase: dedicated `ministrium-425f9` project, Email/Password enabled.
- Both SQL migrations applied; server entered workspace mode. No original church tables or devotional database were migrated.
- App and database limits: 0.5 vCPU and 500 MB each. App sleep is enabled. Limits constrain resources, not a guaranteed monthly bill.
- Existing devotional deployment `fd83ae17-5f51-40cd-8144-cd081269ffd7` remains unchanged and successful.

## Live account and privacy checks

Two clearly named synthetic test accounts use aliases of the owner's connected ministry mailbox. Actual Firebase registration, delivered verification emails, application of the received verification codes, and fresh password sign-in were verified through the real Firebase API. Tokens were validated by the deployed application; no test bypass or emulator was enabled.

Verified:

- Unverified account denied by the live workspace API.
- Both received-email verifications succeed; newly issued tokens carry verified email identity.
- Family workspace and separate ministry can be created in the dedicated database.
- An account cannot open another workspace without membership.
- Invitation is bound to the invited email; wrong account and replay are denied.
- Invite acceptance grants membership, not leadership. Members cannot list leader invitations.
- Leaders can revoke invitations.
- Members can post conversations and prayer requests; leaders can mark requests answered.
- A member cannot schedule a leader-only gathering.
- Stored membership and conversation entries survive fresh sign-in.

The backend checks use real HTTP/Firebase APIs. They do not constitute a manual browser walkthrough of every signed-in screen. Browser checks separately cover public pages and the account form. Invitation expiry remains covered by embedded PostgreSQL tests; it was not forced against live data.

## Browser issue corrected

The extracted Firebase import still used an older environment-only snapshot even though the canonical client configuration was registered. The extracted module now re-exports `client/firebase.ts`; the extraction script preserves this single source of configuration. Strict TypeScript, production build and all 24 tests pass after the fix.

## Not enabled

Payments, payouts, uploads, paid calling, automatic invitation emails, Google OAuth and the remaining inherited church tools remain disabled or pending their milestones. No new subscription or custom domain was purchased. Synthetic test workspaces remain clearly labeled; test credentials and verification codes are excluded from the repository.

## Completion record

Stage 2 account activation checks passed. Corrected app commit: `6c70c7c8c96055b22c3bdfb0af50c44d9e126342`. Deployment `c33d81af-5314-456c-bbc1-8c0ed45a5250` reached SUCCESS. Browser verified enabled sign-in and registration forms after readiness loaded; `stage2-live-account.jpg` captures the real registration screen. Both test accounts retained their saved memberships after this deployment and fresh sign-in. No production identity verification was bypassed.
