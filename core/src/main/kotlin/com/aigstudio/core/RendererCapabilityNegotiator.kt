package com.aigstudio.core

enum class RendererPlatform { ANDROID, WINDOWS }

data class RendererCapabilitySnapshot(
    val available:Set<RendererBackend>,
    val implemented:Set<RendererBackend>,
    val disabled:Set<RendererBackend> = emptySet()
) {
    fun eligible(): Set<RendererBackend> = (available intersect implemented) - disabled
}

object RendererCapabilityNegotiator {
    private val androidOrder=listOf(
        RendererBackend.ANDROID_VULKAN,
        RendererBackend.ANDROID_OPENGL_ES,
        RendererBackend.ANDROID_HWUI,
        RendererBackend.DIAGNOSTIC_CANVAS
    )
    private val windowsOrder=listOf(
        RendererBackend.WINDOWS_D3D12,
        RendererBackend.WINDOWS_D3D11,
        RendererBackend.WINDOWS_JAVA2D,
        RendererBackend.DIAGNOSTIC_GRAPHICS2D
    )
    fun fallbackChain(platform:RendererPlatform, capabilities:RendererCapabilitySnapshot):List<RendererBackend>{
        val eligible=capabilities.eligible()
        return orderFor(platform).filter{it in eligible}
    }
    fun selectAuto(platform:RendererPlatform, capabilities:RendererCapabilitySnapshot):RendererBackend?=
        fallbackChain(platform,capabilities).firstOrNull()
    private fun orderFor(platform:RendererPlatform)=when(platform){
        RendererPlatform.ANDROID->androidOrder
        RendererPlatform.WINDOWS->windowsOrder
    }
}
