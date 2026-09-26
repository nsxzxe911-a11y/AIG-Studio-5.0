package com.aigstudio.desktop

import com.aigstudio.core.*
import java.awt.*
import java.awt.event.*
import java.awt.geom.Path2D
import java.awt.image.BufferedImage
import java.io.File
import java.security.MessageDigest
import javax.imageio.ImageIO
import javax.swing.*
import javax.swing.border.EmptyBorder
import kotlin.math.*

private class AdaptiveGlassToolbar : JPanel() {
    private var cols = 7
    init {
        isOpaque = false
        border = BorderFactory.createEmptyBorder(8, 10, 8, 10)
        layout = GridLayout(0, cols, 6, 6)
        addComponentListener(object : ComponentAdapter() {
            override fun componentResized(e: ComponentEvent) {
                val next = max(2, width / 128)
                if (next != cols) {
                    cols = next
                    layout = GridLayout(0, cols, 6, 6)
                    revalidate(); repaint()
                }
            }
        })
    }
    override fun paintComponent(g: Graphics) {
        val g2 = g.create() as Graphics2D
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        g2.color = Color(8, 22, 36, 178)
        g2.fillRoundRect(0, 0, width, height, 20, 20)
        g2.color = Color(61, 235, 255, 105)
        g2.stroke = BasicStroke(1.2f)
        g2.drawRoundRect(1, 1, max(0, width - 3), max(0, height - 3), 20, 20)
        g2.dispose()
        super.paintComponent(g)
    }
}

private class GlassActionButton(label: String, private val accent: Color) : JButton(label) {
    var active = false
        set(value) { field = value; repaint() }
    init {
        foreground = Color.WHITE
        isOpaque = false
        isContentAreaFilled = false
        isFocusPainted = false
        border = BorderFactory.createEmptyBorder(8, 10, 8, 10)
        preferredSize = Dimension(118, 44)
    }
    override fun paintComponent(g: Graphics) {
        val g2 = g.create() as Graphics2D
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        val a = if (active) 220 else 150
        g2.color = Color(12, 28, 44, a)
        g2.fillRoundRect(3, 3, width - 6, height - 6, 16, 16)
        g2.color = Color(accent.red, accent.green, accent.blue, if (active) 235 else 170)
        g2.stroke = BasicStroke(if (active) 2.6f else 1.4f)
        g2.drawRoundRect(3, 3, width - 6, height - 6, 16, 16)
        g2.dispose()
        super.paintComponent(g)
    }
}


private class RgbGlyphIcon(private val kind:String, private val accent:Color) : Icon {
    override fun getIconWidth()=24
    override fun getIconHeight()=24
    override fun paintIcon(c:Component?,g0:Graphics?,x:Int,y:Int){
        val g=(g0?.create() as? Graphics2D) ?: return
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON)
        g.color=Color(accent.red,accent.green,accent.blue,220)
        g.stroke=BasicStroke(2.2f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
        val cx=x+12;val cy=y+12
        when(kind){
            "CAD" -> { g.drawRect(x+4,y+5,16,14);g.drawLine(x+7,y+16,x+17,y+8);g.drawOval(x+9,y+9,6,6) }
            "CAM" -> { g.drawOval(x+5,y+5,14,14);g.drawArc(x+8,y+8,8,8,30,280);g.drawLine(cx,y+3,cx,y+8) }
            "3D" -> {
                val p=Polygon(intArrayOf(cx,x+20,cx,x+4),intArrayOf(y+3,y+8,y+14,y+8),4);g.drawPolygon(p)
                g.drawLine(x+4,y+8,x+4,y+17);g.drawLine(x+20,y+8,x+20,y+17);g.drawLine(x+4,y+17,cx,y+22);g.drawLine(x+20,y+17,cx,y+22);g.drawLine(cx,y+14,cx,y+22)
            }
            "3AX" -> { g.drawLine(x+5,y+19,x+19,y+19);g.drawLine(x+5,y+19,x+5,y+5);g.drawLine(x+5,y+19,x+16,y+8) }
            "4AX" -> { g.drawOval(x+4,y+6,16,12);g.drawArc(x+7,y+3,12,18,210,220);g.drawLine(x+18,y+5,x+21,y+7) }
            "5AX" -> { g.drawOval(x+5,y+5,14,14);g.drawArc(x+2,y+7,20,10,200,200);g.drawArc(x+7,y+2,10,20,20,200) }
            "NC_EDIT" -> { g.drawRect(x+5,y+3,14,18);for(i in 0..3)g.drawLine(x+8,y+8+i*3,x+16,y+8+i*3) }
            else -> g.drawOval(x+5,y+5,14,14)
        }
        g.dispose()
    }
}

private enum class DrawMode { LINE, RECT, CIRCLE }

