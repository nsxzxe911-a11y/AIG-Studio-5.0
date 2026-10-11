package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId

data class PageSurfaceTextureSpec(val path:String,val width:Float,val height:Float)

/** Exact user-selected preview page art. Current generated assets remain REFERENCE_ONLY. */
object PageSurfaceTexturePlan {
    private val specs=mapOf(
        PageId.HOME to PageSurfaceTextureSpec("aig-rgb/page-surfaces/home.png",941f,1672f),
        PageId.CAD to PageSurfaceTextureSpec("aig-rgb/page-surfaces/cad.png",856f,1836f),
        PageId.CAM to PageSurfaceTextureSpec("aig-rgb/page-surfaces/cam.png",856f,1836f),
        PageId.SIM to PageSurfaceTextureSpec("aig-rgb/page-surfaces/sim.png",941f,1672f),
        PageId.AXIS3 to PageSurfaceTextureSpec("aig-rgb/page-surfaces/3ax.png",856f,1836f),
        PageId.AXIS4 to PageSurfaceTextureSpec("aig-rgb/page-surfaces/4ax.png",856f,1836f),
        PageId.AXIS5 to PageSurfaceTextureSpec("aig-rgb/page-surfaces/5ax.png",856f,1836f),
        PageId.AXIS6 to PageSurfaceTextureSpec("aig-rgb/page-surfaces/6ax.png",856f,1836f),
        PageId.NC to PageSurfaceTextureSpec("aig-rgb/page-surfaces/nc.png",856f,1836f),
        PageId.AI to PageSurfaceTextureSpec("aig-rgb/page-surfaces/ai.png",856f,1836f),
    )
    fun path(page:PageId):String?=specs[page]?.path
    fun imageSize(page:PageId):Pair<Float,Float>?=specs[page]?.let{it.width to it.height}
    fun missingPages():Set<PageId> = PageId.entries.filter { it !in specs }.toSet()
}
