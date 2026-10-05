#!/usr/bin/env python3
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "shared" / "tutorial"
VERSION_FILE = PACK / "tutorial-version.properties"
INDEX_FILE = PACK / "tutorial-index.json"
DIGEST_FILE = PACK / "pack-digest.sha256"

EXPECTED_MODES = [
    "BEGINNER", "QUICK", "STEP_BY_STEP", "AI_TEACHER", "CAD", "CAM", "SIM",
    "AXIS", "NC_FANUC", "DIAGNOSTICS", "WORK_PAGES", "AI_MAINTENANCE", "BANTER"
]
REQUIRED_PAGES = {"HOME", "CAD", "CAM", "SIM", "3AX", "4AX", "5AX", "6AX", "NC", "AI", "SETTINGS"}
WORK_PAGES = {"VIEW", "PHOTO", "CORNER", "EDIT", "FILE", "TOOL", "WORK", "ALARM", "MONITOR", "SYNC"}
BANTER_LEVELS = ["OFF", "LIGHT", "NORMAL", "MAX"]
EXPRESSION_IDS = ["NEUTRAL", "SMILE", "LAUGH", "THINK", "TEACHER", "WARN", "BANTER"]
REQUIRED_ACTION_TARGETS = {
    "CAD.LINE", "CAM.MANUAL_PATH", "SIM.MATERIAL_REMOVAL", "AXIS.6AX",
    "NC.G54", "SETTINGS.UPDATE", "WORK.PHOTO_ALIGN"
}
REQUIRED_LESSON_FILES = [
    "beginner.json", "quick.json", "step-by-step.json", "ai-teacher.json", "cad.json",
    "cam.json", "sim.json", "3ax.json", "4ax.json", "5ax.json", "6ax.json",
    "nc-fanuc.json", "work-pages.json", "diagnostics.json", "maintenance.json"
]


def fail(code: str) -> None:
    print(f"TUTORIAL_PACK_V1_FAIL|{code}")
    raise SystemExit(1)


def read_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"MISSING|{path.relative_to(ROOT).as_posix()}")
    except json.JSONDecodeError as exc:
        fail(f"JSON|{path.relative_to(ROOT).as_posix()}|{exc.msg}")


def canonical_digest() -> str:
    if not PACK.is_dir():
        fail("PACK_DIR_MISSING")
    h = hashlib.sha256()
    files = sorted(
        p for p in PACK.rglob("*")
        if p.is_file() and p != DIGEST_FILE
    )
    for path in files:
        rel = path.relative_to(PACK).as_posix().encode("utf-8")
        h.update(rel)
        h.update(b"\0")
        h.update(path.read_bytes())
        h.update(b"\0")
    return h.hexdigest()


def main() -> None:
    if not VERSION_FILE.is_file():
        fail("VERSION_MISSING")
    version_text = VERSION_FILE.read_text(encoding="utf-8").strip()
    if version_text != "version=1.0.0":
        fail(f"VERSION|{version_text}")

    index = read_json(INDEX_FILE)
    if index.get("pack_version") != "1.0.0":
        fail("INDEX_VERSION")
    if index.get("modes") != EXPECTED_MODES:
        fail("MODES")
    if index.get("banter_levels") != BANTER_LEVELS:
        fail("BANTER_LEVELS")
    if index.get("expression_ids") != EXPRESSION_IDS:
        fail("EXPRESSION_IDS")
    if index.get("default_banter") != "OFF" or index.get("default_expression") != "NEUTRAL":
        fail("DEFAULTS")

    listed = index.get("lesson_files")
    if listed != REQUIRED_LESSON_FILES:
        fail("LESSON_FILE_LIST")

    lesson_ids = set()
    pages = set()
    actions = set()
    modes = set()
    for name in REQUIRED_LESSON_FILES:
        path = PACK / "lessons" / name
        lesson = read_json(path)
        for key in ("lesson_id", "mode", "page_targets", "action_targets", "title_zh_tw", "steps"):
            if key not in lesson:
                fail(f"SCHEMA|{name}|{key}")
        lesson_id = lesson["lesson_id"]
        if not isinstance(lesson_id, str) or not lesson_id or lesson_id in lesson_ids:
            fail(f"LESSON_ID|{name}")
        lesson_ids.add(lesson_id)
        mode = lesson["mode"]
        if mode not in EXPECTED_MODES:
            fail(f"MODE|{name}|{mode}")
        modes.add(mode)
        if not isinstance(lesson["page_targets"], list) or not all(isinstance(x, str) for x in lesson["page_targets"]):
            fail(f"PAGE_TARGETS|{name}")
        if not isinstance(lesson["action_targets"], list) or not all(isinstance(x, str) for x in lesson["action_targets"]):
            fail(f"ACTION_TARGETS|{name}")
        pages.update(lesson["page_targets"])
        actions.update(lesson["action_targets"])
        steps = lesson["steps"]
        if not isinstance(steps, list) or not steps:
            fail(f"STEPS|{name}")
        for idx, step in enumerate(steps):
            if not isinstance(step, dict) or not isinstance(step.get("fact"), str) or not step["fact"].strip():
                fail(f"STEP_FACT|{name}|{idx}")
            expr = step.get("expression_id", "NEUTRAL")
            if expr not in EXPRESSION_IDS:
                fail(f"STEP_EXPRESSION|{name}|{idx}|{expr}")
            target = step.get("action_target")
            if target is not None and target not in lesson["action_targets"]:
                fail(f"STEP_ACTION|{name}|{idx}|{target}")

    if set(EXPECTED_MODES) - modes:
        fail("MODE_COVERAGE|" + ",".join(sorted(set(EXPECTED_MODES) - modes)))
    if REQUIRED_PAGES - pages:
        fail("PAGE_COVERAGE|" + ",".join(sorted(REQUIRED_PAGES - pages)))
    if WORK_PAGES - pages:
        fail("WORK_PAGE_COVERAGE|" + ",".join(sorted(WORK_PAGES - pages)))
    if REQUIRED_ACTION_TARGETS - actions:
        fail("ACTION_COVERAGE|" + ",".join(sorted(REQUIRED_ACTION_TARGETS - actions)))

    assets = read_json(PACK / "assets" / "manifest.json")
    if assets.get("pack_version") != "1.0.0" or assets.get("missing_art_policy") != "AI_RGB_OPTIONAL_NON_BLOCKING":
        fail("ASSET_MANIFEST")

    digest = canonical_digest()
    if "--write-digest" in sys.argv:
        DIGEST_FILE.write_text(digest + "\n", encoding="utf-8")
    if not DIGEST_FILE.is_file():
        fail("DIGEST_MISSING")
    recorded = DIGEST_FILE.read_text(encoding="utf-8").strip()
    if recorded != digest:
        fail(f"DIGEST|RECORDED={recorded}|ACTUAL={digest}")

    print(f"TUTORIAL_PACK_V1_PASS|1.0.0|PACK_SHA256={digest}|LESSONS={len(lesson_ids)}")


if __name__ == "__main__":
    main()
