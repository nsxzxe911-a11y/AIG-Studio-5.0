package com.aigstudio.app

import android.content.Context
import android.util.Base64
import java.security.SecureRandom
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

class StudioLocalLoginStore(context: Context) {
    private val prefs = context.applicationContext
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    data class Profile(
        val account: String,
        val rememberAccount: Boolean,
        val configured: Boolean
    )

    fun profile(): Profile = Profile(
        account = if (prefs.getBoolean(KEY_REMEMBER, false)) {
            prefs.getString(KEY_ACCOUNT, "").orEmpty()
        } else {
            ""
        },
        rememberAccount = prefs.getBoolean(KEY_REMEMBER, false),
        configured = prefs.contains(KEY_HASH) && prefs.contains(KEY_SALT)
    )

    fun enroll(account: String, password: String, rememberAccount: Boolean) {
        require(account.isNotBlank()) { "AIG 帳號不得空白" }
        require(password.length >= 4) { "AIG 密碼至少 4 碼" }
        val salt = ByteArray(16).also(SecureRandom()::nextBytes)
        val hash = derive(password, salt)
        prefs.edit()
            .putString(KEY_ACCOUNT, account.trim())
            .putString(KEY_SALT, Base64.encodeToString(salt, Base64.NO_WRAP))
            .putString(KEY_HASH, Base64.encodeToString(hash, Base64.NO_WRAP))
            .putBoolean(KEY_REMEMBER, rememberAccount)
            .apply()
    }

    fun verify(account: String, password: String): Boolean {
        val expectedAccount = prefs.getString(KEY_ACCOUNT, null) ?: return false
        val saltEncoded = prefs.getString(KEY_SALT, null) ?: return false
        val hashEncoded = prefs.getString(KEY_HASH, null) ?: return false
        if (account.trim() != expectedAccount) return false
        return runCatching {
            val salt = Base64.decode(saltEncoded, Base64.NO_WRAP)
            val expected = Base64.decode(hashEncoded, Base64.NO_WRAP)
            constantTimeEquals(expected, derive(password, salt))
        }.getOrDefault(false)
    }

    fun setRememberAccount(enabled: Boolean, currentAccount: String) {
        val edit = prefs.edit().putBoolean(KEY_REMEMBER, enabled)
        if (enabled) edit.putString(KEY_ACCOUNT, currentAccount.trim())
        edit.apply()
    }

    private fun derive(password: String, salt: ByteArray): ByteArray {
        val spec = PBEKeySpec(password.toCharArray(), salt, 120_000, 256)
        return try {
            SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
                .generateSecret(spec)
                .encoded
        } finally {
            spec.clearPassword()
        }
    }

    private fun constantTimeEquals(a: ByteArray, b: ByteArray): Boolean {
        if (a.size != b.size) return false
        var diff = 0
        for (i in a.indices) {
            diff = diff or (a[i].toInt() xor b[i].toInt())
        }
        return diff == 0
    }

    companion object {
        private const val PREFS_NAME = "aig_cnc_local_login"
        private const val KEY_ACCOUNT = "account"
        private const val KEY_SALT = "salt"
        private const val KEY_HASH = "hash"
        private const val KEY_REMEMBER = "remember"
    }
}
