package com.aigstudio.app

import android.content.Context
import android.graphics.Color
import android.util.Log
import android.view.MotionEvent
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageView

class Aig436VisualPagerView(context: Context) : FrameLayout(context) {
    private val image = ImageView(context)
    private val navSurface = View(context)
    private val drawables = intArrayOf(
        R.drawable.aig436_page_home,
        R.drawable.aig436_page_cad,
        R.drawable.aig436_page_cam,
        R.drawable.aig436_page_sim,
        R.drawable.aig436_page_3ax,
        R.drawable.aig436_page_4ax,
        R.drawable.aig436_page_5ax,
        R.drawable.aig436_page_6ax,
        R.drawable.aig436_page_nc,
        R.drawable.aig436_page_ai
    )

    var pageIndex: Int = 0
        private set

    init {
        setBackgroundColor(Color.rgb(2, 4, 7))
        image.scaleType = ImageView.ScaleType.FIT_CENTER
        image.adjustViewBounds = false
        addView(image, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))

        navSurface.setBackgroundColor(Color.TRANSPARENT)
        navSurface.contentDescription = "AIG436 VISUAL PAGE NAV"
        navSurface.isClickable = true
        navSurface.setOnTouchListener { _, event ->
            if (width <= 0 || height <= 0) return@setOnTouchListener false
            val y = event.y / height.toFloat()
            val inNav = y >= Aig436VisualPageContract.NAV_TOP_FRACTION &&
                y <= Aig436VisualPageContract.NAV_BOTTOM_FRACTION
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> inNav
                MotionEvent.ACTION_UP -> {
                    if (inNav) {
                        showPage(Aig436VisualPageContract.pageIndexForXFraction(event.x / width.toFloat()))
                        performClick()
                        true
                    } else false
                }
                else -> inNav
            }
        }
        addView(navSurface, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        showPage(0)
    }

    override fun performClick(): Boolean {
        super.performClick()
        return true
    }

    fun showPage(index: Int) {
        val safe = index.coerceIn(0, drawables.lastIndex)
        pageIndex = safe
        val page = Aig436VisualPageContract.pages[safe]
        image.setImageResource(drawables[safe])
        contentDescription = "AIG436 RGB PAGE ${page.id}"
        Log.i(TAG, "page=${page.id}|authority=LIBRARY_FINAL|topLayer=RGB")
    }

    private companion object {
        const val TAG = "AIG436_VISUAL"
    }
}
