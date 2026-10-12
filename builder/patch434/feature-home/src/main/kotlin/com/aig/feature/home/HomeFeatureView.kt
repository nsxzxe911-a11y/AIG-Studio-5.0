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

            addView(UiKit.label(c, "AIG-II / AIG CNC", 28f))
            addView(UiKit.label(c, "435.0.0 • 正式 Runtime HOME", 16f))
            addView(
                UiKit.statusLabel(
                    c,
                    "0.001 mm • ${settings.fps.fps}Hz • GPU 3D ${if (settings.gpu3d) "ON" else "OFF"} • 本機離線可用"
                )
            )

            addView(UiKit.panel(c).apply {
                addView(UiKit.label(c, "加工核心", 18f))
                addView(UiKit.label(c, "CAD  真幾何 / SNAP / TRIM / EXTEND / OFFSET / ARRAY", 14f))
                addView(UiKit.label(c, "CAM  MANUAL 優先 / Safe-Z / 避讓 / A-B-C 保留", 14f))
                addView(UiKit.label(c, "NC   Fanuc 編輯 / G-M Code / 0.001 mm", 14f))
            }, LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, UiKit.dp(c, 8), 0, 0) })

            addView(UiKit.panel(c).apply {
                addView(UiKit.label(c, "模擬與軸態", 18f))
                addView(UiKit.label(c, "SIM  OpenGL ES / 數值材料移除", 14f))
                addView(UiKit.label(c, "3AX  X/Y/Z", 14f))
                addView(UiKit.label(c, "4AX  A", 14f))
                addView(UiKit.label(c, "5AX  A/B", 14f))
                addView(UiKit.label(c, "6AX  A/B/C • VERTICAL ONLY", 14f))
            }, LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, UiKit.dp(c, 8), 0, 0) })

            addView(UiKit.panel(c).apply {
                addView(UiKit.label(c, "Runtime 狀態", 18f))
                addView(UiKit.label(c, "One Scene / One Renderer / No Overlay", 14f))
                addView(UiKit.label(c, "HOME 不使用整張 UI 截圖，不建立第二套假按鈕。", 14f))
            }, LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, UiKit.dp(c, 8), 0, 0) })
        }
    }
}
