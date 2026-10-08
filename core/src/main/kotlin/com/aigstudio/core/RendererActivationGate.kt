package com.aigstudio.core

enum class RendererBackend { ANDROID_VULKAN, WINDOWS_D3D11, DIAGNOSTIC_CANVAS, DIAGNOSTIC_GRAPHICS2D }
enum class RendererRuntimeState { NOT_MOUNTED, MOUNTING, GPU_ACTIVE, FAILED, DIAGNOSTIC_FALLBACK }

/** GPU_ACTIVE is evidence-bearing state, never a UI preference or source-code claim. */
class RendererActivationGate {
    private var backend:RendererBackend?=null
    private var deviceReady=false
    private var surfaceReady=false
    private var firstPresented=false
    private var failed=false

    fun begin(selected:RendererBackend) {
        backend=selected;deviceReady=false;surfaceReady=false;firstPresented=false;failed=false
    }
    fun markDeviceReady(){if(!failed)deviceReady=true}
    fun markSurfaceReady(){if(!failed)surfaceReady=true}
    fun markFirstFramePresented(){if(!failed)firstPresented=true}
    fun markFailure(){failed=true}

    fun state():RendererRuntimeState {
        if(failed) return RendererRuntimeState.FAILED
        val b=backend ?: return RendererRuntimeState.NOT_MOUNTED
        val native=b==RendererBackend.ANDROID_VULKAN || b==RendererBackend.WINDOWS_D3D11
        if(!native) return RendererRuntimeState.DIAGNOSTIC_FALLBACK
        return if(deviceReady&&surfaceReady&&firstPresented) RendererRuntimeState.GPU_ACTIVE else RendererRuntimeState.MOUNTING
    }

    fun productStatusZhTw():String=when(state()) {
        RendererRuntimeState.NOT_MOUNTED -> "3D Renderer 尚未啟動"
        RendererRuntimeState.MOUNTING -> "3D Renderer 啟動中"
        RendererRuntimeState.GPU_ACTIVE -> "3D GPU Renderer 已啟動"
        RendererRuntimeState.FAILED -> "3D Renderer 需要重新載入 • 其他功能可繼續"
        RendererRuntimeState.DIAGNOSTIC_FALLBACK -> "3D 診斷顯示模式 • 其他功能可繼續"
    }
}
