package com.aigstudio.bootstrap

import com.aigstudio.core.StudioStartupStage
import com.aigstudio.desktop.AigRgbDesktopSkinRuntime
import com.aigstudio.desktop.HomeRgbDesktopInstaller
import com.aigstudio.desktop.RuntimeSurfaceDesktopInstaller
import java.awt.Frame
import javax.swing.JFrame
import javax.swing.SwingUtilities
import javax.swing.Timer

/**
 * Reflective bridge to the historical StudioDesktopStartupWindow that still
 * lives in DesktopApp.kt. Keeping the bridge here restores the visible startup
 * page without rolling back or duplicating the production Runtime.
 */
private class RestoredDesktopStartup {
    private val type=Class.forName("com.aigstudio.desktop.StudioDesktopStartupWindow")
    private val instance=type.getDeclaredConstructor().apply { isAccessible=true }.newInstance()
    private val showMethod=type.getDeclaredMethod("show").apply { isAccessible=true }
    private val advanceMethod=type.getDeclaredMethod(
        "advance",StudioStartupStage::class.java,String::class.java
    ).apply { isAccessible=true }
    private val closeMethod=type.getDeclaredMethod("close").apply { isAccessible=true }

    fun show(){showMethod.invoke(instance)}
    fun advance(stage:StudioStartupStage,message:String){advanceMethod.invoke(instance,stage,message)}
    fun close(){closeMethod.invoke(instance)}
}

/** Installs validated RGB skin/HOME/surface/tutorial layers, then delegates to the existing production runtime. */
fun main(args:Array<String>) {
    val smoke=args.contains("--smoke")
    if(!smoke) {
        AigRgbDesktopSkinRuntime.install()
        HomeRgbDesktopInstaller.install()
        RuntimeSurfaceDesktopInstaller.install()
        installOptionalTutorial()
    }

    val startup=if(smoke) null else runCatching { RestoredDesktopStartup() }
        .onFailure { System.err.println("STARTUP_PAGE_WARNING|WINDOWS|"+it.javaClass.simpleName) }
        .getOrNull()

    if(startup!=null) {
        SwingUtilities.invokeAndWait {
            startup.show()
            startup.advance(StudioStartupStage.SAFE_THEME,"載入原版 RGB 啟動圖")
            startup.advance(StudioStartupStage.CORE,"初始化 CAD / CAM 核心")
        }
    }

    val entry=Class.forName("com.aigstudio.desktop.DesktopAppKt")
        .getMethod("main",Array<String>::class.java)
    try {
        entry.invoke(null,args as Any)
    } catch(error:Throwable) {
        if(startup!=null) {
            runCatching {
                if(SwingUtilities.isEventDispatchThread()) startup.close()
                else SwingUtilities.invokeAndWait { startup.close() }
            }
        }
        throw error
    }

    if(startup!=null) {
        SwingUtilities.invokeLater {
            startup.advance(StudioStartupStage.CONFIGURATION,"載入環境設定")
            startup.advance(StudioStartupStage.UI_RENDERER,"載入 RGB UI / Renderer")
            var ticks=0
            val readyTimer=Timer(50,null)
            readyTimer.addActionListener {
                ticks++
                val runtimeVisible=Frame.getFrames()
                    .filterIsInstance<JFrame>()
                    .any { it.isVisible && it.title.startsWith("AIG Studio • CNC 加工控制") }
                if(runtimeVisible) {
                    startup.advance(StudioStartupStage.PROJECT_DATA,"檢查專案 / Recovery")
                    startup.advance(StudioStartupStage.HEALTH,"執行 Runtime 健康檢查")
                    startup.advance(StudioStartupStage.WRAP_UP,"完成啟動收尾")
                    startup.advance(StudioStartupStage.HOME,"AIG CNC READY")
                    startup.close()
                    readyTimer.stop()
                } else if(ticks>=300) {
                    System.err.println("STARTUP_PAGE_WARNING|WINDOWS|RUNTIME_VISIBILITY_TIMEOUT")
                    startup.close()
                    readyTimer.stop()
                }
            }
            readyTimer.start()
        }
    }
}

private fun installOptionalTutorial() {
    runCatching {
        val type=Class.forName("com.aigstudio.desktop.tutorial.TutorialDesktopInstaller")
        val instance=type.getField("INSTANCE").get(null)
        type.getMethod("install").invoke(instance)
    }.onFailure {
        System.err.println("OPTIONAL_MODULE_SKIP|TUTORIAL_V1|WINDOWS|STATUS_ONLY|NO_ROLLBACK|"+it.javaClass.simpleName)
    }
}
