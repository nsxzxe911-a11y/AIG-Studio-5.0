package com.aigstudio.core

fun main(){
    val win=RendererCapabilitySnapshot(
        available=setOf(RendererBackend.WINDOWS_D3D12,RendererBackend.WINDOWS_D3D11,RendererBackend.WINDOWS_JAVA2D),
        implemented=setOf(RendererBackend.WINDOWS_JAVA2D)
    )
    check(RendererCapabilityNegotiator.selectAuto(RendererPlatform.WINDOWS,win)==RendererBackend.WINDOWS_JAVA2D)
    val android=RendererCapabilitySnapshot(
        available=setOf(RendererBackend.ANDROID_VULKAN,RendererBackend.ANDROID_OPENGL_ES,RendererBackend.ANDROID_HWUI),
        implemented=setOf(RendererBackend.ANDROID_OPENGL_ES,RendererBackend.ANDROID_HWUI)
    )
    check(RendererCapabilityNegotiator.selectAuto(RendererPlatform.ANDROID,android)==RendererBackend.ANDROID_OPENGL_ES)
    println("AIGCNC_RENDERER_CAPABILITY_NEGOTIATION_PASS|DX12_DX11_JAVA2D|VULKAN_OPENGL_ES_HWUI|NO_FAKE_BACKEND")
}
