package com.aigstudio.core

fun main(){
    val g=RendererActivationGate()
    check(g.state()==RendererRuntimeState.NOT_MOUNTED)
    g.begin(RendererBackend.ANDROID_VULKAN)
    check(g.state()==RendererRuntimeState.MOUNTING)
    g.markDeviceReady();g.markSurfaceReady()
    check(g.state()==RendererRuntimeState.MOUNTING)
    g.markFirstFramePresented()
    check(g.state()==RendererRuntimeState.GPU_ACTIVE)
    g.begin(RendererBackend.DIAGNOSTIC_CANVAS)
    g.markDeviceReady();g.markSurfaceReady();g.markFirstFramePresented()
    check(g.state()==RendererRuntimeState.DIAGNOSTIC_FALLBACK)
    g.begin(RendererBackend.WINDOWS_D3D11);g.markFailure()
    check(g.state()==RendererRuntimeState.FAILED)
    check("其他功能可繼續" in g.productStatusZhTw())
    println("RENDERER_ACTIVATION_GATE_PASS|VULKAN|D3D11|FIRST_PRESENT_REQUIRED|NO_FAKE_GPU_ACTIVE")
}
