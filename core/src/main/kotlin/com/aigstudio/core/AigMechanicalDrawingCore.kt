package com.aigstudio.core

import kotlin.math.abs
import kotlin.math.hypot

/** Mechanical-drawing data and cross-reference validation.
 * This is a technical-drawing schema, NOT an ISO/ASME GD&T solver,
 * nor a CAM toolpath, controller command or machine-release certificate.
 */
enum class AigMechanicalStandard { ISO_GPS, ASME_Y14_5 }
enum class AigMechanicalViewKind {
    FRONT, REAR, TOP, BOTTOM, LEFT, RIGHT, ISOMETRIC, SECTION, DETAIL
}
enum class AigMechanicalFeatureKind {
    HOLE, COUNTERBORE, COUNTERSINK, THREAD, SLOT, KEYWAY,
    POCKET, FACE, CONTOUR, FILLET, CHAMFER, OTHER
}
enum class AigMechanicalDimensionKind {
    LINEAR, DIAMETER, RADIUS, ANGULAR, DEPTH, POSITION_X, POSITION_Y
}
enum class AigMechanicalDimensionRole { DRIVING, INSPECTION, REFERENCE, BASIC }
enum class AigMechanicalGdtKind {
    FLATNESS, STRAIGHTNESS, PARALLELISM, PERPENDICULARITY,
    POSITION, PROFILE_OF_SURFACE, CIRCULAR_RUNOUT
}
enum class AigMechanicalEvidenceKind {
    CAD_ENTITY_MEASURED, DRAWING_DESIGN_INTENT, USER_CONFIRMED
}

data class AigMechanicalFeature(
    val id:String,
    val kind:AigMechanicalFeatureKind,
    val nativeEntityIds:Set<String>,
    val center:Vec2?=null,
    val nominalDiameterMm:Double?=null,
    val nominalDepthMm:Double?=null
)
data class AigMechanicalView(
    val id:String,
    val kind:AigMechanicalViewKind,
    val featureIds:Set<String>,
    val scale:Double=1.0,
    val sectionReference:String?=null
)
data class AigMechanicalDimension(
    val id:String,
    val kind:AigMechanicalDimensionKind,
    val featureId:String,
    val nativeEntityId:String,
    val nominal:Double,
    val plusTolerance:Double,
    val minusTolerance:Double,
    val role:AigMechanicalDimensionRole,
    val evidence:AigMechanicalEvidenceKind
)
data class AigMechanicalDatum(
    val symbol:String,
    val featureId:String
)
data class AigMechanicalGdtFrame(
    val id:String,
    val kind:AigMechanicalGdtKind,
    val controlledFeatureId:String,
    val zoneMm:Double,
    val datumSymbols:List<String>
)
data class AigMechanicalBomRow(
    val partNumber:String,
    val description:String,
    val quantity:Int
)
data class AigMechanicalDrawingSheet(
    val drawingNumber:String,
    val revision:String,
    val partNumber:String,
    val material:String,
    val projectionStandard:AigMechanicalStandard,
    val features:List<AigMechanicalFeature>,
    val views:List<AigMechanicalView>,
    val dimensions:List<AigMechanicalDimension>,
    val datums:List<AigMechanicalDatum> = emptyList(),
    val frames:List<AigMechanicalGdtFrame> = emptyList(),
    val billOfMaterials:List<AigMechanicalBomRow> = emptyList(),
    val notes:List<String> = emptyList()
)
data class AigMechanicalDrawingAudit(
    val drawingNumber:String,
    val featureCount:Int,
    val viewCount:Int,
    val dimensionCount:Int,
    val nativeGeometryReferencesVerified:Boolean,
    val numericToleranceFieldsValidated:Boolean,
    val gdtCrossReferencesValidated:Boolean,
    val gdtStandardFullyCertified:Boolean=false,
    val manufacturingInstructionsGenerated:Boolean=false,
    val machineExecutionAllowed:Boolean=false
)

