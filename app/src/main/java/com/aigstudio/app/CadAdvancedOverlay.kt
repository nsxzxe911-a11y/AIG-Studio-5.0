package com.aigstudio.app

import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.Toast
import com.aigstudio.core.*
import java.io.File
import java.util.Locale
import kotlin.math.roundToInt

/** One-button advanced CAD bridge: MEASURE / CONSTRAINT / DXF / CAM FEATURE. */
object CadAdvancedOverlayInstaller {
    private const val EXISTING_RAIL_TAG="AIG_CAD_EXACT_3D_ASSIST_V1"
    private const val BUTTON_TAG="AIG_CAD_ADVANCED_V1"

    fun install(activity:Activity){ attach(activity,activity.window.decorView,0) }

    private fun attach(activity:Activity,decor:View,attempt:Int){
        decor.postDelayed({
            val cad=findCadView(decor)
            val stage=cad?.parent as? FrameLayout
            val rail=stage?.findViewWithTag<View>(EXISTING_RAIL_TAG) as? LinearLayout
            if(cad==null || rail==null){ if(attempt<5) attach(activity,decor,attempt+1); return@postDelayed }
            if(rail.findViewWithTag<View>(BUTTON_TAG)!=null) return@postDelayed
            rail.addView(RgbGlowButton(activity).apply{
                tag=BUTTON_TAG
                text="CAD+"
                contentDescription="CAD ADVANCED MULTIFUNCTION • MEASURE CONSTRAINT DXF CAM FEATURE"
                minHeight=dp(activity,42);minWidth=dp(activity,86);textSize=10f;maxLines=1
                setRgbState(0xFF8B5CF6.toInt(),false)
                setOnClickListener{showMenu(activity,cad)}
            })
        },if(attempt==0)40L else 90L)
    }

    private fun findCadView(view:View):CadView?{
        if(view is CadView)return view
        if(view is ViewGroup)for(i in 0 until view.childCount)findCadView(view.getChildAt(i))?.let{return it}
        return null
    }

    private fun showMenu(activity:Activity,cad:CadView){
        AlertDialog.Builder(activity).setTitle("CAD+")
            .setItems(arrayOf("尺寸 / MEASURE","約束 / CONSTRAINT","DXF 匯入 / 匯出","CAM 外框 / 內孔 / SLOT 辨識")){d,w->
                d.dismiss();when(w){0->showMeasure(activity,cad);1->showConstraintMenu(activity,cad);2->showDxfMenu(activity,cad);3->showFeatures(activity,cad)}
            }.setNegativeButton("關閉",null).show()
    }

    @Suppress("UNCHECKED_CAST")
    private fun documentOf(cad:CadView):DrawingDocument{
        val f=cad.javaClass.getDeclaredField("doc");f.isAccessible=true;return f.get(cad) as DrawingDocument
    }
    @Suppress("UNCHECKED_CAST")
    private fun selectedIdsOf(cad:CadView):MutableSet<EntityId>{
        val f=cad.javaClass.getDeclaredField("selectedIds");f.isAccessible=true;return f.get(cad) as MutableSet<EntityId>
    }
    private fun runCommand(cad:CadView,command:Command){
        val m=cad.javaClass.getDeclaredMethod("runGeometryCommand",Command::class.java);m.isAccessible=true;m.invoke(cad,command)
    }
    private fun selection(cad:CadView):List<Entity>{
        val doc=documentOf(cad);val ids=selectedIdsOf(cad);return if(ids.isEmpty())doc.all() else ids.mapNotNull(doc::get)
    }
    private fun mm(v:Double)=String.format(Locale.US,"%.3f",v)

    private fun showMeasure(activity:Activity,cad:CadView){
        runCatching{
            val entities=selection(cad);require(entities.isNotEmpty()){"CAD 沒有可量測幾何"}
            val text=buildString{
                append("選取/範圍：${entities.size} geometry\n")
                if(entities.size==1)when(val e=entities[0]){
                    is Line->append("L ${mm(CadMeasurementEngine.length(e))} mm\nΔX ${mm(CadMeasurementEngine.horizontal(e))} mm\nΔY ${mm(CadMeasurementEngine.vertical(e))} mm\n")
                    is Circle->append("R ${mm(CadMeasurementEngine.radius(e))} mm\nØ ${mm(CadMeasurementEngine.diameter(e))} mm\n")
                    is Arc->append("R ${mm(CadMeasurementEngine.radius(e))} mm\n弧長 ${mm(CadMeasurementEngine.perimeter(listOf(e)))} mm\n")
                }
                if(entities.size==2 && entities.all{it is Line})append("角度 ${mm(CadMeasurementEngine.angleBetween(entities[0] as Line,entities[1] as Line))}°\n")
                append("周長 ${mm(CadMeasurementEngine.perimeter(entities))} mm\n")
                val area=CadMeasurementEngine.area(entities);if(area>0.0)append("面積 ${mm(area)} mm²\n")
                append("精度基準 0.001 mm")
            }
            AlertDialog.Builder(activity).setTitle("CAD • 尺寸").setMessage(text).setPositiveButton("OK",null).show()
        }.onFailure{warning(activity,it.message?:"MEASURE blocked")}
    }

    private fun showConstraintMenu(activity:Activity,cad:CadView){
        val labels=arrayOf("水平 H","垂直 V","平行 ∥","垂直 ⟂","同心 ◎","相切 ○○","相切 LINE○")
        AlertDialog.Builder(activity).setTitle("CAD • 約束").setMessage("先選取幾何；兩個物件時第一個為參考、第二個為調整目標。")
            .setItems(labels){d,w->d.dismiss();applyConstraint(activity,cad,w)}.setNegativeButton("取消",null).show()
    }

