package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.contract.ui.AigUiPageDescriptor
import org.junit.Assert.assertTrue
import org.junit.Test

class AigRgbPageAssetOwnershipRegression {
    private fun textures(nodes:AigUiPageDescriptor)=nodes.components.mapNotNull{it.iconAsset}

    @Test fun homeCadCamTexturesAreOwnedByTheirPageRoots(){
        val home=textures(HomeProfessionalDescriptor.descriptor())
        val cad=textures(CadProfessionalDescriptor.descriptor(false,false,false))
        val cam=textures(CamProfessionalDescriptor.descriptor(CamState()))
        assertTrue(home.isNotEmpty() && home.all{it.startsWith("aig-rgb/home/")})
        assertTrue(cad.isNotEmpty() && cad.all{it.startsWith("aig-rgb/cad/")})
        assertTrue(cam.isNotEmpty() && cam.all{it.startsWith("aig-rgb/cam/")})
    }
}
