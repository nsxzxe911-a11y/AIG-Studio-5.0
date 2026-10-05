package com.aigstudio.desktop.tutorial

import com.aigstudio.core.tutorial.*
import java.awt.AWTEvent
import java.awt.Component
import java.awt.Dimension
import java.awt.EventQueue
import java.awt.Toolkit
import java.awt.Window
import java.awt.event.ComponentAdapter
import java.awt.event.ComponentEvent
import java.awt.event.WindowEvent
import java.util.Collections
import java.util.WeakHashMap
import java.util.prefs.Preferences
import javax.swing.JButton
import javax.swing.JFrame
import javax.swing.JLayeredPane
import javax.swing.JOptionPane

class TutorialDialogRenderer(private val adapter:TutorialRuntimeAdapter) {
    private val prefs=Preferences.userRoot().node("aig/tutorial")

    fun showEntry(owner:Component?) {
        val items=arrayOf("AI 導航","教程中心","目前頁面說明","嘴炮模式")
        when(JOptionPane.showOptionDialog(owner,"AIG Tutorial Pack V1","AI 教程",JOptionPane.DEFAULT_OPTION,JOptionPane.INFORMATION_MESSAGE,null,items,items[0])) {
            0 -> showNavigation(owner)
            1 -> showTutorialCenter(owner)
            2 -> adapter.openCurrentPageHelp(adapter.currentPageTarget())
            3 -> showBanterSelector(owner)
        }
    }

    fun showLesson(lessonId:String,owner:Component?) {
        val lesson=adapter.pack.lessonById(lessonId) ?: return showUnavailable(lessonId,owner)
        val step=lesson.steps.firstOrNull() ?: return showUnavailable(lessonId,owner)
        val level=currentBanter()
        val expression=runCatching { AiExpression.valueOf(step.expressionId) }.getOrDefault(AiExpression.NEUTRAL)
        val shown=presentTutorialFact(TutorialFact(lesson.lessonId,step.fact,step.actionTarget),level,expression)
        val message=buildString {
            append(shown.fact.factualText)
            shown.emoji?.let { append("\n\n").append(it) }
            shown.secondaryText?.let { append("\n").append(it) }
        }
        val actionTarget=step.actionTarget
        val options=if(actionTarget!=null) arrayOf("執行此步","關閉") else arrayOf("關閉")
        val choice=JOptionPane.showOptionDialog(owner,message,lesson.titleZhTw,JOptionPane.DEFAULT_OPTION,JOptionPane.INFORMATION_MESSAGE,null,options,options[0])
        if(actionTarget!=null && choice==0) adapter.invokeActionTarget(actionTarget)
    }

    fun showUnavailable(target:String,owner:Component?) {
        JOptionPane.showMessageDialog(owner,"目前頁面說明暫無對應教程：$target\nRuntime 繼續運作。","教程暫不可用",JOptionPane.WARNING_MESSAGE)
    }

    private fun showNavigation(owner:Component?) {
        val page=adapter.currentPageTarget()
        val lesson=adapter.lessonForPage(page)
        if(lesson==null) showUnavailable(page,owner) else {
            val options=arrayOf("開啟教程","取消")
            if(JOptionPane.showOptionDialog(owner,"目前頁面：$page\n建議教程：$lesson","AI 導航",JOptionPane.DEFAULT_OPTION,JOptionPane.INFORMATION_MESSAGE,null,options,options[0])==0) adapter.openTutorial(lesson)
        }
    }

    private fun showTutorialCenter(owner:Component?) {
        val lessons=adapter.pack.lessons.toTypedArray()
        if(lessons.isEmpty()) return showUnavailable(TutorialPack.TUTORIAL_UNAVAILABLE,owner)
        val titles=lessons.map { it.titleZhTw }.toTypedArray()
        val selected=JOptionPane.showInputDialog(owner,"選擇教程","教程中心",JOptionPane.PLAIN_MESSAGE,null,titles,titles.firstOrNull()) as? String ?: return
        lessons.firstOrNull { it.titleZhTw==selected }?.let { adapter.openTutorial(it.lessonId) }
    }

    private fun showBanterSelector(owner:Component?) {
        val levels=BanterLevel.entries.map { it.name }.toTypedArray()
        val current=currentBanter().name
        val selected=JOptionPane.showInputDialog(owner,"嘴炮模式只改語氣，不改數值 / G碼 / callback。","嘴炮模式",JOptionPane.PLAIN_MESSAGE,null,levels,current) as? String ?: return
        prefs.put("banter_level",selected)
    }

    private fun currentBanter():BanterLevel = runCatching {
        BanterLevel.valueOf(prefs.get("banter_level",BanterLevel.OFF.name))
    }.getOrDefault(BanterLevel.OFF)
}

object TutorialDesktopInstaller {
    private val installed=Collections.newSetFromMap(WeakHashMap<Window,Boolean>())
    @Volatile private var listenerInstalled=false

    @Synchronized fun install() {
        if(!listenerInstalled) {
            Toolkit.getDefaultToolkit().addAWTEventListener({ event ->
                if(event is WindowEvent && event.id==WindowEvent.WINDOW_OPENED) attach(event.window)
            },AWTEvent.WINDOW_EVENT_MASK)
            listenerInstalled=true
        }
        EventQueue.invokeLater { Window.getWindows().forEach(::attach) }
    }

    private fun attach(window:Window) {
        val frame=window as? JFrame ?: return
        if(!installed.add(frame)) return
        val button=JButton("AI 教程").apply {
            toolTipText="AI 導航 / 教程中心 / 目前頁面說明 / 嘴炮模式"
            preferredSize=Dimension(96,36)
            addActionListener { TutorialDialogRenderer(TutorialRuntimeAdapter(windowProvider={ frame })).showEntry(frame) }
        }
        val layer=frame.rootPane.layeredPane
        layer.add(button,JLayeredPane.PALETTE_LAYER)
        fun place(){ button.setBounds((layer.width-108).coerceAtLeast(8),8,96,36) }
        layer.addComponentListener(object:ComponentAdapter(){ override fun componentResized(e:ComponentEvent){ place() } })
        EventQueue.invokeLater { place(); button.repaint() }
    }
}