object AigMechanicalDrawingCore {
    const val SCHEMA="AIG_MECHANICAL_DRAWING_V1"
    const val DISPLAY_RESOLUTION_MM=0.001
    private val token=Regex("[A-Za-z0-9][A-Za-z0-9._-]{0,63}")
    private fun validId(s:String)=token.matches(s)
    private fun validMm(x:Double)=x.isFinite()&&abs(x)<=1000000.0
    private fun <T> unique(items:List<T>):Boolean=items.size==items.toSet().size

    /** Validates documentary evidence and all references against live native
     * CAD entities. Never interprets drawing annotations as NC output.
     */
    fun audit(sheet:AigMechanicalDrawingSheet,
              liveNativeEntityIds:Set<String>):AigMechanicalDrawingAudit{
        require(validId(sheet.drawingNumber)&&validId(sheet.partNumber)&&
            validId(sheet.revision)&&sheet.material.isNotBlank()&&
            sheet.material.length<=100){"MECH_TITLE_BLOCK_INVALID"}
        require(sheet.features.isNotEmpty()&&sheet.features.size<=10000 &&
            sheet.views.isNotEmpty()&&sheet.views.size<=256 &&
            sheet.dimensions.size<=10000 &&
            sheet.frames.size<=256){"MECH_DOCUMENT_BOUNDS"}
        val ids=sheet.features.map{it.id}
        require(ids.all(::validId)&&unique(ids)){"MECH_DUPLICATE_FEATURE"}
        val features=sheet.features.associateBy{it.id}
        val nativeIds=liveNativeEntityIds
        require(nativeIds.isNotEmpty()){"MECH_LIVE_CAD_ENTITIES_REQUIRED"}
        sheet.features.forEach{f->
            require(f.nativeEntityIds.isNotEmpty()&&
                f.nativeEntityIds.all{validId(it)&&it in nativeIds}){
                "MECH_UNBOUND_NATIVE_GEOMETRY"
            }
            require(f.center==null||(validMm(f.center.x)&&validMm(f.center.y))){
                "MECH_NONFINITE_CENTER"
            }
            require(f.nominalDiameterMm==null||
                (validMm(f.nominalDiameterMm)&&f.nominalDiameterMm>0)){
                "MECH_INVALID_DIAMETER"
            }
            require(f.nominalDepthMm==null||
                (validMm(f.nominalDepthMm)&&f.nominalDepthMm>0)){
                "MECH_INVALID_DEPTH"
            }
            if(f.kind in setOf(AigMechanicalFeatureKind.HOLE,
                AigMechanicalFeatureKind.COUNTERBORE,
                AigMechanicalFeatureKind.COUNTERSINK))
                require(f.center!=null&&f.nominalDiameterMm!=null){
                    "MECH_HOLE_REQUIRES_CENTER_DIAMETER"
                }
        }
        require(sheet.views.map{it.id}.all(::validId)&&
            unique(sheet.views.map{it.id})){"MECH_DUPLICATE_VIEW"}
        sheet.views.forEach{v->
            require(v.scale.isFinite()&&v.scale>0&&v.scale<=1000.0&&
                v.featureIds.isNotEmpty()&&v.featureIds.all{it in features}){
                "MECH_DANGLING_VIEW_OR_SCALE"
            }
            require(v.kind!=AigMechanicalViewKind.SECTION||
                (v.sectionReference!=null && v.sectionReference.isNotBlank())){
                "MECH_SECTION_REFERENCE_REQUIRED"
            }
        }
        require(sheet.dimensions.map{it.id}.all(::validId)&&
            unique(sheet.dimensions.map{it.id})){"MECH_DUPLICATE_DIMENSION"}
        sheet.dimensions.forEach{d->
            val target=features[d.featureId]
            require(target!=null&&d.nativeEntityId in target.nativeEntityIds &&
                d.nativeEntityId in nativeIds){"MECH_DIMENSION_UNBOUND_FROM_SOURCE"}
            require(validMm(d.nominal)&&d.plusTolerance.isFinite()&&
                d.minusTolerance.isFinite()&&d.plusTolerance>=0&&
                d.minusTolerance<=0&&abs(d.minusTolerance)<=10000.0&&
                d.plusTolerance<=10000.0){
                "MECH_INVALID_DIMENSION_TOLERANCE"
            }
            require(d.kind in setOf(AigMechanicalDimensionKind.ANGULAR,
                AigMechanicalDimensionKind.POSITION_X,
                AigMechanicalDimensionKind.POSITION_Y) || d.nominal>0){
                "MECH_SIZE_MUST_BE_POSITIVE"
            }
            require(d.role!=AigMechanicalDimensionRole.REFERENCE||
                (d.plusTolerance==0.0&&d.minusTolerance==0.0)){
                "MECH_REFERENCE_DIMENSION_IS_NOT_TOLERANCED"
            }
            // A reported dimension is a measurement only if bound to
            // live native geometry and separately checked by the caller.
        }
        require(sheet.datums.map{it.symbol}.all{
            it.matches(Regex("[A-Z]"))}&&
            unique(sheet.datums.map{it.symbol})&&
            sheet.datums.all{it.featureId in features}){
            "MECH_INVALID_DATUM_REFERENCE"
        }
        val datums=sheet.datums.map{it.symbol}.toSet()
        require(sheet.frames.map{it.id}.all(::validId)&&
            unique(sheet.frames.map{it.id})){"MECH_DUPLICATE_GDT"}
        sheet.frames.forEach{frame->
            require(frame.controlledFeatureId in features &&
                validMm(frame.zoneMm)&&frame.zoneMm>0 &&
                frame.datumSymbols.size<=3&&
                unique(frame.datumSymbols)&&
                frame.datumSymbols.all{it in datums}){
                "MECH_GDT_DANGLING_OR_INVALID"
            }
        }
        sheet.billOfMaterials.forEach{r->
            require(validId(r.partNumber)&&r.description.isNotBlank()&&
                r.description.length<=200&&r.quantity in 1..100000){
                "MECH_BOM_INVALID"
            }
        }
        require(unique(sheet.billOfMaterials.map{it.partNumber})&&
            sheet.notes.size<=256&&sheet.notes.all{it.length<=512}){
            "MECH_BOM_OR_NOTES_BOUNDS"
        }
        return AigMechanicalDrawingAudit(
            sheet.drawingNumber,sheet.features.size,sheet.views.size,
            sheet.dimensions.size,true,true,true
        )
    }

