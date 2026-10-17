package com.aigstudio.core

enum class NcCannedCycleKind { G81, G73, G83 }

data class NcCannedCycleSpec(
    val kind:NcCannedCycleKind,
    val retractR:Double,
    val depthZ:Double,
    val peckQ:Double?,
    val feedMmMin:Double,
    val initialPlaneZ:Double,
    val returnToInitial:Boolean,
)

data class NcCycleStep(
    val x:Double,
    val y:Double,
    val z:Double,
    val rapid:Boolean,
)

data class NcCannedCyclePlan(
    val steps:List<NcCycleStep>,
    val holeCount:Int,
    val modelTag:String,
)

object NcCannedCyclePlanner {
    fun expand(holes:List<Pair<Double,Double>>,spec:NcCannedCycleSpec):NcCannedCyclePlan {
        require(holes.isNotEmpty()){"Canned cycle requires hole positions"}
        require(listOf(spec.retractR,spec.depthZ,spec.feedMmMin,spec.initialPlaneZ).all{it.isFinite()}){"Canned-cycle values must be finite"}
        require(spec.retractR>0.0){"R plane must be above Z0 for NC-first material preview"}
        require(spec.depthZ<0.0){"Canned cycle depth must be below Z0"}
        require(spec.retractR>spec.depthZ){"R plane must be above drilling depth"}
        require(spec.initialPlaneZ>=spec.retractR){"Initial plane must not be below R plane"}
        require(spec.feedMmMin>0.0){"Canned cycle feed must be positive"}
        if(spec.kind!=NcCannedCycleKind.G81) require((spec.peckQ?:0.0)>0.0){"Peck cycle requires Q > 0"}

        val out=mutableListOf<NcCycleStep>()
        holes.forEach { (x,y) ->
            out+=NcCycleStep(x,y,spec.initialPlaneZ,true)
            out+=NcCycleStep(x,y,spec.retractR,true)
            when(spec.kind){
                NcCannedCycleKind.G81 -> out+=NcCycleStep(x,y,spec.depthZ,false)
                NcCannedCycleKind.G73, NcCannedCycleKind.G83 -> {
                    val pecks=NcCycleGeometry.peckDepths(spec.retractR,spec.depthZ,spec.peckQ!!)
                    pecks.forEachIndexed { index,depth ->
                        out+=NcCycleStep(x,y,depth,false)
                        if(index<pecks.lastIndex) out+=NcCycleStep(x,y,spec.retractR,true)
                    }
                }
            }
            out+=NcCycleStep(x,y,if(spec.returnToInitial)spec.initialPlaneZ else spec.retractR,true)
        }
        val model=when(spec.kind){
            NcCannedCycleKind.G81->"G81_STANDARD"
            NcCannedCycleKind.G83->"G83_FULL_R_RETRACT"
            NcCannedCycleKind.G73->"G73_CONSERVATIVE_FULL_R_RETRACT"
        }
        return NcCannedCyclePlan(out,holes.size,model)
    }
}
