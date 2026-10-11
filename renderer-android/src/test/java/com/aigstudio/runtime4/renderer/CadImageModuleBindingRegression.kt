package com.aigstudio.runtime4.renderer

import org.junit.Assert.*
import org.junit.Test

class CadImageModuleBindingRegression {
    @Test fun imageControlsResolveThroughCadModulesAndUseNormalizedSlots(){
        val moduleIds=CadImageModuleCatalog.controlIds()
        val expected=(CadProfessionalDescriptor.primaryIds+CadProfessionalDescriptor.advancedIds).toSet()
        assertEquals(expected,moduleIds)
        val slots=CadImageControlManifest.controlSlots
        assertTrue(slots.isNotEmpty())
        assertTrue(slots.all{it.controlId in moduleIds})
        assertTrue(slots.all{it.rect.left in 0f..1f && it.rect.top in 0f..1f && it.rect.right in 0f..1f && it.rect.bottom in 0f..1f})
        assertTrue(slots.all{it.rect.left<it.rect.right && it.rect.top<it.rect.bottom})
        assertEquals(slots.map{it.controlId}.toSet().size,slots.size)
    }

    @Test fun cadArtworkUsesApproved856x1836ReferenceAndAdaptiveFullViewport(){
        assertEquals(856f/1836f,CadImageInteractionLayout.referenceAspectRatio(),0.000001f)
        val b=CadImageInteractionLayout.imageBounds(2160f,3840f)
        assertEquals(0f,b.top,0.01f)
        assertEquals(2160f,b.width,0.5f)
        assertEquals(3840f,b.height,0.5f)
    }
}
