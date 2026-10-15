from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "aig-remote-agent"
INSTALL = ROOT / "Install-AigRemoteAgent.ps1"
UNINSTALL = ROOT / "Uninstall-AigRemoteAgent.ps1"


def test_installer_files_exist():
    assert INSTALL.exists()
    assert UNINSTALL.exists()


def test_installer_uses_fixed_programdata_path_and_startup_task():
    text = INSTALL.read_text(encoding="utf-8")
    assert "AIG-II\\RemoteAgent" in text
    assert "AIG-II Remote Agent" in text
    assert "New-ScheduledTaskTrigger -AtStartup" in text
    assert "AigRemoteAgent.ps1" in text
    assert "agent.config.json" in text


def test_installer_restricts_config_acl_and_requires_https():
    text = INSTALL.read_text(encoding="utf-8")
    assert "https://" in text
    assert "icacls" in text.lower()
    assert "/inheritance:r" in text
    assert "S-1-5-18" in text and "S-1-5-32-544" in text


def test_uninstaller_only_removes_agent_area_not_project_data():
    text = UNINSTALL.read_text(encoding="utf-8")
    assert "AIG-II Remote Agent" in text
    assert "AIG-II\\RemoteAgent" in text
    assert "E:\\AIG" not in text
    assert "AIG-II-429-win" not in text
