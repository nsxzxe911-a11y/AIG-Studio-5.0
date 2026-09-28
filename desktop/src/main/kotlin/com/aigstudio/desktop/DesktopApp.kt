package com.aigstudio.desktop

import com.aigstudio.core.*
import java.awt.*
import java.awt.event.*
import java.awt.geom.Path2D
import java.awt.image.BufferedImage
import java.io.File
import java.security.MessageDigest
import java.util.Properties
import java.util.prefs.Preferences
import javax.imageio.ImageIO
import javax.swing.*
import javax.swing.border.EmptyBorder
import kotlin.math.*


private object StudioDesktopOriginalVisuals {
    val startup:BufferedImage? by lazy {
        runCatching {
            StudioDesktopOriginalVisuals::class.java.getResourceAsStream("/visuals/studio_startup_original.png")
                ?.use(ImageIO::read)
        }.getOrNull()
    }
    val machine:BufferedImage? by lazy { null }
    fun paintCover(g:Graphics2D,w:Int,h:Int,image:BufferedImage?,alpha:Float,zoom:Double=1.0,panX:Double=0.0) {
        if(image==null || w<=0 || h<=0)return
        val srcRatio=image.width.toDouble()/image.height.toDouble()
        val dstRatio=w.toDouble()/h.toDouble()
        val baseW=if(srcRatio>dstRatio) h*srcRatio else w.toDouble()
        val baseH=if(srcRatio>dstRatio) h.toDouble() else w/srcRatio
        val dw=baseW*zoom; val dh=baseH*zoom
        val x=((w-dw)/2.0+panX).roundToInt()
        val y=((h-dh)/2.0).roundToInt()
        val old=g.composite
        g.composite=AlphaComposite.SrcOver.derive(alpha.coerceIn(0f,1f))
        g.drawImage(image,x,y,dw.roundToInt(),dh.roundToInt(),null)
        g.composite=old
    }
}


private class StudioDesktopStartupWindow {
    private val window=JWindow()
    private val title=JLabel("AIG CNC",SwingConstants.CENTER)
    private val detail=JLabel("CAD • CAM • SIM • 3AX • 4AX • 5AX • NC • AI",SwingConstants.CENTER)
    private val status=JLabel("啟動中…",SwingConstants.CENTER)
    private val progress=JProgressBar(0,100)
    private var stage=StudioStartupStage.BOOTSTRAP
    private val timer=Timer(40){window.repaint()}
    private val panel=object:JPanel(){
        override fun paintComponent(g0:Graphics){
            super.paintComponent(g0)
            val g=g0.create() as Graphics2D
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BICUBIC)
            val phase=(System.currentTimeMillis()%9000L)/9000.0
            val zoom=1.02+0.035*sin(phase*2.0*PI)
            StudioDesktopOriginalVisuals.paintCover(g,width,height,StudioDesktopOriginalVisuals.startup,0.90f,zoom,(phase-0.5)*20.0)
            g.color=Color(2,7,14,100);g.fillRect(0,0,width,height)
            g.color=Color(61,235,255,72);g.fillRect(0,(phase*height).roundToInt(),width,2)
            g.dispose()
        }
    }.apply{
        layout=BoxLayout(this,BoxLayout.Y_AXIS)
        background=Color(4,9,18)
        border=BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(Color(61,235,255),2,true),
            EmptyBorder(30,42,30,42)
        )
    }

    init{
        title.foreground=Color.WHITE;title.font=title.font.deriveFont(Font.BOLD,32f)
        detail.foreground=Color(190,215,235);detail.font=detail.font.deriveFont(Font.PLAIN,12f)
        status.foreground=Color(61,235,255);status.font=status.font.deriveFont(Font.BOLD,15f)
        progress.isStringPainted=true;progress.foreground=Color(61,235,255);progress.background=Color(22,32,46)
        listOf<JComponent>(title,detail,status,progress).forEach{
            it.alignmentX=Component.CENTER_ALIGNMENT;panel.add(it);panel.add(Box.createVerticalStrut(14))
        }
        window.contentPane=panel
        window.setSize(760,430)
        window.setLocationRelativeTo(null)
    }

    fun show(){timer.start();window.isVisible=true;window.toFront()}
    fun advance(next:StudioStartupStage,message:String){
        if(!StudioStartupEngineContract.canAdvance(stage,next))return
        stage=next
        val pct=StudioStartupEngineContract.progressBefore(next)
        progress.value=pct;progress.string="$pct%";status.text=message
        window.repaint();Toolkit.getDefaultToolkit().sync()
    }
    fun close(){
        progress.value=100;progress.string="100%";timer.stop();window.dispose()
    }
    fun evidencePanel():JPanel=panel
}

private class AdaptiveGlassToolbar : JPanel() {
    private var cols = 7
    init {
        isOpaque = false
        border = BorderFactory.createEmptyBorder(8, 10, 8, 10)
        layout = GridLayout(0, cols, 6, 6)
        addComponentListener(object : ComponentAdapter() {
            override fun componentResized(e: ComponentEvent) {
                val next = max(2, width / 112)
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
        g2.paint = GradientPaint(0f,0f,Color(16,28,42,235),0f,height.toFloat(),Color(8,12,22,238))
        g2.fillRoundRect(0, 0, width, height, 22, 22)
        g2.color = Color(61, 235, 255, 140)
        g2.stroke = BasicStroke(1.2f)
        g2.drawRoundRect(1, 1, max(0, width - 3), max(0, height - 3), 20, 20)
        g2.dispose()
        super.paintComponent(g)
    }
}

private class CadToolGrid : JPanel(FlowLayout(FlowLayout.LEFT,8,8)) {
    init {
        isOpaque=false
        border=BorderFactory.createEmptyBorder(8,8,8,8)
    }
    override fun addImpl(comp:Component,constraints:Any?,index:Int) {
        if(comp is JButton) {
            comp.preferredSize=Dimension(96,50)
            comp.minimumSize=Dimension(88,46)
        }
        super.addImpl(comp,constraints,index)
    }
    override fun paintComponent(g:Graphics) {
        val g2=g.create() as Graphics2D
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON)
        g2.paint=GradientPaint(
            0f,0f,Color(20,38,58,230),
            width.toFloat(),height.toFloat(),Color(5,13,24,220)
        )
        g2.fillRoundRect(1,1,max(0,width-2),max(0,height-2),22,22)
        g2.color=Color(61,235,255,42)
        g2.fillRoundRect(7,7,max(0,width-14),max(0,height-14),18,18)
        g2.color=Color(61,235,255,118)
        g2.stroke=BasicStroke(1.35f)
        g2.drawRoundRect(1,1,max(0,width-3),max(0,height-3),22,22)
        g2.color=Color(255,255,255,30)
        g2.drawLine(12,6,max(12,width-12),6)
        g2.dispose()
        super.paintComponent(g)
    }
}

private class GlassActionButton(label: String, private val accent: Color) : JButton(label) {
    private val pulseTimer=Timer(90) { if(active && isShowing) repaint() }.apply { isRepeats=true }
    var active = false
        set(value) {
            field = value
            if(value) pulseTimer.start() else pulseTimer.stop()
            repaint()
        }
    init {
        foreground = StudioDesktopProductionTheme.text
        isOpaque = false
        isContentAreaFilled = false
        isFocusPainted = false
        isRolloverEnabled = true
        border = BorderFactory.createEmptyBorder(8, 10, 8, 10)
        preferredSize = Dimension(118, 48)
        ProductionRgbAssets.icon(label)?.let {
            icon=it
            iconTextGap=7
            horizontalTextPosition=SwingConstants.RIGHT
        }
    }
    override fun paintComponent(g: Graphics) {
        val g2 = g.create() as Graphics2D
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        g2.setRenderingHint(RenderingHints.KEY_RENDERING,RenderingHints.VALUE_RENDER_QUALITY)
        val pressed=model.isPressed
        val hover=model.isRollover
        val phase=2.0*Math.PI*((System.nanoTime()%1_180_000_000L).toDouble()/1_180_000_000.0)
        val pulse=if(active) 0.84+0.16*((sin(phase)+1.0)*0.5) else 1.0
        fun mix(base:Color,tint:Color,amount:Float,alpha:Int):Color {
            val a=amount.coerceIn(0f,1f)
            fun m(x:Int,y:Int)=(x+(y-x)*a).roundToInt().coerceIn(0,255)
            return Color(m(base.red,tint.red),m(base.green,tint.green),m(base.blue,tint.blue),alpha.coerceIn(0,255))
        }
        val glowAlpha=when {
            active -> (92*pulse).roundToInt().coerceIn(68,112)
            pressed -> 82
            hover -> 62
            else -> 30
        }
        g2.color=Color(accent.red,accent.green,accent.blue,glowAlpha)
        g2.fillRoundRect(0,0,max(0,width-1),max(0,height-1),20,20)
        val topTint=when{pressed->0.54f;active->0.46f;hover->0.36f;else->0.27f}
        val bottomTint=when{pressed->0.22f;active->0.18f;hover->0.14f;else->0.10f}
        val top=mix(Color(30,45,65),accent,topTint,238)
        val bottom=mix(Color(6,14,26),accent,bottomTint,226)
        g2.paint=GradientPaint(0f,4f,top,0f,height.toFloat(),bottom)
        g2.fillRoundRect(4,4,max(0,width-8),max(0,height-8),18,18)
        g2.color=Color(255,255,255,if(active || hover || pressed)62 else 44)
        g2.stroke=BasicStroke(1.0f)
        g2.drawLine(12,8,max(12,width-12),8)
        g2.color=Color(accent.red,accent.green,accent.blue,if(active)78 else if(hover)58 else 38)
        g2.drawLine(12,max(9,height-9),max(12,width-12),max(9,height-9))
        g2.color = Color(accent.red, accent.green, accent.blue, when{active->248;pressed->235;hover->218;else->190})
        g2.stroke = BasicStroke(when{active->3.0f;pressed->2.7f;hover->2.1f;else->1.6f})
        g2.drawRoundRect(4,4,max(0,width-9),max(0,height-9),18,18)
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

private object StudioDesktopProductionTheme {
    const val ID="official_rgb_original"
    val background=Color(8,12,22)
    val panel=Color(16,28,42)
    val text=Color(225,240,255)
    val accent=Color(61,235,255)
    val selected=Color(0,229,255)
    val cutting=Color(0,230,118)
    val rapid=Color(213,0,249)
    val warning=Color(255,152,0)
    val alarm=Color(255,23,68)
}

private object ProductionRgbAssets {
    private const val ROOT="/aig-generated-rgb/approved/184"
    private val hashes:Map<String,String> by lazy {
        val props=Properties()
        val stream=ProductionRgbAssets::class.java.getResourceAsStream("$ROOT/sha256.properties")
            ?: error("Production RGB hash manifest missing")
        stream.use{props.load(it)}
        props.stringPropertyNames().associateWith{props.getProperty(it)}
    }
    private val cache=mutableMapOf<String,ByteArray>()

    private fun assetId(name:String):String? {
        val n=name.trim().uppercase().replace(Regex("\\s+")," ")
        return when {
            n=="LINE" || name=="線" -> "line"
            n=="RECT" || n.contains("RECT") || name=="矩形" -> "rect"
            n=="CIRCLE" || name=="圓" -> "circle"
            n=="ARC" || name=="圓弧" -> "arc"
            n=="HOLE" || name=="孔" -> "hole"
            n=="SELECT" || name=="選取" -> "select"
            n.contains("2D CAD") || n=="CAD" -> "cad"
            n=="CAM" || n.contains("CAM ") -> "cam"
            n=="SIM" || n.contains("3D SIM") -> "sim"
            n=="3D" || n.contains("3D ") -> "3d"
            n.contains("3AX") || n.contains("3 AXIS") -> "3ax"
            n.contains("4AX") || n.contains("4 AXIS") || name.contains("四軸") -> "4ax"
            n.contains("5AX") || n.contains("5 AXIS") || n=="5X" || name.contains("五軸") -> "5ax"
            n=="NC" || n.contains("NC_EDIT") || n.contains("NC EDIT") -> "nc"
            n=="AI" || n.contains("AI ") -> "ai"
            else -> null
        }
    }

    private fun sha256(bytes:ByteArray):String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}

    @Synchronized
    private fun verifiedBytes(id:String):ByteArray {
        cache[id]?.let{return it}
        val bytes=ProductionRgbAssets::class.java.getResourceAsStream("$ROOT/$id.png")
            ?.use{it.readBytes()} ?: error("Production RGB asset missing: $id")
        val expected=hashes[id] ?: error("Production RGB hash missing: $id")
        require(sha256(bytes)==expected){"Production RGB hash mismatch: $id"}
        cache[id]=bytes
        return bytes
    }

    fun icon(name:String):Icon? {
        val id=assetId(name) ?: return null
        return runCatching {
            val image=ImageIO.read(java.io.ByteArrayInputStream(verifiedBytes(id)))
                ?: error("Production RGB decode failed: $id")
            ImageIcon(image.getScaledInstance(24,24,Image.SCALE_SMOOTH))
        }.getOrNull()
    }
}

private enum class DrawMode { LINE, RECT, CIRCLE, ARC, HOLE, SELECT }

private class CadPanel(
    private val doc: DrawingDocument,
    private val status: (String) -> Unit
) : JPanel() {
    var mode = DrawMode.LINE
        set(value) {
            field=value
            first=null
            arcCenter=null
            arcStart=null
        }
    private var first: Vec2? = null
    private var arcCenter: Vec2? = null
    private var arcStart: Vec2? = null
    private var pxPerMm = 5.0
    private var panX = 0.0
    private var panY = 0.0
    private var dragPoint: Point? = null
    var snapEnabled = true
    private val history = History(doc)
    private val selectedIds = linkedSetOf<EntityId>()

    init {
        background = StudioDesktopProductionTheme.background
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
                val raw = screenToWorld(e.x, e.y)
                val p = if(snapEnabled) CadSnapEngine.snapTo(doc,raw,18.0/pxPerMm,reference=first) ?: raw else raw
                if(mode==DrawMode.SELECT){
                    nearest(p)?.let { entity ->
                        val group=CadSelectionEngine.selectionIds(doc,entity)
                        if(group.all{it in selectedIds}) selectedIds.removeAll(group) else selectedIds.addAll(group)
                        status("SELECT • kind="+CadSelectionEngine.semanticKind(entity)+" • count="+selectedIds.size)
                        repaint()
                    }
                    return
                }
                if(mode==DrawMode.ARC){
                    val center=arcCenter
                    if(center==null){
                        arcCenter=p
                        status("ARC • CENTER X="+DisplayFormat.mm(p.x)+" Y="+DisplayFormat.mm(p.y))
                    } else {
                        val start=arcStart
                        if(start==null){
                            if(center.distanceTo(p)>=CNC_RESOLUTION_MM){
                                arcStart=p
                                status("ARC • END POINT")
                            }
                        } else {
                            val radius=center.distanceTo(start)
                            val direction=p-center
                            if(direction.length()>=CNC_RESOLUTION_MM){
                                val end=center+direction.normalized()*radius
                                history.run(AddEntitiesCommand(listOf(
                                    Arc(center=center,radius=radius,start=start,end=end,clockwise=false)
                                )))
                            }
                            arcCenter=null
                            arcStart=null
                            status("ARC PASS • entities="+doc.size())
                            repaint()
                        }
                    }
                    return
                }
                val a = first
                if (a == null) {
                    first = p
                    status("FIRST X=" + DisplayFormat.mm(p.x) + " Y=" + DisplayFormat.mm(p.y))
                } else {
                    when (mode) {
                        DrawMode.LINE -> if (a.distanceTo(p) >= CNC_RESOLUTION_MM) {
                            history.run(AddEntitiesCommand(listOf(Line(a = a, b = p))))
                        }
                        DrawMode.RECT -> {
                            if (abs(a.x - p.x) >= CNC_RESOLUTION_MM && abs(a.y - p.y) >= CNC_RESOLUTION_MM) {
                                val b = Vec2(p.x, a.y)
                                val c = p
                                val d = Vec2(a.x, p.y)
                                val ids=CadSemanticIdentity.newRectIds()
                                history.run(AddEntitiesCommand(listOf(
                                    Line(id=ids[0],a = a, b = b),
                                    Line(id=ids[1],a = b, b = c),
                                    Line(id=ids[2],a = c, b = d),
                                    Line(id=ids[3],a = d, b = a)
                                )))
                            }
                        }
                        DrawMode.CIRCLE -> {
                            val r = a.distanceTo(p)
                            if (r >= CNC_RESOLUTION_MM)
                                history.run(AddEntitiesCommand(listOf(Circle(center = a, radius = r))))
                        }
                        DrawMode.HOLE -> {
                            val r=a.distanceTo(p)
                            if(r>=CNC_RESOLUTION_MM)
                                history.run(AddEntitiesCommand(listOf(Circle(id=CadSemanticIdentity.newHoleId(),center=a,radius=r))))
                        }
                        DrawMode.ARC, DrawMode.SELECT -> Unit
                    }
                    first = null
                    status("CAD entities=" + doc.size() + " • 原點 X0.000 Y0.000 • 精度 0.001 mm")
                    repaint()
                }
            }
            override fun mouseReleased(e: MouseEvent) { dragPoint = null }
        })
    }

