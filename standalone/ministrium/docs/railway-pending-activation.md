# Railway pending activation — 2026-10-29

The owner supplied screenshots confirming Email/Password is enabled for the dedicated Ministrium Firebase project. Google sign-in and Identity Platform upgrades are not required for the current setup. Live account flows remain untested until deployment.

## Prepared, not activated

Project: `welcoming-harmony` (`1c363e1e-47ae-46a5-8d47-808d3fc413f9`). Environment: `production` (`fb9313bf-5f27-4c7f-b49b-a3262bae43a1`). This existing environment contains the devotional app, but the pending changes touch only the new Ministrium services and volume.

Pending patch: `a75a27cf-b862-47bb-93f1-532c98222cc3`. Read-back confirmed `STAGED`, non-destructive, 35 field changes, no shared variable changes or changes to the live devotional service.

| Resource | ID | Pending setup |
|---|---|---|
| Ministrium | `b9b8e527-d777-410f-bbcf-0c13275f4c16` | New app, `/standalone/ministrium`, Dockerfile, `/api/health`, application sleep enabled, retry limit 3 |
| Ministrium-Postgres | `8f6f7caa-e137-4344-8e36-77547a08c859` | New PostgreSQL 17 service, dedicated credentials and database, no public TCP proxy |
| ministrium-postgres-data | `1072e921-dcdd-45e6-b15f-b4594545b491` | New 512 MB volume in us-west2, mounted at `/var/lib/postgresql/data` |

App source is pinned to tested commit `9f17439bed0a37fdde5e55d39d6ebdcd4728cc5e`; GitHub Actions completed successfully. The dedicated database URL is supplied through a Railway service reference. Password values are not recorded here. The explicit Ministrium migration is configured as the pre-deploy command against the new database only.

## Activation on hold — no further expenses

The owner’s latest instruction supersedes earlier hosting plans: **do not activate any new paid resources.** The staged patch remains unapplied; its pinned commit does not include the newer community milestone. Continue code and local preview work only. No new billing budget is authorized.

## Work needed only if the owner later changes the expense constraint

- Reassess hosting against the owner’s expense constraint before any resource activation. No fixed monthly quote is verified.
- Re-read the pending patch immediately before applying; stop if unrelated changes appear.
- Activate the new resources and wait for database and app deployment success.
- Apply small runtime resource limits after the service instances exist. The attempt to stage resource limits was rejected with `Service Instance not found`; no resource cap is currently configured. Do not claim one or promise a billing ceiling.
- Generate the app's Railway domain and add the exact hostname in the Firebase Authentication authorized domains through the owner's console.
- Verify live signup, verification email, organization/group creation, invitations, account persistence and isolation.

Nothing has been deployed or publicly exposed by this preparation. Do not mark Stage 2 complete yet. Railway usage and storage billing begins when the new resources are activated.
