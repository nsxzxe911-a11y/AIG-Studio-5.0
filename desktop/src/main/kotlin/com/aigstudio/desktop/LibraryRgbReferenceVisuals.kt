package com.aigstudio.desktop

import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.security.MessageDigest
import javax.imageio.ImageIO

object StudioLibraryRgbReferenceVisuals {
    private data class Entry(val file:String,val sha256:String)

    private val entries=mapOf(
        "STARTUP" to Entry("startup_aigii_future_cnc_1536x1024.png","363115847162f726ae54011da431b79f5ac4563b4b844cf8b7dfc9ee5a0fff21"),
        "HOME" to Entry("startup_aigii_future_cnc_1536x1024.png","363115847162f726ae54011da431b79f5ac4563b4b844cf8b7dfc9ee5a0fff21"),
        "CAD" to Entry("desktop_ai_cnc_5_neon_1536x1024.png","081cd86c8e5f096400f2b272288e1af5610c833de3e0f1aedea3a07730ec8be1"),
        "CAM" to Entry("axis5_realcam_landscape_1672x941.png","e58d585864f61ffe60d58c76239b3d4f20af91c235024e9a50b700306a56d066"),
        "SIM" to Entry("desktop_ai_cnc_5_neon_1536x1024.png","081cd86c8e5f096400f2b272288e1af5610c833de3e0f1aedea3a07730ec8be1"),
        "3D" to Entry("desktop_ai_cnc_5_neon_1536x1024.png","081cd86c8e5f096400f2b272288e1af5610c833de3e0f1aedea3a07730ec8be1"),
        "3AX" to Entry("desktop_ai_cnc_5_neon_1536x1024.png","081cd86c8e5f096400f2b272288e1af5610c833de3e0f1aedea3a07730ec8be1"),
        "4AX" to Entry("axis4_hightech_sim_1536x1024.png","e06c58c424ed862b0bc4d6ec39412052d85102dc2f61eee3c3ddf1368c2ab762"),
        "5AX" to Entry("axis5_realcam_landscape_1672x941.png","e58d585864f61ffe60d58c76239b3d4f20af91c235024e9a50b700306a56d066"),
        "5X" to Entry("axis5_realcam_landscape_1672x941.png","e58d585864f61ffe60d58c76239b3d4f20af91c235024e9a50b700306a56d066"),
        "AXIS" to Entry("axis5_realcam_landscape_1672x941.png","e58d585864f61ffe60d58c76239b3d4f20af91c235024e9a50b700306a56d066")
    )
    private val cache=mutableMapOf<String,BufferedImage?>()

    private fun sha256(bytes:ByteArray):String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}

    @Synchronized
    fun image(surface:String):BufferedImage? {
        val key=surface.uppercase()
        if(cache.containsKey(key)) return cache[key]
        val entry=entries[key] ?: return null
        val image=runCatching {
            val bytes=StudioLibraryRgbReferenceVisuals::class.java.getResourceAsStream("/"+entry.file)?.use { it.readBytes() }
                ?: return@runCatching null
            require(sha256(bytes)==entry.sha256){"Library RGB reference SHA mismatch: "+entry.file}
            ImageIO.read(ByteArrayInputStream(bytes))
                ?: error("Library RGB reference decode failed: "+entry.file)
        }.getOrNull()
        cache[key]=image
        return image
    }
}
