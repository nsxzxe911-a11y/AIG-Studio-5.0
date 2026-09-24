package com.aigstudio.app

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.widget.Toast
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Base64
import java.io.ByteArrayOutputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import java.util.Locale

data class UpdateConfig(
    val manifestUrl: String,
    val rsaPublicKeyBase64: String,
    val autoDownload: Boolean = true
) {
    val configured: Boolean
        get() = manifestUrl.startsWith("https://") && rsaPublicKeyBase64.isNotBlank()
}

data class UpdateManifest(
    val packageName: String,
    val versionCode: Long,
    val versionName: String,
    val apkUrl: String,
    val sha256: String,
    val signature: String
) {
    fun canonicalPayload(): String =
        listOf(packageName, versionCode.toString(), versionName, apkUrl, sha256.lowercase(Locale.US))
            .joinToString("|")
}

data class UpdateOutcome(
    val ok: Boolean,
    val available: Boolean,
    val message: String,
    val verifiedApk: File? = null
)

data class SecurityFinding(
    val path: String,
    val severity: String,
    val reason: String,
    val sha256: String?
)

data class SecurityReport(
    val scannedFiles: Int,
    val hashedFiles: Int,
    val findings: List<SecurityFinding>
) {
    val clean: Boolean get() = findings.none { it.severity == "HIGH" }
}

object UpdateConfigStore {
    private const val PREF = "secure_update_config"
    private const val KEY_URL = "manifest_url"
    private const val KEY_PUB = "rsa_public_key"
    private const val KEY_AUTO = "auto_download"

    fun load(context: Context): UpdateConfig {
        val p = context.getSharedPreferences(PREF, Context.MODE_PRIVATE)
        return UpdateConfig(
            p.getString(KEY_URL, "") ?: "",
            p.getString(KEY_PUB, "") ?: "",
            p.getBoolean(KEY_AUTO, true)
        )
    }

    fun save(context: Context, config: UpdateConfig) {
        context.getSharedPreferences(PREF, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_URL, config.manifestUrl.trim())
            .putString(KEY_PUB, config.rsaPublicKeyBase64.filterNot(Char::isWhitespace))
            .putBoolean(KEY_AUTO, config.autoDownload)
            .apply()
    }
}

object NetworkSecurity {
    fun status(context: Context): String {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return "OFFLINE"
        val caps = cm.getNetworkCapabilities(network) ?: return "OFFLINE"
        val internet = caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        val validated = caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        return when {
            internet && validated -> "ONLINE / VALIDATED"
            internet -> "ONLINE / UNVALIDATED"
            else -> "OFFLINE"
        }
    }

    fun requireHttps(url: String): URI {
        val uri = URI(url.trim())
        require(uri.scheme.equals("https", ignoreCase = true)) { "HTTPS required" }
        val host = uri.host ?: error("Missing host")
        require(host.isNotBlank()) { "Missing host" }
        require(host != "localhost" && host != "127.0.0.1" && host != "::1") { "Localhost blocked" }
        return uri
    }
}

object AppSecurityScanner {
    private val highRiskExt = setOf(
        "exe", "dll", "bat", "cmd", "ps1", "vbs", "scr", "com", "msi",
        "so", "dex", "jar", "js", "sh"
    )

    fun scan(roots: List<File>, maxFiles: Int = 1500): SecurityReport {
        var scanned = 0
        var hashed = 0
        val findings = mutableListOf<SecurityFinding>()

        for (root in roots.distinctBy { runCatching { it.canonicalPath }.getOrDefault(it.absolutePath) }) {
            if (!root.exists()) continue
            val rootCanonical = runCatching { root.canonicalFile }.getOrElse { root.absoluteFile }
            val prefix = rootCanonical.path.trimEnd(File.separatorChar) + File.separator

            root.walkTopDown().forEach { file ->
                if (scanned >= maxFiles) return@forEach
                if (!file.isFile) return@forEach
                scanned++

                val canonical = runCatching { file.canonicalFile }.getOrNull()
                if (canonical == null || (!canonical.path.startsWith(prefix) && canonical != rootCanonical)) {
                    findings += SecurityFinding(file.absolutePath, "HIGH", "Path escape / unreadable canonical path", null)
                    return@forEach
                }

                val ext = file.extension.lowercase(Locale.US)
                val size = file.length()
                val verifiedUpdate = file.parentFile?.name == "verified-updates" && ext == "apk"
                var reason: String? = null
                var severity = "LOW"

                if (ext in highRiskExt) {
                    reason = "Executable/script type ." + ext
                    severity = "HIGH"
                } else if (ext == "apk" && !verifiedUpdate) {
                    reason = "APK outside verified-updates"
                    severity = "HIGH"
                } else if (size > 256L * 1024L * 1024L) {
                    reason = "Unusually large file"
                    severity = "MEDIUM"
                }

                val magic = readMagic(file)
                if (magic == "MZ" || magic == "ELF" || magic == "DEX") {
                    reason = (reason?.plus("; ") ?: "") + "Executable magic=" + magic
                    severity = "HIGH"
                }

                val hash = if (size <= 64L * 1024L * 1024L) {
                    hashed++
                    runCatching { sha256(file) }.getOrNull()
                } else null

                if (reason != null) {
                    findings += SecurityFinding(file.absolutePath, severity, reason, hash)
                }
            }
            if (scanned >= maxFiles) break
        }

        return SecurityReport(scanned, hashed, findings)
    }

