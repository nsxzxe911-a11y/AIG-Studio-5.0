#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
core=(ROOT/'core/src/main/kotlin/com/aigstudio/core/FanucNc.kt').read_text(encoding='utf-8')
android=(ROOT/'app/src/main/java/com/aigstudio/app/MainActivity.kt').read_text(encoding='utf-8')
desktop=(ROOT/'desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt').read_text(encoding='utf-8')
web=(ROOT/'web/index.html').read_text(encoding='utf-8')
combined='\n'.join((core,android,desktop,web))

for token in ['data class NcEditorAlarm','object NcEditorAlarmRouter','fun firstAlarm','rawLine','suggestion']:
    assert token in core, 'NC_INLINE_ALARM_CORE_MISSING:'+token
for token in ['refreshNcEditorAlarm','RuntimeIssueRoutingPolicy','RuntimeIssueDomain.NC',' ALARM • L','setSelection(']:
    assert token in android, 'NC_INLINE_ALARM_ANDROID_MISSING:'+token
for token in ['refreshNcEditorAlarm','RuntimeIssueRoutingPolicy','RuntimeIssueDomain.NC',' ALARM • L','area.select(']:
    assert token in desktop, 'NC_INLINE_ALARM_DESKTOP_MISSING:'+token
for token in ['function ncEditorAlarm','data-nc-alarm','function focusNcAlarmLine','NC ALARM • L']:
    assert token in web, 'NC_INLINE_ALARM_WEB_MISSING:'+token

assert '.execLine.alarm' in web, 'TRUE_NC_ALARM_STYLE_MUST_REMAIN'
assert 'NcExecutionTimeline.build' in core, 'NC_TIMELINE_SOURCE_OF_TRUTH_MISSING'
assert 'showGuidanceMessage(guidanceTarget="NC' not in android, 'NC_ALARM_MUST_NOT_USE_GENERAL_AI_GUIDANCE'
print('NC_INLINE_ALARM_EDITOR_GATE_PASS|LINE|RAW_GCODE|REASON|SUGGESTION|FOCUS_LINE|ANDROID|WINDOWS|WEB|NO_GENERAL_AI_POPUP')
