"""AIG website real builder API: GitHub-hosted Android+Windows runners.

No filesystem execution, shell command, arbitrary ref, browser-stored token,
or fake success. Fails closed until two Render environment secrets are supplied.
"""
import hmac
import json
import os
import threading
import time
import uuid
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel

PROJECTS = {
    "aigii": {
        "repo": "nsxzxe911-a11y/AIG-II",
        "branch": "repair/core-first-aigii-20261021",
        "workflow": "build-download.yml",
        "artifacts": {"AIG-II-Android-and-Source": "APK_SOURCE",
                      "AIG-II-Windows-EXE": "WINDOWS_EXE"},
    },
    "studio": {
        "repo": "nsxzxe911-a11y/AIG-Studio-5.0",
        "branch": "repair/core-first-studio-20261021",
        "workflow": "build-download.yml",
        "artifacts": {"AIG-Studio-Android-and-Source": "APK_SOURCE",
                      "AIG-Studio-Windows-EXE": "WINDOWS_EXE"},
    },
}
PUBLIC_ORIGIN = "https://aig-dual-formal-runtime.onrender.com"
API = "https://api.github.com"
app = FastAPI(title="AIG Website Real Cloud Compiler", docs_url=None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=[PUBLIC_ORIGIN],
                   allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])
LOCK = threading.Lock()
REQUESTS = {}
RUN_MATCH_WINDOW_SEC = 300
RUN_ACTIVE_LIMIT_SEC = 4 * 60 * 60
RUN_TITLE_PREFIX = 'AIG verified native build / '


class BuildRequest(BaseModel):
    project: str


def configured():
    return bool(os.getenv("AIG_BUILDER_ADMIN_TOKEN")) and bool(os.getenv("AIG_BUILDER_GITHUB_TOKEN"))


def authorize(value):
    expected = os.getenv("AIG_BUILDER_ADMIN_TOKEN", "")
    supplied = value[7:] if value and value.startswith("Bearer ") else ""
    if not expected or not supplied or not hmac.compare_digest(expected, supplied):
        raise HTTPException(401, "AIG_BUILDER_AUTH_REQUIRED")


def github(method, path, payload=None):
    token = os.getenv("AIG_BUILDER_GITHUB_TOKEN", "")
    if not token:
        raise HTTPException(503, "GITHUB_WORKFLOW_TOKEN_NOT_CONFIGURED")
    data = json.dumps(payload).encode() if payload is not None else None
    headers = {
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "aig-formal-website-real-compiler",
    }
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = Request(API + path, data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=18) as response:
            content = response.read(1024 * 1024)
            return json.loads(content) if content else None
    except HTTPError as exc:
        # Never return secret or upstream HTML to the public website.
        reason = {401: "GITHUB_TOKEN_DENIED", 403: "GITHUB_WORKFLOW_PERMISSION_OR_RATE_LIMIT",
                  404: "GITHUB_WORKFLOW_OR_BRANCH_NOT_FOUND",
                  409: "GITHUB_WORKFLOW_DISABLED"}.get(exc.code, "GITHUB_API_REQUEST_FAILED")
        raise HTTPException(502, reason + "_" + str(exc.code)) from exc
    except (URLError, TimeoutError) as exc:
        raise HTTPException(503, "GITHUB_UNREACHABLE") from exc


def projects_endpoint():
    return [
        {"id": key, "repo": info["repo"], "ref": info["branch"],
         "workflow": info["workflow"], "target": "ANDROID_APK_AND_WINDOWS_EXE",
         "releaseCertified": False}
        for key, info in PROJECTS.items()
    ]


@app.get("/health")
@app.get("/api/health")
def health():
    return {"state": "READY_TO_DISPATCH" if configured() else "BLOCKED_NOT_CONFIGURED",
            "realCompilers": "GITHUB_ACTIONS_ANDROID_LINUX_WINDOWS_2025",
            "authConfigured": bool(os.getenv("AIG_BUILDER_ADMIN_TOKEN")),
            "githubConfigured": bool(os.getenv("AIG_BUILDER_GITHUB_TOKEN")),
            "ready": configured(), "releaseCertified": False,
            "projects": projects_endpoint()}


