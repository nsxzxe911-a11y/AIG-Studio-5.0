#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
AUTHORITY_REPO = "nsxzxe911-a11y/AIG-II"
AUTHORITY_SHA = "221dd38fd4c24d9bb291f2d29ad9a54f324fc39a"
PACK = "427"
ASSETS = {
    "home_mobile.jpg": {
        "source": "app/src/main/assets/aig-generated-rgb/approved/427/home_mobile.jpg",
        "sha256": "8835cded863074b4de9b848e12eb037254119b5a7f21e135b66657f764fbd652",
        "destinations": [
            "app/src/main/assets/aig-generated-rgb/approved/427/home_mobile.jpg",
        ],
    },
    "home_desktop.jpg": {
        "source": "desktop/resources/aig-generated-rgb/approved/427/home_desktop.jpg",
        "sha256": "02185fbd1dd8026ad17bf6cb1994bcd5a03d03e46b68bb45135d911d809ff9da",
        "destinations": [
            "desktop/src/main/resources/aig-generated-rgb/approved/427/home_desktop.jpg",
        ],
    },
}


def fetch_exact(path: str) -> bytes:
    url = f"https://raw.githubusercontent.com/{AUTHORITY_REPO}/{AUTHORITY_SHA}/{path}"
    request = urllib.request.Request(url, headers={"User-Agent": "AIG-Studio-release-builder"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def main() -> None:
    for name, spec in ASSETS.items():
        data = fetch_exact(spec["source"])
        digest = hashlib.sha256(data).hexdigest()
        if digest != spec["sha256"]:
            raise SystemExit(
                f"SHARED_HOME_FAIL|{name}|expected={spec['sha256']}|actual={digest}"
            )
        for relative in spec["destinations"]:
            target = ROOT / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            written = hashlib.sha256(target.read_bytes()).hexdigest()
            if written != spec["sha256"]:
                raise SystemExit(f"SHARED_HOME_FAIL|WRITE_VERIFY|{relative}|{written}")
        print(f"SHARED_HOME_ASSET_PASS|{name}|sha256={digest}|bytes={len(data)}")

    print(
        "SHARED_HOME_427_PASS|"
        f"authority={AUTHORITY_REPO}@{AUTHORITY_SHA}|"
        "ANDROID_LOCAL|DESKTOP_LOCAL|OFFLINE_RUNTIME"
    )


if __name__ == "__main__":
    main()
