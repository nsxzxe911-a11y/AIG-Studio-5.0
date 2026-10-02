#!/usr/bin/env python3
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
xml_path=ROOT/"continuity/cache-update-standard.xml"
root=ET.fromstring(xml_path.read_text(encoding="utf-8"))
version=(ROOT/"release-version.properties").read_text(encoding="utf-8").strip().split("=",1)[1]
required=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI","UIUX","ANDROID_BUILD","WINDOWS_BUILD","WEB"]

assert root.tag=="aigCacheUpdateStandard"
assert root.attrib["schema"]=="aig-cache-update-xml-v1"
assert root.attrib["version"]==version
authority=root.find("authority")
assert authority is not None and authority.attrib["primary"]=="XML_CONTENT_AND_DIGEST"
decision=root.find("decision")
fields={e.attrib["name"]:e.attrib for e in decision.findall("requiredField")}
for name in ("revision","contentDigest","sourceExactSha","xmlStructuralIdentity"):
    assert name in fields, name
assert fields["contentDigest"].get("algorithm")=="SHA-256"
for opt in decision.findall("optionalField"):
    if opt.attrib.get("name") in ("observedTimestamp","fileMtime"):
        assert opt.attrib.get("decisionAuthority")=="false"
forbidden={e.attrib["id"] for e in root.find("forbidden").findall("criterion")}
assert {"MTIME_ONLY","LAST_MODIFIED_ONLY","PROCESSING_TIME_ONLY","TIMESTAMP_ONLY","FILE_DATE_ONLY"} <= forbidden
deps={e.attrib["id"]:e.attrib for e in root.find("departments").findall("department")}
for d in required:
    assert d in deps
    assert deps[d]["mode"]=="XML_CACHE_STANDARD"
    assert deps[d]["mtimeAuthority"]=="false"
    assert deps[d]["digestRequired"]=="true"
    assert deps[d]["revisionRequired"]=="true"
    assert deps[d]["sourceExactShaRequired"]=="true"
rules=[e.text for e in root.find("conflictRule").findall("rule")]
assert "NEVER_OVERWRITE_NEWER_REVISION_WITH_OLDER_REVISION" in rules
assert "SAME_REVISION_DIFFERENT_DIGEST_IS_CONFLICT" in rules
print("XML_CACHE_UPDATE_STANDARD_PASS|ALL_DEPARTMENTS|REVISION|SHA256_CONTENT_DIGEST|SOURCE_EXACT_SHA|XML_STRUCTURE|MTIME_NOT_AUTHORITY")
