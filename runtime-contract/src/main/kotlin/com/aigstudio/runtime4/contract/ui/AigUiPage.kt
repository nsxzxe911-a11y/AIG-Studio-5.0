package com.aigstudio.runtime4.contract.ui

import com.aigstudio.runtime4.contract.PageId

data class AigUiPageDescriptor(
    val page:PageId,
    val components:List<AigUiComponent>,
){
    init {
        val ids=components.map{it.controlId}
        require(ids.size==ids.toSet().size) { "AIG UI page has duplicate controlId values: ${page.name}" }
    }
}