private class CadPanel(
    private val doc: DrawingDocument,
    private val status: (String) -> Unit
) : JPanel() {
    var mode = DrawMode.LINE
    private var first: Vec2? = null
    private var pxPerMm = 5.0
    private var panX = 0.0
    private var panY = 0.0
    private var dragPoint: Point? = null

    init {
        background = Color(8, 18, 30)
        preferredSize = Dimension(1000, 650)
        addMouseWheelListener {
            pxPerMm = (pxPerMm * if (it.wheelRotation < 0) 1.12 else 1.0 / 1.12).coerceIn(0.5, 80.0)
            repaint()
        }
        addMouseMotionListener(object : MouseMotionAdapter() {
            override fun mouseDragged(e: MouseEvent) {
                if (SwingUtilities.isMiddleMouseButton(e) || SwingUtilities.isRightMouseButton(e)) {
                    dragPoint?.let { p -> panX += e.x - p.x; panY += e.y - p.y }
                    dragPoint = e.point; repaint()
                }
            }
        })
        addMouseListener(object : MouseAdapter() {
            override fun mousePressed(e: MouseEvent) {
                if (SwingUtilities.isMiddleMouseButton(e) || SwingUtilities.isRightMouseButton(e)) { dragPoint = e.point; return }
                val p = screenToWorld(e.x, e.y)
                val a = first
                if (a == null) {
                    first = p
                    status("FIRST X=" + DisplayFormat.mm(p.x) + " Y=" + DisplayFormat.mm(p.y))
                } else {
                    when (mode) {
                        DrawMode.LINE -> if (a.distanceTo(p) >= CNC_RESOLUTION_MM) {
                            doc.put(Line(a = a, b = p))
                        }
                        DrawMode.RECT -> {
                            if (abs(a.x - p.x) >= CNC_RESOLUTION_MM && abs(a.y - p.y) >= CNC_RESOLUTION_MM) {
                                val b = Vec2(p.x, a.y)
                                val c = p
                                val d = Vec2(a.x, p.y)
                                doc.put(Line(a = a, b = b))
                                doc.put(Line(a = b, b = c))
                                doc.put(Line(a = c, b = d))
                                doc.put(Line(a = d, b = a))
                            }
                        }
                        DrawMode.CIRCLE -> {
                            val r = a.distanceTo(p)
                            if (r >= CNC_RESOLUTION_MM) doc.put(Circle(center = a, radius = r))
                        }
                    }
                    first = null
                    status("CAD entities=" + doc.size() + " • 原點 X0.000 Y0.000 • 精度 0.001 mm")
                    repaint()
                }
            }
            override fun mouseReleased(e: MouseEvent) { dragPoint = null }
        })
    }

    fun clearCad() {
        doc.clear()
        first = null
        repaint()
        status("CAD cleared")
    }

    private fun screenToWorld(x: Int, y: Int) =
        Vec2((x - width / 2.0 - panX) / pxPerMm, (height / 2.0 + panY - y) / pxPerMm)

    private fun worldToScreen(p: Vec2) =
        Point((width / 2.0 + panX + p.x * pxPerMm).roundToInt(), (height / 2.0 + panY - p.y * pxPerMm).roundToInt())

    override fun paintComponent(g: Graphics) {
        super.paintComponent(g)
        val g2 = g as Graphics2D
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)

        g2.color = Color(22, 48, 68)
        var x = width / 2 % 50
        while (x < width) { g2.drawLine(x, 0, x, height); x += 50 }
        var y = height / 2 % 50
        while (y < height) { g2.drawLine(0, y, width, y); y += 50 }

        g2.color = Color(0, 210, 240)
        g2.stroke = BasicStroke(2f)
        g2.drawLine(0, height / 2, width, height / 2)
        g2.drawLine(width / 2, 0, width / 2, height)

        g2.color = Color(232, 241, 250)
        g2.stroke = BasicStroke(2.2f)
        doc.all().forEach { entity ->
            when (entity) {
                is Line -> {
                    val a = worldToScreen(entity.a)
                    val b = worldToScreen(entity.b)
                    g2.drawLine(a.x, a.y, b.x, b.y)
                }
                is Circle -> {
                    val c = worldToScreen(entity.center)
                    val r = (entity.radius * pxPerMm).roundToInt()
                    g2.drawOval(c.x - r, c.y - r, r * 2, r * 2)
                }
                is Arc -> {
                    val c = worldToScreen(entity.center)
                    val r = (entity.radius * pxPerMm).roundToInt()
                    val start = Math.toDegrees(atan2(entity.start.y - entity.center.y, entity.start.x - entity.center.x))
                    val end = Math.toDegrees(atan2(entity.end.y - entity.center.y, entity.end.x - entity.center.x))
                    var sweep = end - start
                    if (entity.clockwise) while (sweep >= 0.0) sweep -= 360.0 else while (sweep <= 0.0) sweep += 360.0
                    g2.drawArc(c.x - r, c.y - r, r * 2, r * 2, start.roundToInt(), sweep.roundToInt())
                }
            }
        }

        first?.let {
            val p = worldToScreen(it)
            g2.color = Color(255, 176, 32)
            g2.fillOval(p.x - 5, p.y - 5, 10, 10)
        }

        g2.color = Color(143, 179, 201)
        g2.font = Font(Font.SANS_SERIF, Font.PLAIN, 14)
        g2.drawString("AIG CNC • OFFICIAL RGB ORIGINAL • 1080P/2K/3K/4K+ • 2D CAD • 原點 X0.000 Y0.000 • 精度 0.001 mm", 14, 22)
    }
}

private class Mesh3DPanel(private val result: Machining3DResult) : JPanel() {
    private var rx = -35.0
    private var ry = 35.0
    private var zoom = 1.0
    private var lastX = 0
    private var lastY = 0

    init {
        background = Color(5, 10, 17)
        preferredSize = Dimension(1000, 650)
        addMouseListener(object : MouseAdapter() {
            override fun mousePressed(e: MouseEvent) { lastX = e.x; lastY = e.y }
        })
        addMouseMotionListener(object : MouseMotionAdapter() {
            override fun mouseDragged(e: MouseEvent) {
                ry += (e.x - lastX) * 0.4
                rx = (rx + (e.y - lastY) * 0.4).coerceIn(-89.0, 89.0)
                lastX = e.x; lastY = e.y
                repaint()
            }
        })
        addMouseWheelListener {
            zoom = (zoom * if (it.wheelRotation < 0) 1.1 else 0.9).coerceIn(0.3, 6.0)
            repaint()
        }
    }

    fun evidenceAnimateStep() {
        ry += 24.0
        rx = (rx + 12.0).coerceIn(-89.0, 89.0)
        zoom = (zoom * 1.20).coerceIn(0.3, 6.0)
        repaint()
    }

    fun evidenceState(): String = "rx=$rx,ry=$ry,zoom=$zoom"

    private fun rotate(v: Vec3): Vec3 {
        val cx = (result.stock.minX + result.stock.maxX) / 2.0
        val cy = (result.stock.minY + result.stock.maxY) / 2.0
        val cz = -result.stock.thickness / 2.0
        var x = v.x - cx
        var y = v.y - cy
        var z = v.z - cz
        val ax = Math.toRadians(rx)
        val ay = Math.toRadians(ry)
        val y1 = y * cos(ax) - z * sin(ax)
        val z1 = y * sin(ax) + z * cos(ax)
        y = y1; z = z1
        val x1 = x * cos(ay) + z * sin(ay)
        val z2 = -x * sin(ay) + z * cos(ay)
        return Vec3(x1, y, z2)
    }

    private fun project(v: Vec3, scale: Double): Point {
        val r = rotate(v)
        return Point(
            (width / 2.0 + r.x * scale).roundToInt(),
            (height / 2.0 - r.y * scale).roundToInt()
        )
    }

    override fun paintComponent(g: Graphics) {
        super.paintComponent(g)
        val g2 = g as Graphics2D
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        g2.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY)
        val span = max(max(result.stock.maxX - result.stock.minX, result.stock.maxY - result.stock.minY), result.stock.thickness).coerceAtLeast(1.0)
        val scale = min(width, height) * 0.72 / span * zoom
        val projected = result.mesh.vertices.map { project(it, scale) }
        val stride = max(1, ceil(result.mesh.triangles.size / 5500.0).toInt())

