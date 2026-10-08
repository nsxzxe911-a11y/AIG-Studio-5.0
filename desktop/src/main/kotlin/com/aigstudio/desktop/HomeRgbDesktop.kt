package com.aigstudio.desktop

import com.aigstudio.core.UiAssetContract
import java.awt.AWTEvent
import java.awt.AlphaComposite
import java.awt.Color
import java.awt.Component
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
import javax.swing.JComponent
import javax.swing.SwingUtilities
import javax.swing.border.AbstractBorder
import kotlin.math.max
import kotlin.math.roundToInt

/** Warning-only HOME skin installer. Existing HOME buttons and callbacks stay authoritative. */
object HomeRgbDesktopInstaller {
    private const val EXPECTED_SHA256 = "9b0d4c983d8b69d9e1735036842567e5082101976bd17335cd9c3ec7c4494a80"
    private val applied = Collections.newSetFromMap(WeakHashMap<JComponent, Boolean>())
    private val image: BufferedImage? by lazy { loadExact() ?: loadRuntimeSurfaceFallback() }

    fun install() {
        Toolkit.getDefaultToolkit().addAWTEventListener({ event ->
            if (event is WindowEvent && event.id == WindowEvent.WINDOW_OPENED) applyTo(event.window)
        }, AWTEvent.WINDOW_EVENT_MASK)
        SwingUtilities.invokeLater { Window.getWindows().forEach(::applyTo) }
    }

    private fun loadExact(): BufferedImage? = runCatching {
        val root = UiAssetContract.DESKTOP_HOME_ROOT
        val bytes = HomeRgbDesktopInstaller::class.java
            .getResourceAsStream("$root/${UiAssetContract.DESKTOP_HOME_FILE}")
            ?.use { it.readBytes() } ?: error("HOME desktop asset missing")
        val digest = sha256(bytes)
        require(digest == EXPECTED_SHA256) { "HOME desktop SHA mismatch" }
        val decoded = ImageIO.read(bytes.inputStream()) ?: error("HOME desktop JPEG decode failed")
        require(decoded.width == 1280 && decoded.height == 720) { "HOME desktop dimensions invalid" }
        decoded
    }.onFailure { System.err.println("AIG RGB HOME 416 NOTICE • exact asset unavailable • trying runtime surface") }.getOrNull()

    private fun loadRuntimeSurfaceFallback():BufferedImage? = runCatching {
        val root="${UiAssetContract.DESKTOP_ROOT}/runtime-surfaces"
        val props=Properties()
        HomeRgbDesktopInstaller::class.java.getResourceAsStream("$root/sha256.properties")?.use(props::load)
            ?: error("runtime surface hashes missing")
        val expected=(props.getProperty("home") ?: props.getProperty("home.png"))?.trim()?.lowercase()
            ?: error("HOME runtime surface hash missing")
        val bytes=HomeRgbDesktopInstaller::class.java.getResourceAsStream("$root/home.png")?.use{it.readBytes()}
            ?: error("HOME runtime surface missing")
        require(sha256(bytes)==expected){"HOME runtime surface SHA mismatch"}
        val decoded=ImageIO.read(bytes.inputStream()) ?: error("HOME runtime surface decode failed")
        require(decoded.width>=640 && decoded.height>=360){"HOME runtime surface too small"}
        decoded
    }.onFailure { System.err.println("AIG RGB HOME NOTICE • full-page image unavailable • Runtime continues") }.getOrNull()

    private fun sha256(bytes:ByteArray)=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}

    private fun applyTo(window: Window) {
        val target = findHome(window) ?: return
        val bg = image ?: return
        if (!applied.add(target)) return
        target.border = HomeRgbBorder(bg)
        target.revalidate()
        target.repaint()
    }

    private fun findHome(component: Component): JComponent? {
        if (component is JComponent && component.name == "HOME_CARD") return component
        if (component is java.awt.Container) {
            component.components.forEach { child -> findHome(child)?.let { return it } }
        }
        return null
    }
}

private class HomeRgbBorder(private val image: BufferedImage) : AbstractBorder() {
    private val insets = Insets(12, 14, 12, 14)
    override fun getBorderInsets(c: Component?): Insets = Insets(insets.top, insets.left, insets.bottom, insets.right)

    override fun paintBorder(c: Component, g0: Graphics, x: Int, y: Int, width: Int, height: Int) {
        if (width <= 0 || height <= 0) return
        val g = g0.create() as Graphics2D
        val scale = max(width.toDouble() / image.width, height.toDouble() / image.height)
        val dw = (image.width * scale).roundToInt()
        val dh = (image.height * scale).roundToInt()
        val dx = x + (width - dw) / 2
        val dy = y + (height - dh) / 2
        g.composite = AlphaComposite.SrcOver.derive(0.86f)
        g.drawImage(image, dx, dy, dw, dh, null)
        g.composite = AlphaComposite.SrcOver
        g.color = Color(2, 4, 7, 88)
        g.fillRect(x, y, width, height)
        g.dispose()
    }
}
