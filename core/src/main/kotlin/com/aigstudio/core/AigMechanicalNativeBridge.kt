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

    /** Current DrawingDocument snapshot entities are the only trusted
     * measurement source. Do not accept persisted annotations as proof.
     */
    fun auditLive(sheet:AigMechanicalDrawingSheet,
                  currentCadEntities:List<Entity>):AigMechanicalDrawingAudit {
        val byId=currentCadEntities.associateBy { it.id }
        require(byId.size==currentCadEntities.size){"MECH_DUPLICATE_LIVE_CAD_ID"}
        val measured=sheet.dimensions.filter {
            it.evidence==AigMechanicalEvidenceKind.CAD_ENTITY_MEASURED
        }.associate { dimension->
            val entity=byId[dimension.nativeEntityId]
                ?:error("MECH_LIVE_SOURCE_MISSING")
            val value=when(dimension.kind){
                AigMechanicalDimensionKind.LINEAR ->
                    if(entity is Line)entity.length
                    else error("MECH_LINEAR_MEASUREMENT_UNSUPPORTED")
                AigMechanicalDimensionKind.DIAMETER ->
                    if(entity is Circle)entity.radius*2
                    else error("MECH_DIAMETER_MEASUREMENT_UNSUPPORTED")
                AigMechanicalDimensionKind.RADIUS ->
                    if(entity is Circle)entity.radius
                    else error("MECH_RADIUS_MEASUREMENT_UNSUPPORTED")
                AigMechanicalDimensionKind.POSITION_X ->
                    if(entity is Circle)entity.center.x
                    else error("MECH_X_DATUM_MEASUREMENT_UNSUPPORTED")
                AigMechanicalDimensionKind.POSITION_Y ->
                    if(entity is Circle)entity.center.y
                    else error("MECH_Y_DATUM_MEASUREMENT_UNSUPPORTED")
                else->error("MECH_UNMEASURABLE_2D_ENTITY_DIMENSION")
            }
            require(value.isFinite()){"MECH_LIVE_MEASUREMENT_NONFINITE"}
            dimension.id to value
        }
        for(feature in sheet.features.filter { it.kind==AigMechanicalFeatureKind.HOLE }){
            require(feature.nativeEntityIds.size==1){"MECH_HOLE_AMBIGUOUS_SOURCE"}
            val native=byId[feature.nativeEntityIds.single()]
            val circle=native as? Circle ?:error("MECH_HOLE_NATIVE_SOURCE_NOT_CIRCLE")
            val center=feature.center?:error("MECH_HOLE_CENTER_REQUIRED")
            val dia=feature.nominalDiameterMm?:error("MECH_HOLE_DIAMETER_REQUIRED")
            require(hypot(circle.center.x-center.x,circle.center.y-center.y)<=
                AigMechanicalDrawingCore.DISPLAY_RESOLUTION_MM/2+1e-9 &&
                kotlin.math.abs(2*circle.radius-dia)<=
                AigMechanicalDrawingCore.DISPLAY_RESOLUTION_MM/2+1e-9){
                "MECH_HOLE_FEATURE_STALE_FROM_LIVE_CAD"
            }
        }
        return AigMechanicalDrawingCore.audit(sheet,byId.keys,measured)
    }
}