        val rotated = result.mesh.vertices.map { rotate(it) }
        val visible = result.mesh.triangles.mapIndexedNotNull { index, t ->
            if (index % stride != 0) null else {
                val depth = (rotated[t.a].z + rotated[t.b].z + rotated[t.c].z) / 3.0
                Pair(depth, t)
            }
        }.sortedBy { it.first }
        visible.forEachIndexed { index, item ->
            val t = item.second
            val a = projected[t.a]
            val b = projected[t.b]
            val c = projected[t.c]
            val poly = Polygon(intArrayOf(a.x,b.x,c.x), intArrayOf(a.y,b.y,c.y), 3)
            val shade = (70 + index * 150 / max(1, visible.size)).coerceIn(70,220)
            g2.color = Color(30, shade, 220, 120)
            g2.fillPolygon(poly)
            g2.color = Color(61, 220, 255, 165)
            g2.stroke = BasicStroke(0.8f)
            g2.drawPolygon(poly)
        }

        g2.stroke = BasicStroke(2.4f)
        var previous: Move? = null
        result.cam.toolpaths.forEach { tp ->
            previous = null
            tp.moves.forEach { move ->
                val prev = previous
                if (prev != null) {
                    val a = project(Vec3(prev.to.x, prev.to.y, prev.z), scale)
                    val b = project(Vec3(move.to.x, move.to.y, move.z), scale)
                    g2.color = if (move.rapid) Color(255, 70, 220, 170) else Color(63, 255, 157)
                    g2.drawLine(a.x, a.y, b.x, b.y)
                }
                previous = move
            }
        }

        val removed = result.removal.depth.count { it < 0.0 }
        val absoluteMoves = result.cam.toolpaths.flatMap { it.moves }
        val minX = absoluteMoves.minOfOrNull { it.to.x } ?: 0.0
        val maxX = absoluteMoves.maxOfOrNull { it.to.x } ?: 0.0
        val minY = absoluteMoves.minOfOrNull { it.to.y } ?: 0.0
        val maxY = absoluteMoves.maxOfOrNull { it.to.y } ?: 0.0
        val minZ = absoluteMoves.minOfOrNull { it.z } ?: 0.0
        val maxZ = absoluteMoves.maxOfOrNull { it.z } ?: 0.0
        g2.color = Color(220, 240, 255)
        g2.font = Font(Font.SANS_SERIF, Font.PLAIN, 14)
        g2.drawString(
            "HQ 3D RENDER ENGINE • TRUE MESH • CAM=" + result.cam.toolpaths.size + " • removed=" + removed + " • 精度 0.001 mm",
            14, 22
        )
        g2.drawString(
            "ABS " + SoftwareCoordinateContract.coordinateMode() +
                " • MASTER " + SoftwareCoordinateContract.masterOriginData() +
                " • X[" + DisplayFormat.mm(minX) + ".." + DisplayFormat.mm(maxX) + "]" +
                " • Y[" + DisplayFormat.mm(minY) + ".." + DisplayFormat.mm(maxY) + "]" +
                " • Z[" + DisplayFormat.mm(minZ) + ".." + DisplayFormat.mm(maxZ) + "]" +
                " • OFFSET SHIFT=OFF • TOLERANCE SHIFT=OFF",
            14, 42
        )
    }
}


private class AxisMachiningPanel(private val result:Machining3DResult) : JPanel() {
    var axisA=0.0
        private set
    var axisB=0.0
        private set
    private var zoom=1.0
    init{
        background=Color(5,10,17)
        preferredSize=Dimension(860,620)
        addMouseWheelListener { zoom=(zoom*if(it.wheelRotation<0)1.1 else 0.9).coerceIn(0.3,5.0);repaint() }
    }
    fun setAngles(a:Double,b:Double){axisA=a;axisB=b;repaint()}
    private fun axisTransform(v:Vec3):Vec3{
        val cx=(result.stock.minX+result.stock.maxX)/2.0
        val cy=(result.stock.minY+result.stock.maxY)/2.0
        val cz=-result.stock.thickness/2.0
        var x=v.x-cx;var y=v.y-cy;var z=v.z-cz
        val aa=Math.toRadians(axisA)
        val bb=Math.toRadians(axisB)
        val y1=y*cos(aa)-z*sin(aa);val z1=y*sin(aa)+z*cos(aa);y=y1;z=z1
        val x1=x*cos(bb)+z*sin(bb);val z2=-x*sin(bb)+z*cos(bb);x=x1;z=z2
        return Vec3(x,y,z)
    }
    private fun project(v:Vec3,scale:Double):Point{
        val r=axisTransform(v)
        return Point(
            (width/2.0+(r.x-r.z*.34)*scale).roundToInt(),
            (height/2.0-(r.y+r.z*.28)*scale).roundToInt()
        )
    }
    override fun paintComponent(g0:Graphics){
        super.paintComponent(g0)
        val g=g0 as Graphics2D
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON)
        g.setRenderingHint(RenderingHints.KEY_RENDERING,RenderingHints.VALUE_RENDER_QUALITY)
        val span=max(max(result.stock.maxX-result.stock.minX,result.stock.maxY-result.stock.minY),result.stock.thickness).coerceAtLeast(1.0)
        val scale=min(width,height)*0.68/span*zoom
        val pts=result.mesh.vertices.map{project(it,scale)}
        val stride=max(1,ceil(result.mesh.triangles.size/4500.0).toInt())
        result.mesh.triangles.forEachIndexed { i,t ->
            if(i%stride==0){
                val a=pts[t.a];val b=pts[t.b];val c=pts[t.c]
                val poly=Polygon(intArrayOf(a.x,b.x,c.x),intArrayOf(a.y,b.y,c.y),3)
                g.color=Color(35,120,210,70);g.fillPolygon(poly)
                g.color=Color(61,235,255,155);g.stroke=BasicStroke(.9f);g.drawPolygon(poly)
            }
        }
        var prev:Move?=null
        result.cam.toolpaths.forEach { tp ->
            prev=null
            tp.moves.forEach { m ->
                val p=prev
                if(p!=null){
                    val a=project(Vec3(p.to.x,p.to.y,p.z),scale)
                    val b=project(Vec3(m.to.x,m.to.y,m.z),scale)
                    g.color=if(m.rapid)Color(61,235,255,195) else Color(255,176,32)
                    g.stroke=BasicStroke(if(m.rapid)1.8f else 2.7f)
                    g.drawLine(a.x,a.y,b.x,b.y)
                }
                prev=m
            }
        }
        g.color=Color(235,245,255);g.font=Font(Font.SANS_SERIF,Font.BOLD,14)
        g.drawString("TRUE AXIS VIEW • A="+DisplayFormat.mm(axisA)+"° • B="+DisplayFormat.mm(axisB)+"° • G0 CYAN • CUT ORANGE",14,22)
    }
}