    private fun readMagic(file: File): String? {
        return runCatching {
            file.inputStream().use { input ->
                val b = ByteArray(4)
                val n = input.read(b)
                when {
                    n >= 2 && b[0] == 'M'.code.toByte() && b[1] == 'Z'.code.toByte() -> "MZ"
                    n >= 4 && b[0] == 0x7f.toByte() && b[1] == 'E'.code.toByte() &&
                        b[2] == 'L'.code.toByte() && b[3] == 'F'.code.toByte() -> "ELF"
                    n >= 4 && b[0] == 'd'.code.toByte() && b[1] == 'e'.code.toByte() &&
                        b[2] == 'x'.code.toByte() && b[3] == '\n'.code.toByte() -> "DEX"
                    else -> null
                }
            }
        }.getOrNull()
    }

    fun sha256(file: File): String {
        val md = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(64 * 1024)
            while (true) {
                val n = input.read(buffer)
                if (n <= 0) break
                md.update(buffer, 0, n)
            }
        }
        return md.digest().joinToString("") { "%02x".format(it) }
    }
}

class UpdateInstallReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                val confirm = if (Build.VERSION.SDK_INT >= 33) {
                    intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
                }
                confirm?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                if (confirm != null) context.startActivity(confirm)
            }
            PackageInstaller.STATUS_SUCCESS ->
                Toast.makeText(context, "AIG CNC 更新安裝完成", Toast.LENGTH_LONG).show()
            else -> {
                val message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: "unknown installer error"
                Toast.makeText(context, "UPDATE BLOCKED: $message", Toast.LENGTH_LONG).show()
            }
        }
    }
}

object SecureUpdateManager {
    private const val MAX_MANIFEST_BYTES = 64 * 1024
    private const val MAX_APK_BYTES = 300L * 1024L * 1024L
    private val main = Handler(Looper.getMainLooper())

    fun autoCheck(
        context: Context,
        config: UpdateConfig,
        onResult: (UpdateOutcome) -> Unit
    ) {
        if (!config.configured) {
            onResult(UpdateOutcome(false, false, "UPDATE BLOCKED: HTTPS manifest/public key not configured"))
            return
        }

        Thread({
            val outcome = runCatching {
                val manifest = fetchManifest(config)
                validateManifest(context, config, manifest)
                val current = currentVersionCode(context)
                if (manifest.versionCode < current) {
                    UpdateOutcome(false, false, "DOWNGRADE BLOCKED: " + manifest.versionCode + " < " + current + " • UPGRADE ONLY")
                } else if (manifest.versionCode == current) {
                    UpdateOutcome(true, false, "UPDATE CURRENT: v" + current)
                } else if (!config.autoDownload) {
                    UpdateOutcome(true, true, "UPDATE AVAILABLE: " + manifest.versionName + " (" + manifest.versionCode + ")")
                } else {
                    val apk = downloadAndVerify(context, manifest)
                    UpdateOutcome(
                        true,
                        true,
                        "VERIFIED UPDATE READY: " + manifest.versionName + "; Android install confirmation still required",
                        apk
                    )
                }
            }.getOrElse { error ->
                UpdateOutcome(false, false, "UPDATE BLOCKED: " + (error.message ?: "verification error"))
            }
            main.post { onResult(outcome) }
        }, "SecureUpdate").start()
    }

