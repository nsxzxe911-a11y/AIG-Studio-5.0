package com.aigstudio.desktop

import com.aigstudio.core.AiRgbMissingAssetContract
import com.aigstudio.core.AiRgbRuntimeSurface
import java.awt.image.BufferedImage
import java.security.MessageDigest
import javax.imageio.ImageIO

object AiRgbSupplementalAssets {
    @Volatile var lastWarning:String? = null
        private set

    private fun sha256(bytes:ByteArray):String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }

    private fun resourceBytes(path:String):ByteArray =
        requireNotNull(AiRgbSupplementalAssets::class.java.getResourceAsStream(path)) { "resource missing: $path" }.use { it.readBytes() }

    private fun expectedHash(manifest:String,surface:AiRgbRuntimeSurface):String {
        val start=manifest.indexOf("\"${surface.name}\"")
        require(start>=0) { "manifest surface missing: ${surface.name}" }
        val tail=manifest.substring(start)
        val match=Regex("\"runtime_sha256\"\\s*:\\s*\"([0-9a-f]{64})\"").find(tail)
            ?: error("manifest runtime_sha256 missing: ${surface.name}")
        return match.groupValues[1]
    }

    private fun verifiedBytes(surface:AiRgbRuntimeSurface):ByteArray? = runCatching {
        val root=AiRgbMissingAssetContract.DESKTOP_SUPPLEMENTAL_ROOT
        val manifest=resourceBytes("$root/manifest.json").toString(Charsets.UTF_8)
        val file=AiRgbMissingAssetContract.fileName(surface)
        val bytes=resourceBytes("$root/$file")
        require(sha256(bytes)==expectedHash(manifest,surface)) { "AI RGB SHA mismatch: $file" }
        lastWarning=null
        bytes
    }.getOrElse {
        lastWarning="AI RGB supplemental unavailable • ${it.message ?: it.javaClass.simpleName} • fallback Pack ${AiRgbMissingAssetContract.FALLBACK_PACK}"
        null
    }

    fun loadDesktopHome():BufferedImage? =
        verifiedBytes(AiRgbRuntimeSurface.HOME_DESKTOP)?.let { bytes ->
            ImageIO.read(bytes.inputStream())
        }
}
