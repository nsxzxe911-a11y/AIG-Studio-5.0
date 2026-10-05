# AIG Tutorial Pack V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one offline-first Tutorial Pack V1 shared by AIG-II and AIG Studio, with AI navigation, current-page help, Banter Mode, presentation-only AI expressions/emoji, and a 30-second AI maintenance index.

**Architecture:** The tutorial content is a deterministic data pack mirrored into both repositories. Each product owns only thin Android/Windows adapters that map shared semantic targets to existing callbacks. Banter and mascot expressions are presentation transforms around an immutable factual payload; they never alter CAD/CAM/SIM/NC data, values, G/M code, action targets, or machine state.

**Tech Stack:** Kotlin/JVM 17, Android Kotlin, Swing desktop Kotlin, JSON assets, Python 3 focused verification, SHA-256.

**Spec:** `docs/superpowers/specs/2026-10-05-aig-tutorial-pack-v1-design.md`

## Global Constraints

- Tutorial Pack version begins at `1.0.0`; it is independent from application version.
- Current application version floors remain AIG-II `416.0.0` and Studio `362.0.0`; never downgrade either project.
- AIG-II and Studio must package byte-equivalent logical tutorial content and report the same canonical pack digest.
- Offline tutorial load must work without network access.
- No tutorial code may duplicate or replace CAD/CAM/SIM/NC implementations; adapters invoke existing callbacks only after explicit user action.
- Full-open Runtime policy remains unchanged: tutorial/diagnostic warnings do not trigger rollback or automatic regression.
- Banter levels are exactly `OFF`, `LIGHT`, `NORMAL`, `MAX`; default is `OFF`.
- AI expression IDs are exactly `NEUTRAL`, `SMILE`, `LAUGH`, `THINK`, `TEACHER`, `WARN`, `BANTER`; default is `NEUTRAL`.
- Emoji/mascot expressions are decoration only; accessibility text must contain the complete factual message without depending on emoji.
- Missing tutorial art may be supplied by the existing AI RGB asset pipeline and must not block text/data tutorial use.
- Do not begin maintenance by scanning complete multi-thousand-line `MainActivity` / `DesktopApp`; read `AGENTS.md` and the quick-maintenance index first.

## Review Focus

- Corrupt or partial tutorial JSON must fail the tutorial-pack verifier without crashing the product Runtime.
- An unknown `lesson_id`, `page_target`, or `action_target` must degrade to a clear unavailable-help state and never invoke a wrong callback.
- Banter `MAX` and emoji/expression changes must preserve factual text, numeric/G-code tokens, lesson ID, and action target.
- Offline startup must load the bundled tutorial pack without attempting a network dependency.
- AIG-II and Studio pack drift must be reported as tutorial-pack mismatch only; it must not activate product rollback/regression.

---

### Task 1: Shared Tutorial Pack Schema, Lessons, and Digest

**Files (mirror identically in both repositories):**
- Create: `shared/tutorial/tutorial-version.properties`
- Create: `shared/tutorial/tutorial-index.json`
- Create: `shared/tutorial/lessons/beginner.json`
- Create: `shared/tutorial/lessons/quick.json`
- Create: `shared/tutorial/lessons/step-by-step.json`
- Create: `shared/tutorial/lessons/ai-teacher.json`
- Create: `shared/tutorial/lessons/cad.json`
- Create: `shared/tutorial/lessons/cam.json`
- Create: `shared/tutorial/lessons/sim.json`
- Create: `shared/tutorial/lessons/3ax.json`
- Create: `shared/tutorial/lessons/4ax.json`
- Create: `shared/tutorial/lessons/5ax.json`
- Create: `shared/tutorial/lessons/6ax.json`
- Create: `shared/tutorial/lessons/nc-fanuc.json`
- Create: `shared/tutorial/lessons/work-pages.json`
- Create: `shared/tutorial/lessons/diagnostics.json`
- Create: `shared/tutorial/lessons/maintenance.json`
- Create: `shared/tutorial/assets/manifest.json`
- Create: `shared/tutorial/pack-digest.sha256`
- Create: `ci/verify_tutorial_pack_v1.py`

**Interfaces:**
- Consumes: existing Runtime page names and semantic actions from the approved spec.
- Produces: `tutorial-index.json` records with `lesson_id`, `mode`, `page_targets`, `action_targets`, `title_zh_tw`, `steps`, optional `expression_id`; canonical SHA-256 digest printed by `ci/verify_tutorial_pack_v1.py`.

