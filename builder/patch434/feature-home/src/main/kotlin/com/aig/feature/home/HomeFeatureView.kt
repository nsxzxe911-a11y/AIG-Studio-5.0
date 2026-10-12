package com.aig.feature.home

import android.content.Context
import android.graphics.Color
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import com.aig.core.settings.RuntimeSettings
import com.aig.core.ui.UiKit

object HomeFeatureView {
    fun create(c: Context): View {
        val settings = RuntimeSettings()
        return UiKit.column(c).apply {
            setBackgroundColor(Color.rgb(2, 4, 7))
            gravity = Gravity.TOP
            setPadding(UiKit.dp(c, 14), UiKit.dp(c, 18), UiKit.dp(c, 14), UiKit.dp(c, 12))

            addView(UiKit.label(c, "AIG-II / AIG CNC", 28f))
            addView(
                UiKit.statusLabel(
                    c,
                    "0.001 mm • ${settings.fps.fps}Hz • 本機離線可用"
                )
            )

            addView(UiKit.panel(c).apply {
                addView(UiKit.label(c, "加工流程", 19f))
                addView(UiKit.label(c, "製圖 → 刀路 → 模擬 → NC", 16f))
                addView(UiKit.label(c, "CAD / CAM / SIM / NC 可獨立操作，也可依流程串接。", 13f))
            }, LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, UiKit.dp(c, 12), 0, 0) })

            addView(UiKit.panel(c).apply {
                addView(UiKit.label(c, "加工功能", 19f))
                addView(UiKit.label(c, "CAD  幾何 / SNAP / TRIM / EXTEND / OFFSET / ARRAY", 14f))
                addView(UiKit.label(c, "CAM  手動優先 / Safe-Z / 避讓 / 刀路編輯", 14f))
                addView(UiKit.label(c, "NC   Fanuc 編輯 / G-M Code / 單節 / 空跑", 14f))
            }, LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, UiKit.dp(c, 10), 0, 0) })

            addView(UiKit.panel(c).apply {
                addView(UiKit.label(c, "機台與模擬", 19f))
                addView(UiKit.label(c, "3AX  X / Y / Z", 14f))
                addView(UiKit.label(c, "4AX  A", 14f))
                addView(UiKit.label(c, "5AX  A / B", 14f))
                addView(UiKit.label(c, "6AX  A / B / C", 14f))
                addView(UiKit.label(c, "SIM  材料移除與刀路檢查", 14f))
            }, LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, UiKit.dp(c, 10), 0, 0) })
        }
    }
}
