package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import org.junit.Assert.*
import org.junit.Test
import java.io.File
import java.security.MessageDigest

class PageSurfaceTexturePlanRegression {
    private fun repoRoot():File{
        var root=File(System.getProperty("user.dir")).absoluteFile
        repeat(8){ if(File(root,"settings.gradle.kts").isFile) return root; root=root.parentFile?:error("repo root") }
        error("repo root")
    }
    private fun sha256(file:File)=MessageDigest.getInstance("SHA-256").digest(file.readBytes()).joinToString(""){"%02x".format(it)}

    @Test fun onlyApprovedTenPrimaryPageArtsAreMountedWithExactBytes(){
        val expected=linkedMapOf(
            PageId.HOME to Triple("home.png",941f to 1672f,"55408281cbc57e487e64f38b4b99161580a39c651b4b99aa5c10a19df3ec71d8"),
            PageId.CAD to Triple("cad.png",856f to 1836f,"742d9fbe1f92f004712dab6f4011160954b83d21789c37cf3db58c2ce9662b10"),
            PageId.CAM to Triple("cam.png",856f to 1836f,"507dfa0dd85b891a55fa1102c8ae6509cfaea605c16e18d3d53f98a3e08e547a"),
            PageId.SIM to Triple("sim.png",941f to 1672f,"c78fc52cf46e2778616469fb56137b667548e03648ac68c9e667e908f3de3d12"),
            PageId.AXIS3 to Triple("3ax.png",856f to 1836f,"b52968cba8e09824a8bf39f561543edd8cde7d7d70557cc3e66d0502ab74b7bf"),
            PageId.AXIS4 to Triple("4ax.png",856f to 1836f,"784b3ee1273a68308ac024620774dc7f0aacbfcc90c82ad2c5b0684451aafa50"),
            PageId.AXIS5 to Triple("5ax.png",856f to 1836f,"3f8faaa2c261891f6c9b0bacc8f4fedbde9e106293ca4fb7d7687c197d4b1c32"),
            PageId.AXIS6 to Triple("6ax.png",856f to 1836f,"eff6f369f8f70e286d26fec1708f14ffc47d26c94e05fc684ee5b0ca736b9561"),
            PageId.NC to Triple("nc.png",856f to 1836f,"253b642139195f0f4cb70c0e8823fde54612f1f1861d4422592f09ccb20ccbbe"),
            PageId.AI to Triple("ai.png",856f to 1836f,"3413ce32f77909e5133757fcd9c80905c753c08e3a77c617f2efe7885e8212f0"),
        )
        val root=repoRoot()
        expected.forEach{(page,entry)->
            val (name,size,sha)=entry
            assertEquals("aig-rgb/page-surfaces/$name",PageSurfaceTexturePlan.path(page))
            assertEquals(size,PageSurfaceTexturePlan.imageSize(page))
            val f=File(root,"renderer-android/src/main/assets/aig-rgb/page-surfaces/$name")
            assertTrue("missing $name",f.isFile)
            assertEquals("sha $name",sha,sha256(f))
        }
        assertNull(PageSurfaceTexturePlan.path(PageId.MULTIFUNCTION))
        assertTrue(PageId.MULTIFUNCTION in PageSurfaceTexturePlan.missingPages())
    }
}
