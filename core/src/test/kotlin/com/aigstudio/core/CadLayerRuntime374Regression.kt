package com.aigstudio.core

import java.io.File
import java.security.MessageDigest
import java.util.Base64

private fun rootLayer374():File {
    val d=File(".").canonicalFile
    if(File(d,"core").isDirectory)return d
    return d.parentFile.takeIf{it!=null && File(it,"core").isDirectory} ?: error("root")
}
private fun sha374(text:String)=MessageDigest.getInstance("SHA-256").digest(text.toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}
private fun enc374(v:String)=Base64.getUrlEncoder().withoutPadding().encodeToString(v.toByteArray(Charsets.UTF_8))

fun main(){
    val doc=DrawingDocument()
    val line=Line("LAYER-L1",Vec2(0.0,0.0),Vec2(10.0,0.0))
    val circle=Circle("LAYER-C1",Vec2(5.0,5.0),2.0)
    doc.put(line);doc.put(circle)
    check(doc.layerOf(line.id)==CadLayerId.WORKPIECE)
    check(doc.layerOf(circle.id)==CadLayerId.WORKPIECE)
    doc.assignLayer(setOf(line.id),CadLayerId.CENTERLINE)
    doc.setLayerVisible(CadLayerId.CENTERLINE,false)
    check(doc.all().size==2)
    check(doc.visibleEntities().map{it.id}.toSet()==setOf(circle.id))
    check(doc.snapshot().entities.size==2) // visibility must never mutate machining geometry truth
    doc.setActiveLayer(CadLayerId.DIMENSIONS)
    val dim=Line("LAYER-D1",Vec2(0.0,1.0),Vec2(10.0,1.0));doc.put(dim)
    check(doc.layerOf(dim.id)==CadLayerId.DIMENSIONS)
    val history=History(doc)
    history.run(DeleteEntityCommand(dim.id))
    check(!doc.contains(dim.id))
    check(history.undo())
    check(doc.layerOf(dim.id)==CadLayerId.DIMENSIONS)

    val project=StudioProjectRepository.capture(doc,ncText="G90\nM30")
    val digestBefore=StudioProjectRepository.canonicalDigest(project)
    val changedLayerProject=project.copy(layerSnapshot=project.layerSnapshot.copy(visibility=project.layerSnapshot.visibility+ (CadLayerId.DIMENSIONS to false)))
    check(StudioProjectRepository.canonicalDigest(changedLayerProject)!=digestBefore)
    val file=kotlin.io.path.createTempFile("aigcnc-v4-layer-",StudioProjectRepository.EXTENSION).toFile()
    val legacyV3=kotlin.io.path.createTempFile("aigcnc-v3-layer-",StudioProjectRepository.EXTENSION).toFile()
    try {
        StudioProjectRepository.saveRevisioned(project,file,"WINDOWS","LAYER-TEST")
        check(file.readLines().first()=="AIGSTUDIO_PROJECT|4")
        check(file.readLines().any{it=="LAYERACTIVE|DIMENSIONS"})
        check(file.readLines().any{it=="LAYERVIS|CENTERLINE|0"})
        val loaded=StudioProjectRepository.load(file)
        check(loaded.layerSnapshot.activeLayer==CadLayerId.DIMENSIONS)
        check(loaded.layerSnapshot.visibility[CadLayerId.CENTERLINE]==false)
        check(loaded.layerSnapshot.entityLayers[line.id]==CadLayerId.CENTERLINE)
        val restored=DrawingDocument();StudioProjectRepository.applyTo(loaded,restored)
        check(!restored.isLayerVisible(CadLayerId.CENTERLINE))
        check(restored.visibleEntities().none{it.id==line.id})
        check(restored.all().size==3)

        // Convert V4 payload to revisioned V3 by removing layer records. Legacy load must default safely.
        val v4=file.readLines().filter{it.isNotBlank()}
        val v3Body=v4.drop(1).filter{!it.startsWith("LAYERACTIVE|") && !it.startsWith("LAYERVIS|") && !it.startsWith("LAYER|") && !it.startsWith("REVISION|")}
        val payload=(listOf("AIGSTUDIO_PROJECT|3")+v3Body).joinToString("\n",postfix="\n")
        legacyV3.writeText(payload+"REVISION|1|0|WINDOWS|"+enc374("LEGACY-V3")+"|"+sha374(payload)+"\n")
        val old3=StudioProjectRepository.load(legacyV3)
        check(old3.layerSnapshot.activeLayer==CadLayerId.WORKPIECE)
        check(CadLayerId.entries.all{old3.layerSnapshot.visibility[it]!=false})
        check(old3.entities.all{old3.layerSnapshot.entityLayers[it.id]==CadLayerId.WORKPIECE})
    } finally { file.delete();legacyV3.delete() }

    val desktop=File(rootLayer374(),"desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt").readText()
    val android=File(rootLayer374(),"app/src/main/java/com/aigstudio/app/MainActivity.kt").readText()
    check("doc.visibleEntities()" in desktop)
    check("showLayersDialog" in desktop && "LAYERS" in desktop)
    check("doc.visibleEntities()" in android)
    check("showLayersDialog" in android && "LAYERS" in android)
    val spec=ProductionActionContract.spec("CAD_LAYER")
    check(spec.android.availability==ProductionActionAvailability.CONNECTED)
    check(spec.windows.availability==ProductionActionAvailability.CONNECTED)
    println("AIGCNC_374_CAD_LAYER_PASS|SEPARATE_METADATA|VISIBILITY|ASSIGNMENT|V4_ROUNDTRIP|V3_BACKWARD_COMPAT|ANDROID|WINDOWS")
}