- [ ] **Step 1: Write the failing pack verifier**

Add assertions in `ci/verify_tutorial_pack_v1.py` for version `1.0.0`, all 13 tutorial modes, required page targets `HOME/CAD/CAM/SIM/3AX/4AX/5AX/6AX/NC/AI/SETTINGS`, work-page targets `VIEW/PHOTO/CORNER/EDIT/FILE/TOOL/WORK/ALARM/MONITOR/SYNC`, allowed Banter levels, allowed expression IDs, and canonical digest generation over sorted UTF-8 pack files excluding `pack-digest.sha256` itself.

- [ ] **Step 2: Run the verifier and confirm RED**

Run: `python ci/verify_tutorial_pack_v1.py`

Expected: `TUTORIAL_PACK_V1_FAIL|...` because shared pack files are not yet complete.

- [ ] **Step 3: Add the minimal shared pack data**

Populate the files above with stable semantic targets including at minimum `CAD.LINE`, `CAM.MANUAL_PATH`, `SIM.MATERIAL_REMOVAL`, `AXIS.6AX`, `NC.G54`, `SETTINGS.UPDATE`, and `WORK.PHOTO_ALIGN`. Keep lesson actions declarative; do not encode platform class names in JSON.

- [ ] **Step 4: Generate and write the canonical digest**

Run the verifier in write/update mode or a one-shot helper within the verifier to produce `shared/tutorial/pack-digest.sha256`; then rerun read-only verification.

Expected: `TUTORIAL_PACK_V1_PASS|1.0.0|PACK_SHA256=<sha256>`.

- [ ] **Step 5: Test corrupt/partial input behavior**

Use a temporary copy of one lesson with invalid JSON and another with an unknown required field value.

Expected: verifier fails with a tutorial-specific error; no product Runtime files are modified.

- [ ] **Step 6: Commit each repository**

Commit message: `Tutorial V1: add shared offline lesson pack`

---

### Task 2: Immutable Fact, Banter, and AI Expression Contract

**Studio Files:**
- Create: `core/src/main/kotlin/com/aigstudio/core/tutorial/TutorialPresentation.kt`
- Create: `core/src/test/kotlin/com/aigstudio/core/TutorialPresentationRegression.kt`

**AIG-II Files:**
- Create: `shared/aigii/tutorial/TutorialPresentation.kt`
- Create: `tests/aigii/TutorialPresentationRegression.kt`

**Interfaces:**
- Produces: `enum class BanterLevel { OFF, LIGHT, NORMAL, MAX }`; `enum class AiExpression { NEUTRAL, SMILE, LAUGH, THINK, TEACHER, WARN, BANTER }`; `data class TutorialFact(val lessonId:String, val factualText:String, val actionTarget:String?)`; `data class TutorialPresentation(val fact:TutorialFact, val secondaryText:String?, val expression:AiExpression, val emoji:String?)`; `fun presentTutorialFact(fact:TutorialFact, banter:BanterLevel, expression:AiExpression):TutorialPresentation`.

- [ ] **Step 1: Write the failing pure regression tests**

Assert that all four Banter levels return the identical `TutorialFact`; `MAX` can only add `secondaryText`; changing every `AiExpression` preserves `lessonId`, `factualText`, and `actionTarget`; factual samples containing `X125.432`, `F1200`, `T012`, `G54`, and `G41` remain unchanged.

- [ ] **Step 2: Run focused tests and confirm RED**

Studio expected failure: missing tutorial presentation types.

AIG-II expected failure: missing tutorial presentation types.

- [ ] **Step 3: Implement the minimal pure presentation layer**

Banter text lives only in `secondaryText`. Map expressions to optional emoji separately (`SMILE→🙂`, `LAUGH/BANTER→🤣`, `THINK→🤔`, `WARN→⚠️`); `NEUTRAL` may render no emoji. Do not concatenate emoji into `fact.factualText`.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Expected: both regressions pass with fact/action immutability assertions.

- [ ] **Step 5: Commit each repository**

Commit message: `Tutorial V1: add banter and expression contract`

---

### Task 3: AI 30-Second Maintenance Index

**Files (both repositories):**
- Create: `AGENTS.md`
- Create: `docs/ai/AI_MAINTENANCE_QUICK_GUIDE.md`
- Create: `ci/verify_ai_maintenance_index.py`

**Interfaces:**
- Produces: a first-hop table `symptom → first file → symbol/search token → minimal verification`, plus breakpoint-recovery instructions.

