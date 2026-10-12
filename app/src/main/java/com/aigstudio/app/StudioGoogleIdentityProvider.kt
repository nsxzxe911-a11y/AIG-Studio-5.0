package com.aigstudio.app

import android.app.Activity
import android.os.CancellationSignal
import android.util.Base64
import androidx.credentials.CredentialManager
import androidx.credentials.CredentialManagerCallback
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import java.security.SecureRandom

data class StudioGoogleIdentityOutcome(
    val ok: Boolean,
    val message: String,
    val subject: String? = null,
    val displayName: String? = null
)

class StudioGoogleIdentityProvider(private val activity: Activity) {
    private val credentialManager = CredentialManager.create(activity)

    private fun nonce(): String {
        val bytes = ByteArray(32)
        SecureRandom().nextBytes(bytes)
        return Base64.encodeToString(
            bytes,
            Base64.NO_WRAP or Base64.URL_SAFE or Base64.NO_PADDING
        )
    }

    fun signIn(callback: (StudioGoogleIdentityOutcome) -> Unit) {
        val clientId = BuildConfig.GOOGLE_WEB_CLIENT_ID.trim()
        if (!StudioGoogleIdentityConfig.isReady(clientId)) {
            callback(
                StudioGoogleIdentityOutcome(
                    ok = false,
                    message = "Google 登入尚未設定 • 可離線進入"
                )
            )
            return
        }

        val option = GetSignInWithGoogleOption.Builder(clientId)
            .setNonce(nonce())
            .build()
        val request = GetCredentialRequest.Builder()
            .addCredentialOption(option)
            .build()

        credentialManager.getCredentialAsync(
            activity,
            request,
            CancellationSignal(),
            activity.mainExecutor,
            object : CredentialManagerCallback<GetCredentialResponse, GetCredentialException> {
                override fun onResult(result: GetCredentialResponse) {
                    val credential = result.credential
                    if (
                        credential !is CustomCredential ||
                        credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                    ) {
                        callback(StudioGoogleIdentityOutcome(false, "Google 登入回應格式不支援"))
                        return
                    }
                    callback(
                        runCatching {
                            val google = GoogleIdTokenCredential.createFrom(credential.data)
                            StudioGoogleIdentityOutcome(
                                ok = true,
                                message = "Google 登入成功",
                                subject = google.id,
                                displayName = google.displayName
                            )
                        }.getOrElse {
                            StudioGoogleIdentityOutcome(
                                ok = false,
                                message = "Google 登入資料無法解析 • ${it.message ?: "invalid response"}"
                            )
                        }
                    )
                }

                override fun onError(e: GetCredentialException) {
                    callback(
                        StudioGoogleIdentityOutcome(
                            ok = false,
                            message = "Google 登入未完成 • ${e.message ?: e.javaClass.simpleName}"
                        )
                    )
                }
            }
        )
    }
}
