package com.aigstudio.core

import kotlin.math.hypot

/** Native CAD measurements are inspection annotations, NOT NC commands. */
object AigMechanicalNativeBridge {
    fun line(line:Line,featureId:String,dimensionId:String,
             upperMm:Double,lowerMm:Double):Pair<AigMechanicalFeature,AigMechanicalDimension>{
        val len=hypot(line.b.x-line.a.x,line.b.y-line.a.y)
        val entityId=line.id
        val f=AigMechanicalFeature(featureId,AigMechanicalFeatureKind.CONTOUR,setOf(entityId))
        val dim=AigMechanicalDrawingCore.dimensionFromNativeLength(
            dimensionId,featureId,entityId,len,upperMm,lowerMm)
        return f to dim
    }
    /** Circle becomes a hole *only on explicitly requested drawing feature*.
     * This does not guess a CAM drill operation from an arbitrary circle.
     */
    fun designatedHole(circle:Circle,featureId:String,dimensionId:String,
             depthMm:Double,upperMm:Double,lowerMm:Double):
             Pair<AigMechanicalFeature,AigMechanicalDimension>{
        require(circle.radius.isFinite()&&circle.radius>0&&
            circle.center.x.isFinite()&&circle.center.y.isFinite()){
            "MECH_NATIVE_HOLE_INVALID"
        }
        val entityId=circle.id
        val diameter=circle.radius*2
        val feature=AigMechanicalFeature(featureId,AigMechanicalFeatureKind.HOLE,
            setOf(entityId),circle.center,diameter,depthMm)
        val dim=AigMechanicalDimension(
            dimensionId,AigMechanicalDimensionKind.DIAMETER,
            featureId,entityId,diameter,upperMm,lowerMm,
            AigMechanicalDimensionRole.INSPECTION,
            AigMechanicalEvidenceKind.CAD_ENTITY_MEASURED)
        return feature to dim
    }
}
