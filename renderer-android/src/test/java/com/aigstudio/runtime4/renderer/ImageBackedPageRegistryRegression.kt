package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import org.junit.Assert.assertEquals
import org.junit.Test

class ImageBackedPageRegistryRegression {
    @Test fun formalTargetsMatchApprovedProductResolution(){
        assertEquals(ImageAssetTarget(1440,3088),ImageBackedPageRegistry.formalTarget(ImageAssetPlatform.MOBILE))
        assertEquals(ImageAssetTarget(3840,2160),ImageBackedPageRegistry.formalTarget(ImageAssetPlatform.WINDOWS))
    }

    @Test fun mobileMasterMustBePortraitAndAtLeast1440x3088(){
        assertEquals(ImageAssetQuality.FORMAL,ImageBackedPageRegistry.classify(PageId.CAM,ImageAssetCandidate(PageId.CAM,ImageAssetPlatform.MOBILE,1440,3088,false)))
        assertEquals(ImageAssetQuality.REFERENCE_ONLY,ImageBackedPageRegistry.classify(PageId.CAM,ImageAssetCandidate(PageId.CAM,ImageAssetPlatform.MOBILE,941,1672,false)))
        assertEquals(ImageAssetQuality.REJECTED,ImageBackedPageRegistry.classify(PageId.CAM,ImageAssetCandidate(PageId.CAM,ImageAssetPlatform.MOBILE,3088,1440,false)))
    }

    @Test fun windowsFormalMasterIsReal4kLandscape(){
        assertEquals(ImageAssetQuality.FORMAL,ImageBackedPageRegistry.classify(PageId.NC,ImageAssetCandidate(PageId.NC,ImageAssetPlatform.WINDOWS,3840,2160,false)))
        assertEquals(ImageAssetQuality.REFERENCE_ONLY,ImageBackedPageRegistry.classify(PageId.NC,ImageAssetCandidate(PageId.NC,ImageAssetPlatform.WINDOWS,1672,941,false)))
        assertEquals(ImageAssetQuality.REJECTED,ImageBackedPageRegistry.classify(PageId.NC,ImageAssetCandidate(PageId.NC,ImageAssetPlatform.WINDOWS,2160,3840,false)))
    }

    @Test fun wrongOwnerAndCollageAlwaysReject(){
        assertEquals(ImageAssetQuality.REJECTED,ImageBackedPageRegistry.classify(PageId.CAM,ImageAssetCandidate(PageId.SIM,ImageAssetPlatform.MOBILE,1440,3088,false)))
        assertEquals(ImageAssetQuality.REJECTED,ImageBackedPageRegistry.classify(PageId.CAM,ImageAssetCandidate(PageId.CAM,ImageAssetPlatform.MOBILE,1440,3088,true)))
    }
}
