package com.aigstudio.app

import android.app.Activity
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.text.method.PasswordTransformationMethod
import android.view.Gravity
import android.view.View
import android.widget.CheckBox
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import com.aigstudio.core.CoordinatePrecisionRuntime
import com.aigstudio.core.ProductionUiSwitchContract
import com.aigstudio.core.UiLocalizationRegistry
import com.aigstudio.core.VisibleFunctionUiContract
import java.io.File
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class AigCncLoginGateView(
    private val activity: Activity,
    private val onAuthenticated: (mode: String, account: String) -> Unit
) : FrameLayout(activity) {
    private val store = StudioLocalLoginStore(activity)
    private val googleIdentityProvider = StudioGoogleIdentityProvider(activity)
    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    private val authInFlight = AtomicBoolean(false)

    private val account = EditText(activity)
    private val password = EditText(activity)
    private val remember = CheckBox(activity)
    private val showPassword = TextView(activity)
    private val confirmButton = TextView(activity)
    private val googleButton = TextView(activity)
    private val offlineButton = TextView(activity)
    private val status = TextView(activity)
    private val progressPanel = LinearLayout(activity)
    private val progress = ProgressBar(activity, null, android.R.attr.progressBarStyleHorizontal)
    private val progressText = TextView(activity)

    init {
        setBackgroundColor(Color.rgb(2, 4, 7))
        contentDescription = "AIG CNC LOGIN RGB AUTHORITY"
        buildSurface()
    }

    private fun buildSurface() {
        addView(
            ImageView(activity).apply {
                setImageResource(R.drawable.aig_mobile_login_master_q90)
                scaleType = ImageView.ScaleType.FIT_XY
                contentDescription = "AIG CNC RGB 手機正式登入主圖"
            },
            LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        )

        val profile = store.profile()
        configureField(account, secret = false)
        account.setText(profile.account)
        account.contentDescription = "AIGCNC LOGIN ACCOUNT"
        addView(account)

        configureField(password, secret = true)
        password.contentDescription = "AIGCNC LOGIN PASSWORD"
        addView(password)

        remember.apply {
            text = ""
            isChecked = profile.rememberAccount || profile.account.isNotBlank()
            buttonTintList = ColorStateList.valueOf(CYAN)
            contentDescription = "AIGCNC LOGIN REMEMBER"
            setBackgroundColor(Color.TRANSPARENT)
        }
        addView(remember)

        showPassword.apply {
            text = ""
            isClickable = true
            isFocusable = true
            contentDescription = "AIGCNC LOGIN SHOW PASSWORD"
            setOnClickListener {
                val hidden = password.transformationMethod != null
                password.transformationMethod = if (hidden) null else PasswordTransformationMethod.getInstance()
                password.setSelection(password.text.length)
                contentDescription = if (hidden) {
                    "AIGCNC LOGIN HIDE PASSWORD"
                } else {
                    "AIGCNC LOGIN SHOW PASSWORD"
                }
            }
        }
        addView(showPassword)

        configureTouch(confirmButton, "AIGCNC LOGIN CONFIRM") { loginOrEnroll() }
        addView(confirmButton)

        configureTouch(googleButton, "AIGCNC LOGIN GOOGLE") { googleSignIn() }
        addView(googleButton)

        configureTouch(offlineButton, "AIGCNC LOGIN OFFLINE DIRECT") { offlineDirectLogin() }
        offlineButton.apply {
            text = "離線直接登入\n無需網路，使用本機資料直接進入"
            textSize = 12f
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            background = GradientDrawable().apply {
                cornerRadius = dp(12).toFloat()
                setColor(Color.argb(176, 7, 9, 25))
                setStroke(dp(2), 0xFFB72CFF.toInt())
            }
        }
        addView(offlineButton)

        status.apply {
            gravity = Gravity.CENTER
            textSize = 11f
            setTextColor(CYAN)
            setBackgroundColor(Color.argb(190, 2, 8, 16))
            visibility = View.GONE
            contentDescription = "AIGCNC LOGIN STATUS"
        }
        addView(status)

        progressPanel.apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(10), dp(5), dp(10), dp(5))
            background = GradientDrawable().apply {
                cornerRadius = dp(10).toFloat()
                setColor(Color.argb(205, 2, 9, 18))
                setStroke(dp(1), CYAN)
            }
            visibility = View.GONE
            addView(
                progressText.apply {
                    textSize = 11f
                    setTextColor(Color.WHITE)
                    gravity = Gravity.CENTER_VERTICAL
                },
                LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, dp(20))
            )
            addView(
                progress.apply {
                    max = 100
                    progress = 0
                    progressTintList = ColorStateList.valueOf(CYAN)
                    progressBackgroundTintList = ColorStateList.valueOf(Color.argb(150, 20, 45, 70))
                    contentDescription = "AIG CNC 離線本機資料讀取進度"
                },
                LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, dp(7)).apply {
                    topMargin = dp(2)
                }
            )
        }
        addView(progressPanel)
    }

    private fun configureField(field: EditText, secret: Boolean) {
        field.apply {
            background = null
            setTextColor(Color.WHITE)
            setHintTextColor(Color.TRANSPARENT)
            textSize = 16f
            setSingleLine(true)
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(18), 0, dp(18), 0)
            inputType = if (secret) {
                InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            } else {
                InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
            }
            if (secret) transformationMethod = PasswordTransformationMethod.getInstance()
        }
    }

    private fun configureTouch(view: TextView, description: String, action: () -> Unit) {
        view.apply {
            text = ""
            setBackgroundColor(Color.TRANSPARENT)
            isClickable = true
            isFocusable = true
            contentDescription = description
            setOnClickListener { action() }
        }
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)
        val w = right - left
        val h = bottom - top
        if (w <= 0 || h <= 0) return
        place(account, 232, 674, 702, 737, w, h)
        place(password, 232, 747, 702, 812, w, h)
        place(remember, 222, 812, 286, 866, w, h)
        place(showPassword, 635, 744, 709, 814, w, h)
        place(confirmButton, 228, 866, 706, 955, w, h)
        place(googleButton, 229, 991, 706, 1063, w, h)
        place(offlineButton, 229, 1068, 706, 1138, w, h)
        place(status, 236, 1142, 698, 1192, w, h)
        place(progressPanel, 228, 1142, 706, 1200, w, h)
    }

    private fun place(view: View, l: Int, t: Int, r: Int, b: Int, w: Int, h: Int) {
        val sx = w / SOURCE_W.toFloat()
        val sy = h / SOURCE_H.toFloat()
        view.layout(
            (l * sx).toInt(),
            (t * sy).toInt(),
            (r * sx).toInt(),
            (b * sy).toInt()
        )
    }

    private fun loginOrEnroll() {
        val user = account.text.toString().trim()
        val pass = password.text.toString()
        if (user.isBlank() || pass.length < 4) {
            showStatus("請輸入 AIG 帳號與至少 4 碼密碼", ALARM)
            return
        }
        if (!authInFlight.compareAndSet(false, true)) return
        showStatus("AIG 本機驗證中…", CYAN)
        val networkAvailable = hasValidatedNetwork()
        executor.execute {
            val result = runCatching {
                val profile = store.profile()
                val valid = profile.configured && store.verify(user, pass)
                val decision = StudioLoginAuthPolicy.decide(
                    configured = profile.configured,
                    networkAvailable = networkAvailable,
                    credentialsValid = valid
                )
                if (decision.allowEnter && decision.mode == "LOCAL_ENROLL") {
                    store.enroll(user, pass, remember.isChecked)
                } else if (decision.allowEnter) {
                    store.setRememberAccount(remember.isChecked, user)
                }
                decision
            }
            mainHandler.post {
                authInFlight.set(false)
                result.onSuccess { decision ->
                    if (decision.allowEnter) {
                        onAuthenticated(decision.mode, user)
                    } else {
                        showStatus(decision.message, WARNING)
                    }
                }.onFailure {
                    showStatus(it.message ?: "本機登入驗證失敗", ALARM)
                }
            }
        }
    }

    private fun googleSignIn() {
        if (!authInFlight.compareAndSet(false, true)) return
        showStatus("正在開啟 Google 登入…", CYAN)
        googleIdentityProvider.signIn { outcome ->
            mainHandler.post {
                authInFlight.set(false)
                if (outcome.ok) {
                    val subject = outcome.subject.orEmpty().ifBlank { "google" }
                    showStatus(outcome.message, CYAN)
                    onAuthenticated("GOOGLE", subject)
                } else {
                    showStatus(outcome.message, WARNING)
                }
            }
        }
    }

    private fun offlineDirectLogin() {
        if (!authInFlight.compareAndSet(false, true)) return
        status.visibility = View.GONE
        progressPanel.visibility = View.VISIBLE
        setOfflineProgress(0, "正在讀取本機資料…")
        executor.execute {
            val result = runCatching {
                val files = activity.filesDir
                require(
                    (files.exists() || files.mkdirs()) && files.canRead() && files.canWrite()
                ) { "本機資料目錄不可用" }
                publishOfflineStep(0, "本機資料目錄")

                val snapshot = SharedSettingsAndroidBridge.load(activity).snapshot()
                require(snapshot.localeId in UiLocalizationRegistry.supportedLocales) { "本機設定驗證失敗" }
                require(CoordinatePrecisionRuntime.ENGINE_RESOLUTION_MM == 0.001) { "0.001 mm 精度核心未就緒" }
                publishOfflineStep(1, "本機設定")

                val expected = listOf("CAD", "CAM", "SIM", "3AX", "4AX", "5AX", "6AX", "NC", "AI")
                require(VisibleFunctionUiContract.requiredModes == expected) { "正式頁面路由驗證失敗" }
                expected.forEach(ProductionUiSwitchContract::runtimeTarget)
                publishOfflineStep(2, "正式頁面路由")

                val projectDir = File(files, "projects")
                require((projectDir.exists() || projectDir.mkdirs()) && projectDir.canRead()) { "本機專案資料不可用" }
                publishOfflineStep(3, "專案資料")
                publishOfflineStep(4, "READY")
            }
            mainHandler.post {
                authInFlight.set(false)
                result.onSuccess {
                    progressPanel.postDelayed(
                        { onAuthenticated("LOCAL_OFFLINE_DIRECT", "offline") },
                        180L
                    )
                }.onFailure {
                    progressPanel.visibility = View.GONE
                    showStatus(it.message ?: "離線本機資料讀取失敗", ALARM)
                }
            }
        }
    }

    private fun publishOfflineStep(index: Int, label: String) {
        val value = StudioEntryGateContract.offlineProgress[index]
        mainHandler.post {
            val message = if (value == 100) {
                "本機資料讀取完成 • READY"
            } else {
                "正在讀取$label…"
            }
            setOfflineProgress(value, message)
        }
        Thread.sleep(120L)
    }

    private fun setOfflineProgress(value: Int, message: String) {
        progress.setProgress(value, true)
        progressText.text = "$message    $value%"
        progressText.contentDescription = "AIG CNC 離線登入 $message $value%"
        progress.animate().alpha(0.72f).setDuration(80L).withEndAction {
            progress.animate().alpha(1f).setDuration(120L).start()
        }.start()
    }

    private fun showStatus(message: String, color: Int) {
        progressPanel.visibility = View.GONE
        status.visibility = View.VISIBLE
        status.text = message
        status.setTextColor(color)
        status.contentDescription = "AIGCNC LOGIN STATUS $message"
    }

    private fun hasValidatedNetwork(): Boolean = runCatching {
        val cm = activity.getSystemService(ConnectivityManager::class.java)
        val network = cm.activeNetwork ?: return@runCatching false
        val caps = cm.getNetworkCapabilities(network) ?: return@runCatching false
        caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }.getOrDefault(false)

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    override fun onDetachedFromWindow() {
        mainHandler.removeCallbacksAndMessages(null)
        executor.shutdownNow()
        super.onDetachedFromWindow()
    }

    private companion object {
        const val SOURCE_W = 934
        const val SOURCE_H = 1684
        const val CYAN = 0xFF27E9FF.toInt()
        const val WARNING = 0xFFFFB326.toInt()
        const val ALARM = 0xFFFF465F.toInt()
    }
}
