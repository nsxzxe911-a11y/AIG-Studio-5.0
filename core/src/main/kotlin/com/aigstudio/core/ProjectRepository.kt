package com.aigstudio.core

import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.security.MessageDigest
import java.util.Base64
import kotlin.math.abs

data class StudioProjectPackage(
    val entities: List<Entity>,
    val links: Set<CadTopologyLink>,
    val camSettings: CamSettings,
    val axisA: Double,
    val axisB: Double,
    val axisMode: String,
    val ncText: String,
    val revisionMeta:ProjectRevisionMeta=ProjectRevisionMeta()
)

object StudioProjectRepository {
    const val HEADER = "AIGSTUDIO_PROJECT|2"
    const val LEGACY_HEADER = "AIGSTUDIO_PROJECT|1"
    const val EXTENSION = ".aigp"
    private const val MAX_BYTES = 16L * 1024L * 1024L
    private const val MAX_ENTITIES = 50_000

    private fun enc(value:String):String =
        Base64.getUrlEncoder().withoutPadding().encodeToString(value.toByteArray(Charsets.UTF_8))
    private fun dec(value:String):String =
        String(Base64.getUrlDecoder().decode(value),Charsets.UTF_8)

    private fun finite(v:Double,label:String):Double {
        require(v.isFinite() && abs(v)<=1_000_000.0) { "$label out of range" }
        return v
    }

    fun capture(
        doc:DrawingDocument,
        camSettings:CamSettings=CamSettings(),
        axisA:Double=0.0,
        axisB:Double=0.0,
        axisMode:String="3AX",
        ncText:String=""
    ):StudioProjectPackage {
        require(axisMode in setOf("3AX","4AX","5AX")) { "Unsupported axis mode" }
        require(abs(axisA)<=360.0 && abs(axisB)<=360.0) { "Unsafe axis angle" }
        return StudioProjectPackage(
            entities=doc.all(),
            links=doc.links(),
            camSettings=camSettings,
            axisA=axisA,
            axisB=axisB,
            axisMode=axisMode,
            ncText=ncText
        )
    }

    fun applyTo(project:StudioProjectPackage,doc:DrawingDocument) {
        doc.clear()
        project.entities.forEach(doc::put)
        doc.restoreLinks(project.links)
        doc.pruneTopology()
    }

    private fun canonicalPayload(project:StudioProjectPackage):String = buildString {
        appendLine(HEADER)
        appendLine("MASTER|0.0|0.0|0.0")
        val c=project.camSettings
        appendLine("CAM|${c.toolDiameter}|${c.depth}|${c.safeZ}|${c.feedMmMin}|${if(c.climb)1 else 0}|${c.leadInMm}|${c.leadOutMm}")
        appendLine("AXIS|${project.axisMode}|${project.axisA}|${project.axisB}")
        val nc64=if(project.ncText.isEmpty()) "-" else Base64.getEncoder().encodeToString(project.ncText.toByteArray(Charsets.UTF_8))
        appendLine("NC64|$nc64")
        project.entities.forEach { e ->
            when(e) {
                is Line -> appendLine("LINE|${enc(e.id)}|${e.a.x}|${e.a.y}|${e.b.x}|${e.b.y}")
                is Circle -> appendLine("CIRCLE|${enc(e.id)}|${e.center.x}|${e.center.y}|${e.radius}")
                is Arc -> appendLine("ARC|${enc(e.id)}|${e.center.x}|${e.center.y}|${e.radius}|${e.start.x}|${e.start.y}|${e.end.x}|${e.end.y}|${if(e.clockwise)1 else 0}")
            }
        }
        project.links.sortedWith(compareBy<CadTopologyLink>({it.aId},{it.bId})).forEach {
            appendLine("LINK|${enc(it.aId)}|${enc(it.bId)}")
        }
    }

    private fun sha256(text:String):String =
        MessageDigest.getInstance("SHA-256")
            .digest(text.toByteArray(Charsets.UTF_8))
            .joinToString(""){"%02x".format(it)}

