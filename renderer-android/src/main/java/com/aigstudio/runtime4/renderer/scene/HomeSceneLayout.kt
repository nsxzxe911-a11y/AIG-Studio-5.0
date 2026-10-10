package com.aigstudio.runtime4.renderer

import kotlin.math.max

object HomeSceneLayout {
    fun nodes(
        widthPx:Float,
        heightPx:Float,
        density:Float,
        presentation:HomeLivePresentation=HomeLivePresentation.localOnly(),
        localeId:String="zh-TW",
    ):List<SceneNode> = AigComponentNodeAdapter.nodes(
        HomeProfessionalDescriptor.descriptor(),
        layout(widthPx,heightPx,density,presentation,localeId),
    )

    fun layout(
        widthPx:Float,
        heightPx:Float,
        density:Float,
        presentation:HomeLivePresentation=HomeLivePresentation.localOnly(),
        localeId:String="zh-TW",
    ):AigPageLayout {
        val gap=SharedVisualPolicy.gapPx(density)
        val touch=SharedVisualPolicy.touchPx(density)
        val bounds=linkedMapOf<String,UiBounds>()
        val headerH=touch
        bounds["HOME.HEADER"]=UiBounds(gap,gap,widthPx-gap,gap+headerH)
        bounds["HOME.TITLE"]=UiBounds(gap*2,gap+touch*0.12f,widthPx*0.62f,gap+touch*0.88f)
        bounds["HOME.RUNTIME"]=UiBounds(widthPx*0.63f,gap+touch*0.12f,widthPx-gap*2,gap+touch*0.88f)

        val navIds=listOf("NAV.HOME","NAV.CAD","NAV.CAM","NAV.SIM","NAV.MULTIFUNCTION","NAV.NC","NAV.AI")
        val navColumns=if(widthPx>=heightPx)7 else 4
        val navRows=(navIds.size+navColumns-1)/navColumns
        val navTop=gap+headerH+gap
        val navWidth=max(touch,(widthPx-gap*(navColumns+1))/navColumns)
        navIds.forEachIndexed{index,id->
            val row=index/navColumns;val col=index%navColumns
            val left=gap+col*(navWidth+gap);val top=navTop+row*(touch+gap)
            bounds[id]=UiBounds(left,top,(left+navWidth).coerceAtMost(widthPx-gap),top+touch)
        }
        val navBottom=navTop+navRows*touch+(navRows-1)*gap
        val contentTop=navBottom+gap
        val contentBottom=heightPx-gap

        if(widthPx>=heightPx){
            val leftW=max(touch*3.2f,widthPx*0.28f).coerceAtMost(widthPx*0.34f)
            val leftRight=gap+leftW
            val heroLeft=leftRight+gap
            val quickTitleBand=touch*0.38f+gap
            val quickTop=contentBottom-(quickTitleBand+touch)
            val heroBottom=(quickTop-gap).coerceAtLeast(contentTop+heightPx*0.25f)
            val leftAvailable=contentBottom-contentTop
            val cardH=(leftAvailable-gap*2)/3f
            val machine=UiBounds(gap,contentTop,leftRight,contentTop+cardH)
            val project=UiBounds(gap,machine.bottom+gap,leftRight,machine.bottom+gap+cardH)
            val ai=UiBounds(gap,project.bottom+gap,leftRight,contentBottom)
            putStatus(bounds,"HOME.MACHINE",machine,gap,touch)
            putStatus(bounds,"HOME.PROJECT",project,gap,touch)
            putStatus(bounds,"HOME.AI",ai,gap,touch)
            bounds["HOME.HERO"]=UiBounds(heroLeft,contentTop,widthPx-gap,heroBottom)
            bounds["HOME.HERO.TITLE"]=titleBounds(bounds.getValue("HOME.HERO"),gap,touch)
            val quickDeck=UiBounds(heroLeft,quickTop,widthPx-gap,contentBottom)
            bounds["HOME.QUICK.DECK"]=quickDeck
            bounds["HOME.QUICK.TITLE"]=UiBounds(quickDeck.left+gap,quickDeck.top+touch*0.06f,quickDeck.left+touch*2.2f,quickDeck.top+touch*0.34f)
            putQuickButtons(bounds,quickDeck,gap,4,1,quickTitleBand)
        } else {
            val statusH=touch*2f
            val half=(widthPx-gap*3)/2f
            val machine=UiBounds(gap,contentTop,gap+half,contentTop+statusH)
            val project=UiBounds(machine.right+gap,contentTop,widthPx-gap,contentTop+statusH)
            putStatus(bounds,"HOME.MACHINE",machine,gap,touch)
            putStatus(bounds,"HOME.PROJECT",project,gap,touch)
            val aiTop=machine.bottom+gap
            val ai=UiBounds(gap,aiTop,widthPx-gap,aiTop+touch*1.65f)
            putStatus(bounds,"HOME.AI",ai,gap,touch)
            val quickRows=2
            val quickTitleBand=touch*0.38f+gap
            val quickH=quickTitleBand+quickRows*touch+(quickRows-1)*gap
            val quickTop=contentBottom-quickH
            val heroTop=ai.bottom+gap
            val heroBottom=(quickTop-gap).coerceAtLeast(heroTop+heightPx*0.25f)
            bounds["HOME.HERO"]=UiBounds(gap,heroTop,widthPx-gap,heroBottom)
            bounds["HOME.HERO.TITLE"]=titleBounds(bounds.getValue("HOME.HERO"),gap,touch)
            val quickDeck=UiBounds(gap,quickTop,widthPx-gap,contentBottom)
            bounds["HOME.QUICK.DECK"]=quickDeck
            bounds["HOME.QUICK.TITLE"]=UiBounds(quickDeck.left+gap,quickDeck.top+touch*0.04f,quickDeck.left+touch*2.2f,quickDeck.top+touch*0.28f)
            putQuickButtons(bounds,quickDeck,gap,2,2,quickTitleBand)
        }
        return AigPageLayout(bounds,presentation.labels(localeId),emptySet(),40)
    }

    private fun putStatus(bounds:MutableMap<String,UiBounds>,prefix:String,card:UiBounds,gap:Float,touch:Float){
        bounds["$prefix.CARD"]=card
        bounds["$prefix.TITLE"]=UiBounds(card.left+gap,card.top+gap,card.right-gap,card.top+gap+touch*0.42f)
        bounds["$prefix.VALUE"]=UiBounds(card.left+gap,card.top+gap+touch*0.52f,card.right-gap,(card.bottom-gap).coerceAtLeast(card.top+gap+touch*0.94f))
    }

    private fun titleBounds(card:UiBounds,gap:Float,touch:Float)=
        UiBounds(card.left+gap,card.top+gap,card.right-gap,card.top+gap+touch*0.44f)

    private fun putQuickButtons(bounds:MutableMap<String,UiBounds>,deck:UiBounds,gap:Float,columns:Int,rows:Int,titleBand:Float){
        val ids=listOf("HOME.QUICK.CAD","HOME.QUICK.SIM","HOME.QUICK.NC","HOME.MULTIFUNCTION.OPEN")
        val usableTop=deck.top+titleBand
        val usableHeight=deck.height-titleBand
        val cellW=(deck.width-gap*(columns-1))/columns
        val cellH=(usableHeight-gap*(rows-1))/rows
        ids.forEachIndexed{index,id->
            val row=index/columns;val col=index%columns
            val left=deck.left+col*(cellW+gap);val top=usableTop+row*(cellH+gap)
            bounds[id]=UiBounds(left,top,left+cellW,top+cellH)
        }
    }
}