@app.post("/api/builds", status_code=202)
def launch(request: BuildRequest, authorization: str | None = Header(default=None)):
    authorize(authorization)
    if not configured():
        raise HTTPException(503, "BUILDER_NOT_CONFIGURED")
    info = PROJECTS.get(request.project)
    if not info:
        raise HTTPException(400, "UNKNOWN_AIG_PROJECT")
    with LOCK:
        # In-memory duplicate guard; remote Actions also has ref-level concurrency.
        pending = [i for i in REQUESTS.values()
                   if i["project"] == request.project and i["state"] in
                   ("QUEUED", "RUNNING")]
        if pending:
            raise HTTPException(409, "BUILD_ALREADY_PENDING")
        repo = info["repo"]
        sha = github("GET", "/repos/" + repo + "/commits/" +
                     quote(info["branch"], safe=""))["sha"]
        if len(sha) != 40:
            raise HTTPException(502, "SOURCE_SHA_NOT_VERIFIABLE")
        # Workflow concurrency uses cancel-in-progress. NEVER dispatch a
        # duplicate project while a real GitHub run is queued or running,
        # even if this Render service restarted and lost its in-memory queue.
        recent = (github("GET", "/repos/" + repo +
                 "/actions/workflows/" + info["workflow"] + "/runs?branch=" +
                 quote(info["branch"], safe="") + "&per_page=30") or {}).get(
                     "workflow_runs", [])
        if any(run.get("status") in (
            "queued", "waiting", "pending", "requested", "in_progress")
               for run in recent):
            raise HTTPException(409, "GITHUB_BUILD_ALREADY_ACTIVE_DO_NOT_CANCEL")
        run_id = uuid.uuid4().hex[:22]
        # Save queue before dispatch, but drop record if API dispatch fails.
        record = {"id": run_id, "project": request.project, "sha": sha,
                  "branch": info["branch"], "state": "QUEUED",
                  "started": datetime.now(timezone.utc).isoformat(),
                  "runId": None, "conclusion": None}
        REQUESTS[run_id] = record
        try:
            github("POST", "/repos/" + repo + "/actions/workflows/" +
                   info["workflow"] + "/dispatches", {"ref": info["branch"],
                                                  "inputs": {"aig_request_id": run_id}})
        except Exception:
            del REQUESTS[run_id]
            raise
        if len(REQUESTS) > 64:
            stale = [key for key, value in REQUESTS.items()
                     if value["state"] not in ("QUEUED", "RUNNING")]
            for key in stale[:32]:
                del REQUESTS[key]
        return {"id": run_id, "project": request.project, "sourceSHA": sha,
                "state": "DISPATCH_ACCEPTED", "realCompilerRequested": True,
                "releaseCertified": False}


def run_status(record):
    info = PROJECTS[record["project"]]
    repo = info["repo"]
    if not record["runId"]:
        path = ("/repos/" + repo + "/actions/workflows/" + info["workflow"] +
                "/runs?branch=" + quote(info["branch"], safe="") +
                "&event=workflow_dispatch&per_page=30")
        runs = (github("GET", path) or {}).get("workflow_runs", [])
        after = datetime.fromisoformat(record["started"].replace("Z", "+00:00")).timestamp() - 4
        # Correlate by unique server-generated ID and exact immutable SHA;
        # matching only time+branch+SHA can hijack a different user's run.
        matching = [
            r for r in runs if r.get("head_sha") == record["sha"] and
            r.get("display_title") == RUN_TITLE_PREFIX + record["id"] and
            datetime.fromisoformat(r["created_at"].replace("Z", "+00:00")).timestamp() >= after
        ]
        if matching:
            matching.sort(key=lambda r: r.get("created_at", ""), reverse=True)
            record["runId"] = matching[0]["id"]
    if not record["runId"]:
        elapsed = (datetime.now(timezone.utc) - datetime.fromisoformat(
            record["started"].replace("Z", "+00:00"))).total_seconds()
        if elapsed > RUN_MATCH_WINDOW_SEC:
            record["state"] = "BLOCKED_DISPATCH_TIMEOUT"
        return {"id": record["id"], "state": record["state"] if elapsed > RUN_MATCH_WINDOW_SEC else "WAITING_FOR_GITHUB_RUN",
                "sourceSHA": record["sha"], "downloadReady": False,
                "reason": "GITHUB_RUN_CORRELATION_NOT_FOUND" if elapsed > RUN_MATCH_WINDOW_SEC else None,
                "releaseCertified": False}
    run = github("GET", "/repos/" + repo + "/actions/runs/" + str(record["runId"]))
    # Fail closed: no result from a different branch or source SHA.
    if run.get("head_sha") != record["sha"] or run.get("head_branch") != info["branch"]:
        raise HTTPException(409, "GITHUB_BUILD_SOURCE_IDENTITY_CHANGED")
    if run.get("display_title") != RUN_TITLE_PREFIX + record["id"]:
        raise HTTPException(409, "GITHUB_BUILD_REQUEST_IDENTITY_CHANGED")
    state = run.get("status")
    result = run.get("conclusion")
    run_created = run.get("created_at") or record["started"]
    run_age = (datetime.now(timezone.utc) - datetime.fromisoformat(
        run_created.replace("Z", "+00:00"))).total_seconds()
    if state != "completed" and run_age > RUN_ACTIVE_LIMIT_SEC:
        record["state"] = "BLOCKED_BUILD_STALLED"
    else:
        record["state"] = "FINISHED" if state == "completed" else "RUNNING"
    record["conclusion"] = result
    output = {"id": record["id"], "project": record["project"],
              "state": record["state"], "sourceSHA": record["sha"],
              "runId": record["runId"],
              "runUrl": run.get("html_url"), "workflowConclusion": result,
              "releaseCertified": False, "androidAndWindowsRequested": True,
              "artifacts": [], "downloadReady": False}
    if record["state"] == "BLOCKED_BUILD_STALLED":
        output["reason"] = "RUN_EXCEEDED_WATCHDOG_LIMIT_VERIFY_IN_GITHUB"
        return output
    if state == "completed" and result != "success":
        output["state"] = "BLOCKED_WORKFLOW_FAILED"
        output["reason"] = "GITHUB_ACTIONS_" + str(result or "UNKNOWN")
        return output
    if state == "completed" and result == "success":
        artifacts = (github("GET", "/repos/" + repo +
                     "/actions/runs/" + str(record["runId"]) +
                     "/artifacts?per_page=100") or {}).get("artifacts", [])
        for a in artifacts:
            kind = info["artifacts"].get(a.get("name"))
            if kind and not a.get("expired") and a.get("size_in_bytes", 0) > 0:
                output["artifacts"].append({
                    "id": a["id"], "type": kind, "name": a["name"],
                    "bytes": a["size_in_bytes"], "expiresAt": a.get("expires_at"),
                    "archiveDigest": a.get("digest"),
                    "downloadPath": "/api/builds/" + record["id"] +
                                    "/download/" + str(a["id"])})
        kinds = {a["type"] for a in output["artifacts"]}
        output["downloadReady"] = {"APK_SOURCE", "WINDOWS_EXE"} <= kinds
        if not output["downloadReady"]:
            output["state"] = "BLOCKED_ARTIFACTS_MISSING_OR_QUOTA"
    return output


