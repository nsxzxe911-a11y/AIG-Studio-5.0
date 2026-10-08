package com.aigstudio.desktop

import com.aigstudio.core.RuntimeSurfaceVisualContract
import com.aigstudio.core.UiAssetContract
import java.awt.AWTEvent
import java.awt.AlphaComposite
import java.awt.Component
import java.awt.Container
import java.awt.Graphics
import java.awt.Graphics2D
import java.awt.Insets
import java.awt.Toolkit
import java.awt.Window
import java.awt.event.WindowEvent
import java.awt.image.BufferedImage
import java.security.MessageDigest
import java.util.Collections
import java.util.Properties
import java.util.WeakHashMap
import javax.imageio.ImageIO
import javax.swing.AbstractButton
import javax.swing.JComponent
import javax.swing.JDialog
import javax.swing.JLabel
import javax.swing.JScrollBar
import javax.swing.JTabbedPane
import javax.swing.SwingUtilities
import javax.swing.border.AbstractBorder
import javax.swing.border.Border
import javax.swing.border.CompoundBorder
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * Runtime-only RGB surface mounting. Button icons and full-page artwork stay
 * separate; icon-sized generated assets are never stretched into page skins.
 */
object RuntimeSurfaceDesktopInstaller {
    private val installedTabs=Collections.newSetFromMap(WeakHashMap<JTabbedPane,Boolean>())
    private val installedButtons=Collections.newSetFromMap(WeakHashMap<AbstractButton,Boolean>())
    private val mountedRoots=WeakHashMap<Window,JComponent>()
    private val originalBorders=WeakHashMap<JComponent,Border?>()

    fun install() {
        Toolkit.getDefaultToolkit().addAWTEventListener({ event ->
            if(event is WindowEvent && event.id==WindowEvent.WINDOW_OPENED) bindWindow(event.window)
        },AWTEvent.WINDOW_EVENT_MASK)
        SwingUtilities.invokeLater { Window.getWindows().forEach(::bindWindow) }
    }

    private fun bindWindow(window:Window) {
        walk(window) { component ->
            if(component is JTabbedPane && installedTabs.add(component)) {
                component.addChangeListener { mountSelected(component) }
                mountSelected(component)
            }
            if(component is AbstractButton && installedButtons.add(component)) {
                recognizedSurface(component.text)?.let { surface ->
                    component.addActionListener { SwingUtilities.invokeLater { mountWindowSurface(window,surface) } }
                }
            }
        }
        if(window !is JDialog) SwingUtilities.invokeLater { mountWindowSurface(window,"HOME") }
    }

    private fun recognizedSurface(raw:String?):String? {
        val value=raw?.trim().orEmpty()
        val upper=value.uppercase()
        val recognized=
            value=="首頁" || upper=="HOME" || upper=="CAD" || upper.contains("2D CAD") ||
            upper=="CAM" || upper=="SIM" || upper.contains("3D SIM") ||
            upper=="3AX" || upper=="4AX" || upper=="5AX" || upper=="5X" ||
            upper=="6AX" || upper=="6X" || upper=="NC" || upper.contains("NC EDIT") ||
            upper=="AI" || upper.contains("AI 智能")
        return if(recognized) RuntimeSurfaceVisualContract.normalize(value) else null
    }

    private fun mountSelected(tabs:JTabbedPane) {
        val index=tabs.selectedIndex
        if(index<0) return
        val component=tabs.getComponentAt(index) as? JComponent ?: return
        val surface=recognizedSurface(tabs.getTitleAt(index)) ?: return
        applySurface(component,surface)
    }

    private fun mountWindowSurface(window:Window,surface:String) {
        if(surface=="HOME") return // HOME is mounted by the verified full-page HOME installer.
        val root=largestVisibleContent(window) ?: return
        val previous=mountedRoots.put(window,root)
        if(previous!=null && previous!==root) {
            previous.border=originalBorders[previous]
            previous.repaint()
        }
        applySurface(root,surface)
    }

    private fun largestVisibleContent(window:Window):JComponent? {
        var best:JComponent?=null
        var bestArea=0L
        walk(window) { component ->
            val jc=component as? JComponent ?: return@walk
            if(!jc.isVisible || jc is AbstractButton || jc is JLabel || jc is JScrollBar || jc is JTabbedPane) return@walk
            val area=jc.width.toLong().coerceAtLeast(0L)*jc.height.toLong().coerceAtLeast(0L)
            if(area>bestArea) { best=jc;bestArea=area }
        }
        return best
    }

