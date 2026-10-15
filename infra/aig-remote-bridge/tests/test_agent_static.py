from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HANDLERS = ROOT / "aig-remote-agent" / "CommandHandlers.ps1"
AGENT = ROOT / "aig-remote-agent" / "AigRemoteAgent.ps1"
INSTALLER = ROOT / "aig-remote-agent" / "Install-AigRemoteAgent.ps1"
FAST_LOOP = ROOT / "aig-remote-agent" / "aig-fast.ps1"


def test_windows_agent_files_exist():
    assert HANDLERS.exists()
    assert AGENT.exists()
    assert INSTALLER.exists()


def test_handlers_have_only_fixed_whitelist_and_paths():
    text = HANDLERS.read_text(encoding="utf-8")
    assert "NOX_STATUS" in text and "NOX_START" in text and "RESUME_463" in text
    assert "DUAL_ANDROID_UPDATE" in text
    assert "AIG_DUAL_AI_UPDATE" in text
    assert "E:\\Program Files\\Nox\\bin\\nox_adb.exe" in text
    assert "127.0.0.1:62026" in text
    assert "E:\\AIG\\AIG\\AIG-II-429-win" in text
    assert "6cd20f36" in text
    assert "merge-base --is-ancestor" in text
    assert "cat-file -e" in text


def test_dual_android_update_is_fixed_fast_loop_only():
    text = HANDLERS.read_text(encoding="utf-8")
    assert "Invoke-DualAndroidUpdate" in text
    assert "E:\\AIG_WORK\\tools\\fast-loop\\aig-fast.ps1" in text
    assert "-Project" in text and "BOTH" in text
    assert "-Platform" in text and "ANDROID" in text
    assert "AIG_FAST_LOOP_DUAL_ANDROID" in text


def test_aig_dual_ai_update_alias_maps_to_same_bounded_handler():
    text = HANDLERS.read_text(encoding="utf-8")
    assert "'AIG_DUAL_AI_UPDATE' { return Invoke-DualAndroidUpdate }" in text
    assert "'DUAL_ANDROID_UPDATE' { return Invoke-DualAndroidUpdate }" in text


def test_recovered_fast_loop_is_packaged_as_fixed_fallback():
    assert FAST_LOOP.exists()
    fast = FAST_LOOP.read_text(encoding="utf-8")
    assert "RECOVERED_FAST_LOOP_CANDIDATE" in fast
    assert "ValidateSet('AIGII','AIGCNC','BOTH')" in fast
    assert "ValidateSet('ANDROID','DESKTOP','BOTH')" in fast
    assert "127.0.0.1:62026" in fast
    installer = INSTALLER.read_text(encoding="utf-8")
    assert "aig-fast.ps1" in installer
    assert "Copy-Item" in installer


def test_dual_android_update_builds_both_before_atomic_promote():
    fast = FAST_LOOP.read_text(encoding="utf-8")
    for marker in (
        "Prepare-AndroidCandidate",
        "Test-AndroidCandidate",
        "Invoke-AtomicDualAndroidInstall",
        "install-create --multi-package",
        "install-add-session",
        "install-commit",
        "FAST_LOOP_ATOMIC_MULTI_PACKAGE_UNSUPPORTED",
        "FAST_LOOP_DUAL_PREFLIGHT_PASS",
        "FAST_LOOP_DUAL_ATOMIC_INSTALL_PASS",
        "CURRENT_STABLE_RETAINED",
    ):
        assert marker in fast, marker
    both_start = fast.index("if($Project -eq 'BOTH' -and $Platform -eq 'ANDROID')")
    both_block = fast[both_start:]
    assert "Invoke-AtomicDualAndroidInstall" in both_block
    assert "install -r" not in both_block


def test_dual_android_post_commit_has_no_unknown_placeholder_command():
    fast = FAST_LOOP.read_text(encoding="utf-8")
    assert "runCatching = $null" not in fast


def test_no_arbitrary_shell_primitives():
    combined = HANDLERS.read_text(encoding="utf-8") + "\n" + AGENT.read_text(encoding="utf-8")
    if FAST_LOOP.exists():
        combined += "\n" + FAST_LOOP.read_text(encoding="utf-8")
    forbidden = ["Invoke-Expression", "iex ", "cmd /c", "cmd.exe /c", "powershell -Command", "pwsh -Command"]
    for item in forbidden:
        assert item.lower() not in combined.lower()
    assert "ScriptBlock::Create" not in combined


def test_agent_posts_only_fixed_api_paths_and_caps_backoff():
    text = AGENT.read_text(encoding="utf-8")
    for path in ["/api/agent/heartbeat", "/api/agent/poll", "/api/agent/result"]:
        assert path in text
    assert "[Math]::Min(60" in text