    private fun applyConstraint(activity:Activity,cad:CadView,kind:Int){
        runCatching{
            val doc=documentOf(cad);val ids=selectedIdsOf(cad).toList();require(ids.isNotEmpty()){"請先選取幾何"};val selected=ids.map{doc.get(it)?:error("選取幾何不存在")}
            val before:List<Entity>;val after:List<Entity>
            when(kind){
                0->{val line=selected.singleOrNull() as? Line?:error("水平約束需要選 1 條 LINE");before=listOf(line);after=listOf(CadConstraintEngine.horizontal(line))}
                1->{val line=selected.singleOrNull() as? Line?:error("垂直約束需要選 1 條 LINE");before=listOf(line);after=listOf(CadConstraintEngine.vertical(line))}
                2->{require(selected.size==2&&selected.all{it is Line}){"平行需要選 2 條 LINE"};before=listOf(selected[1]);after=listOf(CadConstraintEngine.parallel(selected[0] as Line,selected[1] as Line))}
                3->{require(selected.size==2&&selected.all{it is Line}){"垂直需要選 2 條 LINE"};before=listOf(selected[1]);after=listOf(CadConstraintEngine.perpendicular(selected[0] as Line,selected[1] as Line))}
                4->{require(selected.size==2){"同心需要選 2 個圓/圓弧"};before=listOf(selected[1]);after=listOf(CadConstraintEngine.concentric(selected[0],selected[1]))}
                5->{require(selected.size==2&&selected.all{it is Circle}){"○○ 相切需要選 2 個 CIRCLE"};before=listOf(selected[1]);after=listOf(CadConstraintEngine.tangentExternal(selected[0] as Circle,selected[1] as Circle))}
                else->{require(selected.size==2){"LINE○ 相切需要選 LINE + CIRCLE"};val line=selected.filterIsInstance<Line>().singleOrNull()?:error("缺少 LINE");val circle=selected.filterIsInstance<Circle>().singleOrNull()?:error("缺少 CIRCLE");before=listOf(line);after=listOf(CadConstraintEngine.tangent(line,circle))}
            }
            runCommand(cad,ReplaceEntitiesCommand(before,after));Toast.makeText(activity,"CAD CONSTRAINT PASS • Undo/Redo READY",Toast.LENGTH_SHORT).show()
        }.onFailure{warning(activity,(it.cause?:it).message?:"CONSTRAINT blocked")}
    }

    private fun dxfFile(activity:Activity):File{
        val dir=activity.getExternalFilesDir("DXF")?:File(activity.filesDir,"DXF")
        if(!dir.exists())dir.mkdirs();return File(dir,"aig-cad.dxf")
    }
    private fun showDxfMenu(activity:Activity,cad:CadView){
        AlertDialog.Builder(activity).setTitle("CAD • DXF")
            .setItems(arrayOf("匯出 aig-cad.dxf","匯入 aig-cad.dxf")){d,w->d.dismiss();if(w==0)exportDxf(activity,cad)else importDxf(activity,cad)}
            .setMessage("ASCII DXF • mm • LINE/CIRCLE/ARC • 離線可用").setNegativeButton("取消",null).show()
    }
    private fun exportDxf(activity:Activity,cad:CadView){runCatching{val f=dxfFile(activity);f.writeText(CadDxfCodec.exportAscii(documentOf(cad).all()),Charsets.UTF_8);f}.onSuccess{Toast.makeText(activity,"DXF EXPORT • ${it.absolutePath}",Toast.LENGTH_LONG).show()}.onFailure{warning(activity,it.message?:"DXF export blocked")}}
    private fun importDxf(activity:Activity,cad:CadView){runCatching{val f=dxfFile(activity);require(f.isFile){"找不到 ${f.absolutePath}"};val entities=CadDxfCodec.importAscii(f.readText(Charsets.UTF_8));require(entities.isNotEmpty()){"DXF 沒有支援的幾何"};runCommand(cad,AddEntitiesCommand(entities));entities.size}.onSuccess{Toast.makeText(activity,"DXF IMPORT PASS • $it geometry • Undo READY",Toast.LENGTH_LONG).show()}.onFailure{warning(activity,(it.cause?:it).message?:"DXF import blocked")}}

    private fun showFeatures(activity:Activity,cad:CadView){
        runCatching{
            val entities=selection(cad);require(entities.isNotEmpty()){"CAD 沒有幾何"};val features=CamFeatureRecognizer.recognize(entities);require(features.isNotEmpty()){"沒有找到閉合 OUTER / INNER / SLOT"}
            val labels=features.mapIndexed{i,f->"${i+1}. ${f.kind} • ${mm(f.areaEstimateMm2)} mm² • ${f.entityIds.size} geometry"}.toTypedArray()
            AlertDialog.Builder(activity).setTitle("CAM 特徵辨識 • 點選即可回填 CAD 選取").setItems(labels){d,w->val ids=selectedIdsOf(cad);ids.clear();ids.addAll(features[w].entityIds);cad.invalidate();Toast.makeText(activity,"${features[w].kind} 已選取",Toast.LENGTH_SHORT).show();d.dismiss()}.setNegativeButton("關閉",null).show()
        }.onFailure{warning(activity,it.message?:"CAM feature recognition blocked")}
    }

    private fun warning(activity:Activity,message:String){AlertDialog.Builder(activity).setTitle("CAD 訊息").setMessage("WARNING • $message\n資料保持原狀，Runtime 繼續。").setPositiveButton("OK",null).show()}
    private fun dp(context:Context,v:Int)=(v*context.resources.displayMetrics.density).roundToInt()
}