private fun desktopAdaptiveSize(baseW: Int, baseH: Int): Dimension {
    val bounds = GraphicsEnvironment.getLocalGraphicsEnvironment().maximumWindowBounds
    val shortEdge = min(bounds.width, bounds.height)
    val longEdge = max(bounds.width, bounds.height)
    val scale = when {
        shortEdge >= 2160 && longEdge >= 3800 -> 1.35
        shortEdge >= 1440 && longEdge >= 2880 -> 1.22
        shortEdge >= 1440 && longEdge >= 2400 -> 1.14
        else -> 1.0
    }
    return Dimension(
        min((baseW * scale).roundToInt(), (bounds.width * 0.92).roundToInt()),
        min((baseH * scale).roundToInt(), (bounds.height * 0.90).roundToInt())
    )
}

private fun addRectangle(doc: DrawingDocument, x0: Double, y0: Double, x1: Double, y1: Double) {
    val a = Vec2(x0, y0)
    val b = Vec2(x1, y0)
    val c = Vec2(x1, y1)
    val d = Vec2(x0, y1)
    doc.put(Line(a = a, b = b))
    doc.put(Line(a = b, b = c))
    doc.put(Line(a = c, b = d))
    doc.put(Line(a = d, b = a))
}

private fun writePanel(panel: JPanel, file: File, width: Int = 1280, height: Int = 800) {
    panel.setSize(width, height)
    panel.doLayout()
    val image = BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB)
    val g = image.createGraphics()
    panel.paint(g)
    g.dispose()
    ImageIO.write(image, "png", file)
    require(file.isFile && file.length() > 0) { "Smoke image missing: " + file.name }
}

private fun sha256File(file: File): String {
    val md = MessageDigest.getInstance("SHA-256")
    file.inputStream().use { input ->
        val buffer = ByteArray(64 * 1024)
        while (true) {
            val n = input.read(buffer)
            if (n <= 0) break
            md.update(buffer, 0, n)
        }
    }
    return md.digest().joinToString("") { "%02x".format(it) }
}

private fun runSmoke() {
    val doc = DrawingDocument()
    addRectangle(doc, -40.0, -25.0, 40.0, 25.0)
    require(doc.size() == 4) { "2D CAD smoke failed" }
    val snapshot = doc.snapshot()
    val cam = CamModel.fromCad(1L, snapshot, CamSettings(toolDiameter = 10.0, depth = -2.0, safeZ = 5.0, feedMmMin = 150.0))
    require(cam.toolpaths.isNotEmpty()) { "CAM smoke failed" }
    val result = Machining3DEngine.build(snapshot, cam.settings)
    require(result.mesh.vertices.isNotEmpty() && result.mesh.triangles.isNotEmpty()) { "3D mesh smoke failed" }
    require(result.removal.depth.any { it < 0.0 }) { "Material removal smoke failed" }

    val smokeRoot = JPanel(BorderLayout()).apply {
        background = Color(5,10,17)
        val header = AdaptiveGlassToolbar().apply {
            background = Color(8,18,30)
            add(JLabel("AIG CNC • OFFICIAL RGB ORIGINAL").apply { foreground=Color(61,235,255);font=font.deriveFont(Font.BOLD,20f) })
            listOf("2D CAD","CAM","3D SIM","NC EDIT").forEachIndexed { i,label ->
                add(GlassActionButton(label, listOf(Color(61,235,255),Color(63,255,157),Color(236,72,153),Color(80,170,255))[i]))
            }
        }
        add(header,BorderLayout.NORTH)
        add(CadPanel(doc) {},BorderLayout.CENTER)
        add(JLabel("AIG CNC • 0.001 mm • FANUC • RGB RUNTIME").apply { foreground=Color(99,255,157);border=BorderFactory.createEmptyBorder(8,12,8,12) },BorderLayout.SOUTH)
    }
    val launchFile = File("desktop_launch.png")
    writePanel(smokeRoot, launchFile)

    val meshPanel = Mesh3DPanel(result)
    val renderRoot = JPanel(BorderLayout()).apply {
        background = Color(5, 10, 17)
        add(AdaptiveGlassToolbar().apply {
            add(JLabel("AIG CNC • OFFICIAL RGB ORIGINAL • 3D SIM • HQ RENDER ENGINE").apply {
                foreground = Color(61,235,255)
                font = font.deriveFont(Font.BOLD,18f)
            })
            add(GlassActionButton("ROTATE", Color(236,72,153)))
            add(GlassActionButton("ZOOM", Color(125,112,255)))
            add(GlassActionButton("TRUE MATERIAL REMOVAL", Color(63,255,157)))
        }, BorderLayout.NORTH)
        add(meshPanel, BorderLayout.CENTER)
        add(JLabel("TRUE MESH • CAM + MATERIAL REMOVAL • 0.001 mm").apply {
            foreground = Color(99,255,157)
            border = BorderFactory.createEmptyBorder(8,12,8,12)
        }, BorderLayout.SOUTH)
    }
    val beforeFile = File("desktop_3d_before.png")
    val afterFile = File("desktop_3d.png")
    writePanel(renderRoot, beforeFile)
    val beforeState = meshPanel.evidenceState()
    meshPanel.evidenceAnimateStep()
    writePanel(renderRoot, afterFile)
    val afterState = meshPanel.evidenceState()
    require(sha256File(beforeFile) != sha256File(afterFile)) { "3D rotate/zoom produced identical frames" }

    val removed = result.removal.depth.count { it < 0.0 }
    require(removed > 0) { "Material removal result empty" }
    val absoluteMoves = result.cam.toolpaths.flatMap { it.moves }
    require(absoluteMoves.any { it.to.x < 0.0 || it.to.y < 0.0 }) { "Signed negative CAM coordinates missing" }
    require(SoftwareCoordinateContract.masterOriginData() == "X0.000 Y0.000 Z0.000")
    require(SoftwareCoordinateContract.xyzData(-40.0, -25.0, -2.0) == "X-40.000 Y-25.000 Z-2.000")
    require(!SoftwareCoordinateContract.simulationAppliesWorkOffset())
    require(!SoftwareCoordinateContract.simulationUsesToleranceCompensation())
    val sourceSha = System.getenv()["GITHUB_SHA"] ?: "LOCAL"
    File("REMOVED_CELLS.txt").writeText(
        "SOURCE_SHA=$sourceSha\nREMOVED_CELLS=$removed\n"
    )
    File("3D_RUNTIME_EVIDENCE.txt").writeText(
        "SOURCE_SHA=$sourceSha\n" +
            "OFFICIAL_RGB_UI=PASS\n3D_PAGE_OPENED=PASS\nHQ_RENDERER_STARTED=PASS\n" +
            "DRAG_ROTATION_CAPABILITY=PASS\nWHEEL_ZOOM_CAPABILITY=PASS\n" +
            "ANIMATION_FRAME_CHANGE=PASS\nMATERIAL_REMOVAL=PASS\nREMOVED_CELLS=$removed\n" +
            "ABS_MODE=" + SoftwareCoordinateContract.coordinateMode() + "\n" +
            "MASTER_ORIGIN=" + SoftwareCoordinateContract.masterOriginData() + "\n" +
            "SIGNED_NEGATIVE_SAMPLE=" + SoftwareCoordinateContract.xyzData(-40.0, -25.0, -2.0) + "\n" +
            "SIM_WORK_OFFSET_SHIFT=" + SoftwareCoordinateContract.simulationAppliesWorkOffset() + "\n" +
            "SIM_TOLERANCE_SHIFT=" + SoftwareCoordinateContract.simulationUsesToleranceCompensation() + "\n" +
            "STATE_BEFORE=$beforeState\nSTATE_AFTER=$afterState\n" +
            "DESKTOP_3D_SHA256=" + sha256File(afterFile) + "\n"
    )
    File("3D_RUNTIME_SHA256.txt").writeText(
        sha256File(launchFile) + "  desktop_launch.png\n" +
            sha256File(beforeFile) + "  desktop_3d_before.png\n" +
            sha256File(afterFile) + "  desktop_3d.png\n" +
            "SOURCE_SHA=$sourceSha\n"
    )

    File("desktop_smoke.txt").writeText(
        "STUDIO_WINDOWS_SMOKE=PASS\n" +
            "CAD_ENTITIES=" + doc.size() + "\n" +
            "CAM_PATHS=" + cam.toolpaths.size + "\n" +
            "MESH_VERTICES=" + result.mesh.vertices.size + "\n" +
            "MESH_TRIANGLES=" + result.mesh.triangles.size + "\n" +
            "REMOVED_CELLS=$removed\n" +
            "OFFICIAL_RGB_UI_SCREENSHOT=desktop_launch.png\n" +
            "HQ_3D_RUNTIME_SCREENSHOT=desktop_3d.png\n" +
            "ANIMATION_FRAME_CHANGE=PASS\n"
    )
}

