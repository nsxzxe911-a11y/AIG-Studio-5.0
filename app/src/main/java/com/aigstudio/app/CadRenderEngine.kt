package com.aigstudio.app

import android.annotation.TargetApi
import android.graphics.Canvas
import android.graphics.Picture
import android.graphics.RenderNode
import android.os.Build

/**
 * CAD drawing engine v2.
 *
 * API 29+ uses RenderNode display lists so static CAD/grid geometry is recorded once
 * and replayed by the hardware renderer. Older supported devices fall back to Picture.
 * Dynamic overlays (cursor, coordinates, selection interaction) remain outside the cache.
 */
internal class CadRenderEngine(private val nodeName: String) {
    private var nodeHolder: Any? = null
    private var nodeKey = Long.MIN_VALUE
    private var nodeWidth = -1
    private var nodeHeight = -1

    private var picture: Picture? = null
    private var pictureKey = Long.MIN_VALUE
    private var pictureWidth = -1
    private var pictureHeight = -1

    var recordings: Long = 0
        private set
    var cacheHits: Long = 0
        private set

    val backendName: String
        get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) "RenderNode" else "Picture"

    fun draw(
        canvas: Canvas,
        width: Int,
        height: Int,
        sceneKey: Long,
        recordScene: (Canvas) -> Unit
    ) {
        if (width <= 0 || height <= 0) {
            recordScene(canvas)
            return
        }

        if (canvas.isHardwareAccelerated && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val holder = (nodeHolder as? Api29NodeHolder)
                ?: Api29NodeHolder(nodeName).also { nodeHolder = it }
            val cacheValid = nodeKey == sceneKey &&
                nodeWidth == width &&
                nodeHeight == height &&
                holder.hasDisplayList()
            if (!cacheValid) {
                holder.record(width, height, recordScene)
                nodeKey = sceneKey
                nodeWidth = width
                nodeHeight = height
                picture = null
                pictureKey = Long.MIN_VALUE
                recordings++
            } else {
                cacheHits++
            }
            holder.draw(canvas)
            return
        }

        val cacheValid = pictureKey == sceneKey &&
            pictureWidth == width &&
            pictureHeight == height &&
            picture != null
        if (!cacheValid) {
            val next = Picture()
            val recordingCanvas = next.beginRecording(width, height)
            try {
                recordScene(recordingCanvas)
            } finally {
                next.endRecording()
            }
            picture = next
            pictureKey = sceneKey
            pictureWidth = width
            pictureHeight = height
            nodeKey = Long.MIN_VALUE
            recordings++
        } else {
            cacheHits++
        }
        canvas.drawPicture(picture!!)
    }

    @TargetApi(Build.VERSION_CODES.Q)
    private class Api29NodeHolder(name: String) {
        private val node = RenderNode(name)

        fun hasDisplayList(): Boolean = node.hasDisplayList()

        fun record(width: Int, height: Int, block: (Canvas) -> Unit) {
            node.setPosition(0, 0, width, height)
            val recordingCanvas = node.beginRecording(width, height)
            try {
                block(recordingCanvas)
            } finally {
                node.endRecording()
            }
        }

        fun draw(canvas: Canvas) {
            canvas.drawRenderNode(node)
        }
    }
}