- [ ] **Step 1: Write the failing index verifier**

Require entries for startup/HOME, AIG RGB assets, CAD, CAM, SIM, 3D/3AX/4AX/5AX/6AX, NC/Fanuc/Post, Android/Windows split, settings, RuntimeLink, sync/update, full-open regression/rollback policy, exact-bind, Tutorial Pack, and breakpoint recovery.

Require root text: `Read AGENTS.md first` and the rule prohibiting full-file scanning unless the index cannot resolve the issue.

- [ ] **Step 2: Run and confirm RED**

Run: `python ci/verify_ai_maintenance_index.py`

Expected: missing `AGENTS.md` / guide.

- [ ] **Step 3: Write `AGENTS.md`**

Keep it short enough for a 30-second read. Point to `docs/ai/AI_MAINTENANCE_QUICK_GUIDE.md`, current version files, HOME asset contracts, Tutorial Pack paths, and the minimal focused verifiers before any deep regression.

- [ ] **Step 4: Write the detailed quick guide**

Use current real repository paths and symbols. Include examples such as `showUserSettingsCenter`, `showAiSystemSuiteDialog`, RuntimeLink store/contract, HOME asset pack verification, and the exact-bind manifest. Record Android and Windows paths separately where they differ.

- [ ] **Step 5: Verify representative lookups**

The verifier must prove at least five representative symptoms resolve to a non-empty first file, search token, and command without requiring whole-file scanning.

Expected: `AI_MAINTENANCE_INDEX_PASS`.

- [ ] **Step 6: Commit each repository**

Commit message: `docs: add AIG AI fast maintenance index`

---

### Task 4: Studio Tutorial Runtime Adapters and UI Entry Points

**Files:**
- Create: `core/src/main/kotlin/com/aigstudio/core/tutorial/TutorialPack.kt`
- Create: `app/src/main/java/com/aigstudio/app/tutorial/TutorialRuntimeAdapter.kt`
- Create: `app/src/main/java/com/aigstudio/app/tutorial/TutorialDialogRenderer.kt`
- Create: `desktop/src/main/kotlin/com/aigstudio/desktop/tutorial/TutorialRuntimeAdapter.kt`
- Create: `desktop/src/main/kotlin/com/aigstudio/desktop/tutorial/TutorialDialogRenderer.kt`
- Modify: `app/src/main/java/com/aigstudio/app/MainActivity.kt` only around existing AI/tutorial/settings entry symbols such as `showAiSystemSuiteDialog()` and `showUserSettingsCenter()`.
- Modify: `desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt` only around existing AI/settings/multi-function entry symbols.
- Create: `ci/verify_tutorial_runtime_studio.py`

**Interfaces:**
- Consumes: Task 1 pack and Task 2 presentation contract.
- Produces: `fun lessonForPage(pageTarget:String):String?`; `fun openTutorial(lessonId:String)`; `fun openCurrentPageHelp(pageTarget:String)`; `fun invokeActionTarget(actionTarget:String):Boolean` where invocation routes only to existing callbacks after explicit user selection.

- [ ] **Step 1: Write failing Studio runtime-surface verifier**

Require three visible entry points: `AI 導航`, `教程中心`, `目前頁面說明`; require Banter selector with default `OFF`; require current-page mapping for all core/work pages; require offline asset load; require unknown target returns unavailable-help rather than another callback.

- [ ] **Step 2: Confirm RED**

Run: `python ci/verify_tutorial_runtime_studio.py`

Expected: missing adapter/entry points.

- [ ] **Step 3: Implement `TutorialPack` loader**

Load bundled `shared/tutorial` data into immutable lesson records; malformed pack returns a tutorial-unavailable result and does not crash Studio Runtime.

- [ ] **Step 4: Implement Android adapter and renderer**

Add only narrow calls at existing AI/settings entry symbols. Render factual text first, secondary Banter below it, mascot/emoji separately, and map user-selected action targets to existing callbacks.

- [ ] **Step 5: Implement Windows adapter and renderer**

Mirror Android semantics using Swing dialogs/panels without copying product logic.

- [ ] **Step 6: Run verifier and compile**

Run focused verifier, Studio core tutorial regression, `:app:compileDebugKotlin`, and `:desktop:compileKotlin`.

Expected: verifier PASS and both platform compiles successful.

- [ ] **Step 7: Commit**

Commit message: `Studio 362: add shared AI tutorial runtime`

---

### Task 5: AIG-II Tutorial Runtime Adapters and UI Entry Points

