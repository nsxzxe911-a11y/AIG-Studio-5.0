package com.aigstudio.runtime4.renderer.gpu

import com.aigstudio.runtime4.contract.CadRuntimePort
import com.aigstudio.runtime4.contract.CadState

class RendererStateSource(val runtimePort: CadRuntimePort) {
    fun snapshotForFrame(): CadState = runtimePort.snapshot()
}
