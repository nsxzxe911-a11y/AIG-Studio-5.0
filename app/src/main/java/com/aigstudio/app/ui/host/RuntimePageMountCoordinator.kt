package com.aigstudio.app.ui.host

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageView
import com.aigstudio.app.ui.AndroidRuntimeUiRegistry
import com.aigstudio.core.ui.RuntimeActionSink
import com.aigstudio.core.ui.RuntimeMountStage
import com.aigstudio.core.ui.RuntimePageMountCatalog
import com.aigstudio.core.ui.RuntimePageMountState
import com.aigstudio.core.ui.RuntimeSurface
import com.aigstudio.core.ui.RuntimeViewport
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executor

class AndroidRgbVisualCache {
    private val bitmaps = ConcurrentHashMap<String, Bitmap>()

    private fun decodeAsset(context: Context, assetName: String) {
        val appContext = context.applicationContext
        bitmaps.computeIfAbsent(assetName) {
            appContext.assets.open(assetName).use { input ->
                BitmapFactory.decodeStream(input)
                    ?: error("Unable to decode packaged AIG RGB visual: $assetName")
            }
        }
    }

    fun preloadSurfaceAsync(
        context: Context,
        surface: RuntimeSurface,
        executor: Executor,
        onReady: (Result<Unit>) -> Unit
    ) {
        val assetName = RuntimePageMountCatalog.spec(surface).visualAsset
        executor.execute {
            val result = runCatching { decodeAsset(context, assetName) }
            Handler(Looper.getMainLooper()).post { onReady(result) }
        }
    }

    fun preloadAsync(
        context: Context,
        executor: Executor,
        onReady: (Result<Unit>) -> Unit
    ) {
        executor.execute {
            val result = runCatching {
                RuntimePageMountCatalog.specs
                    .map { it.visualAsset }
                    .distinct()
                    .forEach { decodeAsset(context, it) }
            }
            Handler(Looper.getMainLooper()).post { onReady(result) }
        }
    }

    fun requireBitmap(assetName: String): Bitmap =
        bitmaps[assetName] ?: error(
            "AIG RGB visual not preloaded: $assetName. Preload assets before mounting Runtime pages."
        )

    fun isReady(assetName: String): Boolean = bitmaps.containsKey(assetName)

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

        val bitmap = visualCache.requireBitmap(spec.visualAsset)
        val visual = ImageView(context).apply {
            setImageBitmap(bitmap)
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