    /** Hole positions are geometry design-intent ONLY. A pattern is not a
     * verified toolpath, drilling cycle or Fanuc G-code.
     */
    fun rectangularHoleCenters(
        start:Vec2,columns:Int,rows:Int,
        pitchXmm:Double,pitchYmm:Double
    ):List<Vec2>{
        require(columns in 1..64 && rows in 1..64 &&
            columns.toLong()*rows.toLong()<=256){
            "MECH_HOLE_PATTERN_BOUNDS"
        }
        require(validMm(start.x)&&validMm(start.y)&&
            validMm(pitchXmm)&&validMm(pitchYmm)&&
            (columns==1||pitchXmm>0)&&
            (rows==1||pitchYmm>0)){
            "MECH_HOLE_PITCH_INVALID"
        }
        val centers=(0 until rows).flatMap{row->
            (0 until columns).map{col->
                Vec2(start.x+col*pitchXmm,start.y+row*pitchYmm)
            }
        }
        require(centers.all{validMm(it.x)&&validMm(it.y)}){
            "MECH_HOLE_PATTERN_COORDINATES_OVERFLOW"
        }
        return centers
    }

    /** Report actual native geometry only; a tolerance callout does NOT
     * automatically modify the underlying CAD nor post G-code.
     */
    fun dimensionFromNativeLength(
        id:String,featureId:String,nativeEntityId:String,
        lengthMm:Double,upperMm:Double,lowerMm:Double
    ):AigMechanicalDimension{
        require(validMm(lengthMm)&&lengthMm>0){"MECH_NATIVE_LENGTH_INVALID"}
        return AigMechanicalDimension(id,AigMechanicalDimensionKind.LINEAR,
            featureId,nativeEntityId,lengthMm,upperMm,lowerMm,
            AigMechanicalDimensionRole.INSPECTION,
            AigMechanicalEvidenceKind.CAD_ENTITY_MEASURED)
    }
}
