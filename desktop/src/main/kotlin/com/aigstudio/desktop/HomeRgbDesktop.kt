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
import java.util.WeakHashMap
import javax.imageio.ImageIO
import javax.swing.JComponent
import javax.swing.SwingUtilities
import javax.swing.border.AbstractBorder
import kotlin.math.max
import kotlin.math.roundToInt

/** Warning-only HOME skin installer. Existing HOME buttons and callbacks stay authoritative. */
object HomeRgbDesktopInstaller {
    private val applied = Collections.newSetFromMap(WeakHashMap<JComponent, Boolean>())
    private val image: BufferedImage? by lazy { loadVerified() }

    fun install() {
        Toolkit.getDefaultToolkit().addAWTEventListener({ event ->
            if (event is WindowEvent && event.id == WindowEvent.WINDOW_OPENED) applyTo(event.window)
        }, AWTEvent.WINDOW_EVENT_MASK)
        SwingUtilities.invokeLater { Window.getWindows().forEach(::applyTo) }
    }

    private fun loadVerified(): BufferedImage? = runCatching {
        val root = UiAssetContract.DESKTOP_HOME_ROOT
        val bytes = HomeRgbDesktopInstaller::class.java
            .getResourceAsStream("$root/${UiAssetContract.DESKTOP_HOME_FILE}")
            ?.use { it.readBytes() } ?: error("HOME desktop asset missing")
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
        require(digest == UiAssetContract.DESKTOP_HOME_SHA256) { "HOME desktop SHA mismatch" }
        val decoded = ImageIO.read(bytes.inputStream()) ?: error("HOME desktop PNG decode failed")
        require(decoded.width > 0 && decoded.height > 0) { "HOME desktop dimensions invalid" }
        decoded
    }.onFailure {
        System.err.println(
            "AIG RGB HOME ${UiAssetContract.HOME_PACK_VERSION} WARNING • ${it.message} • CURRENT HOME CONTINUES"
        )
    }.getOrNull()

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
