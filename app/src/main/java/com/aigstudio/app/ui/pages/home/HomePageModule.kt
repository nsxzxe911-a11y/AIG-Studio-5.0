package com.aigstudio.app.ui.pages.home

import android.content.Context
import android.view.View
import com.aigstudio.app.ui.AndroidRuntimeUiModule
import com.aigstudio.core.ui.RuntimeActionSink
import com.aigstudio.core.ui.RuntimeSurface
import com.aigstudio.core.ui.RuntimeViewport

/**
 * Wave 1 adapter: keeps the proven formal HOME view/callbacks intact while the
 * RGB-first RuntimePageHost owns page mounting and lifecycle.
 */
class HomePageModule(
    private val contentFactory: () -> View
) : AndroidRuntimeUiModule {
    override val surface: RuntimeSurface = RuntimeSurface.HOME

    override fun create(
        context: Context,
        viewport: RuntimeViewport,
        actions: RuntimeActionSink
    ): View = contentFactory()
}
