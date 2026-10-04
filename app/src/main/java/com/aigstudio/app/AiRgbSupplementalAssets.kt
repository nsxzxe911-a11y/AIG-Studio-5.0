package com.aigstudio.app

import android.content.Context
import android.graphics.drawable.Drawable
import com.aigstudio.core.AiRgbMissingAssetContract
import com.aigstudio.core.AiRgbRuntimeSurface
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.security.MessageDigest

object AiRgbSupplementalAssets {
    @Volatile var lastWarning:String? = null
        private set

    private fun sha256(bytes:ByteArray):String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }

    private fun verifiedBytes(context:Context,surface:AiRgbRuntimeSurface):ByteArray? = runCatching {
        val root=AiRgbMissingAssetContract.ANDROID_SUPPLEMENTAL_ROOT
        val manifest=JSONObject(context.assets.open("$root/manifest.json").bufferedReader().use{it.readText()})
        val node=manifest.getJSONObject("assets").getJSONObject(surface.name)
        val file=node.getString("file")
        require(file==AiRgbMissingAssetContract.fileName(surface)) { "AI RGB file mismatch" }
        val expected=node.getString("runtime_sha256")
        val bytes=context.assets.open("$root/$file").use{it.readBytes()}
        require(sha256(bytes)==expected) { "AI RGB SHA mismatch: $file" }
        lastWarning=null
        bytes
    }.getOrElse {
        lastWarning="AI RGB supplemental unavailable • ${it.message ?: it.javaClass.simpleName} • fallback Pack ${AiRgbMissingAssetContract.FALLBACK_PACK}"
        null
    }

    fun loadMobileHome(context:Context):Drawable? =
        verifiedBytes(context,AiRgbRuntimeSurface.HOME_MOBILE)?.let { bytes ->
            Drawable.createFromStream(ByteArrayInputStream(bytes),"home_mobile.jpg")
        }
}
