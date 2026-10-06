#!/usr/bin/env python3
from __future__ import annotations

import base64
import hashlib
import json
import os
import pathlib
import urllib.parse
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
    encoded_path = urllib.parse.quote(path, safe="/")
    url = (
        f"https://api.github.com/repos/{AUTHORITY_REPO}/contents/{encoded_path}"
        f"?ref={AUTHORITY_SHA}"
    )
    headers = {
        "User-Agent": "AIG-Studio-release-builder",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if payload.get("type") != "file" or payload.get("encoding") != "base64":
        raise SystemExit(f"SHARED_HOME_FAIL|API_PAYLOAD|{path}|type={payload.get('type')}|encoding={payload.get('encoding')}")
    content = payload.get("content", "").replace("\n", "")
    if not content:
        raise SystemExit(f"SHARED_HOME_FAIL|EMPTY_API_CONTENT|{path}")
    return base64.b64decode(content, validate=True)


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
        "GITHUB_CONTENTS_API|ANDROID_LOCAL|DESKTOP_LOCAL|OFFLINE_RUNTIME"
    )


if __name__ == "__main__":
    main()