**Files:**
- Create: `shared/aigii/tutorial/TutorialPack.kt`
- Create: `app/src/main/java/com/aigii/app/tutorial/TutorialRuntimeAdapter.kt`
- Create: `app/src/main/java/com/aigii/app/tutorial/TutorialDialogRenderer.kt`
- Create: `desktop/aigii/tutorial/TutorialRuntimeAdapter.kt`
- Create: `desktop/aigii/tutorial/TutorialDialogRenderer.kt`
- Modify: `app/src/main/java/com/aigii/app/MainActivity.kt` only around `showAiSystemSuiteDialog()`, `showUserSettingsCenter()`, and existing grouped multi-function/help entry symbols.
- Modify: `desktop/aigii/DesktopApp.kt` only around existing AI/settings/multi-function entry symbols.
- Create: `ci/verify_tutorial_runtime_aigii.py`

**Interfaces:**
- Consumes: the same Task 1 logical pack and Task 2 semantic presentation contract.
- Produces the same adapter interface names and target semantics as Task 4, in AIG-II packages.

- [ ] **Step 1: Write failing AIG-II runtime-surface verifier**

Mirror Task 4 assertions, including unknown-target handling and Banter default `OFF`.

- [ ] **Step 2: Confirm RED**

Run: `python ci/verify_tutorial_runtime_aigii.py`

Expected: missing adapter/entry points.

- [ ] **Step 3: Implement AIG-II shared pack loader and Android adapter**

Route only through existing AIG-II Runtime callbacks. Do not add tutorial-owned CNC execution paths.

- [ ] **Step 4: Implement AIG-II Windows adapter**

Mirror Android semantics and preserve the existing Windows HOME/AI/settings layout structure.

- [ ] **Step 5: Run verifier and compile**

Run AIG-II focused tutorial regression, `:app:compileDebugKotlin`, `:desktop:compileKotlin`, and the existing desktop runtime resource verifier.

Expected: verifier PASS and platform compiles successful.

- [ ] **Step 6: Commit**

Commit message: `AIG-II 416: add shared AI tutorial runtime`

---

### Task 6: Cross-Project Parity, Offline Evidence, and Final Verification

**Files:**
- Modify only if required: `integration/manifest.json` / continuity evidence to record Tutorial Pack V1 digest without changing existing exact-bind semantics.
- Create: `ci/verify_tutorial_dual_project_parity.py` in AIG-II or the joint-gate location used by the dual-project workflow.

**Interfaces:**
- Consumes: Task 1 digest output from both repositories and Task 4/5 adapter verifier outputs.
- Produces: `AIG_TUTORIAL_DUAL_PROJECT_PASS|1.0.0|PACK_SHA256=<same_sha>`.

- [ ] **Step 1: Write the failing dual-project parity check**

Given paths to both checkouts, compare `tutorial-version.properties`, canonical pack digest, lesson IDs, semantic target sets, Banter levels, and expression IDs.

- [ ] **Step 2: Run and confirm any drift is RED**

Intentionally compare against a temporary modified copy of one lesson.

Expected: `AIG_TUTORIAL_DUAL_PROJECT_FAIL|PACK_DRIFT` and no product rollback action.

- [ ] **Step 3: Restore identical pack and run GREEN**

Expected: `AIG_TUTORIAL_DUAL_PROJECT_PASS|1.0.0|PACK_SHA256=...`.

- [ ] **Step 4: Verify offline load**

Run Android/Windows tutorial entry with network unavailable or network lookup bypassed; open `目前頁面說明` from HOME, CAD, CAM, SIM, 6AX, NC, and one work page.

Expected: bundled lesson renders on all tested pages.

- [ ] **Step 5: Verify Banter and expressions are presentation-only**

For the same factual fixture containing `G54`, `T012`, `F1200`, `X125.432`, render OFF/LIGHT/NORMAL/MAX and all seven expression IDs.

Expected: `fact`, lesson ID, and action target identical across every rendering; only secondary text / expression / emoji differ.

- [ ] **Step 6: Fresh platform build verification**

Build Android APK and Windows `installDist` for Studio 362 and AIG-II 416. Compilation/package failure remains `ARTIFACT_INVALID`; Tutorial Pack policy must not hide it.

- [ ] **Step 7: Final branch review and commit evidence**

Confirm both repositories have identical Tutorial Pack digest, focused verifiers are green, and no automatic rollback/regression rule was reintroduced.

Commit message: `Tutorial V1: verify dual-project offline parity`