    private fun canonicalText(project:StudioProjectPackage):String {
        val payload=canonicalPayload(project)
        val digest=sha256(payload)
        val meta=project.revisionMeta.copy(contentDigest=digest)
        return payload+"REVISION|${meta.revision}|${meta.baseRevision}|${meta.sourcePlatform}|"+
            enc(meta.sourceDevice)+"|${meta.contentDigest}\n"
    }

    fun canonicalDigest(project:StudioProjectPackage):String = sha256(canonicalPayload(project))

    fun save(project:StudioProjectPackage,file:File) {
        val bytes=canonicalText(project).toByteArray(Charsets.UTF_8)
        require(bytes.size.toLong()<=MAX_BYTES) { "Project too large" }
        val parent=file.absoluteFile.parentFile ?: error("Project parent missing")
        require(parent.exists() || parent.mkdirs()) { "Unable to create project directory" }
        val tmp=File(parent,file.name+".tmp")
        try {
            tmp.writeBytes(bytes)
            require(tmp.length()==bytes.size.toLong()) { "Project temp size mismatch" }
            runCatching {
                Files.move(tmp.toPath(),file.toPath(),StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE)
            }.getOrElse {
                Files.move(tmp.toPath(),file.toPath(),StandardCopyOption.REPLACE_EXISTING)
            }
        } finally {
            if(tmp.exists()) tmp.delete()
        }
        require(file.isFile && file.length()==bytes.size.toLong()) { "Project save verification failed" }
    }

    fun saveRevisioned(
        project:StudioProjectPackage,
        file:File,
        platform:String,
        device:String
    ):StudioProjectPackage {
        val bumped=project.copy(
            revisionMeta=ProjectRevisionSync.bump(project.revisionMeta,platform,device)
        )
        save(bumped,file)
        return bumped
    }