    private fun applySurface(component:JComponent,surface:String) {
        val original=originalBorders.getOrPut(component){component.border}
        val image=RuntimeSurfaceDesktopAssets.image(surface)
        component.border=if(image!=null) CompoundBorder(
            RuntimeSurfaceImageBorder(image,RuntimeSurfaceVisualContract.SURFACE_ALPHA),original
        ) else CompoundBorder(
            ProceduralRgbSurfaceBorder(surface),original
        )
        component.revalidate()
        component.repaint()
    }

    private fun walk(component:Component,visit:(Component)->Unit) {
        visit(component)
        if(component is Container) component.components.forEach { walk(it,visit) }
    }
}

/** Full interface art only. Small generated button images remain in the parent asset directory. */
private object RuntimeSurfaceDesktopAssets {
    private val root=UiAssetContract.DESKTOP_ROOT+"/runtime-surfaces"
    private val hashes:Map<String,String> by lazy {
        val props=Properties()
        val stream=RuntimeSurfaceDesktopAssets::class.java.getResourceAsStream("$root/sha256.properties")
            ?: return@lazy emptyMap()
        stream.use(props::load)
        props.stringPropertyNames().associateWith { props.getProperty(it).trim().lowercase() }
    }
    private val cache=mutableMapOf<String,BufferedImage?>()

    @Synchronized
    fun image(surface:String):BufferedImage? {
        val id=RuntimeSurfaceVisualContract.assetId(surface)
        if(cache.containsKey(id)) return cache[id]
        val loaded=runCatching {
            val expected=hashes[id] ?: hashes["$id.png"] ?: return@runCatching null
            val bytes=RuntimeSurfaceDesktopAssets::class.java.getResourceAsStream("$root/$id.png")
                ?.use{it.readBytes()} ?: return@runCatching null
            val actual=MessageDigest.getInstance("SHA-256").digest(bytes)
                .joinToString(""){"%02x".format(it)}
            require(actual==expected){"Full RGB surface hash mismatch: $id"}
            val image=ImageIO.read(bytes.inputStream()) ?: return@runCatching null
            require(image.width>=640 && image.height>=360){"Full RGB surface is icon-sized: $id"}
            image
        }.getOrNull()
        cache[id]=loaded
        return loaded
    }
}

private class RuntimeSurfaceImageBorder(
    private val image:BufferedImage,
    alpha:Int
):AbstractBorder() {
    private val opacity=(alpha.coerceIn(0,255)/255f)
    override fun getBorderInsets(c:Component?):Insets=Insets(0,0,0,0)
    override fun paintBorder(c:Component,g0:Graphics,x:Int,y:Int,width:Int,height:Int) {
        if(width<=0 || height<=0) return
        val g=g0.create() as Graphics2D
        val scale=max(width.toDouble()/image.width,height.toDouble()/image.height)
        val dw=(image.width*scale).roundToInt()
        val dh=(image.height*scale).roundToInt()
        val dx=x+(width-dw)/2
        val dy=y+(height-dh)/2
        g.composite=AlphaComposite.SrcOver.derive(opacity)
        g.drawImage(image,dx,dy,dw,dh,null)
        g.dispose()
    }
}

private class ProceduralRgbSurfaceBorder(private val surface:String):AbstractBorder() {
    override fun getBorderInsets(c:Component?):Insets=Insets(0,0,0,0)
    override fun paintBorder(c:Component,g0:Graphics,x:Int,y:Int,width:Int,height:Int) {
        if(width<=0 || height<=0) return
        val g=g0.create() as Graphics2D
        g.color=java.awt.Color(2,4,7,205)
        g.fillRect(x,y,width,height)
        val accent=when(surface) {
            "CAM","SIM" -> java.awt.Color(51,243,155,170)
            "3AX","4AX","5AX","6AX" -> java.awt.Color(255,77,166,170)
            "NC" -> java.awt.Color(255,179,38,170)
            else -> java.awt.Color(39,233,255,170)
        }
        g.color=accent
        g.drawRoundRect(x+2,y+2,max(0,width-5),max(0,height-5),20,20)
        g.color=java.awt.Color(244,251,255,90)
        g.drawString(surface,x+16,y+24)
        g.dispose()
    }
}
