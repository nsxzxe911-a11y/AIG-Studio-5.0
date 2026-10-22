"""Executable AIG web builder safety and real GitHub workflow wiring tests."""
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parent))
import app as builder


class BuilderTests(unittest.TestCase):
    def setUp(self):
        builder.REQUESTS.clear()

    def test_unconfigured_admin_is_fail_closed(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertFalse(builder.health()["ready"])
            with self.assertRaises(HTTPException) as x:
                builder.launch(builder.BuildRequest(project="aigii"), authorization=None)
            self.assertEqual(x.exception.status_code, 401)

    def test_unknown_user_commands_cannot_execute_shell_or_other_repo(self):
        with patch.dict(os.environ, {
            "AIG_BUILDER_ADMIN_TOKEN": "super-secret-admin",
            "AIG_BUILDER_GITHUB_TOKEN": "mock-github-token",
        }, clear=True):
            with self.assertRaises(HTTPException) as x:
                builder.launch(builder.BuildRequest(project="../../arbitrary"), authorization="Bearer super-secret-admin")
            self.assertEqual(x.exception.status_code, 400)
            with self.assertRaises(HTTPException) as x:
                builder.launch(builder.BuildRequest(project="studio"), authorization="Bearer wrong")
            self.assertEqual(x.exception.status_code, 401)

    def test_site_dispatch_is_a_real_workflow_request_on_pinned_cnc_branch(self):
        calls = []
        def mock_github(method, path, payload=None):
            calls.append((method, path, payload))
            if method == "GET":
                return {"sha": "f" * 40}
            if method == "POST":
                return None  # GitHub workflow dispatch returns 204.
            raise AssertionError("unexpected call")
        with patch.dict(os.environ, {
            "AIG_BUILDER_ADMIN_TOKEN": "secure-admin",
            "AIG_BUILDER_GITHUB_TOKEN": "mock",
        }, clear=True), patch.object(builder, "github", side_effect=mock_github):
            result = builder.launch(builder.BuildRequest(project="studio"), authorization="Bearer secure-admin")
            self.assertEqual(result["state"], "DISPATCH_ACCEPTED")
            self.assertEqual(result["sourceSHA"], "f" * 40)
            self.assertEqual(len(calls), 3)
            self.assertEqual(calls[1][0], "GET")
            self.assertEqual(calls[2][0], "POST")
            self.assertIn("/actions/workflows/build-download.yml/dispatches", calls[2][1])
            self.assertEqual(calls[2][2]["ref"], "repair/core-first-studio-20261021")
            self.assertEqual(calls[2][2]["inputs"]["aig_request_id"], result["id"])
            with self.assertRaises(HTTPException) as x:
                builder.launch(builder.BuildRequest(project="studio"), authorization="Bearer secure-admin")
            self.assertEqual(x.exception.status_code, 409)

    def test_busy_actual_github_run_blocks_duplicate_dispatch_after_server_restart(self):
        call_history = []
        def mock_github(method,path,payload=None):
            call_history.append((method,path))
            if "/commits/" in path:
                return {"sha": "a" * 40}
            if "/runs?branch=" in path:
                return {"workflow_runs": [
                    {"id": 93, "status": "in_progress",
                     "head_sha": "a"*40, "display_title": "another active build"}]}
            raise AssertionError("must not dispatch into active workflow")
        with patch.dict(os.environ, {
            "AIG_BUILDER_ADMIN_TOKEN":"admin-token",
            "AIG_BUILDER_GITHUB_TOKEN":"github-token",
        }, clear=True), patch.object(builder,"github",side_effect=mock_github):
            with self.assertRaises(HTTPException) as ex:
                builder.launch(builder.BuildRequest(project="studio"),
                               authorization="Bearer admin-token")
        self.assertEqual(ex.exception.status_code, 409)
        self.assertEqual(ex.exception.detail,"GITHUB_BUILD_ALREADY_ACTIVE_DO_NOT_CANCEL")
        self.assertEqual(len(call_history),2)
        self.assertEqual(builder.REQUESTS, {})

    def test_workflow_success_without_both_android_and_windows_artifacts_is_blocked(self):
        record = {"id": "id3", "project": "aigii", "sha": "b"*40,
                  "branch": "repair/core-first-aigii-20261021",
                  "started": "2026-10-22T00:00:00+00:00", "runId": 1234,
                  "state": "RUNNING", "conclusion": None}
        def mock_github(method, path, payload=None):
            if path.endswith("/runs/1234"):
                return {"head_sha": "b"*40,
                        "head_branch": "repair/core-first-aigii-20261021",
                        "display_title": builder.RUN_TITLE_PREFIX + "id3",
                        "status": "completed", "conclusion": "success",
                        "html_url": "https://github.com/real/build"}
            if path.endswith("/artifacts?per_page=100"):
                return {"artifacts": [{"id": 88, "name": "AIG-II-Android-and-Source",
                                       "size_in_bytes": 1000, "expired": False}]}
            raise AssertionError("unknown query "+path)
        with patch.object(builder,"github",side_effect=mock_github):
            state = builder.run_status(record)
        self.assertEqual(state["state"], "BLOCKED_ARTIFACTS_MISSING_OR_QUOTA")
        self.assertFalse(state["downloadReady"])
        self.assertFalse(state["releaseCertified"])

    def test_success_requires_real_apk_and_exe_archive_and_matching_sha(self):
        record = {"id": "id4", "project": "studio", "sha": "c"*40,
                  "branch": "repair/core-first-studio-20261021",
                  "started": "2026-10-22T00:00:00+00:00", "runId": 1234,
                  "state": "RUNNING", "conclusion": None}
        def mock_github(method, path, payload=None):
            if path.endswith("/runs/1234"):
                return {"head_sha": "c"*40,
                        "head_branch": "repair/core-first-studio-20261021",
                        "display_title": builder.RUN_TITLE_PREFIX + "id4",
                        "status": "completed", "conclusion": "success",
                        "html_url": "https://github.com/real/build"}
            if path.endswith("/artifacts?per_page=100"):
                return {"artifacts": [
                    {"id": 1, "name": "AIG-Studio-Android-and-Source",
                     "size_in_bytes": 987, "expired": False},
                    {"id": 2, "name": "AIG-Studio-Windows-EXE",
                     "size_in_bytes": 1456, "expired": False}]}
            raise AssertionError(path)
        with patch.object(builder,"github",side_effect=mock_github):
            out = builder.run_status(record)
        self.assertEqual(out["state"], "FINISHED")
        self.assertTrue(out["downloadReady"])
        self.assertEqual({a["type"] for a in out["artifacts"]},
                         {"APK_SOURCE", "WINDOWS_EXE"})
        self.assertFalse(out["releaseCertified"])
        with patch.object(builder,"github",return_value={
                "head_sha": "different"*5,
                "head_branch": "repair/core-first-studio-20261021",
                        "display_title": builder.RUN_TITLE_PREFIX + "id4",
                "status": "completed", "conclusion": "success"}):
            with self.assertRaises(HTTPException) as x:
                builder.run_status(record)
            self.assertEqual(x.exception.status_code, 409)



    def test_no_ghost_success_when_dispatch_run_does_not_match_unique_request_id(self):
        record = {"id": "my-request", "project": "studio", "sha": "c"*40,
                  "branch": "repair/core-first-studio-20261021",
                  "started": "2026-10-22T00:00:00+00:00", "runId": None,
                  "state": "QUEUED", "conclusion": None}
        unrelated = {"id": 444, "head_sha": "c"*40,
                     "created_at": "2026-10-22T00:00:10Z",
                     "display_title": builder.RUN_TITLE_PREFIX + "someone-else"}
        with patch.object(builder,"github",return_value={"workflow_runs": [unrelated]}):
            status=builder.run_status(record)
        self.assertEqual(status["state"], "BLOCKED_DISPATCH_TIMEOUT")
        self.assertFalse(status["downloadReady"])
        self.assertEqual(record["runId"], None)

    def test_real_concluded_workflow_failure_never_unlocks_download(self):
        record = {"id": "failed-req", "project": "studio", "sha": "d"*40,
                  "branch": "repair/core-first-studio-20261021",
                  "started": "2026-10-22T00:00:00+00:00", "runId": 555,
                  "state": "RUNNING", "conclusion": None}
        with patch.object(builder,"github",return_value={
                 "head_sha": "d"*40,
                 "head_branch": "repair/core-first-studio-20261021",
                 "display_title": builder.RUN_TITLE_PREFIX + "failed-req",
                 "created_at": "2026-10-22T00:00:00Z",
                 "status": "completed", "conclusion": "failure"}):
            status = builder.run_status(record)
        self.assertEqual(status["state"], "BLOCKED_WORKFLOW_FAILED")
        self.assertFalse(status["downloadReady"])
        self.assertFalse(status["releaseCertified"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
