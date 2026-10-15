from pathlib import Path

root=Path('.')
main=root/'app/src/main/java/com/aigstudio/app/MainActivity.kt'
view=root/'app/src/main/java/com/aigstudio/app/Machining3DView.kt'
home=root/'ci/verify_android_offline_rgb_home.sh'

s=main.read_text(encoding='utf-8')
old='6 -> showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("6AX"))'
new='6 -> showSixAxisRuntimeStage()'
assert s.count(old)==1, f'HOME_MULTI_6AX_ROUTE_COUNT={s.count(old)}'
s=s.replace(old,new)

six_old='''        val root=LinearLayout(this).apply {\n            orientation=LinearLayout.VERTICAL\n            setBackgroundColor(0xFF040A11.toInt())\n            setPadding(dp(8),dp(8),dp(8),dp(8))\n        }'''
six_new='''        val root=LinearLayout(this).apply {\n            orientation=LinearLayout.VERTICAL\n            setBackgroundColor(0xFF040A11.toInt())\n            setPadding(dp(8),dp(8),dp(8),dp(8))\n            contentDescription="AXIS PAGE 6AX RUNTIME"\n        }'''
start=s.index('    private fun showSixAxisRuntimeStage()')
end=s.index('    private fun showCamWorkstation',start)
segment=s[start:end]
assert segment.count(six_old)==1, f'SIX_AXIS_ROOT_COUNT={segment.count(six_old)}'
segment=segment.replace(six_old,six_new)
s=s[:start]+segment+s[end:]

u_start=s.index('    private fun showUnifiedMachiningWorkspace')
u_end=s.index('    private fun showStockDialog',u_start)
u=s[u_start:u_end]
u_old='''        val root=LinearLayout(this).apply {\n            orientation=LinearLayout.VERTICAL\n            setBackgroundColor(0xFF040A11.toInt())\n            setPadding(dp(6),dp(6),dp(6),dp(6))\n        }'''
u_new='''        val root=LinearLayout(this).apply {\n            orientation=LinearLayout.VERTICAL\n            setBackgroundColor(0xFF040A11.toInt())\n            setPadding(dp(6),dp(6),dp(6),dp(6))\n            if(initialMode in setOf("3AX","4AX","5AX")) {\n                contentDescription="AXIS PAGE $initialMode RUNTIME"\n            }\n        }'''
assert u.count(u_old)==1, f'UNIFIED_AXIS_ROOT_COUNT={u.count(u_old)}'
u=u.replace(u_old,u_new)
s=s[:u_start]+u+s[u_end:]
main.write_text(s,encoding='utf-8')

v=view.read_text(encoding='utf-8')
needle=''') : View(context) {\n    private data class ScreenPoint'''
repl=''') : View(context) {\n    init {\n        contentDescription = "MACHINING 3D VIEW " + (machineMode ?: "3D")\n    }\n\n    private data class ScreenPoint'''
assert needle in v, 'MACHINING3D_CLASS_PATTERN_MISSING'
v=v.replace(needle,repl,1)
view.write_text(v,encoding='utf-8')

h=home.read_text(encoding='utf-8')
call='bash ci/verify_android_axis_page_persistence.sh'
assert call not in h, 'AXIS_PERSISTENCE_HOME_CHAIN_ALREADY_PRESENT'
marker="echo 'STUDIO_ANDROID_VISIBLE_RUNTIME_GATE_PASS|OFFLINE|FORMAL_RGB_HOME|NO_ENGINEERING_SHELL'"
assert marker in h, 'HOME_FINAL_MARKER_MISSING'
h=h.replace(marker,call+'\n'+marker)
home.write_text(h,encoding='utf-8')

print('APPLY_AXIS_PERSISTENCE_RUNTIME_PASS|HOME_6AX_DEDICATED|AXIS_PAGE_MARKERS|MACHINING3D_MARKER|EMULATOR_CHAIN')