    fun installVerifiedUpdate(context: Context, apk: File): String {
        require(apk.isFile && apk.parentFile?.name == "verified-updates") { "Verified APK missing" }
        require(apkPackageName(context, apk) == context.packageName) { "APK package mismatch before install" }
        val installedVersion = currentVersionCode(context)
        val candidateVersion = apkVersionCode(context, apk) ?: error("Verified APK version unreadable")
        require(candidateVersion > installedVersion) {
            "DOWNGRADE/EQUAL VERSION BLOCKED: candidate=" + candidateVersion +
                " current=" + installedVersion + " • UPGRADE ONLY"
        }
        require(installedSignerDigests(context) == archiveSignerDigests(context, apk)) {
            "APK signing certificate mismatch before install"
        }

        val installer = context.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
            setAppPackageName(context.packageName)
        }
        val sessionId = installer.createSession(params)
        installer.openSession(sessionId).use { session ->
            apk.inputStream().use { input ->
                session.openWrite("AIG_CNC_verified_update.apk", 0, apk.length()).use { out ->
                    input.copyTo(out, 64 * 1024)
                    session.fsync(out)
                }
            }
            val callback = Intent(context, UpdateInstallReceiver::class.java).apply {
                action = context.packageName + ".VERIFIED_UPDATE_RESULT"
                putExtra("sourceApk", apk.name)
            }
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            val pending = PendingIntent.getBroadcast(context, sessionId, callback, flags)
            session.commit(pending.intentSender)
        }
        return "VERIFIED UPDATE INSTALL REQUESTED • Android confirmation required"
    }

    private fun fetchManifest(config: UpdateConfig): UpdateManifest {
        NetworkSecurity.requireHttps(config.manifestUrl)
        val bytes = downloadSmall(config.manifestUrl, MAX_MANIFEST_BYTES)
        val props = bytes.toString(Charsets.UTF_8)
            .lineSequence()
            .map { it.trim() }
            .filter { it.isNotEmpty() && !it.startsWith("#") }
            .mapNotNull { line ->
                val i = line.indexOf('=')
                if (i <= 0) null else line.substring(0, i).trim() to line.substring(i + 1).trim()
            }
            .toMap()

        return UpdateManifest(
            packageName = props["packageName"] ?: error("manifest packageName missing"),
            versionCode = props["versionCode"]?.toLongOrNull() ?: error("manifest versionCode invalid"),
            versionName = props["versionName"] ?: error("manifest versionName missing"),
            apkUrl = props["apkUrl"] ?: error("manifest apkUrl missing"),
            sha256 = props["sha256"] ?: error("manifest sha256 missing"),
            signature = props["signature"] ?: error("manifest signature missing")
        )
    }

    private fun validateManifest(context: Context, config: UpdateConfig, manifest: UpdateManifest) {
        require(manifest.packageName == context.packageName) { "Package mismatch" }
        NetworkSecurity.requireHttps(manifest.apkUrl)
        require(Regex("^[0-9a-fA-F]{64}$").matches(manifest.sha256)) { "Invalid SHA-256" }
        verifyManifestSignature(config.rsaPublicKeyBase64, manifest)
    }

    private fun verifyManifestSignature(publicKeyBase64: String, manifest: UpdateManifest) {
        val keyBytes = Base64.decode(publicKeyBase64.filterNot(Char::isWhitespace), Base64.DEFAULT)
        val key = KeyFactory.getInstance("RSA").generatePublic(X509EncodedKeySpec(keyBytes))
        val sig = Signature.getInstance("SHA256withRSA")
        sig.initVerify(key)
        sig.update(manifest.canonicalPayload().toByteArray(Charsets.UTF_8))
        val signatureBytes = Base64.decode(manifest.signature, Base64.DEFAULT)
        require(sig.verify(signatureBytes)) { "Manifest signature invalid" }
    }

    private fun downloadAndVerify(context: Context, manifest: UpdateManifest): File {
        val dir = File(context.filesDir, "verified-updates").apply { mkdirs() }
        val temp = File(dir, "update-" + manifest.versionCode + ".apk.part")
        val target = File(dir, "update-" + manifest.versionCode + ".apk")
        if (temp.exists()) temp.delete()

        val uri = NetworkSecurity.requireHttps(manifest.apkUrl)
        val conn = (URL(uri.toString()).openConnection() as HttpURLConnection).apply {
            connectTimeout = 8000
            readTimeout = 15000
            instanceFollowRedirects = false
            requestMethod = "GET"
            setRequestProperty("Accept", "application/vnd.android.package-archive,application/octet-stream")
        }

        try {
            require(conn.responseCode == HttpURLConnection.HTTP_OK) { "APK HTTP " + conn.responseCode }
            val length = conn.contentLengthLong
            require(length <= 0 || length <= MAX_APK_BYTES) { "APK too large" }

            val md = MessageDigest.getInstance("SHA-256")
            var total = 0L
            temp.outputStream().use { out ->
                conn.inputStream.use { input ->
                    val buffer = ByteArray(64 * 1024)
                    while (true) {
                        val n = input.read(buffer)
                        if (n <= 0) break
                        total += n
                        require(total <= MAX_APK_BYTES) { "APK too large" }
                        md.update(buffer, 0, n)
                        out.write(buffer, 0, n)
                    }
                }
            }

            val actual = md.digest().joinToString("") { "%02x".format(it) }
            require(actual.equals(manifest.sha256, ignoreCase = true)) { "APK SHA-256 mismatch" }
            require(apkPackageName(context, temp) == context.packageName) { "Downloaded APK package mismatch" }
            require(installedSignerDigests(context) == archiveSignerDigests(context, temp)) {
                "APK signing certificate mismatch"
            }

            if (target.exists()) target.delete()
            require(temp.renameTo(target)) { "Unable to finalize verified update" }
            return target
        } finally {
            conn.disconnect()
            if (temp.exists()) temp.delete()
        }
    }

    private fun downloadSmall(url: String, maxBytes: Int): ByteArray {
        val uri = NetworkSecurity.requireHttps(url)
        val conn = (URL(uri.toString()).openConnection() as HttpURLConnection).apply {
            connectTimeout = 8000
            readTimeout = 8000
            instanceFollowRedirects = false
            requestMethod = "GET"
            setRequestProperty("Accept", "text/plain")
        }
        try {
            require(conn.responseCode == HttpURLConnection.HTTP_OK) { "Manifest HTTP " + conn.responseCode }
            val out = ByteArrayOutputStream()
            conn.inputStream.use { input ->
                val buffer = ByteArray(8192)
                while (true) {
                    val n = input.read(buffer)
                    if (n <= 0) break
                    require(out.size() + n <= maxBytes) { "Manifest too large" }
                    out.write(buffer, 0, n)
                }
            }
            return out.toByteArray()
        } finally {
            conn.disconnect()
        }
    }

    @Suppress("DEPRECATION")
    private fun currentVersionCode(context: Context): Long {
        val info = context.packageManager.getPackageInfo(context.packageName, 0)
        return if (Build.VERSION.SDK_INT >= 28) {
            info.longVersionCode
        } else {
            info.versionCode.toLong()
        }
    }

    private fun apkPackageName(context: Context, apk: File): String? =
        context.packageManager.getPackageArchiveInfo(apk.absolutePath, 0)?.packageName

    @Suppress("DEPRECATION")
    private fun apkVersionCode(context: Context, apk: File): Long? {
        val info = context.packageManager.getPackageArchiveInfo(apk.absolutePath, 0) ?: return null
        return if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else info.versionCode.toLong()
    }

    @Suppress("DEPRECATION")
    private fun installedSignerDigests(context: Context): Set<String> {
        val pm = context.packageManager
        return if (Build.VERSION.SDK_INT >= 28) {
            val info = pm.getPackageInfo(context.packageName, PackageManager.GET_SIGNING_CERTIFICATES)
            val signingInfo = info.signingInfo ?: return emptySet()
            val signatures = if (signingInfo.hasMultipleSigners()) signingInfo.apkContentsSigners
            else signingInfo.signingCertificateHistory
            signatures.map { digestBytes(it.toByteArray()) }.toSet()
        } else {
            val info = pm.getPackageInfo(context.packageName, PackageManager.GET_SIGNATURES)
            info.signatures.orEmpty().map { digestBytes(it.toByteArray()) }.toSet()
        }
    }

    @Suppress("DEPRECATION")
    private fun archiveSignerDigests(context: Context, apk: File): Set<String> {
        val pm = context.packageManager
        return if (Build.VERSION.SDK_INT >= 28) {
            val info = pm.getPackageArchiveInfo(apk.absolutePath, PackageManager.GET_SIGNING_CERTIFICATES)
                ?: return emptySet()
            val signingInfo = info.signingInfo ?: return emptySet()
            val signatures = if (signingInfo.hasMultipleSigners()) signingInfo.apkContentsSigners
            else signingInfo.signingCertificateHistory
            signatures.map { digestBytes(it.toByteArray()) }.toSet()
        } else {
            val info = pm.getPackageArchiveInfo(apk.absolutePath, PackageManager.GET_SIGNATURES)
                ?: return emptySet()
            info.signatures.orEmpty().map { digestBytes(it.toByteArray()) }.toSet()
        }
    }

    private fun digestBytes(bytes: ByteArray): String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
}
