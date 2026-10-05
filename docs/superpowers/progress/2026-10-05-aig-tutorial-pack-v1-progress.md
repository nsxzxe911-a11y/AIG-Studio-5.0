# SDD ledger — plan: docs/superpowers/plans/2026-10-05-aig-tutorial-pack-v1-implementation.md

Executor: Native / executing-plans
Branch: feature/362-ai-rgb-home
Base checkpoint: eb28304e26efceec9cc7ea0866c91f6fee02c9cf

Ruling: Local Remote Desktop device is offline, so this tracked feature-branch ledger temporarily replaces the git-ignored .superpowers workspace ledger. Delete this progress file before merge.

Pre-flight interfaces:
- Task 1 produces shared/tutorial pack + canonical digest consumed by Tasks 4, 5, 6.
- Task 2 produces Banter/AI-expression presentation contract consumed by Tasks 4 and 5.
- Task 3 produces AI maintenance index; acceptance depends on it but runtime adapters do not.
- Task 4/5 consume only shared semantic targets and existing product callbacks; tutorial code must not duplicate CAD/CAM/SIM/NC logic.

Task 1: complete. RED `TUTORIAL_PACK_V1_FAIL|VERSION_MISSING`; invalid JSON and invalid expression both RED. Canonical digest `5fa69fa49050f6e60538587b890f6e1c116173882fd8efcc9251f810050b4cc3`.
Task 1 Ruling: BANTER is a presentation mode declared in index; no fake dedicated lesson is required.
Task 1 Ruling: canonical digest normalizes JSON formatting/line endings but still changes on semantic content drift.
Task 2: complete. RED unresolved TutorialFact/BanterLevel/AiExpression; GREEN `TUTORIAL_PRESENTATION_PASS|FACT_IMMUTABLE|BANTER_4_LEVELS|EXPRESSIONS_7`.
Task 3: complete. RED `AI_MAINTENANCE_INDEX_FAIL|MISSING|AGENTS.md`; GREEN `AI_MAINTENANCE_INDEX_PASS|CATEGORIES=15|LOOKUPS=16`. Root AGENTS is a short first-hop index; detailed guide carries repo-specific paths/symbols.
Task 4: source/static GREEN. RED verifier existed before adapters; GREEN semantic surface was `STUDIO_TUTORIAL_RUNTIME_PASS|OFFLINE_PACK|3_ENTRY_POINTS|UNKNOWN_TARGET_FALSE|ANDROID|WINDOWS|BANTER_DEFAULT_OFF`. Core loader and Android/Windows adapter sources passed local Kotlin syntax compilation before device disconnect. Real Gradle Android/Windows compilation remains `PENDING_DEVICE_GRADLE` because Remote Desktop is offline.
Task 5: AIG-II source/static GREEN is tracked in the AIG-II ledger; real Gradle remains pending device.
Task 6: canonical pack digest matches AIG-II at `5fa69fa49050f6e60538587b890f6e1c116173882fd8efcc9251f810050b4cc3`. Git blob/tree SHA differences caused only by JSON formatting are explicitly non-blocking; semantic parity uses canonical JSON/digest. Drift reports STATUS_ONLY/NO_ROLLBACK.

Optional-module fail-open update:
- User policy: repair RED first; if an optional Tutorial/AI display module cannot be repaired in the current round, uninstall that module instead of blocking the main Runtime.
- `config/optional-modules.properties`: `TUTORIAL_V1=OPTIONAL_FAIL_OPEN`, `MAIN_RUNTIME_BLOCK=OFF`, `AUTO_ROLLBACK=OFF`.
- Android and Windows production entry points no longer compile-time import Tutorial installers. They install via reflection and emit `OPTIONAL_MODULE_SKIP|...|STATUS_ONLY|NO_ROLLBACK` when unavailable.
- Tutorial focused verifier now returns `SKIP|OPTIONAL_MODULE_NOT_INSTALLED|MAIN_RUNTIME_CONTINUES|NO_ROLLBACK` if optional sources are deliberately absent.
- Dual-project Tutorial parity likewise returns SKIP when the optional module is not installed; installed modules still receive full digest/semantic parity verification.
- GitHub source readback confirmed all four Studio/AIG-II production entry points have no Tutorial hard import and still delegate to the original main Runtime.
- Core HOME/CAD/CAM/SIM/NC files are explicitly not removable under this policy.

Current: waiting only for real device Gradle compile + dual-checkout parity execution + runtime visual verification. Product warning/red surfaces remain STATUS/WARNING and never trigger rollback/regression; development build/TDD failures remain visible evidence. If Tutorial build RED cannot be repaired, remove only Tutorial optional source/install inventory and compile main Runtime again.
