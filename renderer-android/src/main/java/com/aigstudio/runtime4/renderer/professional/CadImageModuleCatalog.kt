package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.ui.AigUiComponent
import com.aigstudio.runtime4.contract.ui.AigUiKind

/** Discovers CAD actions from the real professional descriptor; image skins never own callbacks. */
object CadImageModuleCatalog {
    private fun components():Map<String,AigUiComponent> =
        CadProfessionalDescriptor.descriptor(true,true,true).components
            .filter{it.kind==AigUiKind.BUTTON && it.controlId.startsWith("CAD.")}
            .associateBy{it.controlId}

    fun controlIds():Set<String> = components().keys
    fun component(controlId:String):AigUiComponent? = components()[controlId]
}
