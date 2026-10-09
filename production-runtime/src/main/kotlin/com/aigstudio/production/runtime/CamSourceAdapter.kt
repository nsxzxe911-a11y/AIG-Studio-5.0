package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*
import java.security.MessageDigest

object CamSourceAdapter {
    fun fromCalibratedContours(
        kind:CamSourceKind,
        sourceId:String,
        sourceRevision:Long,
        contours:List<CamContourSnapshot>,
        zones:List<CamZoneSnapshot>,
    ):CamSourceSnapshot {
        require(kind==CamSourceKind.PHOTO || kind==CamSourceKind.AI_CAMERA) { "Calibrated source must be PHOTO or AI_CAMERA" }
        require(sourceId.isNotBlank()) { "CAM source id required" }
        require(sourceRevision>=0L) { "CAM source revision must be non-negative" }
        require(contours.isNotEmpty()) { "CAM source requires at least one contour" }
        contours.forEachIndexed { index, contour ->
            require(contour.points.size>=2) { "CAM contour $index requires at least two XY points" }
            contour.points.forEach { p -> require(p.xMm.isFinite() && p.yMm.isFinite()) { "CAM source XY must be finite" } }
        }
        zones.forEach { z ->
            require(z.id.isNotBlank()) { "CAM zone id required" }
            require(listOf(z.minX,z.minY,z.maxX,z.maxY,z.safeClearanceMm).all{it.isFinite()}) { "CAM zone must be finite" }
            require(z.maxX-z.minX>=0.001 && z.maxY-z.minY>=0.001 && z.safeClearanceMm>=0.0) { "CAM zone bounds invalid" }
        }
        val provisional=CamSourceSnapshot(kind,sourceId,sourceRevision,"",contours,zones)
        return provisional.copy(digest=digest(provisional))
    }

    fun verify(source:CamSourceSnapshot):Boolean = source.digest==digest(source.copy(digest=""))

    private fun digest(source:CamSourceSnapshot):String {
        val raw=buildString {
            append("AIG_CAM_SOURCE_V1|").append(source.kind.name).append('|').append(source.sourceId).append('|').append(source.sourceRevision).append('|')
            source.contours.forEachIndexed { ci,c ->
                append("C|").append(ci).append('|').append(c.points.size).append('|')
                c.points.forEach { p -> append(java.lang.Double.doubleToLongBits(p.xMm)).append('|').append(java.lang.Double.doubleToLongBits(p.yMm)).append('|') }
            }
            source.zones.sortedBy{it.id}.forEach { z ->
                append("Z|").append(z.id).append('|').append(z.kind.name).append('|')
                listOf(z.minX,z.minY,z.maxX,z.maxY,z.safeClearanceMm).forEach { append(java.lang.Double.doubleToLongBits(it)).append('|') }
            }
        }
        return MessageDigest.getInstance("SHA-256").digest(raw.toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}
    }
}