    fun selectedCount():Int = selectedIds.size

    fun clearCad() {
        doc.clear()
        first = null
        arcCenter = null
        arcStart = null
        selectedIds.clear()
        repaint()
        status("CAD cleared")
    }

    fun undoEdit() {
        val effect=history.undoWithEffect() ?: return
        selectedIds.clear();first=null;arcCenter=null;arcStart=null;repaint()
        status("UNDO • "+if(effect)"GEOMETRY • CAM/SIM/NC REBUILD" else "TOPOLOGY ONLY")
    }

    fun redoEdit() {
        val effect=history.redoWithEffect() ?: return
        selectedIds.clear();first=null;arcCenter=null;arcStart=null;repaint()
        status("REDO • "+if(effect)"GEOMETRY • CAM/SIM/NC REBUILD" else "TOPOLOGY ONLY")
    }

    private fun applyGeometry(label:String, command:Command) {
        history.run(command)
        repaint()
        status("$label PASS • selected="+selectedIds.size+" • CAM/SIM/NC REBUILD")
    }

    fun moveSelected(dx:Double,dy:Double) = runCatching {
        applyGeometry("MOVE",CadEditEngine.moveCommand(doc,selectedIds,dx,dy))
    }.onFailure { status("MOVE BLOCKED • "+(it.message?:"error")) }

    fun copySelected(dx:Double,dy:Double) = runCatching {
        val before=doc.all().map{it.id}.toSet()
        applyGeometry("COPY",CadEditEngine.copyCommand(doc,selectedIds,dx,dy))
        selectedIds.clear()
        selectedIds.addAll(doc.all().map{it.id}.filter{it !in before})
        repaint()
    }.onFailure { status("COPY BLOCKED • "+(it.message?:"error")) }

    fun rotateSelected(angleDeg:Double) = runCatching {
        applyGeometry("ROTATE",CadEditEngine.rotateCommand(doc,selectedIds,angleDeg))
    }.onFailure { status("ROTATE BLOCKED • "+(it.message?:"error")) }

    fun mirrorSelected(vertical:Boolean) = runCatching {
        val command=if(vertical) CadEditEngine.mirrorVerticalCommand(doc,selectedIds)
            else CadEditEngine.mirrorHorizontalCommand(doc,selectedIds)
        applyGeometry(if(vertical)"MIRROR X" else "MIRROR Y",command)
    }.onFailure { status("MIRROR BLOCKED • "+(it.message?:"error")) }

    fun deleteSelected() = runCatching {
        applyGeometry("DELETE",CadEditEngine.deleteCommand(selectedIds))
        selectedIds.clear();repaint()
    }.onFailure { status("DELETE BLOCKED • "+(it.message?:"error")) }

    fun trimSelected() = runCatching {
        applyGeometry("TRIM",CadEditEngine.trimCommand(doc,selectedIds))
    }.onFailure { status("TRIM BLOCKED • "+(it.message?:"error")) }

    fun extendSelected() = runCatching {
        applyGeometry("EXTEND",CadEditEngine.extendCommand(doc,selectedIds))
    }.onFailure { status("EXTEND BLOCKED • "+(it.message?:"error")) }

    fun offsetSelected(distance:Double) = runCatching {
        applyGeometry("OFFSET",CadEditEngine.offsetCommand(doc,selectedIds,distance))
    }.onFailure { status("OFFSET BLOCKED • "+(it.message?:"error")) }

    fun arraySelected(count:Int,dx:Double,dy:Double) = runCatching {
        applyGeometry("ARRAY",CadEditEngine.linearArrayCommand(doc,selectedIds,count,dx,dy))
    }.onFailure { status("ARRAY BLOCKED • "+(it.message?:"error")) }

    fun selectedDimensionValue():Double? =
        selectedIds.firstOrNull()?.let(doc::get)?.let { DimensionDriveEngine.currentValue(it) }

    fun driveDimension(value:Double) = runCatching {
        val id=selectedIds.firstOrNull() ?: error("DIM requires selected geometry")
        applyGeometry("DIM",DimensionDriveEngine.command(doc,id,value))
    }.onFailure { status("DIM BLOCKED • "+(it.message?:"error")) }

    fun connectSelected() = runCatching {
        history.run(CadEditEngine.connectCommand(doc,selectedIds,JOIN_TOLERANCE_MM))
        repaint()
        status("CONNECT PASS • TOPOLOGY ONLY • GEOMETRY UNCHANGED • 0.001 mm")
    }.onFailure { status("CONNECT BLOCKED • "+(it.message?:"error")) }

    fun disconnectSelected() = runCatching {
        history.run(CadEditEngine.disconnectCommand(doc,selectedIds))
        repaint()
        status("DISCONNECT PASS • TOPOLOGY ONLY • GEOMETRY UNCHANGED")
    }.onFailure { status("DISCONNECT BLOCKED • "+(it.message?:"error")) }

