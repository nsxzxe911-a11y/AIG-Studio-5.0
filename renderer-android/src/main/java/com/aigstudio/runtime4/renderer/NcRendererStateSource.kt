package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.NcRuntimePort

class NcRendererStateSource(private val runtime:NcRuntimePort){fun snapshotForFrame()=runtime.snapshot()}