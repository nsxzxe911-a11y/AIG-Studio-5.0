from pathlib import Path
R=Path(__file__).resolve().parents[1]
core='\n'.join(p.read_text(encoding='utf-8',errors='ignore') for p in (R/'core/src/main/kotlin').rglob('*.kt'))
web=(R/'web/index.html').read_text(encoding='utf-8',errors='ignore')
for t in ['enum class RuntimeIssueDomain','CAD','CAM','SIM','NC','LOCAL_OWNER_ONLY','NC_ALARM_EDITOR_ONLY','AI_TEACHER_REQUIRES_ALL_CONNECTED','ADVANCED_ONLY_DIAGNOSTICS','CONNECT_DISCONNECT_IS_STATUS']:
    assert t in core, 'DOMAIN_ROUTING_CORE_MISSING:'+t
for t in ['function aigDomainIssue','function aigAllConnected','function aigAdvancedMode','data-link-cadcam','data-link-camsim','data-link-simnc','data-advanced-mode','AI 老師','進階者模式','各自處理各自錯誤']:
    assert t in web, 'DOMAIN_ROUTING_WEB_MISSING:'+t
assert 'data-nc-collision' not in web[web.index('function ncPage()'):web.index('function simPage(axis)')], 'NC_MUST_NOT_OWN_COLLISION'
assert 'data-nc-clearance' not in web[web.index('function ncPage()'):web.index('function simPage(axis)')], 'NC_MUST_NOT_OWN_CLEARANCE'
print('DOMAIN_ISSUE_ROUTING_GATE_PASS|CAD_LOCAL|CAM_LOCAL|SIM_3D_LOCAL|NC_GCODE_LOCAL|LINK_STATUS|ADVANCED_DIAGNOSTICS|AI_TEACHER_ALL_CONNECTED')