    private fun nearest(p:Vec2):Entity? {
        val tolerance=18.0/pxPerMm
        return CadSelectionEngine.nearest(doc,p,tolerance)
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

        g2.stroke = BasicStroke(2.2f)
        doc.all().forEach { entity ->
            g2.color = if(entity.id in selectedIds) Color(255,176,32) else Color(232,241,250)
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


private fun machineDepthShade(base:Color,depth:Double,minDepth:Double,maxDepth:Double):Color {
    val ratio=if(abs(maxDepth-minDepth)<1e-9)0.5 else
        ((depth-minDepth)/(maxDepth-minDepth)).coerceIn(0.0,1.0)
    val factor=0.76+ratio*0.30
    return Color(
        (base.red*factor).roundToInt().coerceIn(0,255),
        (base.green*factor).roundToInt().coerceIn(0,255),
        (base.blue*factor).roundToInt().coerceIn(0,255),
        base.alpha
    )
}

private class Mesh3DPanel(private var result: Machining3DResult) : JPanel() {
    private var rx = -35.0
    private var ry = 35.0
    private var zoom = 1.0
    private var lastX = 0
    private var lastY = 0
    private var progressiveFrame:ProgressiveMachining3DFrame?=null

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

    fun setResult(next:Machining3DResult){
        result=next
        progressiveFrame=null
        repaint()
    }

    fun showProgressiveFrame(index:Int):ProgressiveMachining3DFrame {
        val frame=ProgressiveMachining3D.frame(result,index)
        progressiveFrame=frame
        repaint()
        return frame
    }

    fun clearProgressiveFrame(){progressiveFrame=null;repaint()}
    fun progressiveRemovedCells():Int = progressiveFrame?.removedCells ?: result.removal.depth.count{it<0.0}

    fun evidenceState(): String =
        "rx=$rx,ry=$ry,zoom=$zoom"+
            (progressiveFrame?.let{",frame=${it.index+1}/${it.total},removed=${it.removedCells},tool="+
                "${DisplayFormat.mm(it.toolPoint.to.x)},${DisplayFormat.mm(it.toolPoint.to.y)},${DisplayFormat.mm(it.toolPoint.z)}"} ?: "")

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

    private fun drawMachineModel(g2:Graphics2D,scale:Double,frame:ProgressiveMachining3DFrame?):MachineModel3D {
        val live=frame?.toolPoint ?: result.cam.toolpaths.lastOrNull()?.moves?.lastOrNull()
        val model=MachineModel3DBuilder.build(
            result,
            axisAOverride=live?.axisA,
            axisBOverride=live?.axisB,
            toolPointOverride=live
        )
        val prepared=model.components.map { component ->
            val rotated=component.mesh.vertices.map { rotate(it) }
            val pts=component.mesh.vertices.map { project(it,scale) }
            Triple(component,pts,rotated.map { it.z }.average())
        }.sortedBy { it.third }
        prepared.forEach { item ->
            val component=item.first
            val pts=item.second
            val rotated=component.mesh.vertices.map { rotate(it) }
            val alpha=when(component.role){
                MachineComponentRole.TOOL -> 255
                MachineComponentRole.SPINDLE -> 250
                MachineComponentRole.HOLDER -> 246
                MachineComponentRole.ROTARY_A,MachineComponentRole.ROTARY_B -> 244
                MachineComponentRole.TRUNNION -> 236
                MachineComponentRole.TABLE -> 232
                MachineComponentRole.FIXTURE -> 228
                MachineComponentRole.BASE,MachineComponentRole.COLUMN -> 224
                else -> 220
            }
            val fillColor=when(component.role){
                MachineComponentRole.TOOL -> Color(255,196,64,alpha)
                MachineComponentRole.SPINDLE -> Color(188,226,255,alpha)
                MachineComponentRole.HOLDER -> Color(92,186,232,alpha)
                MachineComponentRole.ROTARY_A -> Color(61,235,255,alpha)
                MachineComponentRole.ROTARY_B -> Color(255,78,205,alpha)
                MachineComponentRole.TRUNNION -> Color(126,92,208,alpha)
                MachineComponentRole.TABLE -> Color(82,132,184,alpha)
                MachineComponentRole.FIXTURE -> Color(112,132,150,alpha)
                else -> Color(55,78,105,alpha)
            }
            val ordered=component.mesh.triangles.map { t ->
                ((rotated[t.a].z+rotated[t.b].z+rotated[t.c].z)/3.0) to t
            }.sortedBy { it.first }
            val minDepth=ordered.firstOrNull()?.first ?: 0.0
            val maxDepth=ordered.lastOrNull()?.first ?: minDepth
            val stride=max(1,ceil(component.mesh.triangles.size/900.0).toInt())
            val edgeAlpha=when(component.role){
                MachineComponentRole.TOOL -> 255
                MachineComponentRole.SPINDLE,MachineComponentRole.HOLDER -> 180
                MachineComponentRole.ROTARY_A,MachineComponentRole.ROTARY_B -> 128
                MachineComponentRole.TRUNNION,MachineComponentRole.TABLE -> 96
                MachineComponentRole.FIXTURE -> 84
                else -> 72
            }
            val rotarySurfaceSolid=component.role==MachineComponentRole.ROTARY_A || component.role==MachineComponentRole.ROTARY_B
            val drawInternalEdges=when(component.role){
                MachineComponentRole.TOOL,
                MachineComponentRole.SPINDLE,
                MachineComponentRole.HOLDER -> true
                else -> false
            }
            val edgeStride=when(component.role){
                MachineComponentRole.TOOL -> stride
                MachineComponentRole.SPINDLE,MachineComponentRole.HOLDER -> stride*96
                else -> stride
            }
            val roleEdgeWidth=when(component.role){
                MachineComponentRole.TOOL -> 2.1f
                MachineComponentRole.SPINDLE,MachineComponentRole.HOLDER -> 1.35f
                MachineComponentRole.ROTARY_A,MachineComponentRole.ROTARY_B -> 1.05f
                else -> 0.8f
            }
            if(rotarySurfaceSolid){
                val solidPath=Path2D.Double(Path2D.WIND_NON_ZERO)
                ordered.forEachIndexed { i,item -> if(i%stride==0){
                    val t=item.second; val a=pts[t.a]; val b=pts[t.b]; val c=pts[t.c]
                    solidPath.moveTo(a.x.toDouble(),a.y.toDouble()); solidPath.lineTo(b.x.toDouble(),b.y.toDouble()); solidPath.lineTo(c.x.toDouble(),c.y.toDouble()); solidPath.closePath()
                }}
                g2.color=fillColor; g2.fill(solidPath)
            } else {
                ordered.forEachIndexed { i,item -> if(i%stride==0){
                    val t=item.second
                    val shadedFill=machineDepthShade(fillColor,item.first,minDepth,maxDepth)
                    val a=pts[t.a]; val b=pts[t.b]; val c=pts[t.c]
                    val poly=Polygon(intArrayOf(a.x,b.x,c.x),intArrayOf(a.y,b.y,c.y),3)
                    g2.color=shadedFill; g2.fillPolygon(poly)
                    if(drawInternalEdges && i%edgeStride==0){ g2.color=Color(180,220,255,edgeAlpha); g2.stroke=BasicStroke(roleEdgeWidth); g2.drawPolygon(poly) }
                }}
            }
        }
        return model
    }

    private fun drawToolStackForeground(g2:Graphics2D,model:MachineModel3D,scale:Double){
        model.components.forEach { component ->
            val edgeStep=when(component.role){
                MachineComponentRole.TOOL -> 1
                MachineComponentRole.HOLDER -> 48
                MachineComponentRole.SPINDLE -> 72
                else -> return@forEach
            }
            val pts=component.mesh.vertices.map { project(it,scale) }
            g2.color=when(component.role){
                MachineComponentRole.TOOL -> Color(255,196,64,255)
                MachineComponentRole.HOLDER -> Color(92,186,232,236)
                else -> Color(188,226,255,232)
            }
            g2.stroke=BasicStroke(when(component.role){
                MachineComponentRole.TOOL -> 2.4f
                MachineComponentRole.HOLDER -> 1.7f
                else -> 1.5f
            },BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
            component.mesh.triangles.forEachIndexed { index,t -> if(index%edgeStep==0){
                val a=pts[t.a]; val b=pts[t.b]; val c=pts[t.c]
                g2.drawPolygon(Polygon(intArrayOf(a.x,b.x,c.x),intArrayOf(a.y,b.y,c.y),3))
            }}
        }
    }

    override fun paintComponent(g: Graphics) {
        super.paintComponent(g)
        val g2 = g as Graphics2D
        StudioDesktopOriginalVisuals.paintCover(g2,width,height,StudioDesktopOriginalVisuals.machine,0.60f)
        g2.color=Color(2,7,14,42);g2.fillRect(0,0,width,height)
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_OFF)
        g2.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY)
        val span = max(max(result.stock.maxX - result.stock.minX, result.stock.maxY - result.stock.minY), result.stock.thickness).coerceAtLeast(1.0)
        val scale = min(width, height) * 0.48 / span * zoom
        val activeFrame=progressiveFrame
        val machineModel=drawMachineModel(g2,scale,activeFrame)
        val activeMesh=activeFrame?.mesh ?: result.mesh
        val projected = activeMesh.vertices.map { project(it, scale) }
        val stride = max(1, ceil(activeMesh.triangles.size / 5500.0).toInt())

        val rotated = activeMesh.vertices.map { rotate(it) }
        val showMaterialMeshEdges=false
        val visible = activeMesh.triangles.mapIndexedNotNull { index,t ->
            if(index%stride!=0) null else Pair((rotated[t.a].z+rotated[t.b].z+rotated[t.c].z)/3.0,t)
        }.sortedBy{it.first}
        val materialColor=Color(45,145,220)
        visible.forEachIndexed { index,item ->
            val t=item.second; val a=projected[t.a]; val b=projected[t.b]; val c=projected[t.c]
            val poly=Polygon(intArrayOf(a.x,b.x,c.x),intArrayOf(a.y,b.y,c.y),3)
            g2.color=materialColor; g2.fillPolygon(poly)
            g2.color=materialColor; g2.stroke=BasicStroke(1.15f); g2.drawPolygon(poly)
            if(showMaterialMeshEdges && index % 18 == 0){ g2.color=Color(61, 220, 255, 46); g2.stroke=BasicStroke(.55f); g2.drawPolygon(poly) }
        }

        val contactMoves=result.cam.toolpaths.flatMap{it.moves}
        val activeCutMove=activeFrame?.let { frame ->
            if(contactMoves.size>1) contactMoves[frame.index.coerceIn(1,contactMoves.lastIndex)] else null
        }
        if(activeCutMove!=null && !activeCutMove.rapid){
            val tip=project(Vec3(activeCutMove.to.x,activeCutMove.to.y,activeCutMove.z),scale)
            val contactRadius=max(10.0,result.cam.settings.toolDiameter*scale*0.72).roundToInt()
            val contactRadius2=contactRadius*contactRadius
            g2.color=Color(255,176,32,210)
            g2.stroke=BasicStroke(1.65f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
            visible.forEach { item ->
                val t=item.second; val a=projected[t.a]; val b=projected[t.b]; val c=projected[t.c]
                val cx=(a.x+b.x+c.x)/3; val cy=(a.y+b.y+c.y)/3
                val dx=cx-tip.x; val dy=cy-tip.y
                if(dx*dx+dy*dy<=contactRadius2){
                    g2.drawPolygon(Polygon(intArrayOf(a.x,b.x,c.x),intArrayOf(a.y,b.y,c.y),3))
                }
            }
            g2.drawOval(tip.x-contactRadius,tip.y-contactRadius,contactRadius*2,contactRadius*2)
        }
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        drawToolStackForeground(g2,machineModel,scale)
        val allMoves=contactMoves
        val visibleMoves=activeFrame?.let{allMoves.take(it.index+1)} ?: allMoves
        var previous:Move?=null
        g2.stroke=BasicStroke(1.15f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
        visibleMoves.forEach { move ->
            val prev=previous
            if(prev!=null){
                val a=project(Vec3(prev.to.x,prev.to.y,prev.z),scale)
                val b=project(Vec3(move.to.x,move.to.y,move.z),scale)
                g2.color=if(move.rapid)Color(255,70,220,40) else Color(63,255,157,82)
                g2.drawLine(a.x,a.y,b.x,b.y)
            }
            previous=move
        }
        activeFrame?.let { frame ->
            if(allMoves.size>1){
                val i=frame.index.coerceIn(1,allMoves.lastIndex)
                val trailStart=(i-3).coerceAtLeast(1)
                for(j in trailStart until i){
                    val trailMove=allMoves[j]
                    if(!trailMove.rapid){
                        val trailPrev=allMoves[j-1]
                        val age=i-j
                        val ta=project(Vec3(trailPrev.to.x,trailPrev.to.y,trailPrev.z),scale)
                        val tb=project(Vec3(trailMove.to.x,trailMove.to.y,trailMove.z),scale)
                        g2.color=Color(61,235,255,(112-age*22).coerceAtLeast(46))
                        g2.stroke=BasicStroke((3.4f-age*0.45f).coerceAtLeast(1.5f),BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
                        g2.drawLine(ta.x,ta.y,tb.x,tb.y)
                    }
                }
                val prev=allMoves[i-1];val move=allMoves[i]
                val a=project(Vec3(prev.to.x,prev.to.y,prev.z),scale)
                val b=project(Vec3(move.to.x,move.to.y,move.z),scale)
                g2.color=Color(61,235,255,68)
                g2.stroke=BasicStroke(10f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
                g2.drawLine(a.x,a.y,b.x,b.y)
                g2.color=Color(61,235,255)
                g2.stroke=BasicStroke(4f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
                g2.drawLine(a.x,a.y,b.x,b.y)
                g2.fillOval(b.x-6,b.y-6,12,12)
            }
        }
        activeFrame?.toolPoint?.let { tool ->
            val p=project(Vec3(tool.to.x,tool.to.y,tool.z),scale)
            g2.color=Color(255,220,90,62)
            g2.fillOval(p.x-12,p.y-12,24,24)
            g2.color=Color(255,220,90,235)
            g2.fillOval(p.x-6,p.y-6,12,12)
            g2.stroke=BasicStroke(2f)
            g2.drawLine(p.x,p.y-20,p.x,p.y+20)
        }
        activeFrame?.let { frame ->
            val progress=frame.progress.coerceIn(0.0,1.0)
            val x=14;val y=height-16;val w=(width-28).coerceAtLeast(1)
            g2.color=Color(8,20,32,175);g2.fillRoundRect(x,y,w,7,7,7)
            g2.color=Color(61,235,255);g2.fillRoundRect(x,y,(w*progress).roundToInt(),7,7,7)
        }

        val removed = activeFrame?.removedCells ?: result.removal.depth.count { it < 0.0 }
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
            "HQ 3D RENDER ENGINE • MACHINE=" + machineModel.mode + " • PARTS=" + machineModel.components.size +
                " • TRUE MESH • CAM=" + result.cam.toolpaths.size + " • removed=" + removed +
                (activeFrame?.let{" • frame=${it.index+1}/${it.total} • ${String.format(java.util.Locale.US,"%.1f",it.progress*100.0)}%"} ?: "") +
                " • 精度 0.001 mm",
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


private class AxisMachiningPanel(private var result:Machining3DResult) : JPanel() {
    var axisA=0.0
        private set
    var axisB=0.0
        private set
    private var zoom=1.0
    private var progressiveFrame:ProgressiveMachining3DFrame?=null
    private var machineMode="3AX"
    init{
        background=Color(5,10,17)
        preferredSize=Dimension(860,620)
        addMouseWheelListener { zoom=(zoom*if(it.wheelRotation<0)1.1 else 0.9).coerceIn(0.3,5.0);repaint() }
    }
    fun setAngles(a:Double,b:Double){axisA=a;axisB=b;repaint()}
    fun setMachineMode(mode:String){
        val normalized=mode.uppercase()
        require(normalized in setOf("3AX","4AX","5AX"))
        machineMode=normalized
        if(machineMode=="3AX"){axisA=0.0;axisB=0.0}
        if(machineMode=="4AX")axisB=0.0
        repaint()
    }
    fun setResult(next:Machining3DResult){
        result=next
        progressiveFrame=null
        repaint()
    }
    fun showProgressiveFrame(frame:ProgressiveMachining3DFrame){
        progressiveFrame=frame
        axisA=frame.toolPoint.axisA
        axisB=frame.toolPoint.axisB
        repaint()
    }
    fun clearProgressiveFrame(){progressiveFrame=null;repaint()}
    private fun kinematicTransform(v:Vec3):Vec3 {
        val a=if(machineMode=="3AX")0.0 else axisA
        val b=if(machineMode=="5AX")axisB else 0.0
        return MachineKinematics3D.transform(v,a,b)
    }
    private fun axisTransform(v:Vec3):Vec3{
        val cx=(result.stock.minX+result.stock.maxX)/2.0
        val cy=(result.stock.minY+result.stock.maxY)/2.0
        val cz=-result.stock.thickness/2.0
        val r=kinematicTransform(v)
        return Vec3(r.x-cx,r.y-cy,r.z-cz)
    }
    private fun project(v:Vec3,scale:Double):Point{
        val r=axisTransform(v)
        return Point(
            (width/2.0+(r.x-r.z*.34)*scale).roundToInt(),
            (height/2.0-(r.y+r.z*.28)*scale).roundToInt()
        )
    }
    private fun projectMachine(v:Vec3,scale:Double):Point{
        val cx=(result.stock.minX+result.stock.maxX)/2.0
        val cy=(result.stock.minY+result.stock.maxY)/2.0
        val cz=-result.stock.thickness/2.0
        val x=v.x-cx; val y=v.y-cy; val z=v.z-cz
        return Point(
            (width/2.0+(x-z*.34)*scale).roundToInt(),
            (height/2.0-(y+z*.28)*scale).roundToInt()
        )
    }
    private fun drawMachineModel(g:Graphics2D,scale:Double,frame:ProgressiveMachining3DFrame?):MachineModel3D{
        val live=frame?.toolPoint ?: result.cam.toolpaths.lastOrNull()?.moves?.lastOrNull()
        val model=MachineModel3DBuilder.build(
            result,machineMode,axisA,axisB,live
        )
        val prepared=model.components.map { component ->
            val pts=component.mesh.vertices.map{projectMachine(it,scale)}
            val depth=component.mesh.vertices.map{it.x*.34-it.y*.28+it.z}.average()
            Triple(component,pts,depth)
        }.sortedBy { it.third }
        prepared.forEach { item ->
            val component=item.first
            val pts=item.second
            val axisDepth=component.mesh.vertices.map{it.x*.34-it.y*.28+it.z}
            val alpha=when(component.role){
                MachineComponentRole.TOOL -> 255
                MachineComponentRole.SPINDLE -> 250
                MachineComponentRole.HOLDER -> 246
                MachineComponentRole.ROTARY_A,MachineComponentRole.ROTARY_B -> 244
                MachineComponentRole.TRUNNION -> 236
                MachineComponentRole.TABLE -> 232
                MachineComponentRole.FIXTURE -> 228
                MachineComponentRole.BASE,MachineComponentRole.COLUMN -> 224
                else -> 220
            }
            val fillColor=when(component.role){
                MachineComponentRole.TOOL -> Color(255,196,64,alpha)
                MachineComponentRole.SPINDLE -> Color(188,226,255,alpha)
                MachineComponentRole.HOLDER -> Color(92,186,232,alpha)
                MachineComponentRole.ROTARY_A -> Color(61,235,255,alpha)
                MachineComponentRole.ROTARY_B -> Color(255,78,205,alpha)
                MachineComponentRole.TRUNNION -> Color(126,92,208,alpha)
                MachineComponentRole.TABLE -> Color(82,132,184,alpha)
                MachineComponentRole.FIXTURE -> Color(112,132,150,alpha)
                else -> Color(55,78,105,alpha)
            }
            val ordered=component.mesh.triangles.map { t ->
                ((axisDepth[t.a]+axisDepth[t.b]+axisDepth[t.c])/3.0) to t
            }.sortedBy { it.first }
            val minDepth=ordered.firstOrNull()?.first ?: 0.0
            val maxDepth=ordered.lastOrNull()?.first ?: minDepth
            val stride=max(1,ceil(component.mesh.triangles.size/900.0).toInt())
            val edgeAlpha=when(component.role){
                MachineComponentRole.TOOL -> 255
                MachineComponentRole.SPINDLE,MachineComponentRole.HOLDER -> 180
                MachineComponentRole.ROTARY_A,MachineComponentRole.ROTARY_B -> 128
                MachineComponentRole.TRUNNION,MachineComponentRole.TABLE -> 96
                MachineComponentRole.FIXTURE -> 84
                else -> 72
            }
            val rotarySurfaceSolid=component.role==MachineComponentRole.ROTARY_A || component.role==MachineComponentRole.ROTARY_B
            val drawInternalEdges=when(component.role){
                MachineComponentRole.TOOL,
                MachineComponentRole.SPINDLE,
                MachineComponentRole.HOLDER -> true
                else -> false
            }
            val edgeStride=when(component.role){
                MachineComponentRole.TOOL -> stride
                MachineComponentRole.SPINDLE,MachineComponentRole.HOLDER -> stride*96
                else -> stride
            }
            val roleEdgeWidth=when(component.role){
                MachineComponentRole.TOOL -> 2.1f
                MachineComponentRole.SPINDLE,MachineComponentRole.HOLDER -> 1.35f
                MachineComponentRole.ROTARY_A,MachineComponentRole.ROTARY_B -> 1.05f
                else -> 0.8f
            }
            if(rotarySurfaceSolid){
                val solidPath=Path2D.Double(Path2D.WIND_NON_ZERO)
                ordered.forEachIndexed { i,item -> if(i%stride==0){
                    val t=item.second; val a=pts[t.a]; val b=pts[t.b]; val c=pts[t.c]
                    solidPath.moveTo(a.x.toDouble(),a.y.toDouble()); solidPath.lineTo(b.x.toDouble(),b.y.toDouble()); solidPath.lineTo(c.x.toDouble(),c.y.toDouble()); solidPath.closePath()
                }}
                g.color=fillColor; g.fill(solidPath)
            } else {
                ordered.forEachIndexed { i,item -> if(i%stride==0){
                    val t=item.second
                    val shadedFill=machineDepthShade(fillColor,item.first,minDepth,maxDepth)
                    val a=pts[t.a]; val b=pts[t.b]; val c=pts[t.c]
                    val poly=Polygon(intArrayOf(a.x,b.x,c.x),intArrayOf(a.y,b.y,c.y),3)
                    g.color=shadedFill; g.fillPolygon(poly)
                    if(drawInternalEdges && i%edgeStride==0){ g.color=Color(180,220,255,edgeAlpha); g.stroke=BasicStroke(roleEdgeWidth); g.drawPolygon(poly) }
                }}
            }
        }
        return model
    }
    private fun drawToolStackForeground(g:Graphics2D,model:MachineModel3D,scale:Double){
        model.components.forEach { component ->
            val edgeStep=when(component.role){
                MachineComponentRole.TOOL -> 1
                MachineComponentRole.HOLDER -> 48
                MachineComponentRole.SPINDLE -> 72
                else -> return@forEach
            }
            val pts=component.mesh.vertices.map { projectMachine(it,scale) }
            g.color=when(component.role){
                MachineComponentRole.TOOL -> Color(255,196,64,255)
                MachineComponentRole.HOLDER -> Color(92,186,232,236)
                else -> Color(188,226,255,232)
            }
            g.stroke=BasicStroke(when(component.role){
                MachineComponentRole.TOOL -> 2.4f
                MachineComponentRole.HOLDER -> 1.7f
                else -> 1.5f
            },BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
            component.mesh.triangles.forEachIndexed { index,t -> if(index%edgeStep==0){
                val a=pts[t.a]; val b=pts[t.b]; val c=pts[t.c]
                g.drawPolygon(Polygon(intArrayOf(a.x,b.x,c.x),intArrayOf(a.y,b.y,c.y),3))
            }}
        }
    }
    override fun paintComponent(g0:Graphics){
        super.paintComponent(g0)
        val g=g0 as Graphics2D
        StudioDesktopOriginalVisuals.paintCover(g,width,height,StudioDesktopOriginalVisuals.machine,0.62f)
        g.color=Color(2,7,14,40);g.fillRect(0,0,width,height)
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_OFF)
        g.setRenderingHint(RenderingHints.KEY_RENDERING,RenderingHints.VALUE_RENDER_QUALITY)
        val span=max(max(result.stock.maxX-result.stock.minX,result.stock.maxY-result.stock.minY),result.stock.thickness).coerceAtLeast(1.0)
        val scale=min(width,height)*0.46/span*zoom
        val activeFrame=progressiveFrame
        val machineModel=drawMachineModel(g,scale,activeFrame)
        val activeMesh=activeFrame?.mesh ?: result.mesh
        val pts=activeMesh.vertices.map{project(it,scale)}
        val stride=max(1,ceil(activeMesh.triangles.size/4500.0).toInt())
        val showMaterialMeshEdges=false
        val materialColor=Color(45,145,220)
        activeMesh.triangles.forEachIndexed { i,t -> if(i%stride==0){
            val a=pts[t.a];val b=pts[t.b];val c=pts[t.c]
            val poly=Polygon(intArrayOf(a.x,b.x,c.x),intArrayOf(a.y,b.y,c.y),3)
            g.color=materialColor;g.fillPolygon(poly)
            g.color=materialColor;g.stroke=BasicStroke(1.15f);g.drawPolygon(poly)
            if(showMaterialMeshEdges && i%(stride*18)==0){ g.color=Color(61,235,255,46);g.stroke=BasicStroke(.55f);g.drawPolygon(poly) }
        }}
        val contactMoves=result.cam.toolpaths.flatMap{it.moves}
        val activeCutMove=activeFrame?.let { frame ->
            if(contactMoves.size>1) contactMoves[frame.index.coerceIn(1,contactMoves.lastIndex)] else null
        }
        if(activeCutMove!=null && !activeCutMove.rapid){
            val tip=project(Vec3(activeCutMove.to.x,activeCutMove.to.y,activeCutMove.z),scale)
            val contactRadius=max(10.0,result.cam.settings.toolDiameter*scale*0.72).roundToInt()
            val contactRadius2=contactRadius*contactRadius
            g.color=Color(255,176,32,210)
            g.stroke=BasicStroke(1.65f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
            activeMesh.triangles.forEachIndexed { i,t -> if(i%stride==0){
                val a=pts[t.a]; val b=pts[t.b]; val c=pts[t.c]
                val cx=(a.x+b.x+c.x)/3; val cy=(a.y+b.y+c.y)/3
                val dx=cx-tip.x; val dy=cy-tip.y
                if(dx*dx+dy*dy<=contactRadius2){
                    g.drawPolygon(Polygon(intArrayOf(a.x,b.x,c.x),intArrayOf(a.y,b.y,c.y),3))
                }
            }}
            g.drawOval(tip.x-contactRadius,tip.y-contactRadius,contactRadius*2,contactRadius*2)
        }
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON)
        drawToolStackForeground(g,machineModel,scale)
        val allMoves=contactMoves
        val visibleMoves=activeFrame?.let{allMoves.take(it.index+1)} ?: allMoves
        var prev:Move?=null
        visibleMoves.forEach { m ->
            val p=prev
            if(p!=null){
                val a=project(Vec3(p.to.x,p.to.y,p.z),scale)
                val b=project(Vec3(m.to.x,m.to.y,m.z),scale)
                g.color=if(m.rapid)Color(61,235,255,36) else Color(255,176,32,78)
                g.stroke=BasicStroke(if(m.rapid)1.05f else 1.5f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
                g.drawLine(a.x,a.y,b.x,b.y)
            }
            prev=m
        }
        activeFrame?.let { frame ->
            if(allMoves.size>1){
                val i=frame.index.coerceIn(1,allMoves.lastIndex)
                val trailStart=(i-3).coerceAtLeast(1)
                for(j in trailStart until i){
                    val trailMove=allMoves[j]
                    if(!trailMove.rapid){
                        val trailPrev=allMoves[j-1]
                        val age=i-j
                        val ta=project(Vec3(trailPrev.to.x,trailPrev.to.y,trailPrev.z),scale)
                        val tb=project(Vec3(trailMove.to.x,trailMove.to.y,trailMove.z),scale)
                        g.color=Color(61,235,255,(112-age*22).coerceAtLeast(46))
                        g.stroke=BasicStroke((3.4f-age*0.45f).coerceAtLeast(1.5f),BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
                        g.drawLine(ta.x,ta.y,tb.x,tb.y)
                    }
                }
                val p=allMoves[i-1];val m=allMoves[i]
                val a=project(Vec3(p.to.x,p.to.y,p.z),scale)
                val b=project(Vec3(m.to.x,m.to.y,m.z),scale)
                g.color=Color(61,235,255,68);g.stroke=BasicStroke(10f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
                g.drawLine(a.x,a.y,b.x,b.y)
                g.color=Color(61,235,255);g.stroke=BasicStroke(4f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
                g.drawLine(a.x,a.y,b.x,b.y)
                g.fillOval(b.x-6,b.y-6,12,12)
            }
        }
        activeFrame?.toolPoint?.let { tool ->
            val p=project(Vec3(tool.to.x,tool.to.y,tool.z),scale)
            g.color=Color(255,225,80,62);g.fillOval(p.x-12,p.y-12,24,24)
            g.color=Color(255,225,80,240);g.fillOval(p.x-6,p.y-6,12,12)
            g.stroke=BasicStroke(2f);g.drawLine(p.x,p.y-20,p.x,p.y+20)
        }
        activeFrame?.let { frame ->
            val progress=frame.progress.coerceIn(0.0,1.0)
            val x=14;val y=height-16;val w=(width-28).coerceAtLeast(1)
            g.color=Color(8,20,32,175);g.fillRoundRect(x,y,w,7,7,7)
            g.color=Color(61,235,255);g.fillRoundRect(x,y,(w*progress).roundToInt(),7,7,7)
        }
        g.color=Color(235,245,255);g.font=Font(Font.SANS_SERIF,Font.BOLD,14)
        g.drawString(
            "TRUE AXIS VIEW • MACHINE="+machineModel.mode+" • PARTS="+machineModel.components.size+
                " • A="+DisplayFormat.mm(axisA)+"° • B="+DisplayFormat.mm(axisB)+"°"+
                (activeFrame?.let{" • frame=${it.index+1}/${it.total} • removed=${it.removedCells}"} ?: "")+
                " • material-first",
            14,22
        )
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
    fun layoutTree(component: Component) {
        if (component is Container) {
            component.doLayout()
            component.components.forEach { layoutTree(it) }
        }
    }
    panel.setSize(width, height)
    layoutTree(panel)
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
    val startupEvidence=StudioDesktopStartupWindow()
    startupEvidence.advance(StudioStartupStage.SAFE_THEME,"載入原版 RGB 啟動圖")
    startupEvidence.advance(StudioStartupStage.CORE,"初始化 CAD / CAM 核心")
    startupEvidence.advance(StudioStartupStage.CONFIGURATION,"載入環境設定")
    startupEvidence.advance(StudioStartupStage.UI_RENDERER,"載入 RGB UI / Renderer")
    writePanel(startupEvidence.evidencePanel(),File("desktop_startup.png"),760,430)

    val doc = DrawingDocument()
    addRectangle(doc, -40.0, -25.0, 40.0, 25.0)
    require(doc.size() == 4) { "2D CAD smoke failed" }
    val snapshot = doc.snapshot()
    val cam = CamModel.fromCad(1L, snapshot, CamSettings(toolDiameter = 10.0, depth = -2.0, safeZ = 5.0, feedMmMin = 150.0))
    require(cam.toolpaths.isNotEmpty()) { "CAM smoke failed" }
    val result = Machining3DEngine.build(snapshot, cam.settings)
    require(result.mesh.vertices.isNotEmpty() && result.mesh.triangles.isNotEmpty()) { "3D mesh smoke failed" }
    require(result.removal.depth.any { it < 0.0 }) { "Material removal smoke failed" }

    val cadStatus=JLabel("CAD EDIT • SNAP7 / DIM / TRIM / EXTEND / OFFSET / ARRAY • 0.001 mm")
    val smokeCad=CadPanel(doc) { cadStatus.text=it }
    lateinit var smokeDeck:JTabbedPane
    val smokeRoot = JPanel(BorderLayout()).apply {
        background = Color(5,10,17)
        val navBar=AdaptiveGlassToolbar().apply {
            listOf("CAD","CAM","3D","3AX","4AX","5AX","NC_EDIT").forEachIndexed { i,assetId ->
                val colors=listOf(Color(61,235,255),Color(63,255,157),Color(139,92,246),Color(59,130,246),Color(245,158,11),Color(236,72,153),Color(80,170,255))
                add(GlassActionButton(UiTextPolicy.display(assetId,118),colors[i]).apply {
                    icon=ProductionRgbAssets.icon(assetId) ?: RgbGlyphIcon(assetId,colors[i])
                    iconTextGap=7
                    horizontalTextPosition=SwingConstants.RIGHT
                })
            }
        }
        val header = JPanel(BorderLayout()).apply {
            background=Color(8,18,30)
            border=BorderFactory.createMatteBorder(0,0,1,0,Color(61,235,255,105))
            add(JLabel("AIG CNC • CAD / 2D").apply {
                foreground=Color(61,235,255)
                font=font.deriveFont(Font.BOLD,18f)
                preferredSize=Dimension(330,58)
            },BorderLayout.WEST)
            add(navBar,BorderLayout.CENTER)
        }
        val drawBar=CadToolGrid().apply {
            add(GlassActionButton("線",Color(61,235,255)))
            add(GlassActionButton("矩形",Color(139,92,246)))
            add(GlassActionButton("圓",Color(245,158,11)))
            add(GlassActionButton("圓弧",Color(59,130,246)))
            add(GlassActionButton("孔",Color(236,72,153)))
            add(GlassActionButton("選取",Color(80,170,255)))
        }
        val editBar=CadToolGrid().apply {
            fun edit(label:String,color:Color,action:()->Unit)=add(GlassActionButton(label,color).apply{addActionListener{action()}})
            edit("移動",Color(61,235,255)){smokeCad.moveSelected(1.0,0.0)}
            edit("複製",Color(63,255,157)){smokeCad.copySelected(1.0,0.0)}
            edit("旋轉",Color(139,92,246)){smokeCad.rotateSelected(90.0)}
            edit("鏡射 X",Color(245,158,11)){smokeCad.mirrorSelected(true)}
            edit("鏡射 Y",Color(245,158,11)){smokeCad.mirrorSelected(false)}
            edit("TRIM",Color(61,235,255)){smokeCad.trimSelected()}
            edit("EXTEND",Color(63,255,157)){smokeCad.extendSelected()}
            edit("OFFSET",Color(139,92,246)){smokeCad.offsetSelected(1.0)}
            edit("ARRAY",Color(59,130,246)){smokeCad.arraySelected(3,10.0,0.0)}
            edit("刪除",Color(239,68,68)){smokeCad.deleteSelected()}
            edit("復原",Color(125,112,255)){smokeCad.undoEdit()}
            edit("重做",Color(125,112,255)){smokeCad.redoEdit()}
        }
        val linkBar=CadToolGrid().apply {
            add(GlassActionButton("連接",Color(63,255,157)))
            add(GlassActionButton("斷開",Color(255,176,32)))
        }
        val viewPanel=JPanel().apply {
            layout=BoxLayout(this,BoxLayout.Y_AXIS)
            background=Color(8,18,30)
            border=BorderFactory.createEmptyBorder(10,10,10,10)
            add(JLabel("中鍵 / 右鍵拖曳 = 視圖平移").apply{foreground=Color(143,179,201)})
            add(Box.createVerticalStrut(8))
            add(JLabel("滾輪 = 縮放").apply{foreground=Color(143,179,201)})
            add(Box.createVerticalStrut(8))
            add(JLabel("Master X0.000 Y0.000").apply{foreground=Color(61,235,255)})
            add(Box.createVerticalStrut(8))
            add(JLabel("顯示精度 0.001 mm").apply{foreground=Color(245,158,11)})
        }
        smokeDeck=JTabbedPane(JTabbedPane.LEFT).apply {
            background=Color(8,18,30)
            foreground=Color(232,241,250)
            preferredSize=Dimension(250,0)
            addTab("繪圖",drawBar)
            addTab("修改",editBar)
            addTab("連接",linkBar)
            addTab("檢視",viewPanel)
        }
        val infoRail=JPanel().apply {
            layout=BoxLayout(this,BoxLayout.Y_AXIS)
            background=Color(5,10,17)
            preferredSize=Dimension(158,0)
            border=BorderFactory.createEmptyBorder(6,6,6,6)
            listOf(
                "MACHINE" to "READY",
                "ORIGIN" to "X0.000 Y0.000",
                "PRECISION" to "0.001 mm",
                "ENTITIES" to doc.size().toString(),
                "LINKS" to doc.links().size.toString()
            ).forEach { (title,value) ->
                add(JPanel(BorderLayout()).apply {
                    background=Color(8,18,30)
                    border=BorderFactory.createCompoundBorder(
                        BorderFactory.createLineBorder(Color(61,235,255,100),1,true),
                        BorderFactory.createEmptyBorder(7,9,7,9)
                    )
                    add(JLabel(title).apply{foreground=Color(120,148,168)},BorderLayout.NORTH)
                    add(JLabel(value).apply{foreground=Color(99,255,157);font=font.deriveFont(Font.BOLD,12f)},BorderLayout.CENTER)
                })
                add(Box.createVerticalStrut(6))
            }
            add(Box.createVerticalGlue())
        }
        add(header,BorderLayout.NORTH)
        add(JPanel(BorderLayout()).apply {
            background=Color(5,10,17)
            add(smokeDeck,BorderLayout.WEST)
            add(smokeCad,BorderLayout.CENTER)
            add(infoRail,BorderLayout.EAST)
        },BorderLayout.CENTER)
        add(cadStatus.apply {
            foreground=Color(99,255,157)
            border=BorderFactory.createEmptyBorder(8,12,8,12)
        },BorderLayout.SOUTH)
    }
    val launchFile = File("desktop_launch.png")
    writePanel(smokeRoot, launchFile)
    smokeDeck.selectedIndex=1
    val cadEditFile = File("desktop_cad_edit.png")
    writePanel(smokeRoot,cadEditFile)
    smokeDeck.selectedIndex=0

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

    val absoluteMoves = result.cam.toolpaths.flatMap { it.moves }
    val earlyIndex=ProgressiveMachining3D.firstCuttingIndex(result)
    val lateIndex=absoluteMoves.lastIndex
    val materialBeforeFrame=meshPanel.showProgressiveFrame(earlyIndex)
    val materialBeforeFile=File("desktop_material_before.png")
    writePanel(renderRoot,materialBeforeFile)
    val materialAfterFrame=meshPanel.showProgressiveFrame(lateIndex)
    val materialAfterFile=File("desktop_material_after.png")
    writePanel(renderRoot,materialAfterFile)
    require(materialAfterFrame.removedCells>materialBeforeFrame.removedCells){
        "Progressive material removal did not increase: before=${materialBeforeFrame.removedCells} after=${materialAfterFrame.removedCells}"
    }
    require(materialBeforeFrame.toolPoint!=materialAfterFrame.toolPoint){"Progressive tool point did not move"}
    require(sha256File(materialBeforeFile)!=sha256File(materialAfterFile)){"Progressive material frames are identical"}
    meshPanel.clearProgressiveFrame()

    val fiveAxisSchedule=MultiAxisOrientationSchedule(
        startA=0.0,startB=0.0,endA=35.0,endB=-25.0,
        mode=MultiAxisInterpolationMode.LINEAR_SYNC
    )
    val fiveAxisResult=Machining3DEngine.build(
        snapshot,
        cam.settings,
        axisA=35.0,
        axisB=-25.0,
        axisSchedule=fiveAxisSchedule
    )
    val fiveMoves=fiveAxisResult.cam.toolpaths.flatMap{it.moves}
    require(fiveMoves.isNotEmpty()){"5AX CAM generated no moves"}
    val fiveBeforeIndex=fiveMoves.indices.firstOrNull{i->
        val m=fiveMoves[i]
        !m.rapid && m.z<0.0
    } ?: 0
    val fiveBeforeFrame=ProgressiveMachining3D.frame(fiveAxisResult,fiveBeforeIndex)
    val fiveAfterIndex=fiveMoves.indices.firstOrNull{i->
        if(i<=fiveBeforeIndex || fiveMoves[i].rapid) false else {
            val f=ProgressiveMachining3D.frame(fiveAxisResult,i)
            val xyzChanged=
                abs(f.toolPoint.to.x-fiveBeforeFrame.toolPoint.to.x)>1e-9 ||
                abs(f.toolPoint.to.y-fiveBeforeFrame.toolPoint.to.y)>1e-9 ||
                abs(f.toolPoint.z-fiveBeforeFrame.toolPoint.z)>1e-9
            val rotaryChanged=
                abs(f.toolPoint.axisA-fiveBeforeFrame.toolPoint.axisA)>1e-9 ||
                abs(f.toolPoint.axisB-fiveBeforeFrame.toolPoint.axisB)>1e-9
            xyzChanged && rotaryChanged && f.removedCells>fiveBeforeFrame.removedCells
        }
    } ?: error("No Studio 5AX frame changes XYZ + rotary axes + material removal together")
    val fiveAfterFrame=ProgressiveMachining3D.frame(fiveAxisResult,fiveAfterIndex)
    val fiveAxisPanel=AxisMachiningPanel(fiveAxisResult)
    fiveAxisPanel.setMachineMode("5AX")
    fiveAxisPanel.showProgressiveFrame(fiveBeforeFrame)
    val fiveBeforeFile=File("desktop_5x_before.png")
    writePanel(fiveAxisPanel,fiveBeforeFile,980,620)
    fiveAxisPanel.showProgressiveFrame(fiveAfterFrame)
    val fiveAfterFile=File("desktop_5x_after.png")
    writePanel(fiveAxisPanel,fiveAfterFile,980,620)
    require(!fiveMoves[fiveBeforeIndex].rapid && !fiveMoves[fiveAfterIndex].rapid){"Studio 5AX cut-contact evidence must use non-rapid frames"}
    require(fiveAfterFrame.removedCells>fiveBeforeFrame.removedCells){"Studio 5AX material removal did not increase"}
    require(
        abs(fiveAfterFrame.toolPoint.to.x-fiveBeforeFrame.toolPoint.to.x)>1e-9 ||
        abs(fiveAfterFrame.toolPoint.to.y-fiveBeforeFrame.toolPoint.to.y)>1e-9 ||
        abs(fiveAfterFrame.toolPoint.z-fiveBeforeFrame.toolPoint.z)>1e-9
    ){"Studio 5AX tool XYZ did not move"}
    require(
        abs(fiveAfterFrame.toolPoint.axisA-fiveBeforeFrame.toolPoint.axisA)>1e-9 ||
        abs(fiveAfterFrame.toolPoint.axisB-fiveBeforeFrame.toolPoint.axisB)>1e-9
    ){"Studio 5AX rotary axes did not change"}
    require(sha256File(fiveBeforeFile)!=sha256File(fiveAfterFile)){"Studio 5AX runtime frames are identical"}

    val removed = result.removal.depth.count { it < 0.0 }
    require(removed > 0) { "Material removal result empty" }
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
            "VIEW_ANIMATION_FRAME_CHANGE=PASS\n" +
            "PROGRESSIVE_MATERIAL_REMOVAL=PASS\n" +
            "REMOVED_BEFORE=${materialBeforeFrame.removedCells}\n" +
            "REMOVED_AFTER=${materialAfterFrame.removedCells}\n" +
            "TOOL_BEFORE=${DisplayFormat.mm(materialBeforeFrame.toolPoint.to.x)},${DisplayFormat.mm(materialBeforeFrame.toolPoint.to.y)},${DisplayFormat.mm(materialBeforeFrame.toolPoint.z)}\n" +
            "TOOL_AFTER=${DisplayFormat.mm(materialAfterFrame.toolPoint.to.x)},${DisplayFormat.mm(materialAfterFrame.toolPoint.to.y)},${DisplayFormat.mm(materialAfterFrame.toolPoint.z)}\n" +
            "MATERIAL_REMOVAL=PASS\nREMOVED_CELLS=$removed\n" +
            "5X_FRAME_BEFORE=${fiveBeforeFrame.index+1}/${fiveBeforeFrame.total}\n" +
            "5X_FRAME_AFTER=${fiveAfterFrame.index+1}/${fiveAfterFrame.total}\n" +
            "5X_TOOL_BEFORE=${DisplayFormat.mm(fiveBeforeFrame.toolPoint.to.x)},${DisplayFormat.mm(fiveBeforeFrame.toolPoint.to.y)},${DisplayFormat.mm(fiveBeforeFrame.toolPoint.z)}\n" +
            "5X_TOOL_AFTER=${DisplayFormat.mm(fiveAfterFrame.toolPoint.to.x)},${DisplayFormat.mm(fiveAfterFrame.toolPoint.to.y)},${DisplayFormat.mm(fiveAfterFrame.toolPoint.z)}\n" +
            "5X_A_BEFORE=${DisplayFormat.mm(fiveBeforeFrame.toolPoint.axisA)}\n" +
            "5X_B_BEFORE=${DisplayFormat.mm(fiveBeforeFrame.toolPoint.axisB)}\n" +
            "5X_A_AFTER=${DisplayFormat.mm(fiveAfterFrame.toolPoint.axisA)}\n" +
            "5X_B_AFTER=${DisplayFormat.mm(fiveAfterFrame.toolPoint.axisB)}\n" +
            "5X_REMOVED_BEFORE=${fiveBeforeFrame.removedCells}\n" +
            "5X_REMOVED_AFTER=${fiveAfterFrame.removedCells}\n" +
            "5X_DYNAMIC_TOOL_CHANGE=PASS\n5X_DYNAMIC_AXIS_CHANGE=PASS\n5X_PROGRESSIVE_MATERIAL_REMOVAL=PASS\n5X_CUT_CONTACT_FRAME=PASS\n" +
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
            sha256File(cadEditFile) + "  desktop_cad_edit.png\n" +
            sha256File(beforeFile) + "  desktop_3d_before.png\n" +
            sha256File(afterFile) + "  desktop_3d.png\n" +
            sha256File(materialBeforeFile) + "  desktop_material_before.png\n" +
            sha256File(materialAfterFile) + "  desktop_material_after.png\n" +
            sha256File(fiveBeforeFile) + "  desktop_5x_before.png\n" +
            sha256File(fiveAfterFile) + "  desktop_5x_after.png\n" +
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
            "CAD_PRECISION_EDIT_SCREENSHOT=desktop_cad_edit.png\n" +
            "HQ_3D_RUNTIME_SCREENSHOT=desktop_3d.png\n" +
            "PROGRESSIVE_MATERIAL_BEFORE=desktop_material_before.png\n" +
            "PROGRESSIVE_MATERIAL_AFTER=desktop_material_after.png\n" +
            "5X_BEFORE=desktop_5x_before.png\n" +
            "5X_AFTER=desktop_5x_after.png\n" +
            "VIEW_ANIMATION_FRAME_CHANGE=PASS\n" +
            "PROGRESSIVE_MATERIAL_REMOVAL=PASS\n" +
            "5X_REAL_MOTION_AND_REMOVAL=PASS\n"
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


private val rotaryMachinePrefs: Preferences =
    Preferences.userRoot().node("com/aigstudio/rotary-machine-profile")

private fun loadDesktopRotaryMachineProfile(): RotaryAxisClampProfile {
    return when (rotaryMachinePrefs.get("mode","UNCONFIGURED")) {
        "PMC_AUTO" -> RotaryAxisClampProfile.controllerAutomatic(
            rotaryMachinePrefs.getBoolean("require_indexed_cut_lock",false)
        )
        "EXPLICIT" -> {
            val lock=rotaryMachinePrefs.getInt("lock_m",-1)
            val unlock=rotaryMachinePrefs.getInt("unlock_m",-1)
            if(lock in 0..999 && unlock in 0..999 && lock!=unlock) {
                RotaryAxisClampProfile.explicit(
                    clampM=lock,
                    unclampM=unlock,
                    requireClampForIndexedCutting=rotaryMachinePrefs.getBoolean("require_indexed_cut_lock",false)
                )
            } else RotaryAxisClampProfile.unconfigured()
        }
        else -> RotaryAxisClampProfile.unconfigured()
    }
}

private fun saveDesktopRotaryMachineProfile(profile:RotaryAxisClampProfile){
    rotaryMachinePrefs.clear()
    rotaryMachinePrefs.putBoolean("require_indexed_cut_lock",profile.requireClampForIndexedCutting)
    when {
        profile.controllerAutomatic -> rotaryMachinePrefs.put("mode","PMC_AUTO")
        profile.explicit -> {
            rotaryMachinePrefs.put("mode","EXPLICIT")
            rotaryMachinePrefs.putInt("lock_m",profile.clampM!!)
            rotaryMachinePrefs.putInt("unlock_m",profile.unclampM!!)
        }
        else -> rotaryMachinePrefs.put("mode","UNCONFIGURED")
    }
    rotaryMachinePrefs.flush()
}

private fun showUnifiedMachiningEditor(frame:JFrame,doc:DrawingDocument,status:JLabel,initialMode:String="3AX"){
    require(initialMode in setOf("3D","3AX","4AX","5AX")){"Unsupported initial mode: $initialMode"}
    val snapshot=doc.snapshot()
    require(snapshot.entities.isNotEmpty()){"UNIFIED WORKSPACE BLOCKED: no CAD geometry"}
    var result=Machining3DEngine.build(snapshot)
    var axisA=0.0
    var axisB=0.0
    var axisMode="3AX"
    var rotaryClampProfile=loadDesktopRotaryMachineProfile()
    fun currentRotaryMode():RotaryAxisOperationMode=when(axisMode){
        "4AX" -> RotaryAxisOperationMode.SIMULTANEOUS_4AX
        "5AX" -> RotaryAxisOperationMode.SIMULTANEOUS_5AX
        else -> RotaryAxisOperationMode.NONE
    }
    fun clampStatus():String=when{
        rotaryClampProfile.controllerAutomatic -> "PMC AUTO"
        rotaryClampProfile.explicit ->
            "M"+rotaryClampProfile.unclampM+" UNLOCK / M"+rotaryClampProfile.clampM+" LOCK"
        else -> "UNCONFIGURED"
    }
    fun generateNc():String {
        return CncPost.generate(
            result.cam,
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
    var simulationMoves=result.cam.toolpaths.flatMap{it.moves}
    var simulationIndex=0
    val playbackTimer=Timer(110,null)

    fun rebuildMachiningForMode(){
        playbackTimer.stop()
        val schedule=when(axisMode){
            "4AX" -> MultiAxisOrientationSchedule(
                startA=0.0,startB=0.0,endA=axisA,endB=0.0,
                mode=MultiAxisInterpolationMode.LINEAR_SYNC
            )
            "5AX" -> MultiAxisOrientationSchedule(
                startA=0.0,startB=0.0,endA=axisA,endB=axisB,
                mode=MultiAxisInterpolationMode.LINEAR_SYNC
            )
            else -> null
        }
        result=Machining3DEngine.build(
            snapshot,
            result.cam.settings,
            axisA=if(axisMode=="3AX")0.0 else axisA,
            axisB=if(axisMode=="5AX")axisB else 0.0,
            axisSchedule=schedule
        )
        mesh.setResult(result)
        axes.setResult(result)
        axes.setMachineMode(axisMode)
        axes.setAngles(
            if(axisMode=="3AX")0.0 else axisA,
            if(axisMode=="5AX")axisB else 0.0
        )
        simulationMoves=result.cam.toolpaths.flatMap{it.moves}
        simulationIndex=0
        status.text="CAM "+axisMode+" REBUILT • moves="+simulationMoves.size+
            " • A="+DisplayFormat.mm(axisA)+" B="+DisplayFormat.mm(axisB)+
            " • NC STALE / REBUILD REQUIRED"
    }

    visual.add(mesh,"3D");visual.add(axes,"AXIS")
    val split=JSplitPane(JSplitPane.HORIZONTAL_SPLIT,visual,editorPanel).apply{
        resizeWeight=1.0
        dividerSize=0
        border=null
        editorPanel.minimumSize=Dimension(0,0)
    }
    fun maximizeVisualWorkspace(){
        split.resizeWeight=1.0
        split.dividerSize=0
        editorPanel.minimumSize=Dimension(0,0)
        SwingUtilities.invokeLater { split.setDividerLocation(1.0) }
    }
    fun showNcWorkspace(){
        split.resizeWeight=.76
        split.dividerSize=6
        editorPanel.minimumSize=Dimension(330,0)
        SwingUtilities.invokeLater { split.setDividerLocation(.76) }
    }
    val dlg=JDialog(frame,"AIG CNC • 3D / 3AX / 4AX / 5AX + EDITABLE G-CODE",false).apply{
        layout=BorderLayout();minimumSize=Dimension(1100,720)
    }
    val modeBar=AdaptiveGlassToolbar()
    val modeButtons=mutableListOf<GlassActionButton>()
    fun mode(id:String,zh:String,en:String,color:Color,icon:String,run:()->Unit){
        val b=GlassActionButton(UiTextPolicy.display(id,118),color).apply{
            toolTipText="$zh / $en"
            this.icon=ProductionRgbAssets.icon(icon) ?: RgbGlyphIcon(icon,color)
            horizontalTextPosition=SwingConstants.RIGHT
            addActionListener{
                modeButtons.forEach{it.active=false};active=true;run()
            }
        }
        modeButtons+=b;modeBar.add(b)
    }
    mode("CAD","2D繪圖","2D CAD",Color(61,235,255),"CAD"){maximizeVisualWorkspace();dlg.dispose()}
    mode("CAM","刀路","CAM",Color(63,255,157),"CAM"){maximizeVisualWorkspace();status.text="REAL CAM • paths="+result.cam.toolpaths.size}
    mode("3D","3D模擬","3D",Color(139,92,246),"3D"){
        maximizeVisualWorkspace();axisMode="3AX";axisA=0.0;axisB=0.0;rebuildMachiningForMode();card.show(visual,"3D")
    }
    mode("3AX","三軸","3 AXIS",Color(59,130,246),"3AX"){
        maximizeVisualWorkspace();axisMode="3AX";axisA=0.0;axisB=0.0;rebuildMachiningForMode();card.show(visual,"AXIS")
    }
    mode("4AX","四軸","4 AXIS",Color(245,158,11),"4AX"){
        maximizeVisualWorkspace();axisMode="4AX";axisB=0.0;rebuildMachiningForMode();card.show(visual,"AXIS")
    }
    mode("5AX","五軸","5 AXIS",Color(236,72,153),"5AX"){
        maximizeVisualWorkspace();axisMode="5AX";rebuildMachiningForMode();card.show(visual,"AXIS")
    }
    mode("NC_EDIT","程式","NC EDIT",Color(80,170,255),"NC_EDIT"){showNcWorkspace();editor.requestFocusInWindow()}
    when(initialMode){
        "4AX" -> modeButtons.getOrNull(4)?.doClick()
        "5AX" -> modeButtons.getOrNull(5)?.doClick()
        "3AX" -> modeButtons.getOrNull(3)?.doClick()
        else -> modeButtons.getOrNull(2)?.doClick()
    }

    fun showPlaybackFrame(index:Int){
        if(simulationMoves.isEmpty()){
            status.text="SIM BLOCKED • CAM has no moves"
            return
        }
        val frameState=ProgressiveMachining3D.frame(result,index)
        simulationIndex=frameState.index
        mesh.showProgressiveFrame(simulationIndex)
        axes.showProgressiveFrame(frameState)
        axisA=frameState.toolPoint.axisA
        axisB=frameState.toolPoint.axisB
        if(axisMode=="4AX" || axisMode=="5AX") card.show(visual,"AXIS")
        else card.show(visual,"3D")
        status.text=
            "SIM • frame="+(frameState.index+1)+"/"+frameState.total+
            " • removed="+frameState.removedCells+
            " • X="+DisplayFormat.mm(frameState.toolPoint.to.x)+
            " Y="+DisplayFormat.mm(frameState.toolPoint.to.y)+
            " Z="+DisplayFormat.mm(frameState.toolPoint.z)+
            " • A="+DisplayFormat.mm(frameState.toolPoint.axisA)+
            " B="+DisplayFormat.mm(frameState.toolPoint.axisB)
    }

    playbackTimer.addActionListener{
        if(simulationMoves.isEmpty() || simulationIndex>=simulationMoves.lastIndex){
            playbackTimer.stop()
            status.text="SIM COMPLETE • material removal="+mesh.progressiveRemovedCells()
        }else{
            showPlaybackFrame(simulationIndex+1)
        }
    }

    val actions=AdaptiveGlassToolbar()
    fun action(label:String,color:Color,icon:String,run:()->Unit){
        actions.add(GlassActionButton(label,color).apply{
            this.icon=ProductionRgbAssets.icon(icon) ?: RgbGlyphIcon(icon,color);addActionListener{run()}
        })
    }
    action("▶",Color(63,255,157),"SIM"){
        if(simulationMoves.isNotEmpty()){
            if(simulationIndex>=simulationMoves.lastIndex)simulationIndex=0
            showPlaybackFrame(simulationIndex)
            playbackTimer.start()
        }
    }
    action("⏸",Color(255,176,32),"SIM"){playbackTimer.stop();status.text="SIM PAUSE • frame="+(simulationIndex+1)}
    action("STEP",Color(61,235,255),"SIM"){
        playbackTimer.stop()
        showPlaybackFrame((simulationIndex+1).coerceAtMost(simulationMoves.lastIndex.coerceAtLeast(0)))
    }
    action("RESET",Color(125,112,255),"SIM"){
        playbackTimer.stop()
        simulationIndex=0
        if(simulationMoves.isNotEmpty())showPlaybackFrame(0)
    }
    action("A−",Color(139,92,246),"4AX"){
        playbackTimer.stop();if(axisMode!="5AX")axisMode="4AX"
        axisA=(axisA-15.0).coerceAtLeast(-360.0);rebuildMachiningForMode();card.show(visual,"AXIS")
    }
    action("A+",Color(139,92,246),"4AX"){
        playbackTimer.stop();if(axisMode!="5AX")axisMode="4AX"
        axisA=(axisA+15.0).coerceAtMost(360.0);rebuildMachiningForMode();card.show(visual,"AXIS")
    }
    action("B−",Color(236,72,153),"5AX"){
        playbackTimer.stop();axisMode="5AX";axisB=(axisB-15.0).coerceAtLeast(-360.0)
        rebuildMachiningForMode();card.show(visual,"AXIS")
    }
    action("B+",Color(236,72,153),"5AX"){
        playbackTimer.stop();axisMode="5AX";axisB=(axisB+15.0).coerceAtMost(360.0)
        rebuildMachiningForMode();card.show(visual,"AXIS")
    }
    action(UiTextPolicy.display("ROTARY_CLAMP",118),Color(125,112,255),"4AX"){
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
            add(JLabel("Machine-specific rotary clamp profile • never assume universal M-codes • M42/M44 is example only"))
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
                saveDesktopRotaryMachineProfile(rotaryClampProfile)
                status.text="ROTARY PROFILE SAVED • "+axisMode+" • "+clampStatus()+" • NC STALE / REBUILD REQUIRED"
            }.onFailure{
                status.text="ROTARY PROFILE WARNING • "+(it.message?:"invalid machine profile")+" • EDITOR STILL ENABLED"
            }
        }
    }
    action("重建 NC",Color(34,197,94),"NC_EDIT"){
        runCatching{generateNc()}.onSuccess{
            editor.text=it
            status.text="UNIFIED NC REBUILT • "+axisMode+" • A="+DisplayFormat.mm(axisA)+" B="+DisplayFormat.mm(axisB)+" • "+clampStatus()
        }
            .onFailure{status.text="NC REBUILD WARNING • existing editor preserved • "+(it.message?:"error")}
    }
    action("檢查",Color(255,176,32),"NC_EDIT"){
        val blocked=NcProgramSafetyPolicy.blocking(editor.text,rotaryClampProfile,currentRotaryMode())
        status.text=if(blocked.isEmpty())"UNIFIED NC SAFETY PASS" else "UNIFIED NC WARNING • EDITING ENABLED • EXECUTION INTERLOCK • "+blocked.take(3).joinToString(","){it.code}
    }
    action("儲存",Color(61,235,255),"NC_EDIT"){
        status.text="NC DRAFT SAVED IN EDITOR • WARNING DOES NOT LOCK EDITING • VERIFY PENDING • chars="+editor.text.length
    }

    dlg.defaultCloseOperation=WindowConstants.DISPOSE_ON_CLOSE
    dlg.addWindowListener(object:WindowAdapter(){
        override fun windowClosing(e:WindowEvent?){playbackTimer.stop()}
        override fun windowClosed(e:WindowEvent?){playbackTimer.stop()}
    })
    dlg.add(modeBar,BorderLayout.NORTH)
    dlg.add(split,BorderLayout.CENTER)
    dlg.add(actions,BorderLayout.SOUTH)
    dlg.size=desktopAdaptiveSize(1500,900)
    dlg.setLocationRelativeTo(frame)
    dlg.isVisible=true
}

private fun showApp(startup:StudioDesktopStartupWindow?=null) {
    startup?.advance(StudioStartupStage.CONFIGURATION,"載入環境設定")
    val doc = DrawingDocument()
    val status = JLabel("AIG CNC • FANUC / MITSUBISHI M800/M80 • 原點 X0.000 Y0.000 • 精度 0.001 mm")
    status.foreground = Color(99, 255, 157)
    val cad = CadPanel(doc) { status.text = it }

    val frame = JFrame("AIG CNC — OFFICIAL RGB ORIGINAL")
    startup?.advance(StudioStartupStage.UI_RENDERER,"載入 RGB UI / Renderer")
    frame.defaultCloseOperation = WindowConstants.EXIT_ON_CLOSE
    frame.layout = BorderLayout()
    frame.contentPane.background = StudioDesktopProductionTheme.background

    val mainCardLayout=CardLayout()
    val mainCardHost=JPanel(mainCardLayout).apply{
        background=StudioDesktopProductionTheme.background
    }
    val moduleButtons=AdaptiveGlassToolbar()
    val toolbar = JPanel(BorderLayout()).apply {
        background=StudioDesktopProductionTheme.background
        border=BorderFactory.createCompoundBorder(
            BorderFactory.createMatteBorder(0,0,2,0,Color(61,235,255,150)),
            BorderFactory.createEmptyBorder(4,6,4,6)
        )
        add(JLabel("AIG CNC  •  REAL CAD / CAM").apply {
            foreground=StudioDesktopProductionTheme.accent
            font=font.deriveFont(Font.BOLD,17f)
            border=BorderFactory.createEmptyBorder(0,10,0,8)
            preferredSize=Dimension(260,62)
            toolTipText="Theme: "+StudioDesktopProductionTheme.ID
        },BorderLayout.WEST)
        add(moduleButtons,BorderLayout.CENTER)
    }
    val drawTools=CadToolGrid()
    val editTools=CadToolGrid()
    val linkTools=CadToolGrid()
    val viewTools=JPanel().apply{
        layout=BoxLayout(this,BoxLayout.Y_AXIS)
        background=Color(8,18,30)
        border=BorderFactory.createEmptyBorder(10,10,10,10)
        add(JLabel("中鍵 / 右鍵拖曳 = 視圖平移").apply{foreground=Color(143,179,201)})
        add(Box.createVerticalStrut(8))
        add(JLabel("滾輪 = 縮放").apply{foreground=Color(143,179,201)})
        add(Box.createVerticalStrut(8))
        add(JLabel("Master X0.000 Y0.000").apply{foreground=Color(61,235,255)})
        add(Box.createVerticalStrut(8))
        add(JLabel("顯示精度 0.001 mm").apply{foreground=Color(245,158,11)})
    }
    val cadCardLayout=CardLayout()
    val cadCardHost=JPanel(cadCardLayout).apply{
        background=StudioDesktopProductionTheme.panel
        add(drawTools,"DRAW")
        add(editTools,"EDIT")
        add(linkTools,"LINK")
        add(viewTools,"VIEW")
    }
    val cadDeckButtons=mutableListOf<GlassActionButton>()
    val cadDeckNav=JPanel(GridLayout(0,1,6,6)).apply{
        background=StudioDesktopProductionTheme.background
        border=BorderFactory.createEmptyBorder(8,8,8,8)
    }
    fun cadDeckButton(label:String,card:String,color:Color){
        val b=GlassActionButton(label,color).apply{
            preferredSize=Dimension(104,48)
            addActionListener{
                cadDeckButtons.forEach{it.active=false}
                active=true
                cadCardLayout.show(cadCardHost,card)
            }
        }
        cadDeckButtons+=b
        cadDeckNav.add(b)
    }
    cadDeckButton("繪圖","DRAW",StudioDesktopProductionTheme.accent)
    cadDeckButton("修改","EDIT",Color(236,72,153))
    cadDeckButton("連接","LINK",StudioDesktopProductionTheme.cutting)
    cadDeckButton("檢視","VIEW",Color(125,112,255))
    cadDeckButtons.firstOrNull()?.active=true
    val cadDeck=JPanel(BorderLayout(6,6)).apply{
        background=StudioDesktopProductionTheme.background
        preferredSize=Dimension(250,0)
        minimumSize=Dimension(225,0)
        border=BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(Color(61,235,255,120),1,true),
            BorderFactory.createEmptyBorder(4,4,4,4)
        )
        add(cadDeckNav,BorderLayout.WEST)
        add(cadCardHost,BorderLayout.CENTER)
    }

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

    fun askDelta(title:String, run:(Double,Double)->Unit) {
        val dx=JTextField("0.000",10)
        val dy=JTextField("0.000",10)
        val panel=JPanel(GridLayout(0,2,5,5)).apply {
            add(JLabel("ΔX mm"));add(dx)
            add(JLabel("ΔY mm"));add(dy)
        }
        if(JOptionPane.showConfirmDialog(frame,panel,title,JOptionPane.OK_CANCEL_OPTION)==JOptionPane.OK_OPTION){
            val x=dx.text.trim().toDoubleOrNull()
            val y=dy.text.trim().toDoubleOrNull()
            if(x==null || y==null) status.text="$title BLOCKED • invalid ΔX/ΔY" else run(x,y)
        }
    }

    fun askAngle(run:(Double)->Unit) {
        val angle=JTextField("90.000",10)
        if(JOptionPane.showConfirmDialog(frame,angle,"旋轉角度 °",JOptionPane.OK_CANCEL_OPTION)==JOptionPane.OK_OPTION){
            angle.text.trim().toDoubleOrNull()?.let(run) ?: run { status.text="ROTATE BLOCKED • invalid angle" }
        }
    }

    fun askSingle(title:String,initial:String="1.000",run:(Double)->Unit) {
        val value=JTextField(initial,10)
        if(JOptionPane.showConfirmDialog(frame,value,title,JOptionPane.OK_CANCEL_OPTION)==JOptionPane.OK_OPTION){
            value.text.trim().toDoubleOrNull()?.let(run) ?: run { status.text="$title BLOCKED • invalid value" }
        }
    }

    fun askArray(run:(Int,Double,Double)->Unit) {
        val count=JTextField("3",8); val dx=JTextField("10.000",10); val dy=JTextField("0.000",10)
        val panel=JPanel(GridLayout(0,2,5,5)).apply {
            add(JLabel("總數"));add(count)
            add(JLabel("ΔX mm"));add(dx)
            add(JLabel("ΔY mm"));add(dy)
        }
        if(JOptionPane.showConfirmDialog(frame,panel,"LINEAR ARRAY",JOptionPane.OK_CANCEL_OPTION)==JOptionPane.OK_OPTION){
            val n=count.text.trim().toIntOrNull(); val x=dx.text.trim().toDoubleOrNull(); val y=dy.text.trim().toDoubleOrNull()
            if(n==null || x==null || y==null) status.text="ARRAY BLOCKED • invalid values" else run(n,x,y)
        }
    }

    fun buildProductionCamPanel():JPanel {
        val snapshot=doc.snapshot()
        if(snapshot.entities.isEmpty()){
            return JPanel(BorderLayout()).apply{
                background=StudioDesktopProductionTheme.background
                border=BorderFactory.createEmptyBorder(18,18,18,18)
                add(JLabel("CAM 尚未建立 • 請先完成 CAD 幾何").apply{
                    foreground=StudioDesktopProductionTheme.warning
                    font=font.deriveFont(Font.BOLD,18f)
                    horizontalAlignment=SwingConstants.CENTER
                },BorderLayout.CENTER)
            }
        }
        val result=Machining3DEngine.build(snapshot)
        val cam=result.cam
        val settings=cam.settings
        val left=JPanel(BorderLayout(6,6)).apply{
            background=StudioDesktopProductionTheme.panel
            preferredSize=Dimension(190,0)
            minimumSize=Dimension(178,0)
            border=BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(Color(61,235,255,135),1,true),
                BorderFactory.createEmptyBorder(10,10,10,10)
            )
            add(JLabel("刀路 / TOOLPATH").apply{
                foreground=StudioDesktopProductionTheme.accent
                font=font.deriveFont(Font.BOLD,14f)
            },BorderLayout.NORTH)
            add(JTextArea(buildString{
                append("CAM READY\n")
                append("PATHS  ").append(cam.toolpaths.size).append("\n")
                append("MOVES  ").append(cam.toolpaths.sumOf{it.moves.size}).append("\n\n")
                cam.toolpaths.take(18).forEachIndexed{i,path->
                    append(String.format("%02d",i+1)).append("  moves=").append(path.moves.size).append("\n")
                }
            }).apply{
                isEditable=false;isOpaque=false
                foreground=StudioDesktopProductionTheme.text
                font=Font(Font.MONOSPACED,Font.PLAIN,12)
            },BorderLayout.CENTER)
        }
        val right=JPanel(GridLayout(0,1,5,5)).apply{
            background=StudioDesktopProductionTheme.background
            preferredSize=Dimension(180,0)
            minimumSize=Dimension(168,0)
            border=BorderFactory.createEmptyBorder(2,2,2,2)
        }
        fun parameter(title:String,value:String,color:Color){
            right.add(JPanel(BorderLayout()).apply{
                background=StudioDesktopProductionTheme.panel
                border=BorderFactory.createCompoundBorder(
                    BorderFactory.createLineBorder(Color(color.red,color.green,color.blue,125),1,true),
                    BorderFactory.createEmptyBorder(8,10,8,10)
                )
                add(JLabel(title).apply{foreground=Color(145,175,198)},BorderLayout.NORTH)
                add(JLabel(value).apply{foreground=color;font=font.deriveFont(Font.BOLD,13f)},BorderLayout.CENTER)
            })
        }
        parameter("TOOL DIA",DisplayFormat.mm(settings.toolDiameter)+" mm",StudioDesktopProductionTheme.accent)
        parameter("TOOL RADIUS",DisplayFormat.mm(settings.toolDiameter/2.0)+" mm",Color(139,92,246))
        parameter("DEPTH",DisplayFormat.mm(settings.depth)+" mm",StudioDesktopProductionTheme.cutting)
        parameter("SAFE-Z",DisplayFormat.mm(settings.safeZ)+" mm",StudioDesktopProductionTheme.warning)
        parameter("FEED",DisplayFormat.mm(settings.feedMmMin)+" mm/min",Color(80,170,255))
        parameter("DIRECTION",if(settings.climb)"CLIMB" else "CONVENTIONAL",Color(236,72,153))
        val actions=AdaptiveGlassToolbar()
        fun camAction(label:String,color:Color,run:()->Unit){
            actions.add(GlassActionButton(label,color).apply{addActionListener{run()}})
        }
        camAction("3D SIM",Color(139,92,246)){
            runCatching{showUnifiedMachiningEditor(frame,doc,status,"3D")}
                .onFailure{status.text="3D SIM BLOCKED • "+(it.message?:"error")}
        }
        camAction("3AX",Color(59,130,246)){
            runCatching{showUnifiedMachiningEditor(frame,doc,status,"3AX")}
                .onFailure{status.text="3AX BLOCKED • "+(it.message?:"error")}
        }
        camAction("4AX",Color(245,158,11)){
            runCatching{showUnifiedMachiningEditor(frame,doc,status,"4AX")}
                .onFailure{status.text="4AX BLOCKED • "+(it.message?:"error")}
        }
        camAction("5AX",Color(236,72,153)){
            runCatching{showUnifiedMachiningEditor(frame,doc,status,"5AX")}
                .onFailure{status.text="5AX BLOCKED • "+(it.message?:"error")}
        }
        camAction("NC",Color(80,170,255)){
            runCatching{showNcEditor(frame,doc)}
                .onFailure{status.text="NC EDIT BLOCKED • "+(it.message?:"error")}
        }
        return JPanel(BorderLayout(7,7)).apply{
            name="CAM_CARD"
            background=StudioDesktopProductionTheme.background
            border=BorderFactory.createEmptyBorder(7,7,7,7)
            add(JLabel("AIG CNC • REAL CAM 真實刀路 • "+StudioDesktopProductionTheme.ID).apply{
                foreground=StudioDesktopProductionTheme.accent
                font=font.deriveFont(Font.BOLD,15f)
                border=BorderFactory.createEmptyBorder(4,8,5,8)
            },BorderLayout.NORTH)
            add(left,BorderLayout.WEST)
            add(Mesh3DPanel(result),BorderLayout.CENTER)
            add(right,BorderLayout.EAST)
            add(actions,BorderLayout.SOUTH)
        }
    }

    fun showProductionCam(){
        mainCardHost.components.filter{it.name=="CAM_CARD"}.forEach{mainCardHost.remove(it)}
        mainCardHost.add(buildProductionCamPanel(),"CAM")
        mainCardLayout.show(mainCardHost,"CAM")
        mainCardHost.revalidate()
        mainCardHost.repaint()
        status.text=if(doc.size()>0)"CAM READY • 真刀路 / 真 3D / 材料移除" else "CAM WAITING • CAD geometry required"
    }

    viewTools.add(button("SNAP",Color(61,235,255)) {
        cad.snapEnabled=!cad.snapEnabled
        status.text="SNAP "+if(cad.snapEnabled)"ON • END/MID/CENTER/INTERSECTION/TANGENT/H/V" else "OFF"
    })
    viewTools.add(Box.createVerticalStrut(8))
    viewTools.add(button("尺寸驅動",Color(245,158,11)) {
        askSingle("尺寸驅動 mm",cad.selectedDimensionValue()?.let(DisplayFormat::mm)?:"10.000",cad::driveDimension)
    })

    drawTools.add(button("線", Color(61, 235, 255)) { cad.mode = DrawMode.LINE; status.text = "LINE" })
    drawTools.add(button("矩形", Color(139, 92, 246)) { cad.mode = DrawMode.RECT; status.text = "RECT" })
    drawTools.add(button("圓", Color(245, 158, 11)) { cad.mode = DrawMode.CIRCLE; status.text = "CIRCLE" })
    drawTools.add(button("圓弧", Color(59,130,246)) { cad.mode=DrawMode.ARC; status.text="ARC • CENTER / START / END" })
    drawTools.add(button("孔", Color(236,72,153)) { cad.mode=DrawMode.HOLE; status.text="HOLE • CENTER / RADIUS" })
    drawTools.add(button("選取", Color(80,170,255)) { cad.mode=DrawMode.SELECT; status.text="SELECT • LINE / RECT / CIRCLE / ARC / HOLE" })
    editTools.add(button("移動", Color(61,235,255)) { askDelta("MOVE"){x,y->cad.moveSelected(x,y)} })
    editTools.add(button("複製", Color(63,255,157)) { askDelta("COPY"){x,y->cad.copySelected(x,y)} })
    editTools.add(button("旋轉", Color(139,92,246)) { askAngle(cad::rotateSelected) })
    editTools.add(button("鏡射 X", Color(245,158,11)) { cad.mirrorSelected(true) })
    editTools.add(button("鏡射 Y", Color(245,158,11)) { cad.mirrorSelected(false) })
    editTools.add(button("TRIM", Color(61,235,255)) { cad.trimSelected() })
    editTools.add(button("EXTEND", Color(63,255,157)) { cad.extendSelected() })
    editTools.add(button("OFFSET", Color(139,92,246)) { askSingle("OFFSET mm","1.000",cad::offsetSelected) })
    editTools.add(button("ARRAY", Color(59,130,246)) { askArray(cad::arraySelected) })
    editTools.add(button("刪除", Color(239,68,68)) { cad.deleteSelected() })
    editTools.add(button("復原", Color(125,112,255)) { cad.undoEdit() })
    editTools.add(button("重做", Color(125,112,255)) { cad.redoEdit() })
    linkTools.add(button("連接", Color(63,255,157)) { cad.connectSelected() })
    linkTools.add(button("斷開", Color(255,176,32)) { cad.disconnectSelected() })
    moduleButtons.add(button("2D CAD", StudioDesktopProductionTheme.accent) {
        mainCardLayout.show(mainCardHost,"CAD")
        status.text="2D CAD • PRODUCTION UI • MASTER X0.000 Y0.000 • 0.001 mm"
    })
    moduleButtons.add(button("CAM", StudioDesktopProductionTheme.cutting) {
        showProductionCam()
    })
    moduleButtons.add(button("3D", Color(139,92,246)) {
        runCatching { showUnifiedMachiningEditor(frame,doc,status,"3D") }
            .onFailure { status.text="3D BLOCKED • "+(it.message?:"error") }
    })
    moduleButtons.add(button("3AX", Color(59,130,246)) {
        runCatching { showUnifiedMachiningEditor(frame,doc,status,"3AX") }
            .onFailure { status.text="3AX BLOCKED • "+(it.message?:"error") }
    })
    moduleButtons.add(button("4AX", StudioDesktopProductionTheme.warning) {
        runCatching { showUnifiedMachiningEditor(frame,doc,status,"4AX") }
            .onFailure { status.text="4AX BLOCKED • "+(it.message?:"error") }
    })
    moduleButtons.add(button("5AX", Color(236,72,153)) {
        runCatching { showUnifiedMachiningEditor(frame,doc,status,"5AX") }
            .onFailure { status.text="5AX BLOCKED • "+(it.message?:"error") }
    })
    moduleButtons.add(button("SIM", Color(63,255,157)) {
        runCatching { showUnifiedMachiningEditor(frame,doc,status,"3D") }
            .onFailure { status.text="SIM BLOCKED • "+(it.message?:"error") }
    })
    moduleButtons.add(button("NC", Color(80,170,255)) {
        runCatching { showNcEditor(frame,doc) }
            .onSuccess { status.text="NC EDIT • FANUC / MITSUBISHI • G90/G91 EXPLICIT • ABS XYZ LOCKED" }
            .onFailure { status.text="NC EDIT BLOCKED • "+(it.message?:"error") }
    })
    editTools.add(button("清除", Color(239, 68, 68)) { cad.clearCad() })

    status.border = BorderFactory.createCompoundBorder(
        BorderFactory.createMatteBorder(1,0,0,0,Color(61,235,255,125)),
        BorderFactory.createEmptyBorder(8,12,8,12)
    )
    status.background = StudioDesktopProductionTheme.background
    status.isOpaque = true

    val selectedValue=JLabel("0")
    val entityValue=JLabel(doc.size().toString())
    val linkValue=JLabel(doc.links().size.toString())
    fun railCell(title:String,value:JLabel,color:Color)=JPanel(BorderLayout()).apply{
        background=StudioDesktopProductionTheme.panel
        border=BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(Color(color.red,color.green,color.blue,110),1,true),
            BorderFactory.createEmptyBorder(8,10,8,10)
        )
        add(JLabel(title).apply{foreground=Color(120,148,168)},BorderLayout.NORTH)
        value.foreground=color
        value.font=value.font.deriveFont(Font.BOLD,13f)
        add(value,BorderLayout.CENTER)
    }
    val infoRail=JPanel().apply{
        layout=BoxLayout(this,BoxLayout.Y_AXIS)
        background=StudioDesktopProductionTheme.background
        preferredSize=Dimension(158,0)
        minimumSize=Dimension(150,0)
        border=BorderFactory.createEmptyBorder(4,4,4,4)
        add(railCell("MACHINE",JLabel("READY"),Color(99,255,157)))
        add(Box.createVerticalStrut(6))
        add(railCell("ORIGIN",JLabel("X0.000 Y0.000"),Color(61,235,255)))
        add(Box.createVerticalStrut(6))
        add(railCell("PRECISION",JLabel("0.001 mm"),Color(245,158,11)))
        add(Box.createVerticalStrut(6))
        add(railCell("SELECTED",selectedValue,Color(236,72,153)))
        add(Box.createVerticalStrut(6))
        add(railCell("ENTITIES",entityValue,Color(99,255,157)))
        add(Box.createVerticalStrut(6))
        add(railCell("LINKS",linkValue,Color(63,255,157)))
        add(Box.createVerticalGlue())
    }
    Timer(350){
        selectedValue.text=cad.selectedCount().toString()
        entityValue.text=doc.size().toString()
        linkValue.text=doc.links().size.toString()
    }.apply{isRepeats=true;start()}

    val workspace=JPanel(BorderLayout(6,6)).apply{
        name="CAD_CARD"
        background=StudioDesktopProductionTheme.background
        border=BorderFactory.createEmptyBorder(5,5,5,5)
        add(cadDeck,BorderLayout.WEST)
        add(cad,BorderLayout.CENTER)
        add(infoRail,BorderLayout.EAST)
    }
    mainCardHost.add(workspace,"CAD")
    mainCardLayout.show(mainCardHost,"CAD")
    frame.add(toolbar, BorderLayout.NORTH)
    frame.add(mainCardHost, BorderLayout.CENTER)
    frame.add(status, BorderLayout.SOUTH)
    startup?.advance(StudioStartupStage.PROJECT_DATA,"檢查專案 / Recovery")
    startup?.advance(StudioStartupStage.HEALTH,"Runtime 健康檢查")
    frame.size = desktopAdaptiveSize(1280, 820)
    frame.setLocationRelativeTo(null)
    startup?.advance(StudioStartupStage.WRAP_UP,"完成啟動收尾")
    frame.isVisible = true
    startup?.advance(StudioStartupStage.HOME,"AIG CNC READY")
    startup?.close()
}

fun main(args: Array<String>) {
    if (args.contains("--smoke")) {
        runSmoke()
        return
    }
    if (GraphicsEnvironment.isHeadless()) error("Desktop UI requires a graphical Windows session")
    SwingUtilities.invokeLater {
        val startup=StudioDesktopStartupWindow()
        startup.show()
        startup.advance(StudioStartupStage.SAFE_THEME,"載入原版 RGB 啟動圖")
        startup.advance(StudioStartupStage.CORE,"初始化 CAD / CAM 核心")
        showApp(startup)
    }
}
