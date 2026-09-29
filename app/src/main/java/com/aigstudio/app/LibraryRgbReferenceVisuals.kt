package com.aigstudio.app

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.security.MessageDigest

object LibraryRgbReferenceVisuals {
    private data class Entry(val file:String,val sha256:String)
    private val entries=mapOf(
        "STARTUP" to Entry("startup_aigii_future_cnc_1536x1024.png","363115847162f726ae54011da431b79f5ac4563b4b844cf8b7dfc9ee5a0fff21"),
        "HOME" to Entry("startup_aigii_future_cnc_1536x1024.png","363115847162f726ae54011da431b79f5ac4563b4b844cf8b7dfc9ee5a0fff21"),
        "CAD" to Entry("mobile_cad_cam_future_853x1844.png","15ee24653dc67612bb61a2f105d66f25a09a6aa06b78ec094123305ec72ea06e"),
        "CAM" to Entry("mobile_cad_cam_future_853x1844.png","15ee24653dc67612bb61a2f105d66f25a09a6aa06b78ec094123305ec72ea06e"),
        "SIM" to Entry("desktop_ai_cnc_5_neon_1536x1024.png","081cd86c8e5f096400f2b272288e1af5610c833de3e0f1aedea3a07730ec8be1"),
        "3D" to Entry("desktop_ai_cnc_5_neon_1536x1024.png","081cd86c8e5f096400f2b272288e1af5610c833de3e0f1aedea3a07730ec8be1"),
        "3AX" to Entry("desktop_ai_cnc_5_neon_1536x1024.png","081cd86c8e5f096400f2b272288e1af5610c833de3e0f1aedea3a07730ec8be1"),
        "4AX" to Entry("axis4_hightech_sim_1536x1024.png","e06c58c424ed862b0bc4d6ec39412052d85102dc2f61eee3c3ddf1368c2ab762"),
        "5AX" to Entry("axis5_realcam_portrait_941x1672.png","bb677b561ecaf6b0b42382ab0f706cf567cb7c4fa57e0ca3f14f3c73ad3b95eb"),
        "5X" to Entry("axis5_realcam_portrait_941x1672.png","bb677b561ecaf6b0b42382ab0f706cf567cb7c4fa57e0ca3f14f3c73ad3b95eb"),
        "AXIS" to Entry("axis5_realcam_portrait_941x1672.png","bb677b561ecaf6b0b42382ab0f706cf567cb7c4fa57e0ca3f14f3c73ad3b95eb")
    )
    private val cache=mutableMapOf<String,Bitmap?>()
    private fun sha256(bytes:ByteArray):String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
    @Synchronized
    fun bitmap(context:Context,surface:String):Bitmap? {
        val key=surface.uppercase()
        if(cache.containsKey(key)) return cache[key]
        val entry=entries[key] ?: return null
        val bitmap=runCatching {
            val bytes=context.assets.open(entry.file).use { it.readBytes() }
            require(sha256(bytes)==entry.sha256){"Library RGB reference SHA mismatch: "+entry.file}
            BitmapFactory.decodeByteArray(bytes,0,bytes.size)
                ?: error("Library RGB reference decode failed: "+entry.file)
        }.getOrNull()
        cache[key]=bitmap
        return bitmap
    }
}