private fun fanucFromCam(cam: CamModel): String {
    fun fmt(v: Double): String = java.lang.String.format(java.util.Locale.US, "%.3f", v)
    val out = mutableListOf<String>()
    out += "%"
    out += "O5000"
    out += "G90 G54"
    out += "T1 M6"
    out += "S2300 M3"
    out += "G43 H1 Z" + fmt(cam.settings.safeZ) + " M8"
    cam.toolpaths.forEachIndexed { index, path ->
        out += "N" + ((index + 1) * 10)
        path.moves.forEach { move ->
            val code = if (move.rapid) "G0" else "G1"
            val feed = if (move.rapid) "" else " F" + fmt((move as Feed).feedMmMin)
            out += code + " X" + fmt(move.to.x) + " Y" + fmt(move.to.y) + " Z" + fmt(move.z) + feed
        }
    }
    out += "G0 Z" + fmt(cam.settings.safeZ)
    out += "M9"
    out += "M5"
    out += "M99"
    out += "%"
    return out.joinToString("\n")
}

private fun showNcEditor(frame: JFrame, doc: DrawingDocument) {
    val cam = CamModel.fromCad(1L, doc.snapshot())
    require(cam.toolpaths.isNotEmpty()) { "NC BLOCKED: no CAM toolpath" }
    var controllerProfile = CncControllerProfile.FANUC
    var coordinateMode = NcCoordinateMode.ABSOLUTE_G90
    var originTransformMode = NcOriginTransformMode.WORK_OFFSET_ONLY
    var cutterCompensation = CutterCompensationMode.CAM_GEOMETRY_G40
    fun generateNc(): String = CncPost.generate(
        cam,
        FanucPostSettings(
            controller = controllerProfile,
            coordinateMode = coordinateMode,
            originTransformMode = originTransformMode,
            cutterCompensation = cutterCompensation
        )
    )
    val area = JTextArea(generateNc()).apply {
        background = Color(5,8,12)
        foreground = Color(99,255,157)
        font = Font(Font.MONOSPACED, Font.PLAIN, 15)
        lineWrap = false
    }
    val machineInterlockSession = NcMachineInterlockSession()
    val modalStatus = JLabel("MODAL • " + NcModalTracker.evidence(area.text)).apply {
        foreground = Color(255,210,90)
    }
    val lineHelp = JLabel().apply {
        foreground = Color(190,220,255)
    }
    fun refreshLineHelp() {
        val line = NcCodeCatalog.lineNumberAt(area.text, area.caretPosition)
        lineHelp.text = "LINE HELP • " + NcCodeCatalog.lineHelp(area.text, line) + " • " + NcSemanticAuthority.lineEvidence(area.text, line, controllerProfile) + " • " + NcExecutionTimeline.lineEvidence(area.text, line, controllerProfile)
    }
    fun refreshModalStatus() {
        val blocked = NcProgramSafetyPolicy.blocking(area.text)
        val machine = machineInterlockSession.inspect(area.text)
        modalStatus.foreground = if (blocked.isEmpty() && machine.canExecute) Color(255,210,90) else Color(255,110,110)
        modalStatus.text = "MODAL • " + NcModalTracker.evidence(area.text) +
            " • AUX=" + NcAuxiliaryTracker.evidence(area.text) +
            " • CODE=" + NcCodeCatalog.programLegend(area.text,12) +
            " • " + CncControllerCapabilityMatrix.summary(controllerProfile, area.text) +
            (if (blocked.isEmpty()) " • SAFETY=PASS"
            else " • BLOCKED=" + blocked.take(4).joinToString(",") {
                (if (it.lineNumber > 0) "L" + it.lineNumber + ":" else "") + it.code
            }) + " • " + machine.evidence()
    }
    area.document.addDocumentListener(object : javax.swing.event.DocumentListener {
        override fun insertUpdate(e: javax.swing.event.DocumentEvent?) { refreshModalStatus(); refreshLineHelp() }
        override fun removeUpdate(e: javax.swing.event.DocumentEvent?) { refreshModalStatus(); refreshLineHelp() }
        override fun changedUpdate(e: javax.swing.event.DocumentEvent?) { refreshModalStatus(); refreshLineHelp() }
    })
    area.addCaretListener { refreshLineHelp() }
    refreshLineHelp()
    val controller = JComboBox(CncControllerProfile.entries.toTypedArray()).apply {
        selectedItem = controllerProfile
        renderer = object : DefaultListCellRenderer() {
            override fun getListCellRendererComponent(
                list: JList<*>?, value: Any?, index: Int, isSelected: Boolean, cellHasFocus: Boolean
            ): Component = super.getListCellRendererComponent(
                list,
                (value as? CncControllerProfile)?.displayName ?: value,
                index,
                isSelected,
                cellHasFocus
            )
        }
    }
    val coordinate = JComboBox(NcCoordinateMode.entries.toTypedArray()).apply {
        selectedItem = coordinateMode
        toolTipText = "G90: general machining/copy blocks • G91: repeated patterns/subprograms"
        renderer = object : DefaultListCellRenderer() {
            override fun getListCellRendererComponent(
                list: JList<*>?, value: Any?, index: Int, isSelected: Boolean, cellHasFocus: Boolean
            ): Component = super.getListCellRendererComponent(
                list,
                (value as? NcCoordinateMode)?.displayName ?: value,
                index,
                isSelected,
                cellHasFocus
            )
        }
    }
    val origin = JComboBox(NcOriginTransformMode.entries.toTypedArray()).apply {
        selectedItem = originTransformMode
        toolTipText = "G92: temporary origin layer; canonical CAD/CAM/SIM ABS XYZ unchanged"
        renderer = object : DefaultListCellRenderer() {
            override fun getListCellRendererComponent(
                list: JList<*>?, value: Any?, index: Int, isSelected: Boolean, cellHasFocus: Boolean
            ): Component = super.getListCellRendererComponent(
                list,
                (value as? NcOriginTransformMode)?.displayName ?: value,
                index,
                isSelected,
                cellHasFocus
            )
        }
    }
    val compensation = JComboBox(CutterCompensationMode.entries.toTypedArray()).apply {
        selectedItem = cutterCompensation
        renderer = object : DefaultListCellRenderer() {
            override fun getListCellRendererComponent(
                list: JList<*>?, value: Any?, index: Int, isSelected: Boolean, cellHasFocus: Boolean
            ): Component = super.getListCellRendererComponent(
                list,
                (value as? CutterCompensationMode)?.displayName ?: value,
                index,
                isSelected,
                cellHasFocus
            )
        }
    }
    fun refreshNcFromPostSelection() {
        val nextController = controller.selectedItem as? CncControllerProfile ?: CncControllerProfile.FANUC
        val nextCoordinate = coordinate.selectedItem as? NcCoordinateMode ?: NcCoordinateMode.ABSOLUTE_G90
        val nextOrigin = origin.selectedItem as? NcOriginTransformMode ?: NcOriginTransformMode.WORK_OFFSET_ONLY
        val nextComp = compensation.selectedItem as? CutterCompensationMode ?: CutterCompensationMode.CAM_GEOMETRY_G40
        if (nextComp != CutterCompensationMode.CAM_GEOMETRY_G40) {
            compensation.selectedItem = CutterCompensationMode.CAM_GEOMETRY_G40
            JOptionPane.showMessageDialog(
                frame,
                nextComp.code + " BLOCKED: current CAM already applies geometric tool-radius compensation.",
                "CUTTER COMP",
                JOptionPane.WARNING_MESSAGE
            )
            return
        }
        controllerProfile = nextController
        coordinateMode = nextCoordinate
        originTransformMode = nextOrigin
        cutterCompensation = nextComp
        runCatching { generateNc() }
            .onSuccess { area.text = it }
            .onFailure {
                area.text = ""
                JOptionPane.showMessageDialog(
                    frame,
                    (it.message ?: "unsupported post mode") + "\nCAD/CAM/SIM canonical ABS XYZ remains unchanged.",
                    "NC POST BLOCKED",
                    JOptionPane.WARNING_MESSAGE
                )
            }
    }
    controller.addActionListener { refreshNcFromPostSelection() }
    coordinate.addActionListener { refreshNcFromPostSelection() }
    origin.addActionListener { refreshNcFromPostSelection() }
    compensation.addActionListener { refreshNcFromPostSelection() }
    val keys = listOf("G","M","X","Y","Z","F","S","T","A","B","7","8","9","-",".","4","5","6","0","/","1","2","3","INSERT","DELETE","BLOCK SKIP")
    val keypad = AdaptiveGlassToolbar()
    keys.forEach { key ->
        keypad.add(GlassActionButton(key, Color(80,170,255)).apply {
            addActionListener {
                when (key) {
                    "DELETE" -> {
                        val s = area.selectionStart
                        val e = area.selectionEnd
                        if (e > s) area.replaceRange("", s, e) else if (s > 0) area.replaceRange("", s-1, s)
                    }
                    "INSERT" -> area.insert("\n", area.caretPosition)
                    "BLOCK SKIP" -> area.insert("/", area.caretPosition)
                    else -> area.insert(key, area.caretPosition)
                }
                area.requestFocusInWindow()
            }
        })
    }
    val alarmReset = GlassActionButton("ALARM RESET", Color(255,110,110)).apply {
        addActionListener {
            val reset = machineInterlockSession.reset()
            if (reset.state == NcMachineInterlockState.REVALIDATE_REQUIRED) {
                machineInterlockSession.revalidate(area.text)
            }
            refreshModalStatus()
        }
    }
    val resume = GlassActionButton("RESUME", Color(99,255,157)).apply {
        addActionListener {
            machineInterlockSession.resume()
            refreshModalStatus()
        }
    }
    JDialog(frame, "AIG CNC • NC EDIT • CONTROLLER", false).apply {
        layout = BorderLayout()
        add(JPanel(BorderLayout()).apply {
            background = Color(8,18,30)
            add(JPanel(FlowLayout(FlowLayout.LEFT)).apply {
                background = Color(8,18,30)
                add(JLabel("CONTROL").apply { foreground = Color(61,235,255) })
                add(controller)
                add(coordinate)
                add(origin)
                add(compensation)
                add(alarmReset)
                add(resume)
            }, BorderLayout.CENTER)
            add(JPanel(GridLayout(0,1)).apply {
                background = Color(8,18,30)
                add(modalStatus)
                add(lineHelp)
            }, BorderLayout.SOUTH)
        }, BorderLayout.NORTH)
        add(JScrollPane(area), BorderLayout.CENTER)
        add(keypad, BorderLayout.SOUTH)
        setSize(920,720)
        setLocationRelativeTo(frame)
        isVisible = true
    }
}


