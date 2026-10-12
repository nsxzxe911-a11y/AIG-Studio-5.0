package com.aigstudio.app

import android.app.Activity
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.util.Log
import android.view.Gravity
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import com.aigstudio.core.CoordinatePrecisionRuntime
import com.aigstudio.core.ProductionUiSwitchContract
import com.aigstudio.core.UiLocalizationRegistry
import com.aigstudio.core.VisibleFunctionUiContract

class AigCncStartupGateView(
    private val activity: Activity,
    private val onReady: () -> Unit
) : FrameLayout(activity) {
    private val progressBar = ProgressBar(activity, null, android.R.attr.progressBarStyleHorizontal)
    private val progressText = TextView(activity)
    private val statusText = TextView(activity)
    private var readyDelivered = false

    init {
        setBackgroundColor(BACKGROUND)
        contentDescription = "AIG CNC RGB STARTUP AUTHORITY"
        addView(
            ImageView(activity).apply {
                setImageResource(R.drawable.aig_mobile_login_master_q90)
                scaleType = ImageView.ScaleType.FIT_XY
                contentDescription = "AIG CNC RGB 啟動主圖"
            },
            LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        )
        addView(buildProgressPanel(), LayoutParams(LayoutParams.MATCH_PARENT, dp(92), Gravity.BOTTOM).apply {
            setMargins(dp(22), 0, dp(22), dp(34))
        })
        render(0, "正在載入正式介面…")
        Log.i(TAG, "screen=STARTUP_RGB|progress=0|engineeringOverlay=false")
        post { runStepUiReady() }
    }

    private fun buildProgressPanel(): LinearLayout = LinearLayout(activity).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(14), dp(10), dp(14), dp(10))
        background = GradientDrawable().apply {
            cornerRadius = dp(14).toFloat()
            setColor(Color.argb(232, 2, 9, 18))
            setStroke(dp(1), CYAN)
        }
        statusText.apply {
            textSize = 12f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER_VERTICAL
            contentDescription = "AIG CNC 啟動狀態"
        }
        addView(statusText, LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, dp(26)))
        val row = LinearLayout(activity).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        progressBar.apply {
            max = 100
            progress = 0
            progressTintList = ColorStateList.valueOf(CYAN)
            contentDescription = "AIG CNC 啟動進度"
        }
        row.addView(progressBar, LinearLayout.LayoutParams(0, dp(10), 1f))
        progressText.apply {
            textSize = 12f
            setTextColor(CYAN)
            gravity = Gravity.END or Gravity.CENTER_VERTICAL
        }
        row.addView(progressText, LinearLayout.LayoutParams(dp(62), dp(28)))
        addView(row, LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, dp(34)))
    }

    private fun runStepUiReady() {
        complete(25, "正式 RGB 介面已載入")
        postDelayed(::runStepSettings, STEP_VISIBLE_MS)
    }

    private fun runStepSettings() {
        val result = runCatching {
            val snapshot = SharedSettingsAndroidBridge.load(activity).snapshot()
            require(snapshot.localeId in UiLocalizationRegistry.supportedLocales) { "語言設定無效" }
            require(CoordinatePrecisionRuntime.ENGINE_RESOLUTION_MM == 0.001) { "0.001 mm 精度核心未就緒" }
        }
        if (result.isFailure) {
            fail(result.exceptionOrNull()?.message ?: "設定載入失敗")
            return
        }
        complete(50, "設定與 0.001 mm 精度已載入")
        postDelayed(::runStepStorage, STEP_VISIBLE_MS)
    }

    private fun runStepStorage() {
        val dir = activity.filesDir
        val ok = (dir.exists() || dir.mkdirs()) && dir.canRead() && dir.canWrite()
        if (!ok) {
            fail("本機資料目錄不可用")
            return
        }
        complete(75, "本機資料已就緒")
        postDelayed(::runStepRoutes, STEP_VISIBLE_MS)
    }

    private fun runStepRoutes() {
        val expected = listOf("CAD", "CAM", "SIM", "3AX", "4AX", "5AX", "6AX", "NC", "AI")
        val ok = runCatching {
            require(VisibleFunctionUiContract.requiredModes == expected)
            expected.forEach(ProductionUiSwitchContract::runtimeTarget)
        }.isSuccess
        if (!ok) {
            fail("正式頁面路由驗證失敗")
            return
        }
        complete(100, "本機資料讀取完成 • READY")
        if (!readyDelivered) {
            readyDelivered = true
            postDelayed({
                animate().alpha(0f).setDuration(180L).withEndAction(onReady).start()
            }, STEP_VISIBLE_MS)
        }
    }

    private fun complete(progress: Int, message: String) {
        render(progress, message)
        Log.i(TAG, "progress=$progress|message=$message")
    }

    private fun fail(message: String) {
        statusText.setTextColor(ALARM)
        statusText.text = message
        statusText.contentDescription = "AIG CNC 啟動失敗 $message"
        Log.e(TAG, "startup=FAIL|message=$message")
    }

    private fun render(progress: Int, message: String) {
        progressBar.setProgress(progress.coerceIn(0, 100), true)
        progressText.text = "${progress.coerceIn(0, 100)}%"
        statusText.text = message
        statusText.setTextColor(Color.WHITE)
        contentDescription = "AIG CNC RGB STARTUP AUTHORITY $progress% $message"
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private companion object {
        const val TAG = "AIGCNC_STARTUP"
        const val STEP_VISIBLE_MS = 120L
        val BACKGROUND = Color.rgb(2, 4, 7)
        val CYAN = Color.rgb(39, 233, 255)
        val ALARM = Color.rgb(255, 70, 95)
    }
}
