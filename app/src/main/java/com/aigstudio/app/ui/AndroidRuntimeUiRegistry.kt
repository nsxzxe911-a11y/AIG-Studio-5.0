package com.aigstudio.app.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageView
import com.aigstudio.core.ui.RuntimeActionSink
import com.aigstudio.core.ui.RuntimeMountStage
import com.aigstudio.core.ui.RuntimePageMountCatalog
import com.aigstudio.core.ui.RuntimePageMountState
import com.aigstudio.core.ui.RuntimeSurface
import com.aigstudio.core.ui.RuntimeViewport
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executor

interface AndroidRuntimeUiModule {
    val surface: RuntimeSurface

    fun create(
        context: Context,
        viewport: RuntimeViewport,
        actions: RuntimeActionSink
    ): View

    /** Optional second phase for modules that keep callback binding separate. */
    fun bind(actions: RuntimeActionSink) = Unit
    fun onViewportChanged(viewport: RuntimeViewport) = Unit
    fun onActivated() = Unit
    fun onDeactivated() = Unit
}

class AndroidRuntimeUiRegistry(
    modules: Iterable<AndroidRuntimeUiModule> = emptyList()
) {
    private val bySurface = linkedMapOf<RuntimeSurface, AndroidRuntimeUiModule>()

    init {
        modules.forEach(::register)
    }

    fun register(module: AndroidRuntimeUiModule) {
        require(bySurface.put(module.surface, module) == null) {
            "Duplicate Android Runtime UI module: ${module.surface}"
        }
    }

    fun require(surface: RuntimeSurface): AndroidRuntimeUiModule =
        bySurface[surface] ?: error("Android Runtime UI module missing: $surface")

    fun registeredSurfaces(): Set<RuntimeSurface> = bySurface.keys.toSet()
}

/**
 * Full-page RGB visuals are decoded once off the UI thread, then reused by every
 * page mount. This keeps multi-megabyte PNG/JPG decoding out of touch callbacks.
 */
class AndroidRgbVisualCache {
    private val bitmaps = ConcurrentHashMap<String, Bitmap>()

    fun preloadAsync(
        context: Context,
        executor: Executor,
        onReady: (Result<Unit>) -> Unit
    ) {
        val appContext = context.applicationContext
        executor.execute {
            val result = runCatching {
                RuntimePageMountCatalog.specs
                    .map { it.visualAsset }
                    .distinct()
                    .forEach { assetName ->
                        bitmaps.computeIfAbsent(assetName) {
                            appContext.assets.open(assetName).use { input ->
                                BitmapFactory.decodeStream(input)
                                    ?: error("Unable to decode packaged AIG RGB visual: $assetName")
                            }
                        }
                    }
            }
            Handler(Looper.getMainLooper()).post { onReady(result) }
        }
    }

    fun requireBitmap(assetName: String): Bitmap =
        bitmaps[assetName] ?: error(
            "AIG RGB visual not preloaded: $assetName. Preload assets before mounting Runtime pages."
        )

    fun isReady(): Boolean = RuntimePageMountCatalog.specs
        .map { it.visualAsset }
        .distinct()
        .all(bitmaps::containsKey)
}

data class AndroidMountedRuntimePage(
    val surface: RuntimeSurface,
    val root: FrameLayout,
    val state: RuntimePageMountState
)

/**
 * Enforces the product mount order:
 * AIG RGB ASSET -> SKIN -> functional VIEW -> CALLBACK -> READY.
 */
class AndroidRuntimePageMountCoordinator(
    private val registry: AndroidRuntimeUiRegistry,
    private val visualCache: AndroidRgbVisualCache,
    private val applySkin: (RuntimeSurface, View) -> Unit = { _, _ -> }
) {
    fun mount(
        context: Context,
        surface: RuntimeSurface,
        viewport: RuntimeViewport,
        actions: RuntimeActionSink
    ): AndroidMountedRuntimePage {
        val spec = RuntimePageMountCatalog.spec(surface)
        check(spec.assetFirst)
        val state = RuntimePageMountState(spec)
        val root = FrameLayout(context).apply {
            contentDescription = "AIG RGB RUNTIME ${surface.name}"
        }

        val visual = ImageView(context).apply {
            setImageBitmap(visualCache.requireBitmap(spec.visualAsset))
            scaleType = ImageView.ScaleType.CENTER_CROP
            adjustViewBounds = false
            contentDescription = "AIG RGB BASE ${surface.name} ${spec.visualAsset}"
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }
        root.addView(
            visual,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
        state.mark(RuntimeMountStage.ASSET)

        applySkin(surface, root)
        state.mark(RuntimeMountStage.SKIN)

        val module = registry.require(surface)
        val content = module.create(context, viewport, actions)
        root.addView(
            content,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
        state.mark(RuntimeMountStage.VIEW)

        module.bind(actions)
        state.mark(RuntimeMountStage.CALLBACK)
        state.mark(RuntimeMountStage.READY)
        module.onActivated()

        return AndroidMountedRuntimePage(surface, root, state)
    }
}
