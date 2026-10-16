#!/usr/bin/env python3
from pathlib import Path

root=Path(__file__).resolve().parents[1]
main=(root/'app/src/main/java/com/aigstudio/app/MainActivity.kt').read_text(encoding='utf-8')

formal=('CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI')

# #593 contract: formal navigation must mount real page surfaces into the runtime host.
# Modal AlertDialogs are allowed for settings/tools, but not as the formal page implementation.
for mode in formal:
    marker=f'addProductionUi("{mode}")'
    if marker not in main:
        raise SystemExit(f'FORMAL_NAV_MISSING:{mode}')

for forbidden in (
    'addProductionUi("CAM") { showCamWorkstation() }',
    'addProductionUi("SIM") { showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("SIM")) }',
    'addProductionUi("3AX") { showUnifiedMachiningWorkspace("3AX") }',
    'addProductionUi("4AX") { showUnifiedMachiningWorkspace("4AX") }',
    'addProductionUi("5AX") { showUnifiedMachiningWorkspace("5AX") }',
    'addProductionUi("6AX") { showSixAxisRuntimeStage() }',
    'addProductionUi("NC") { showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("NC")) }',
    'addProductionUi("AI") { showAiSystemSuiteDialog() }',
):
    if forbidden in main:
        raise SystemExit('FORMAL_PAGE_MODAL_OR_GENERIC_SHELL_FORBIDDEN:'+forbidden)

required=(
    'showFormalPage("CAD")',
    'showFormalPage("CAM")',
    'showFormalPage("SIM")',
    'showFormalPage("3AX")',
    'showFormalPage("4AX")',
    'showFormalPage("5AX")',
    'showFormalPage("6AX")',
    'showFormalPage("NC")',
    'showFormalPage("AI")',
)
for token in required:
    if token not in main:
        raise SystemExit('FORMAL_PAGE_HOST_MISSING:'+token)

print('FORMAL_PAGE_ARCHITECTURE_V593_PASS|9_WORK_PAGES|NO_FORMAL_DIALOG_IMPLEMENTATION|DEDICATED_RUNTIME_HOST')
