# AIG Remote Bridge Deployment Status — 2026-10-15

## Purpose

Second remote path for authorized AIG development maintenance:

`AIG mobile control page -> Render bridge -> Windows AIG Agent -> Nox / local AIG repo`

This subsystem is isolated from AIG-II product core 462/463.

## Current verified implementation

- GitHub branch: `infra/aig-remote-bridge-20261015`
- Current readiness commit: `16e1782bd5aef35ae0f1ed8ea17429015aeaa08a`
- Local regression suite: `30 passed`
- Initial whitelist only:
  - `NOX_STATUS`
  - `NOX_START`
  - `RESUME_463`
- No arbitrary shell endpoint.
- No CNC machine-output command.
- `RESUME_463` checks local commit `6cd20f36` exists and is an ancestor of HEAD before running the fixed read-only resume script.

## Rulings

### HTTP framework

Original plan named Flask. The execution environment could not install Flask while FastAPI was already available. The HTTP adapter was changed to FastAPI; endpoint contract, authentication model, queue semantics and Windows Agent contract were not changed.

### Persistent queue backend

Render rejected persistent free Key Value with:

`persistence not supported on free tier Key Value instance`

No paid resource was created. Persistent backend was changed to free Render Postgres using a SQLAlchemy store. SQL queue semantics were tested with SQLite parity tests. A real FIFO bug found during the SQL parity test was fixed by using an auto-increment `seq` ordering key instead of timestamp/id ordering.

## Render resources

- Workspace: `tea-dauad1hsrm7s73bf58kg`
- Web service: `aig-remote-bridge`
  - ID: `srv-db85140m7kps73d3fujg`
  - URL: `https://aig-remote-bridge.onrender.com`
  - region: Singapore
  - plan: free
- Persistent Postgres: `aig-remote-command-db`
  - ID: `dpg-db84uo5g1s2s7392bmdg-a`
  - region: Singapore
  - plan: free
  - PostgreSQL: 16
  - provider expiry: `2026-11-14T03:58:24.805876Z`
- Volatile staging KV: `aig-remote-command-queue-volatile`
  - ID: `red-db850jou01pc73eicofg`
  - persistence: off
  - staging only; not accepted as formal persistence evidence

## Deployment evidence

First staging deploy `dep-db85150m7kps73d3g2bg` reached LIVE and logs showed:

- `Build successful`
- `Application startup complete`
- `Uvicorn running on http://0.0.0.0:10000`
- `Your service is live`

A later GitHub update did not trigger a Render webhook event, so an explicit redeploy of branch HEAD was started as `dep-db853aqvcj2c7388dn1g`.

## Readiness semantics

`GET /health` reports separate liveness and operational readiness:

- `status: ok` means the web process is alive.
- `ready: true` requires both a configured persistent store and both authentication credentials.
- Until secure DB/auth pairing is complete, staging must report `ready: false`.

This prevents a LIVE Render process from being mislabeled as an operational remote-control path.

## Secure pairing still pending

The Render connector does not expose the Postgres password/connection string and OpenAI safety correctly blocked an attempt to inject newly generated high-entropy credentials directly through the external-service creation call.

Therefore:

- no credential is committed to Git;
- no predictable/default token is used;
- protected command APIs must remain unusable until secure pairing is completed;
- Windows Agent first install is still pending.

Do not bypass this gate by weakening authentication.

## Bootstrap artifact

Generated conversation artifact:

- `AIG-II-REMOTE-AGENT-BOOTSTRAP-20261015.zip`
- SHA-256: `7e902a06fb3f3f467f13b017b78787cee750053baeb0df95f75e99a2fcf67505`

The package intentionally contains no authentication token.

Drive `AIG_TRANSFER` upload is pending because the Drive connector accepts only connector file references and the generated ZIP currently has only a conversation sandbox path. Do not invent a Drive file URI.

## First Windows pairing gate

When any authorized Windows execution path is available:

1. Securely bind Render DB/auth configuration.
2. Install the Agent under `%ProgramData%\AIG-II\RemoteAgent`.
3. Verify Scheduled Task `AIG-II Remote Agent` is running as SYSTEM.
4. Verify `NOX_STATUS` against `127.0.0.1:62026`.
5. Verify `NOX_START` bounded behavior.
6. Verify `RESUME_463` accepts only a HEAD descended from product commit `6cd20f36`.
7. Only after these checks may the bridge be called operational.
