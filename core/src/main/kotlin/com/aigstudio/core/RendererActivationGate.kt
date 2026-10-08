package com.aigstudio.core

enum class RendererBackend {
    ANDROID_HWUI,
    WINDOWS_JAVA2D,
    ANDROID_VULKAN,
    ANDROID_OPENGL_ES,
    WINDOWS_D3D12,
    WINDOWS_D3D11,
    DIAGNOSTIC_CANVAS,
    DIAGNOSTIC_GRAPHICS2D
}

enum class RendererRuntimeState { NOT_MOUNTED, MOUNTING, PLATFORM_ACTIVE, GPU_ACTIVE, FAILED, DIAGNOSTIC_FALLBACK }

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
    fun markFirstFramePresented(){if(!failed&&deviceReady&&surfaceReady)firstPresented=true}
    fun markFailure(){failed=true}

    fun state():RendererRuntimeState {
        if(failed) return RendererRuntimeState.FAILED
        val b=backend ?: return RendererRuntimeState.NOT_MOUNTED
        if(isDiagnosticBackend(b)) return RendererRuntimeState.DIAGNOSTIC_FALLBACK
        if(!(deviceReady&&surfaceReady&&firstPresented)) return RendererRuntimeState.MOUNTING
        return if(isNativeGpuBackend(b)) RendererRuntimeState.GPU_ACTIVE else RendererRuntimeState.PLATFORM_ACTIVE
    }

    fun productStatusZhTw():String=when(state()) {
        RendererRuntimeState.NOT_MOUNTED -> "3D Renderer 尚未啟動"
        RendererRuntimeState.MOUNTING -> "3D Renderer 啟動中"
        RendererRuntimeState.PLATFORM_ACTIVE -> when(backend) {
            RendererBackend.ANDROID_HWUI -> "Android HWUI Renderer 已啟動"
            RendererBackend.WINDOWS_JAVA2D -> "Windows Java2D Renderer 已啟動"
            else -> "平台 Renderer 已啟動"
        }
        RendererRuntimeState.GPU_ACTIVE -> when(backend) {
            RendererBackend.ANDROID_VULKAN -> "Android Vulkan GPU Renderer 已啟動"
            RendererBackend.ANDROID_OPENGL_ES -> "Android OpenGL ES GPU Renderer 已啟動"
            RendererBackend.WINDOWS_D3D12 -> "Windows D3D12 GPU Renderer 已啟動"
            RendererBackend.WINDOWS_D3D11 -> "Windows D3D11 GPU Renderer 已啟動"
            else -> "3D GPU Renderer 已啟動"
        }
        RendererRuntimeState.FAILED -> "3D Renderer 需要重新載入 • 其他功能可繼續"
        RendererRuntimeState.DIAGNOSTIC_FALLBACK -> "3D 診斷顯示模式 • 其他功能可繼續"
    }

    private fun isNativeGpuBackend(value:RendererBackend)=
        value==RendererBackend.ANDROID_VULKAN ||
        value==RendererBackend.ANDROID_OPENGL_ES ||
        value==RendererBackend.WINDOWS_D3D12 ||
        value==RendererBackend.WINDOWS_D3D11

    private fun isDiagnosticBackend(value:RendererBackend)=
        value==RendererBackend.DIAGNOSTIC_CANVAS || value==RendererBackend.DIAGNOSTIC_GRAPHICS2D
}