    fun load(file:File):StudioProjectPackage {
        require(file.isFile && file.length() in 1..MAX_BYTES) { "Project file missing/invalid size" }
        val text=file.readText(Charsets.UTF_8)
        val lines=text.lineSequence().toList()
        val header=lines.firstOrNull()?.trim()
        require(header==HEADER || header==LEGACY_HEADER) { "Unsupported Studio project header" }
        val entities=mutableListOf<Entity>()
        val links=linkedSetOf<CadTopologyLink>()
        var cam=CamSettings()
        var axisMode="3AX"
        var axisA=0.0
        var axisB=0.0
        var nc=""
        var masterSeen=false
        var pendingRevision:ProjectRevisionMeta?=null
        lines.drop(1).filter{it.isNotBlank()}.forEach { line ->
            val p=line.split('|')
            when(p[0]) {
                "MASTER" -> {
                    require(p.size==4)
                    require(finite(p[1].toDouble(),"MASTER X")==0.0 && finite(p[2].toDouble(),"MASTER Y")==0.0 && finite(p[3].toDouble(),"MASTER Z")==0.0) {
                        "Master origin must remain X0 Y0 Z0"
                    }
                    masterSeen=true
                }
                "CAM" -> {
                    require(p.size==8)
                    cam=CamSettings(
                        toolDiameter=finite(p[1].toDouble(),"tool diameter"),
                        depth=finite(p[2].toDouble(),"depth"),
                        safeZ=finite(p[3].toDouble(),"safe Z"),
                        feedMmMin=finite(p[4].toDouble(),"feed"),
                        climb=p[5]=="1",
                        leadInMm=finite(p[6].toDouble(),"lead in"),
                        leadOutMm=finite(p[7].toDouble(),"lead out")
                    )
                }
                "AXIS" -> {
                    require(p.size==4 && p[1] in setOf("3AX","4AX","5AX"))
                    axisMode=p[1]
                    axisA=finite(p[2].toDouble(),"axis A")
                    axisB=finite(p[3].toDouble(),"axis B")
                    require(abs(axisA)<=360.0 && abs(axisB)<=360.0)
                }
                "NC64" -> {
                    require(p.size==2)
                    nc=if(p[1]=="-") "" else String(Base64.getDecoder().decode(p[1]),Charsets.UTF_8)
                }
                "REVISION" -> {
                    require(header==HEADER) { "REVISION not allowed in legacy Studio project" }
                    require(p.size==6) { "REVISION field count" }
                    val revision=p[1].toLongOrNull() ?: error("REVISION number invalid")
                    val baseRevision=p[2].toLongOrNull() ?: error("REVISION base invalid")
                    require(revision>=0L && baseRevision>=0L && baseRevision<=revision) { "REVISION order invalid" }
                    val platform=p[3]
                    require(platform in setOf("ANDROID","WINDOWS","UNKNOWN")) { "REVISION platform invalid" }
                    val device=runCatching { dec(p[4]) }.getOrElse { error("REVISION device invalid") }
                    require(device.length<=64) { "REVISION device too long" }
                    val digest=p[5].lowercase()
                    require(Regex("[0-9a-f]{64}").matches(digest)) { "REVISION digest invalid" }
                    pendingRevision=ProjectRevisionMeta(revision,baseRevision,platform,device,digest)
                }
                "LINE" -> {
                    require(p.size==6)
                    entities+=Line(dec(p[1]),Vec2(finite(p[2].toDouble(),"x1"),finite(p[3].toDouble(),"y1")),Vec2(finite(p[4].toDouble(),"x2"),finite(p[5].toDouble(),"y2")))
                }
                "CIRCLE" -> {
                    require(p.size==5)
                    entities+=Circle(dec(p[1]),Vec2(finite(p[2].toDouble(),"cx"),finite(p[3].toDouble(),"x�")),finite(p[4].toDouble(),"radius"))
                }
                "ARC" -> {
                    require(p.size==10)
                    entities+=Arc(
                        dec(p[1]),
                        Vec2(finite(p[2].toDouble(),"cx"),finite(p[3].toDouble(),"cy")),
                        finite(p[4].toDouble(),"radius"),
                        Vec2(finite(p[5].toDouble(),"sx"),finite(p[6].toDouble(),"sy")),
                        Vec2(finite(p[7].toDouble(),"ex"),finite(p[8].toDouble(),"ey")),
                        p[9]=="1"
                    )
                }
                "LINK" -> {
                    require(p.size==3)
                    links+=CadTopologyLink.of(dec(p[1]),dec(p[2]))
                }
                else -> error("Unknown project record: ${p[0]}")
            }
            require(entities.size<=MAX_ENTITIES) { "Too many project entities" }
        }
        require(masterSeen) { "Master origin record missing" }
        val revisionMeta=if(header==HEADER) {
            val meta=pendingRevision ?: error("Project V2 REVISION missing")
            val nonBlank=lines.filter{it.isNotBlank()}
            require(nonBlank.last().startsWith("REVISION|")) { "Project V2 REVISION must be final record" }
            val marker="\nREVISION|"
            val markerIndex=text.lastIndexOf(marker)
            require(markerIndex>0) { "Project V2 REVISION marker missing" }
            val payload=text.substring(0,markerIndex+1)
            require(sha256(payload)==meta.contentDigest) { "Project V2 content digest mismatch" }
            meta
        } else ProjectRevisionMeta()
        val project=StudioProjectPackage(entities,links,cam,axisA,axisB,axisMode,nc,revisionMeta)
        val doc=DrawingDocument()
        project.entities.forEach(doc::put)
        project.links.forEach { require(doc.contains(it.aId) && doc.contains(it.bId)) { "Project link entity missing" } }
        return project
    }

    fun referenceProject():StudioProjectPackage {
        val doc=DrawingDocument()
        val geometry=listOf(
            Line("REF-R1",Vec2(0.0,0.0),Vec2(100.0,0.0)),
            Line("REF-R2",Vec2(100.0,0.0),Vec2(100.0,60.0)),
            Line("REF-R3",Vec2(100.0,60.0),Vec2(0.0,60.0)),
            Line("REF-R4",Vec2(0.0,60.0),Vec2(0.0,0.0)),
            Circle("REF-CIRCLE",Vec2(25.0,20.0),10.0),
            Circle("REF-HOLE",Vec2(75.0,20.0),4.0)
        )
        geometry.forEach(doc::put)
        return capture(
            doc,
            CamSettings(toolDiameter=6.0,depth=-3.0,safeZ=5.0,feedMmMin=150.0),
            axisA=30.0,
            axisB=-15.0,
            axisMode="5AX",
            ncText="O1000\nG90 G54\nX25.000 Y20.000\nM30"
        )
    }
}