@app.get("/api/builds/{build_id}")
def get_build(build_id: str, authorization: str | None = Header(default=None)):
    authorize(authorization)
    with LOCK:
        record = REQUESTS.get(build_id)
        if record is None:
            raise HTTPException(404, "BUILD_NOT_FOUND_OR_SERVICE_RESTARTED")
        return run_status(record)


@app.get("/api/builds/{build_id}/download/{artifact_id}")
def download(build_id: str, artifact_id: int,
             authorization: str | None = Header(default=None)):
    authorize(authorization)
    with LOCK:
        record = REQUESTS.get(build_id)
        if not record:
            raise HTTPException(404, "BUILD_NOT_FOUND")
        current = run_status(record)
        item = next((a for a in current.get("artifacts", [])
                     if a["id"] == artifact_id), None)
        if not current.get("downloadReady") or not item:
            raise HTTPException(409, "BINARY_NOT_VERIFIED_OR_GATE_BLOCKED")
        repo = PROJECTS[record["project"]]["repo"]
    # Redirect returned from GitHub is followed server-side; secret never
    # appears in the browser or in a user-facing URL.
    token = os.getenv("AIG_BUILDER_GITHUB_TOKEN", "")
    req = Request(API + "/repos/" + repo + "/actions/artifacts/" +
                  str(artifact_id) + "/zip",
                  headers={"Authorization": "Bearer " + token,
                           "Accept": "application/vnd.github+json",
                           "User-Agent": "aig-site-binary-stream"})
    try:
        response = urlopen(req, timeout=30)
    except (HTTPError, URLError, TimeoutError) as exc:
        raise HTTPException(502, "ARTIFACT_DOWNLOAD_UNAVAILABLE") from exc
    def chunks():
        try:
            while True:
                block = response.read(64 * 1024)
                if not block:
                    break
                yield block
        finally:
            response.close()
    return StreamingResponse(chunks(), media_type="application/zip",
             headers={"Content-Disposition": 'attachment; filename="AIG-' +
                      record["project"] + "-" + item["type"] +
                      '-QA-NOT-RELEASE.zip"',
                      "Cache-Control": "no-store"})


@app.get("/", response_class=HTMLResponse)
def root():
    return HTMLResponse("<!doctype html><html lang='zh-Hant'><meta charset='utf-8'>"
                        "<title>AIG 真編譯 API</title><body style='font:16px system-ui;"
                        "background:#020407;color:white;padding:30px'>"
                        "<h1>AIG 真編譯 API</h1><p>請由原網站受保護的"
                        "<a style='color:cyan' href='" + PUBLIC_ORIGIN +
                        "/cloud-builder.html'>雲端編譯頁</a>操作。</p>"
                        "<p>未配置授權時不會執行或假裝編譯成功。</p></body></html>")
