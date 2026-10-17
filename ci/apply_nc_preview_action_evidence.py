from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/"core/src/main/kotlin/com/aigstudio/core/NcPageRuntime.kt"
text=PATH.read_text(encoding="utf-8")
old='''        previewed=true;verified=false;prepared=false;revision++
        return accepted(command,mapOf("eventCount" to timeline.size.toString(),"readyEventCount" to timeline.count{it.status=="READY"}.toString(),"g34Profile" to profile().g34VendorProfile.template.name,"cAxis" to if(NcSixAxisCompatibility.hasC(program))"VALIDATED" else "NOT_USED","summary" to NcExecutionTimeline.programSummary(legacy,controller,machineLimits,profile())))
'''
new='''        previewed=true;verified=false;prepared=false;revision++
        val ready=timeline.filter{it.status=="READY"}
        val executionActions=ready.map{it.action}.distinct().joinToString(",")
        val executionDomains=ready.flatMap{it.domains}.distinct().joinToString(","){it.name}
        return accepted(command,mapOf(
            "eventCount" to timeline.size.toString(),
            "readyEventCount" to ready.size.toString(),
            "executionActions" to executionActions,
            "executionDomains" to executionDomains,
            "g34Profile" to profile().g34VendorProfile.template.name,
            "cAxis" to if(NcSixAxisCompatibility.hasC(program))"VALIDATED" else "NOT_USED",
            "summary" to NcExecutionTimeline.programSummary(legacy,controller,machineLimits,profile())
        ))
'''
if old in text:
    text=text.replace(old,new,1)
PATH.write_text(text,encoding="utf-8")
final=PATH.read_text(encoding="utf-8")
assert '"executionActions" to executionActions' in final,"NC_PREVIEW_ACTION_EVIDENCE_MISSING"
assert '"executionDomains" to executionDomains' in final,"NC_PREVIEW_DOMAIN_EVIDENCE_MISSING"
assert 'timeline.filter{it.status=="READY"}' in final,"NC_PREVIEW_READY_FILTER_MISSING"
print("NC_PREVIEW_ACTION_EVIDENCE_PATCH_PASS|READY_ACTIONS|READY_DOMAINS|G34_G83")
