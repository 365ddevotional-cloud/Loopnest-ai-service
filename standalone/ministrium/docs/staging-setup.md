> Update: the owner activated the prepared resources on 2026-10-29. See [live verification](stage2-live-verification.md). The instructions below preserve the original setup sequence.

# Stage 2 — deployment and account activation

## Verified preparation

- Independent runtime and frontend identity settings are checked before account access opens.
- A build records its public Firebase project identity in `dist/identity.json`; workspace startup rejects a mismatch with the server project.
- Cryptographic tests exercise the actual Google token-verification library using local RSA keys. They cover valid signatures, wrong project/issuer, expiry, email verification, forged signatures, malformed tokens and certificate outages.
- Deployment configuration checks report missing variable names without printing values and reject the same database with changed credentials/query parameters.
- A multistage Dockerfile packages the app and explicit migration command, omits development dependencies from the runtime, and runs as the unprivileged `node` user.

These are offline/local checks. They do not prove successful live signup, email delivery, hosted database connectivity or a Docker build. Docker is not available in the current development container.

## Proposed Railway configuration

Use a NEW Ministrium application service and a NEW dedicated PostgreSQL database. Do not change the existing devotional service, its source, variables, domains or database.

| Setting | Ministrium application |
|---|---|
| Repository | `365ddevotional-cloud/Loopnest-ai-service` |
| Development branch | `feat/ministryharbor-standalone-20261029` (historical branch name) |
| Root directory | `/standalone/ministrium` |
| Build | Auto-detected `Dockerfile` |
| Start | Image command: `node dist/server.cjs` |
| Health check | `/api/health` |
| Migration | Explicit one-time `npm run migrate` after dedicated DB confirmation, before workspace startup |
| Replicas | One for the pilot; shared rate limiting required before multiple replicas |
| Account and payment state | Open accounts only after matching identity + schema; payments remain disabled |

The registered Ministrium public frontend configuration is built in. Set `MINISTRIUM_FIREBASE_PROJECT_ID=ministrium-425f9` and dedicated database variables at runtime. The four `VITE_MINISTRIUM_FIREBASE_*` variables in `.env.example` may override the public frontend configuration, but all four must be supplied together. Railway's Docker builds require build variables to be declared with `ARG`; the Dockerfile does this only for public Firebase client settings, never the database URL or private credentials.

Run `npm run check:staging` in a securely configured environment before deployment. This checks completeness, not connectivity. No secrets belong in GitHub, images, screenshots, logs or this document.

## Live activation sequence

1. The owner created the dedicated Firebase project `ministrium-425f9` and registered its web app. Its public SDK configuration is integrated in `config/firebase-web.mjs`; no service-account credential is required for token verification.
2. Configure email/password sign-in, authorized application hostname, verification email identity and support settings. Do not enable paid phone/SMS authentication.
3. Review the proposed Railway resources and expected usage cost with the user before activating new billable resources. No new resources have been created or activated by this milestone.
4. Configure the dedicated PostgreSQL connection, run the explicit migration, build with matching Firebase settings, and deploy the new app service.
5. Observe a successful deployment and health check. Test two synthetic accounts: signup, verification, workspace creation, invite, joining, cross-workspace denial, sign-out/sign-in persistence, and invitation expiry/revocation.
6. Mark Stage 2 complete only when hosted identity and database flows succeed. Local signed-token tests are not a substitute for live verification email tests.

## Cost control

Railway documentation currently states usage-based RAM at $10/GB-month, CPU at $20/vCPU-month, and egress at $0.05/GB. These are usage rates, not a fixed quote for this app. Storage, plan credits and existing account usage also affect the bill. No amount or paid-resource activation is approved by this document.

References checked on 2026-10-29:
- https://docs.railway.com/guides/estimate-ai-agent-costs#the-hosting-bill
- https://docs.railway.com/builds/dockerfiles#using-variables-at-build-time
