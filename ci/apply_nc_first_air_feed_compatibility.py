from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/"core/src/main/kotlin/com/aigstudio/core/NcFirstMotion.kt"
text=PATH.read_text(encoding="utf-8")

old_guard='''        require(cuts.any{it.z<0.0}){"NC-first preview requires at least one cutting move below Z0"}
        require(cuts.all{it.z<=0.0}){"NC-first cutting motion above Z0 is not accepted by material preview"}
        return NcFirstMotionTrace(
'''
new_guard='''        require(cuts.any{it.z<0.0}){"NC-first preview requires at least one cutting move below Z0"}
        // Feed motion above Z0 is valid NC motion (for example G83 from R plane toward stock).
        // It remains a Feed in the trace; only the material-removal projection treats it as non-cutting.
        return NcFirstMotionTrace(
'''
if old_guard in text:
    text=text.replace(old_guard,new_guard,1)

old_projection='''        val trace=NcFirstMotionParser.parse(program,machineMode)
        val settings=CamSettings(
            toolDiameter=toolDiameter,
            depth=trace.depth,
            safeZ=trace.safeZ,
            feedMmMin=trace.feedMmMin,
            pathMode=CamPathMode.MANUAL,
            manualPath=trace.points
        )
'''
new_projection='''        val trace=NcFirstMotionParser.parse(program,machineMode)
        // Manual CAM historically used rapid=false as a synonym for "material cutting".
        // NC allows feed motion above stock, so preserve the true trace and create a material-only projection.
        val materialProjection=trace.points.map { point ->
            if(!point.rapid && point.z>0.0) point.copy(rapid=true) else point
        }
        val materialSafeZ=materialProjection.asSequence().filter{it.rapid}.map{it.z}.minOrNull()
            ?: trace.safeZ
        val settings=CamSettings(
            toolDiameter=toolDiameter,
            depth=trace.depth,
            safeZ=materialSafeZ,
            feedMmMin=trace.feedMmMin,
            pathMode=CamPathMode.MANUAL,
            manualPath=materialProjection
        )
'''
if old_projection in text:
    text=text.replace(old_projection,new_projection,1)

PATH.write_text(text,encoding="utf-8")
final=PATH.read_text(encoding="utf-8")
assert "NC-first cutting motion above Z0 is not accepted" not in final,"NC_FIRST_AIR_FEED_OLD_GUARD_PRESENT"
assert "val materialProjection=trace.points.map" in final,"NC_FIRST_MATERIAL_PROJECTION_MISSING"
assert "if(!point.rapid && point.z>0.0) point.copy(rapid=true) else point" in final,"NC_FIRST_AIR_FEED_PROJECTION_MISSING"
assert "manualPath=materialProjection" in final,"NC_FIRST_MATERIAL_PROJECTION_NOT_BOUND"
print("NC_FIRST_AIR_FEED_COMPAT_PATCH_PASS|TRACE_FEED_PRESERVED|MATERIAL_ONLY_BELOW_Z0")