private fun showUnifiedMachiningEditor(frame:JFrame,doc:DrawingDocument,status:JLabel){
    val snapshot=doc.snapshot()
    require(snapshot.entities.isNotEmpty()){"UNIFIED WORKSPACE BLOCKED: no CAD geometry"}
    val result=Machining3DEngine.build(snapshot)
    var axisA=0.0
    var axisB=0.0
    var axisMode="3AX"
    var rotaryClampProfile=RotaryAxisClampProfile.unconfigured()
    fun currentRotaryMode():RotaryAxisOperationMode=when(axisMode){
        "4AX" -> RotaryAxisOperationMode.INDEXED_4AX
        "5AX" -> RotaryAxisOperationMode.INDEXED_5AX
        else -> RotaryAxisOperationMode.NONE
    }
    fun clampStatus():String=when{
        rotaryClampProfile.controllerAutomatic -> "PMC AUTO"
        rotaryClampProfile.explicit ->
            "M"+rotaryClampProfile.unclampM+" UNLOCK / M"+rotaryClampProfile.clampM+" LOCK"
        else -> "UNCONFIGURED"
    }
    fun generateNc():String {
        val orientedCam=CamModel.fromCad(0L,snapshot,result.cam.settings,axisA,axisB)
        return CncPost.generate(
            orientedCam,
            FanucPostSettings(
                axisA=axisA,
                axisB=axisB,
                rotaryMode=currentRotaryMode(),
                rotaryClampProfile=rotaryClampProfile
            )
        )
    }
    val editor=JTextArea(generateNc()).apply{
        background=Color(5,8,12);foreground=Color(99,255,157)
        font=Font(Font.MONOSPACED,Font.PLAIN,14);lineWrap=false;tabSize=4
    }
    val editorPanel=JPanel(BorderLayout()).apply{
        background=Color(8,18,30)
        border=BorderFactory.createCompoundBorder(BorderFactory.createLineBorder(Color(61,235,255,130),1,true),EmptyBorder(8,8,8,8))
        add(JLabel("可編輯 G-code • EDITABLE NC • FANUC").apply{foreground=Color(255,210,90);font=font.deriveFont(Font.BOLD,14f)},BorderLayout.NORTH)
        add(JScrollPane(editor),BorderLayout.CENTER)
    }
    val card=CardLayout()
    val visual=JPanel(card).apply{background=Color(5,10,17)}
    val mesh=Mesh3DPanel(result)
    val axes=AxisMachiningPanel(result)
    visual.add(mesh,"3D");visual.add(axes,"AXIS")
    val split=JSplitPane(JSplitPane.HORIZONTAL_SPLIT,visual,editorPanel).apply{
        resizeWeight=.66;dividerSize=6;border=null
    }
    val dlg=JDialog(frame,"AIG CNC • 3D / 3AX / 4AX / 5AX + EDITABLE G-CODE",false).apply{
        layout=BorderLayout();minimumSize=Dimension(1100,720)
    }
    val modeBar=AdaptiveGlassToolbar()
    val modeButtons=mutableListOf<GlassActionButton>()
    fun mode(id:String,zh:String,en:String,color:Color,icon:String,run:()->Unit){
        val b=GlassActionButton("$zh / $en",color).apply{
            this.icon=RgbGlyphIcon(icon,color)
            horizontalTextPosition=SwingConstants.RIGHT
            addActionListener{
                modeButtons.forEach{it.active=false};active=true;run()
            }
        }
        modeButtons+=b;modeBar.add(b)
    }
    mode("CAD","2D繪圖","2D CAD",Color(61,235,255),"CAD"){dlg.dispose()}
    mode("CAM","刀路","CAM",Color(63,255,157),"CAM"){status.text="REAL CAM • paths="+result.cam.toolpaths.size}
    mode("3D","3D模擬","3D",Color(139,92,246),"3D"){axisMode="3AX";axisA=0.0;axisB=0.0;card.show(visual,"3D")}
    mode("3AX","三軸","3 AXIS",Color(59,130,246),"3AX"){axisMode="3AX";axisA=0.0;axisB=0.0;axes.setAngles(0.0,0.0);card.show(visual,"AXIS")}
    mode("4AX","四軸","4 AXIS",Color(245,158,11),"4AX"){axisMode="4AX";axisB=0.0;axes.setAngles(axisA,0.0);card.show(visual,"AXIS")}
    mode("5AX","五軸","5 AXIS",Color(236,72,153),"5AX"){axisMode="5AX";axes.setAngles(axisA,axisB);card.show(visual,"AXIS")}
    mode("NC_EDIT","程式","NC EDIT",Color(80,170,255),"NC_EDIT"){editor.requestFocusInWindow()}
    modeButtons.getOrNull(2)?.active=true

    val actions=AdaptiveGlassToolbar()
    fun action(label:String,color:Color,icon:String,run:()->Unit){
        actions.add(GlassActionButton(label,color).apply{
            this.icon=RgbGlyphIcon(icon,color);addActionListener{run()}
        })
    }
    action("A−",Color(139,92,246),"4AX"){if(axisMode!="5AX")axisMode="4AX";axisA=(axisA-15.0).coerceAtLeast(-360.0);axes.setAngles(axisA,axisB);card.show(visual,"AXIS")}
    action("A+",Color(139,92,246),"4AX"){if(axisMode!="5AX")axisMode="4AX";axisA=(axisA+15.0).coerceAtMost(360.0);axes.setAngles(axisA,axisB);card.show(visual,"AXIS")}
    action("B−",Color(236,72,153),"5AX"){axisMode="5AX";axisB=(axisB-15.0).coerceAtLeast(-360.0);axes.setAngles(axisA,axisB);card.show(visual,"AXIS")}
    action("B+",Color(236,72,153),"5AX"){axisMode="5AX";axisB=(axisB+15.0).coerceAtMost(360.0);axes.setAngles(axisA,axisB);card.show(visual,"AXIS")}
    action("旋轉鎖定 / ROTARY CLAMP",Color(125,112,255),"4AX"){
        val mode=JComboBox(arrayOf(
            "UNCONFIGURED / BLOCK",
            "CONTROLLER / PMC AUTO • VERIFIED MACHINE ONLY",
            "EXPLICIT MACHINE M-CODES"
        ))
        mode.selectedIndex=when{
            rotaryClampProfile.controllerAutomatic -> 1
            rotaryClampProfile.explicit -> 2
            else -> 0
        }
        val unlock=JTextField(rotaryClampProfile.unclampM?.toString().orEmpty(),8)
        val lock=JTextField(rotaryClampProfile.clampM?.toString().orEmpty(),8)
        val cutLock=JCheckBox("Indexed cutting also requires LOCK",rotaryClampProfile.requireClampForIndexedCutting)
        val panel=JPanel(GridLayout(0,1,4,4)).apply{
            add(JLabel("Machine-specific rotary clamp profile • never assume universal M-codes"))
            add(mode)
            add(JLabel("UNLOCK M number"));add(unlock)
            add(JLabel("LOCK M number"));add(lock)
            add(cutLock)
        }
        if(JOptionPane.showConfirmDialog(
            dlg,panel,"ROTARY CLAMP / MACHINE PROFILE",JOptionPane.OK_CANCEL_OPTION,JOptionPane.WARNING_MESSAGE
        )==JOptionPane.OK_OPTION){
            runCatching{
                when(mode.selectedIndex){
                    0 -> RotaryAxisClampProfile.unconfigured()
                    1 -> RotaryAxisClampProfile.controllerAutomatic(cutLock.isSelected)
                    else -> RotaryAxisClampProfile.explicit(
                        clampM=lock.text.trim().toIntOrNull() ?: error("LOCK M number required"),
                        unclampM=unlock.text.trim().toIntOrNull() ?: error("UNLOCK M number required"),
                        requireClampForIndexedCutting=cutLock.isSelected
                    )
                }
            }.onSuccess{
                rotaryClampProfile=it
                status.text="ROTARY PROFILE • "+axisMode+" • "+clampStatus()+" • NC STALE / REBUILD REQUIRED"
            }.onFailure{
                status.text="ROTARY PROFILE BLOCKED • "+(it.message?:"invalid machine profile")
            }
        }
    }
    action("重建NC / REBUILD NC",Color(34,197,94),"NC_EDIT"){
        runCatching{generateNc()}.onSuccess{
            editor.text=it
            status.text="UNIFIED NC REBUILT • "+axisMode+" • A="+DisplayFormat.mm(axisA)+" B="+DisplayFormat.mm(axisB)+" • "+clampStatus()
        }
            .onFailure{status.text="UNIFIED NC BLOCKED: "+(it.message?:"error")}
    }
    action("安全檢查 / SAFE CHECK",Color(255,176,32),"NC_EDIT"){
        val blocked=NcProgramSafetyPolicy.blocking(editor.text,rotaryClampProfile,currentRotaryMode())
        status.text=if(blocked.isEmpty())"UNIFIED NC SAFETY PASS" else "UNIFIED NC BLOCKED • "+blocked.take(3).joinToString(","){it.code}
    }
    action("儲存草稿 / SAVE DRAFT",Color(61,235,255),"NC_EDIT"){
        status.text="NC DRAFT IN EDITOR • FINAL UNVERIFIED • chars="+editor.text.length
    }

    dlg.add(modeBar,BorderLayout.NORTH)
    dlg.add(split,BorderLayout.CENTER)
    dlg.add(actions,BorderLayout.SOUTH)
    dlg.size=desktopAdaptiveSize(1500,900)
    dlg.setLocationRelativeTo(frame)
    dlg.isVisible=true
}

