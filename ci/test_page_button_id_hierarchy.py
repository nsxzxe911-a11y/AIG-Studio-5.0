import json
import shutil
import tempfile
from pathlib import Path

from verify_page_department_manifests import verify_page_manifests

ROOT = Path(__file__).resolve().parents[1]


def copy_ui_fixture(dst: Path):
    source = ROOT / "design" / "ui" / "pages"
    target = dst / "design" / "ui" / "pages"
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, target)


def must_reject(mutator, expected_marker: str):
    with tempfile.TemporaryDirectory() as raw:
        root = Path(raw)
        copy_ui_fixture(root)
        path = root / "design" / "ui" / "pages" / "CAD" / "button-manifest.json"
        doc = json.loads(path.read_text(encoding="utf-8"))
        mutator(doc)
        path.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
        try:
            verify_page_manifests(root)
        except AssertionError as exc:
            assert expected_marker in str(exc), f"EXPECTED_{expected_marker}_GOT:{exc}"
            return
        raise AssertionError(f"MALFORMED_BUTTON_ID_ACCEPTED:{expected_marker}")


def main():
    must_reject(
        lambda doc: doc["buttons"][0].update(buttonId="cad line"),
        "PAGE_BUTTON_ID_NOT_HIERARCHICAL",
    )
    must_reject(
        lambda doc: doc["buttons"][0].update(buttonId="CAD.DRAW.WRONG_ALIAS"),
        "PAGE_BUTTON_COMMAND_ID_MISMATCH",
    )
    print("PAGE_BUTTON_ID_HIERARCHY_REGRESSION_PASS|MALFORMED_REJECTED|ALIAS_DRIFT_REJECTED")


if __name__ == "__main__":
    main()
