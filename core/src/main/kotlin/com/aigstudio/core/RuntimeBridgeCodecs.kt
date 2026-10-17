package com.aigstudio.core

import java.util.Base64

object CadBridgeCodec {
    fun encode(snapshot:DrawingSnapshot):String = snapshot.entities.joinToString("\n") { entity ->
        when(entity){
            is Line -> listOf("L",entity.id,entity.a.x,entity.a.y,entity.b.x,entity.b.y).joinToString("|")
            is Circle -> listOf("C",entity.id,entity.center.x,entity.center.y,entity.radius).joinToString("|")
            is Arc -> listOf(
                "A",entity.id,entity.center.x,entity.center.y,entity.radius,
                entity.start.x,entity.start.y,entity.end.x,entity.end.y,entity.clockwise
            ).joinToString("|")
        }
    }

    fun decode(data:String):DrawingSnapshot {
        if(data.isBlank()) return DrawingSnapshot(emptyList())
        val entities=data.lineSequence().filter{it.isNotBlank()}.map { line ->
            val p=line.split('|')
            when(p.firstOrNull()){
                "L" -> {
                    require(p.size==6){"Invalid bridge LINE record"}
                    Line(id=p[1],a=Vec2(p[2].toDouble(),p[3].toDouble()),b=Vec2(p[4].toDouble(),p[5].toDouble()))
                }
                "C" -> {
                    require(p.size==5){"Invalid bridge CIRCLE record"}
                    Circle(id=p[1],center=Vec2(p[2].toDouble(),p[3].toDouble()),radius=p[4].toDouble())
                }
                "A" -> {
                    require(p.size==10){"Invalid bridge ARC record"}
                    Arc(
                        id=p[1],center=Vec2(p[2].toDouble(),p[3].toDouble()),radius=p[4].toDouble(),
                        start=Vec2(p[5].toDouble(),p[6].toDouble()),end=Vec2(p[7].toDouble(),p[8].toDouble()),
                        clockwise=p[9].toBooleanStrict()
                    )
                }
                else -> error("Unknown bridge CAD record: ${p.firstOrNull()}")
            }
        }.toList()
        return DrawingSnapshot(entities)
    }
}

object CamBridgeCodec {
    private fun b64(text:String):String =
        Base64.getUrlEncoder().withoutPadding().encodeToString(text.toByteArray(Charsets.UTF_8))
    private fun unb64(text:String):String =
        String(Base64.getUrlDecoder().decode(text),Charsets.UTF_8)

    fun encode(
        snapshot:DrawingSnapshot,
        settings:CamSettings,
        compensation:String,
        regionId:String,
    ):Map<String,String> = mapOf(
        "cadData" to CadBridgeCodec.encode(snapshot),
        "toolDiameter" to settings.toolDiameter.toString(),
        "depth" to settings.depth.toString(),
        "safeZ" to settings.safeZ.toString(),
        "feedMmMin" to settings.feedMmMin.toString(),
        "climb" to settings.climb.toString(),
        "contourSide" to settings.contourSide.name,
        "contourDirection" to settings.contourDirection.name,
        "pathMode" to settings.pathMode.name,
        "leadInMm" to settings.leadInMm.toString(),
        "leadOutMm" to settings.leadOutMm.toString(),
        "manualPath" to b64(encodeManualPath(settings.manualPath)),
        "compensation" to compensation,
        "regionId" to regionId,
    )

    fun decodeSnapshot(body:Map<String,String>):DrawingSnapshot =
        CadBridgeCodec.decode(body["cadData"] ?: error("CAM_SIM missing cadData"))

    fun decodeSettings(body:Map<String,String>):CamSettings {
        val mode=CamPathMode.valueOf(body.required("pathMode"))
        val points=decodeManualPath(unb64(body.required("manualPath")))
        return CamSettings(
            toolDiameter=body.double("toolDiameter"),
            depth=body.double("depth"),
            safeZ=body.double("safeZ"),
            feedMmMin=body.double("feedMmMin"),
            climb=body.required("climb").toBooleanStrict(),
            contourSide=ContourSide.valueOf(body.required("contourSide")),
            contourDirection=ContourDirection.valueOf(body.required("contourDirection")),
            pathMode=mode,
            manualPath=if(mode==CamPathMode.MANUAL) points else emptyList(),
            leadInMm=body.double("leadInMm"),
            leadOutMm=body.double("leadOutMm"),
        )
    }

    private fun encodeManualPath(points:List<ManualCamPoint>):String = points.joinToString("\n") { p ->
        listOf(
            p.x,p.y,p.z,p.rapid,
            p.arcI?.toString() ?: "-",p.arcJ?.toString() ?: "-",
            when(p.clockwise){true->"CW";false->"CCW";null->"-"},
            p.axisA,p.axisB,p.axisC,
        ).joinToString("|")
    }

    private fun decodeManualPath(text:String):List<ManualCamPoint> {
        if(text.isBlank()) return emptyList()
        return text.lineSequence().filter{it.isNotBlank()}.map { line ->
            val p=line.split('|')
            require(p.size==10){"Invalid manual CAM bridge record"}
            ManualCamPoint(
                x=p[0].toDouble(),y=p[1].toDouble(),z=p[2].toDouble(),rapid=p[3].toBooleanStrict(),
                arcI=p[4].takeUnless{it=="-"}?.toDouble(),
                arcJ=p[5].takeUnless{it=="-"}?.toDouble(),
                clockwise=when(p[6]){"CW"->true;"CCW"->false;"-"->null;else->error("Invalid CAM arc direction")},
                axisA=p[7].toDouble(),axisB=p[8].toDouble(),axisC=p[9].toDouble(),
            )
        }.toList()
    }

    private fun Map<String,String>.required(key:String):String = this[key] ?: error("Bridge field missing: $key")
    private fun Map<String,String>.double(key:String):Double = required(key).toDouble().also{require(it.isFinite()){ "$key must be finite" }}
}
