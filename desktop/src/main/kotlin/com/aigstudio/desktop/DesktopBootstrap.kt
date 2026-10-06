package com.aigstudio.bootstrap

import com.aigstudio.core.StudioStartupEngineContract
import com.aigstudio.core.StudioStartupStage
import com.aigstudio.core.UiAssetContract
import com.aigstudio.desktop.AigRgbDesktopSkinRuntime
import com.aigstudio.desktop.HomeRgbDesktopInstaller
import java.awt.*
import java.awt.image.BufferedImage
import java.io.File
import javax.imageio.ImageIO
import javax.swing.*
import javax.swing.border.EmptyBorder
import kotlin.math.max
import kotlin.math.roundToInt

/** Canonical packaged startup page. No engineering shell and no fake Runtime state. */
private class ProfessionalDesktopStartup {
    private val window=JWindow()
    private val title=JLabel("AIG CNC",SwingConstants.CENTER)
    private val detail=JLabel("CAD • CAM • SIM • 3AX • 4AX • 5AX • 6AX • NC • AI",SwingConstants.CENTER)
    private val status=JLabel("啟動中…",SwingConstants.CENTER)
    private val progress=JProgressBar(0,100)
    private var stage=StudioStartupStage.BOOTSTRAP
    private val visual:BufferedImage?=runCatching {
        ProfessionalDesktopStartup::class.java.getResourceAsStream("/${UiAssetContract.STARTUP_VISUAL}")?.use(ImageIO::read)
    }.getOrNull()

    private val panel=object:JPanel(){
        override fun paintComponent(g0:Graphics){
            super.paintComponent(g0)
            val g=g0.create() as Graphics2D
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BICUBIC)
            visual?.let { image ->
                val scale=max(width.toDouble()/image.width,height.toDouble()/image.height)
                val dw=(image.width*scale).roundToInt();val dh=(image.height*scale).roundToInt()
                val dx=(width-dw)/2;val dy=(height-dh)/2
                g.composite=AlphaComposite.SrcOver.derive(0.90f)
                g.drawImage(image,dx,dy,dw,dh,null)
                g.composite=AlphaComposite.SrcOver
            }
            g.color=Color(2,4,7,118);g.fillRect(0,0,width,height)
            g.dispose()
        }
    }.apply{
        layout=BoxLayout(this,BoxLayout.Y_AXIS)
        background=Color(2,4,7)
        border=BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(Color(39,233,255),2,true),
            EmptyBorder(38,54,38,54)
        )
    }

    init{
        title.foreground=Color.WHITE;title.font=title.font.deriveFont(Font.BOLD,34f)
        detail.foreground=Color(205,225,242);detail.font=detail.font.deriveFont(Font.PLAIN,13f)
        status.foreground=Color(39,233,255);status.font=status.font.deriveFont(Font.BOLD,15f)
        progress.isStringPainted=true;progress.foreground=Color(39,233,255);progress.background=Color(7,17,27)
        listOf<JComponent>(title,detail,status,progress).forEach{
            it.alignmentX=Component.CENTER_ALIGNMENT;panel.add(it);panel.add(Box.createVerticalStrut(16))
        }
        window.contentPane=panel;window.size=Dimension(1100,620);window.setLocationRelativeTo(null)
    }

    fun show(){window.isVisible=true;window.toFront();Toolkit.getDefaultToolkit().sync()}
    fun advance(next:StudioStartupStage,message:String){
        if(!StudioStartupEngineContract.canAdvance(stage,next))return
        stage=next
        val pct=StudioStartupEngineContract.progressBefore(next)
        progress.value=pct;progress.string="$pct%";status.text=message
        panel.repaint();Toolkit.getDefaultToolkit().sync()
    }
    fun captureEvidence(){
        val dir=System.getenv("AIGSTUDIO_STARTUP_EVIDENCE_DIR")?.takeIf{it.isNotBlank()}?:return
        val out=File(dir,"desktop_startup_page.png");out.parentFile.mkdirs()
        val image=BufferedImage(panel.width.coerceAtLeast(1100),panel.height.coerceAtLeast(620),BufferedImage.TYPE_INT_ARGB)
        val g=image.createGraphics();panel.printAll(g);g.dispose();ImageIO.write(image,"png",out)
        println("STUDIO_STARTUP_EVIDENCE=${out.absolutePath}|${image.width}x${image.height}")
    }
    fun close(){progress.value=100;progress.string="100%";window.dispose()}
}

/** Installs validated professional RGB visual layers, then delegates to the real production Runtime. */
fun main(args:Array<String>){
    val smoke=args.contains("--smoke")
    if(!smoke){AigRgbDesktopSkinRuntime.install();HomeRgbDesktopInstaller.install();installOptionalTutorial()}
    val startup=if(smoke)null else runCatching{ProfessionalDesktopStartup()}
        .onFailure{System.err.println("STARTUP_PAGE_WARNING|WINDOWS|${it.javaClass.simpleName}")}.getOrNull()
    if(startup!=null){
        SwingUtilities.invokeAndWait{
            startup.show();startup.advance(StudioStartupStage.SAFE_THEME,"載入 Morning RGB / Safe Theme")
            startup.advance(StudioStartupStage.CORE,"初始化 CAD / CAM / SIM / NC 核心");startup.captureEvidence()
        }
        val hold=System.getenv("AIGSTUDIO_STARTUP_EVIDENCE_HOLD_MS")?.toLongOrNull()?.coerceIn(0L,10000L)?:0L
        if(hold>0L)Thread.sleep(hold)
    }
    val entry=Class.forName("com.aigstudio.desktop.DesktopAppKt").getMethod("main",Array<String>::class.java)
    try{entry.invoke(null,args as Any)}catch(error:Throwable){
        startup?.let{runCatching{SwingUtilities.invokeAndWait{it.close()}}};throw error
    }
    if(startup!=null)SwingUtilities.invokeLater{
        startup.advance(StudioStartupStage.CONFIGURATION,"載入環境設定")
        startup.advance(StudioStartupStage.UI_RENDERER,"載入 RGB UI / Renderer")
        var ticks=0
        val timer=Timer(50,null)
        timer.addActionListener{
            ticks++
            val ready=Frame.getFrames().filterIsInstance<JFrame>().any{it.isVisible&&it.title.startsWith("AIG Studio • CNC 加工控制")}
            if(ready){
                startup.advance(StudioStartupStage.PROJECT_DATA,"檢查專案 / Recovery")
                startup.advance(StudioStartupStage.HEALTH,"執行 Runtime 健康檢查")
                startup.advance(StudioStartupStage.WRAP_UP,"完成啟動收尾")
                startup.advance(StudioStartupStage.HOME,"AIG CNC READY");startup.close();timer.stop()
            }else if(ticks>=300){System.err.println("STARTUP_PAGE_WARNING|WINDOWS|RUNTIME_VISIBILITY_TIMEOUT");startup.close();timer.stop()}
        }
        timer.start()
    }
}

private fun installOptionalTutorial(){
    runCatching{
        val type=Class.forName("com.aigstudio.desktop.tutorial.TutorialDesktopInstaller")
        val instance=type.getField("INSTANCE").get(null);type.getMethod("install").invoke(instance)
    }.onFailure{System.err.println("OPTIONAL_MODULE_SKIP|TUTORIAL_V1|WINDOWS|STATUS_ONLY|NO_ROLLBACK|${it.javaClass.simpleName}")}
}
