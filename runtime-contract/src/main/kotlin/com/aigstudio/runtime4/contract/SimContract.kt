package com.aigstudio.runtime4.contract

data class SimState(
    val ready:Boolean=false,
    val motionProgramId:String?=null,
    val motionRevision:Long=0L,
    val motionDigest:String="",
    val blockIndex:Int=-1,
    val blockCount:Int=0,
    val displayMode:String="MATERIAL",
    val removedCells:Int=0,
    val minDepthMm:Double=0.0,
    val removedVolumeMm3:Double=0.0,
    val nx:Int=0,
    val ny:Int=0,
    val depth:List<Double> = emptyList(),
    val message:RuntimeMessage?=null,
)

interface SimRuntimePort {
    fun snapshot():SimState
    fun run():SimState
    fun step():SimState
    fun reset():SimState
    fun toggleDisplay():SimState
}
