from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HANDLERS = ROOT / "aig-remote-agent" / "CommandHandlers.ps1"
AGENT = ROOT / "aig-remote-agent" / "AigRemoteAgent.ps1"


def test_windows_agent_files_exist():
    assert HANDLERS.exists()
    assert AGENT.exists()


def test_handlers_have_only_fixed_whitelist_and_paths():
    text = HANDLERS.read_text(encoding="utf-8")
    assert "NOX_STATUS" in text and "NOX_START" in text and "RESUME_463" in text
    assert "E:\\Program Files\\Nox\\bin\\nox_adb.exe" in text
    assert "127.0.0.1:62026" in text
    assert "E:\\AIG\\AIG\\AIG-II-429-win" in text
    assert "6cd20f36" in text
    assert "merge-base --is-ancestor" in text
    assert "cat-file -e" in text


def test_no_arbitrary_shell_primitives():
    combined = HANDLERS.read_text(encoding="utf-8") + "\n" + AGENT.read_text(encoding="utf-8")
    forbidden = ["Invoke-Expression", "iex ", "cmd /c", "cmd.exe /c", "powershell -Command", "pwsh -Command"]
    for item in forbidden:
        assert item.lower() not in combined.lower()
    assert "ScriptBlock::Create" not in combined


def test_agent_posts_only_fixed_api_paths_and_caps_backoff():
    text = AGENT.read_text(encoding="utf-8")
    for path in ["/api/agent/heartbeat", "/api/agent/poll", "/api/agent/result"]:
        assert path in text
    assert "[Math]::Min(60" in text
