# AIG AI Continuity V1 — official cross-conversation handoff

Source created: 2026-10-22. Applies to AIG-II, AIG Studio 5.0 and AIG FastModel.

## Actual delivered source
- Both formal-web and web directories contain ai-resume.html and ai-resume-manifest.json.
- Homepage links to AI 斷線接續. Reading the JSON produces a copyable handoff request, not automatic chat integration.
- Public manifest has source checkpoints and unverified runtime gates; NO private CAD/NC/asset bytes, passwords or credentials.
- GitHub commits provide source history unless history is rewritten/deleted; they are not immutable independent backups.
- Original CNC core, RGB Authority, project sync and build API are not modified by this delivery.

## Evidence semantics
- source_checked=true: exact SHA was fetched from GitHub at snapshot time, NOT native tests.
- runtime_gate=NOT_VERIFIED: no new actual engine evidence in this handoff work.
- website.deployment=NOT_VERIFIED_LIVE: cannot say this branch is deployed on Render.
- FastModel authoritative path remains unverified; do not infer from chat history.
- Copying a handoff prompt or showing a version number is not manufacturing safety validation.

## New conversation / AI agent procedure
1. Read https://aig-dual-formal-runtime.onrender.com/ai-resume-manifest.json ; when not deployed use the latest GitHub branch web/aig-dual-formal-runtime-20261016 / formal-web/ai-resume-manifest.json and explicitly disclose source-only.
2. Re-read actual repository branch HEAD SHA for all projects. Compare manifest snapshot to live source; do not silently rewrite SHA.
3. Check actual prior native artifacts, core callbacks, authority visuals, failed gates and last action. Do not reset or destroy working data on a mismatch.
4. Apply additive changes only in appropriate project; do not replace core with demo visuals or mix approved desktop/mobile RGB.
5. After real work, append test evidence and artifact digests, update last checkpoint in BOTH website directory copies, and commit. Source commit is never equal to Render LIVE evidence.
6. If any source is unavailable, do not make destructive changes; mark blocked with the missing verification.

## Not implemented / future hard requirements
- Authenticated durable append-only build/update database with real workflow request_id + exact branch/SHA recovery.
- Protected branches, signing and immutable audited backup copies, plus long-retained APK/EXE mirrors with SHA-256.
- Render deployment and public URL readback verification for both handoff HTML and JSON.
- Actual native APK/EXE launches; per-button CAD/CAM/SIM/3-6AX/NC/FastModel real engine evidence.
- Private user CAD/NC data vault, strictly separate from the public web manifest.

## Threat model and limitations
- A GitHub SHA is identity of content, not identity of the human at keyboard. For account compromise examine audit logs and signing policy.
- New ChatGPT chats DO NOT automatically pull this website: user supplies handoff URL/prompt or an authorized connector retrieves it.
- Never publish secrets, proprietary projects, human photos or private CNC G-code to the public handoff.

## Status vocabulary
SOURCE_HANDOFF_V1: source files exist and are structurally consistent.
WEB_LIVE_HANDOFF: independently verified served Render revision matches commit.
TRUE_NATIVE_HANDOFF: separately verified native apps, real runtime outputs and CNC safety.
Never promote earlier status into later status without actual evidence.