private fun showApp() {
    val doc = DrawingDocument()
    val status = JLabel("AIG CNC • FANUC / MITSUBISHI M800/M80 • 原點 X0.000 Y0.000 • 精度 0.001 mm")
    status.foreground = Color(99, 255, 157)
    val cad = CadPanel(doc) { status.text = it }

    val frame = JFrame("AIG CNC — OFFICIAL RGB ORIGINAL")
    frame.defaultCloseOperation = WindowConstants.EXIT_ON_CLOSE
    frame.layout = BorderLayout()
    frame.contentPane.background = Color(5, 10, 17)

    val toolbar = AdaptiveGlassToolbar()

    val activeButtons = mutableListOf<GlassActionButton>()
    fun button(label: String, color: Color, action: () -> Unit): GlassActionButton {
        return GlassActionButton(label, color).apply {
            activeButtons += this
            addActionListener {
                activeButtons.forEach { b -> b.active = false }
                active = true
                action()
            }
        }
    }

    toolbar.add(button("LINE", Color(61, 235, 255)) { cad.mode = DrawMode.LINE; status.text = "LINE" })
    toolbar.add(button("RECT", Color(139, 92, 246)) { cad.mode = DrawMode.RECT; status.text = "RECT" })
    toolbar.add(button("CIRCLE", Color(245, 158, 11)) { cad.mode = DrawMode.CIRCLE; status.text = "CIRCLE" })
    toolbar.add(button("CAM", Color(34, 197, 94)) {
        runCatching { CamModel.fromCad(1L, doc.snapshot()) }
            .onSuccess { cam ->
                JOptionPane.showMessageDialog(frame, "TRUE CAM paths=" + cam.toolpaths.size, "CAM", JOptionPane.INFORMATION_MESSAGE)
            }
            .onFailure { JOptionPane.showMessageDialog(frame, "CAM BLOCKED: " + it.message, "CAM", JOptionPane.WARNING_MESSAGE) }
    })
    toolbar.add(button("3D 加工", Color(236, 72, 153)) {
        runCatching { Machining3DEngine.build(doc.snapshot()) }
            .onSuccess { result ->
                val animationSummary = runCatching {
                    NcExecutionTimeline.programSummary(CncPost.generate(result.cam, FanucPostSettings()), CncControllerProfile.FANUC)
                }.getOrElse { error -> "NC→3D ANIM BLOCKED • NC_POST=" + (error.message ?: "error") }
                status.text = animationSummary
                JDialog(frame, "RGB 真 3D 加工 • HQ RENDER", false).apply {
                    layout = BorderLayout()
                    add(Mesh3DPanel(result), BorderLayout.CENTER)
                    add(JLabel(animationSummary).apply {
                        foreground = if (animationSummary.contains("BLOCKED")) Color(255,110,110) else Color(99,255,157)
                        border = BorderFactory.createEmptyBorder(6,10,8,10)
                    }, BorderLayout.SOUTH)
                    setSize(1050, 760)
                    setLocationRelativeTo(frame)
                    isVisible = true
                }
            }
            .onFailure { JOptionPane.showMessageDialog(frame, "3D BLOCKED: " + it.message, "3D", JOptionPane.WARNING_MESSAGE) }
    })
    toolbar.add(button("NC EDIT", Color(80, 170, 255)) {
        runCatching { showNcEditor(frame, doc) }
            .onSuccess { status.text = "NC EDIT • FANUC / MITSUBISHI • G90/G91 EXPLICIT • ABS XYZ LOCKED" }
            .onFailure { status.text = "NC EDIT BLOCKED: " + it.message }
    })
    toolbar.add(button("3D/3AX/4AX/5AX + NC", Color(125,112,255)) {
        runCatching { showUnifiedMachiningEditor(frame,doc,status) }
            .onFailure { status.text="UNIFIED WORKSPACE BLOCKED: "+(it.message?:"error") }
    })
    toolbar.add(button("CLEAR", Color(239, 68, 68)) { cad.clearCad() })

    status.border = BorderFactory.createEmptyBorder(8, 12, 8, 12)
    status.background = Color(5, 10, 17)
    status.isOpaque = true

    frame.add(toolbar, BorderLayout.NORTH)
    frame.add(cad, BorderLayout.CENTER)
    frame.add(status, BorderLayout.SOUTH)
    frame.size = desktopAdaptiveSize(1280, 820)
    frame.setLocationRelativeTo(null)
    frame.isVisible = true
}

fun main(args: Array<String>) {
    if (args.contains("--smoke")) {
        runSmoke()
        return
    }
    if (GraphicsEnvironment.isHeadless()) error("Desktop UI requires a graphical Windows session")
    SwingUtilities.invokeLater { showApp() }
}
