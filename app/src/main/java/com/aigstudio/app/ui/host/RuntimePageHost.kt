package com.aigstudio.app.ui.host

import android.content.Context
import android.view.View
import com.aigstudio.app.ui.AndroidRuntimeUiRegistry
import com.aigstudio.core.ui.RuntimeActionSink
import com.aigstudio.core.ui.RuntimeSurface
import com.aigstudio.core.ui.RuntimeViewport
import java.util.concurrent.Executor
import java.util.concurrent.Executors

class RuntimePageHost(
    private val context: Context,
    private val registry: AndroidRuntimeUiRegistry,
    private val actions: RuntimeActionSink,
    executor: Executor = Executors.newSingleThreadExecutor(),
    applySkin: (RuntimeSurface, View) -> Unit = { _, _ -> }
) {
    private val visualCache = AndroidRgbVisualCache()
    private val preloadExecutor = executor
    private val coordinator = AndroidRuntimePageMountCoordinator(registry, visualCache, applySkin)
    private var current: RuntimeSurface? = null

    fun preload(onComplete: (Result<Unit>) -> Unit) {
        visualCache.preloadAsync(context, preloadExecutor, onComplete)
    }

    fun show(surface: RuntimeSurface, viewport: RuntimeViewport): Result<View> = runCatching {
        check(visualCache.isReady()) { "AIG RGB visual cache not ready" }
        val mounted = coordinator.mount(context, surface, viewport, actions)
        check(mounted.state.ready) { "Runtime page did not reach READY: $surface" }
        current = surface
        mounted.root
    }

    fun currentSurface(): RuntimeSurface? = current
}
