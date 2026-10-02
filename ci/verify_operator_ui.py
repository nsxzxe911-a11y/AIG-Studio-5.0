from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
studio=(ROOT/'core').is_dir()
desktop=(ROOT/('desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt' if studio else 'desktop/aigii/DesktopApp.kt')).read_text(encoding='utf-8')
android=(ROOT/('app/src/main/java/com/aigstudio/app/MainActivity.kt' if studio else 'app/src/main/java/com/aigii/app/MainActivity.kt')).read_text(encoding='utf-8')
assert 'RuntimeGlassPanel' in desktop
assert 'MasterRuntimeChainContract.masterOriginLabel()' in desktop
if studio:
    home=desktop[desktop.index('val homeActions='):desktop.index('mainCardHost.add(homePanel')]
    assert 'showMaintenanceCenter()' not in home
    assert 'Mesh3DPanel(derived)' in home and 'CadPanel(doc)' in home
    assert 'HOME WORK MAINTENANCE' not in android
    nc=desktop[desktop.index('private fun showNcEditor('):desktop.index('private fun showUnifiedMachiningEditor(')]
    before_post=nc[:nc.index('fun generateNc()')]
    assert 'require(' not in before_post and 'requireNotNull(' not in before_post
    assert 'require(sourceFresh)' in nc and 'require(risk.ok)' in nc
    assert 'JTextArea(runtimeNcDraft ?: runCatching' in nc
    assert 'area.text = ""' not in nc
    assert 'controller.addActionListener { refreshNcFromPostSelection() }' not in nc
    entry=android[android.index('private fun showUnifiedMachiningWorkspace'):]
    assert entry.index('if(initialMode=="NC_EDIT")') < entry.index('if(camDerivedCache==null)')
else:
    home=desktop[desktop.index('fun homePanel()'):desktop.index('fun showStartupSceneSettings()')]
    assert 'showMaintenanceCenter()' not in home and 'CHAIN AUDIT' not in home
    assert 'Render3DPanel(rt)' in home
    nc=desktop[desktop.index('fun ncPanel()'):desktop.index('fun healthPanel()')]
    assert 'isEditable=false' not in nc.split('val machineInterlockSession')[0]
print('OPERATOR_UI_GATE_PASS|LIVE_WORKSPACE|SETTINGS_ONLY_MAINTENANCE|NC_EDIT_INDEPENDENT|POST_VALIDATION_SEPARATE')
