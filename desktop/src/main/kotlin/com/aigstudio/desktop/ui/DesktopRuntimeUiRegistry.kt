package com.aigstudio.desktop.ui

import com.aigstudio.core.ui.RuntimeActionSink
import com.aigstudio.core.ui.RuntimeMountStage
import com.aigstudio.core.ui.RuntimePageMountCatalog
import com.aigstudio.core.ui.RuntimePageMountState
import com.aigstudio.core.ui.RuntimeSurface
import com.aigstudio.core.ui.RuntimeViewport
import java.awt.BorderLayout
import java.awt.Graphics
import java.awt.image.BufferedImage
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executor
import javax.imageio.ImageIO
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.SwingUtilities

interface DesktopRuntimeUiModule {
    val surface: RuntimeSurface

    fun create(
        viewport: RuntimeViewport,
        actions: RuntimeActionSink
    ): JComponent

    /** Optional second phase for modules that keep callback binding separate. */
    fun bind(actions: RuntimeActionSink) = Unit
    fun onViewportChanged(viewport: RuntimeViewport) = Unit
    fun onActivated() = Unit
    fun onDeactivated() = Unit
}

class DesktopRuntimeUiRegistry(
    modules: Iterable<DesktopRuntimeUiModule> = emptyList()
) {
    private val bySurface = linkedMapOf<RuntimeSurface, DesktopRuntimeUiModule>()

    init {
        modules.forEach(::register)
    }

    fun register(module: DesktopRuntimeUiModule) {
        require(bySurface.put(module.surface, module) == null) {
            "Duplicate Desktop Runtime UI module: ${module.surface}"
        }
    }

    fun require(surface: RuntimeSurface): DesktopRuntimeUiModule =
        bySurface[surface] ?: error("Desktop Runtime UI module missing: $surface")

    fun registeredSurfaces(): Set<RuntimeSurface> = bySurface.keys.toSet()
}

/** Decode canonical RGB page visuals once off the Swing EDT. */
class DesktopRgbVisualCache {
    private val images = ConcurrentHashMap<String, BufferedImage>()

    fun preloadAsync(executor: Executor, onReady: (Result<Unit>) -> Unit) {
        executor.execute {
            val result = runCatching {
                RuntimePageMountCatalog.specs
                    .map { it.visualAsset }
                    .distinct()
                    .forEach { assetName ->
                        images.computeIfAbsent(assetName) {
                            val stream = Thread.currentThread().contextClassLoader
                                .getResourceAsStream(assetName)
                                ?: error("Packaged AIG RGB visual missing: $assetName")
                            stream.use { input ->
                                ImageIO.read(input)
                                    ?: error("Unable to decode packaged AIG RGB visual: $assetName")
                            }
                        }
                    }
            }
            SwingUtilities.invokeLater { onReady(result) }
        }
    }

    fun requireImage(assetName: String): BufferedImage =
        images[assetName] ?: error(
            "AIG RGB visual not preloaded: $assetName. Preload resources before mounting Runtime pages."
        )

    fun isReady(): Boolean = RuntimePageMountCatalog.specs
        .map { it.visualAsset }
        .distinct()
        .all(images::containsKey)
}

data class DesktopMountedRuntimePage(
    val surface: RuntimeSurface,
    val root: JComponent,
    val state: RuntimePageMountState
)

/** Enforces AIG RGB ASSET -> SKIN -> VIEW -> CALLBACK -> READY. */
class DesktopRuntimePageMountCoordinator(
    private val registry: DesktopRuntimeUiRegistry,
    private val visualCache: DesktopRgbVisualCache,
    private val applySkin: (RuntimeSurface, JComponent) -> Unit = { _, _ -> }
) {
    fun mount(
        surface: RuntimeSurface,
        viewport: RuntimeViewport,
        actions: RuntimeActionSink
    ): DesktopMountedRuntimePage {
        check(SwingUtilities.isEventDispatchThread()) { "Desktop Runtime page mount must run on EDT" }
        val spec = RuntimePageMountCatalog.spec(surface)
        check(spec.assetFirst)
        val state = RuntimePageMountState(spec)
        val image = visualCache.requireImage(spec.visualAsset)
        val root = object : JPanel(BorderLayout()) {
            override fun paintComponent(g: Graphics) {
                super.paintComponent(g)
                if (width > 0 && height > 0) g.drawImage(image, 0, 0, width, height, null)
            }
        }.apply {
            isOpaque = false
            name = "AIG RGB RUNTIME ${surface.name}"
        }
        state.mark(RuntimeMountStage.ASSET)

        applySkin(surface, root)
        state.mark(RuntimeMountStage.SKIN)

        val module = registry.require(surface)
        val content = module.create(viewport, actions)
        root.add(content, BorderLayout.CENTER)
        state.mark(RuntimeMountStage.VIEW)

        module.bind(actions)
        state.mark(RuntimeMountStage.CALLBACK)
        state.mark(RuntimeMountStage.READY)
        module.onActivated()

        return DesktopMountedRuntimePage(surface, root, state)
    }
}
