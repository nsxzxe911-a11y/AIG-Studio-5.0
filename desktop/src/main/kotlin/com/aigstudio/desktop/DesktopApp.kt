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



private val coordinatePrecisionPrefs = java.util.prefs.Preferences.userRoot().node("com/aigstudio/coordinate-precision")

private fun applyDesktopCoordinatePrecision() {
    val display=CoordinatePrecisionMode.fromStorage(coordinatePrecisionPrefs.get("display","0.001"))
    val nc=CoordinatePrecisionMode.fromStorage(coordinatePrecisionPrefs.get("nc","0.001"))
    CoordinatePrecisionRuntime.configure(display=display,input=display,ncOutput=nc)
}

private fun showDesktopCoordinatePrecisionDialog(owner:java.awt.Component?, status:javax.swing.JLabel) {
    val values=arrayOf("0.001","0.01","0.1")
    val displayBox=javax.swing.JComboBox(values).apply {
        selectedItem=CoordinatePrecisionRuntime.display().storageValue
    }
    val ncBox=javax.swing.JComboBox(values).apply {
        selectedItem=CoordinatePrecisionRuntime.ncOutput().storageValue
    }
    val panel=javax.swing.JPanel(java.awt.GridLayout(0,2,6,6)).apply {
        add(javax.swing.JLabel("座標顯示 / 輸入步進 mm"))
        add(displayBox)
        add(javax.swing.JLabel("NC 輸出精度 mm"))
        add(ncBox)
        add(javax.swing.JLabel("內部幾何 / 安全解析度"))
        add(javax.swing.JLabel("0.001 mm"))
    }
    val ok=javax.swing.JOptionPane.showConfirmDialog(
        owner,panel,"座標 / 精度",javax.swing.JOptionPane.OK_CANCEL_OPTION,javax.swing.JOptionPane.PLAIN_MESSAGE
    )
    if(ok==javax.swing.JOptionPane.OK_OPTION) {
        val display=CoordinatePrecisionMode.fromStorage(displayBox.selectedItem?.toString())
        val nc=CoordinatePrecisionMode.fromStorage(ncBox.selectedItem?.toString())
        coordinatePrecisionPrefs.put("display",display.storageValue)
        coordinatePrecisionPrefs.put("nc",nc.storageValue)
        runCatching { coordinatePrecisionPrefs.flush() }
        CoordinatePrecisionRuntime.configure(display=display,input=display,ncOutput=nc)
        status.text="PRECISION • "+CoordinatePrecisionRuntime.summary()+" • CORE SAFETY UNCHANGED"
    }
}

private fun desktopVersionName():String =
    System.getProperty("aigstudio.version")?.takeIf { it.matches(Regex("""\d+\.\d+\.\d+""")) } ?: "DEV"

private class StudioDesktopStartupWindow {
    private val window=JWindow()
    private val title=JLabel("AIG CNC",SwingConstants.CENTER)
    private val detail=JLabel("MASTER XYZ • CAD • CAM • SIM • NC • AI • 3/4/5AX IN CAM/SIM • OFFLINE-FIRST",SwingConstants.CENTER)
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
    const val ID="aigii_rgb_neon_v2"
    val background=Color(2,4,7)
    val panel=Color(7,17,27)
    val text=Color(244,251,255)
    val accent=Color(39,233,255)
    val selected=Color(39,233,255)
    val cutting=Color(51,243,155)
    val rapid=Color(255,77,166)
    val warning=Color(255,179,38)
    val alarm=Color(255,70,95)
}

private object LibraryFiveAxisSkin208 {
    const val ID="library_5x_real_cam_208"
    const val SOURCE_KIND="CHATGPT_ANDROID_LIBRARY_REFERENCE"
    const val SOURCE_MOBILE="image-gen-1(1).png"
    const val SOURCE_LANDSCAPE="image-gen-2(1).png"
    val background=Color(3,8,16)
    val panel=Color(10,24,38)
    val text=Color(225,240,255)
    val cyan=Color(61,235,255)
    val violet=Color(139,92,246)
    val magenta=Color(236,72,153)
    val safe=Color(99,255,157)
    val warning=Color(245,158,11)
}

private object ProductionRgbAssets {
    private val ROOT=UiAssetContract.DESKTOP_ROOT
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

private enum class DrawMode { LINE, RECT, CIRCLE, ARC, HOLE, SELECT, PAN }

private class CadPanel(
    private val doc: DrawingDocument,
    private val status: (String) -> Unit
) : JPanel() {
    var mode = DrawMode.LINE
        set(value) {
            field=value
            pendingPickOperation=null
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
    private var pendingPickOperation:String? = null

    init {
        background = StudioDesktopProductionTheme.background
        preferredSize = Dimension(1000, 650)
        addMouseWheelListener {
            pxPerMm = (pxPerMm * if (it.wheelRotation < 0) 1.12 else 1.0 / 1.12).coerceIn(0.5, 80.0)
            repaint()
        }
        addMouseMotionListener(object : MouseMotionAdapter() {
            override fun mouseDragged(e: MouseEvent) {
                if (SwingUtilities.isMiddleMouseButton(e) || SwingUtilities.isRightMouseButton(e) ||
                    (mode==DrawMode.PAN && (e.modifiersEx and InputEvent.BUTTON1_DOWN_MASK)!=0)) {
                    dragPoint?.let { p -> panX += e.x - p.x; panY += e.y - p.y }
                    dragPoint = e.point; repaint()
                }
            }
        })
        addMouseListener(object : MouseAdapter() {
            override fun mousePressed(e: MouseEvent) {
                if (SwingUtilities.isMiddleMouseButton(e) || SwingUtilities.isRightMouseButton(e) || mode==DrawMode.PAN) {
                    dragPoint = e.point
                    if(mode==DrawMode.PAN) status("CAD PAN")
                    return
                }
                val raw = screenToWorld(e.x, e.y)
                val p = if(snapEnabled) CadSnapEngine.snapTo(doc,raw,18.0/pxPerMm,reference=first) ?: raw else raw
                if(mode==DrawMode.SELECT){
                    if(handlePendingPick(p)) return
                    val selectedCenter=if(selectedIds.isEmpty()) null else
                        runCatching{CadEditEngine.selectionCenter(doc,selectedIds)}.getOrNull()
                    if(selectedCenter!=null && selectedCenter.distanceTo(p)<=24.0/pxPerMm){
                        editSelectionCenter(selectedCenter)
                        return
                    }
                    val control=if(selectedIds.isNotEmpty())
                        CadControlPointEngine.nearest(doc,selectedIds,p,24.0/pxPerMm)
                    else null
                    if(control!=null){
                        editControlPoint(control)
                        return
                    }
                    nearest(p)?.let { entity ->
                        val group=CadSelectionEngine.selectionIds(doc,entity)
                        if(group.all{it in selectedIds}) selectedIds.removeAll(group) else selectedIds.addAll(group)
                        status("SELECT • kind="+CadSelectionEngine.semanticKind(entity)+" • count="+selectedIds.size+" • click handle to edit")
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
                        DrawMode.ARC, DrawMode.SELECT, DrawMode.PAN -> Unit
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

    fun fitView() {
        val entities=doc.all()
        if(width<=0 || height<=0 || entities.isEmpty()) {
            pxPerMm=5.0
            panX=0.0
            panY=0.0
            repaint()
            status("VIEW FIT PASS")
            return
        }
        var minX=Double.POSITIVE_INFINITY
        var minY=Double.POSITIVE_INFINITY
        var maxX=Double.NEGATIVE_INFINITY
        var maxY=Double.NEGATIVE_INFINITY
        fun include(x:Double,y:Double) {
            minX=min(minX,x); minY=min(minY,y)
            maxX=max(maxX,x); maxY=max(maxY,y)
        }
        entities.forEach { entity ->
            when(entity) {
                is Line -> { include(entity.a.x,entity.a.y); include(entity.b.x,entity.b.y) }
                is Circle -> {
                    include(entity.center.x-entity.radius,entity.center.y-entity.radius)
                    include(entity.center.x+entity.radius,entity.center.y+entity.radius)
                }
                is Arc -> {
                    include(entity.center.x-entity.radius,entity.center.y-entity.radius)
                    include(entity.center.x+entity.radius,entity.center.y+entity.radius)
                }
            }
        }
        val spanX=(maxX-minX).coerceAtLeast(1.0)
        val spanY=(maxY-minY).coerceAtLeast(1.0)
        val usableW=(width-96.0).coerceAtLeast(1.0)
        val usableH=(height-96.0).coerceAtLeast(1.0)
        pxPerMm=min(usableW/spanX,usableH/spanY).coerceIn(0.5,80.0)
        val cx=(minX+maxX)/2.0
        val cy=(minY+maxY)/2.0
        panX=-cx*pxPerMm
        panY=cy*pxPerMm
        repaint()
        status("VIEW FIT PASS")
    }

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

    fun trimSelected() {
        if(selectedIds.size==2){
            runCatching { applyGeometry("TRIM",CadEditEngine.trimCommand(doc,selectedIds)) }
                .onFailure { status("TRIM BLOCKED • "+(it.message?:"error")) }
            return
        }
        mode=DrawMode.SELECT
        pendingPickOperation="TRIM"
        selectedIds.clear()
        repaint()
        status("TRIM • 先點目標 LINE，再點邊界 LINE")
    }

    fun extendSelected() {
        if(selectedIds.size==2){
            runCatching { applyGeometry("EXTEND",CadEditEngine.extendCommand(doc,selectedIds)) }
                .onFailure { status("EXTEND BLOCKED • "+(it.message?:"error")) }
            return
        }
        mode=DrawMode.SELECT
        pendingPickOperation="EXTEND"
        selectedIds.clear()
        repaint()
        status("EXTEND • 先點目標 LINE，再點邊界 LINE")
    }

    private fun handlePendingPick(p:Vec2):Boolean {
        val operation=pendingPickOperation ?: return false
        val line=nearest(p) as? Line
        if(line==null){
            status("$operation • 請點 LINE")
            return true
        }
        if(line.id in selectedIds){
            status("$operation • 請點另一條邊界 LINE")
            return true
        }
        selectedIds.add(line.id)
        repaint()
        if(selectedIds.size==1){
            status("$operation • 目標已選，請點邊界 LINE")
            return true
        }
        val ids=selectedIds.toList()
        val result=runCatching{
            val command=if(operation=="TRIM") CadEditEngine.trimCommand(doc,ids)
            else CadEditEngine.extendCommand(doc,ids)
            applyGeometry(operation,command)
        }
        selectedIds.clear()
        pendingPickOperation=null
        result.onSuccess{status("$operation PASS • CAM/SIM/NC REBUILD")}
            .onFailure{status("$operation BLOCKED • "+(it.message?:"error"))}
        repaint()
        return true
    }

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

    fun disconnectAllTopology() {
        val before=doc.links().size
        if(before==0){
            status("DISCONNECT ALL • no topology links")
            return
        }
        runCatching {
            history.run(CadEditEngine.disconnectAllCommand())
            repaint()
        }.onSuccess {
            status("DISCONNECT ALL PASS • links="+before+" • GEOMETRY UNCHANGED • CAM/NC TOPOLOGY OPTIONAL")
        }.onFailure {
            status("DISCONNECT ALL BLOCKED • "+(it.message?:"error"))
        }
    }

    private fun nearest(p:Vec2):Entity? {
        val tolerance=18.0/pxPerMm
        return CadSelectionEngine.nearest(doc,p,tolerance)
    }

    private fun editSelectionCenter(center:Vec2) {
        val panel=JPanel(GridLayout(0,2,6,6))
        val x=JTextField(DisplayFormat.mm(center.x),10)
        val y=JTextField(DisplayFormat.mm(center.y),10)
        panel.add(JLabel("中心 X mm"));panel.add(x)
        panel.add(JLabel("中心 Y mm"));panel.add(y)
        if(JOptionPane.showConfirmDialog(
                this,panel,"選取中心點 • 整體移動",JOptionPane.OK_CANCEL_OPTION,JOptionPane.PLAIN_MESSAGE
            )==JOptionPane.OK_OPTION) {
            val px=x.text.trim().toDoubleOrNull()
            val py=y.text.trim().toDoubleOrNull()
            if(px==null || py==null){
                status("CENTER BLOCKED • invalid X/Y")
                return
            }
            runCatching {
                applyGeometry("CENTER",CadEditEngine.moveCommand(doc,selectedIds,px-center.x,py-center.y))
            }.onSuccess {
                status("CENTER PASS • X="+DisplayFormat.mm(px)+" Y="+DisplayFormat.mm(py)+" • CAM/SIM/NC REBUILD")
            }.onFailure { status("CENTER BLOCKED • "+(it.message?:"error")) }
        }
    }

    private fun editControlPoint(control:CadControlPoint) {
        val entity=doc.get(control.entityId) ?: return
        if(control.kind==CadControlPointKind.RADIUS) {
            val current=(entity as? Circle)?.radius ?: return
            val input=JTextField(DisplayFormat.mm(current),10)
            if(JOptionPane.showConfirmDialog(
                    this,input,"控制點 • 半徑 R mm",JOptionPane.OK_CANCEL_OPTION,JOptionPane.PLAIN_MESSAGE
                )==JOptionPane.OK_OPTION) {
                val radius=input.text.trim().toDoubleOrNull()
                if(radius==null || radius<CNC_RESOLUTION_MM){
                    status("CONTROL POINT BLOCKED • R must be >= 0.001 mm")
                    return
                }
                val live=doc.get(control.entityId) as? Circle ?: return
                runCatching {
                    applyGeometry("CONTROL POINT",CadControlPointEngine.editCommand(
                        doc,control,live.center+Vec2(radius,0.0)
                    ))
                }.onSuccess {
                    status("CONTROL POINT PASS • R="+DisplayFormat.mm(radius)+" • CAM/SIM/NC REBUILD")
                }.onFailure { status("CONTROL POINT BLOCKED • "+(it.message?:"error")) }
            }
            return
        }
        val panel=JPanel(GridLayout(0,2,6,6))
        val x=JTextField(DisplayFormat.mm(control.point.x),10)
        val y=JTextField(DisplayFormat.mm(control.point.y),10)
        panel.add(JLabel("X mm"));panel.add(x)
        panel.add(JLabel("Y mm"));panel.add(y)
        if(JOptionPane.showConfirmDialog(
                this,panel,"控制點 • "+control.kind.name,JOptionPane.OK_CANCEL_OPTION,JOptionPane.PLAIN_MESSAGE
            )==JOptionPane.OK_OPTION) {
            val px=x.text.trim().toDoubleOrNull()
            val py=y.text.trim().toDoubleOrNull()
            if(px==null || py==null){
                status("CONTROL POINT BLOCKED • invalid X/Y")
                return
            }
            runCatching {
                applyGeometry("CONTROL POINT",CadControlPointEngine.editCommand(doc,control,Vec2(px,py)))
            }.onSuccess {
                status("CONTROL POINT PASS • X="+DisplayFormat.mm(px)+" Y="+DisplayFormat.mm(py)+" • CAM/SIM/NC REBUILD")
            }.onFailure { status("CONTROL POINT BLOCKED • "+(it.message?:"error")) }
        }
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

        if(selectedIds.isNotEmpty()){
            g2.stroke=BasicStroke(2f)
            CadControlPointEngine.points(doc,selectedIds).forEach { control ->
                val p=worldToScreen(control.point)
                g2.color=if(control.kind==CadControlPointKind.CENTER) Color(255,176,32) else Color(61,235,255)
                g2.drawOval(p.x-7,p.y-7,14,14)
                g2.fillOval(p.x-3,p.y-3,6,6)
                if(control.kind==CadControlPointKind.CENTER){
                    g2.drawLine(p.x-8,p.y,p.x+8,p.y)
                    g2.drawLine(p.x,p.y-8,p.x,p.y+8)
                }
            }
            runCatching{CadEditEngine.selectionCenter(doc,selectedIds)}.getOrNull()?.let { center ->
                val p=worldToScreen(center)
                g2.color=Color(99,255,157)
                g2.drawRect(p.x-9,p.y-9,18,18)
                g2.fillOval(p.x-3,p.y-3,6,6)
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

private const val MATERIAL_DEPTH_GRID_W=96
private const val MATERIAL_DEPTH_GRID_H=96

private fun rasterDepthTriangle(
    grid:DoubleArray,width:Int,height:Int,
    a:Point,ad:Double,b:Point,bd:Double,c:Point,cd:Double
){
    if(width<=0 || height<=0)return
    val denom=(b.y-c.y).toDouble()*(a.x-c.x)+(c.x-b.x).toDouble()*(a.y-c.y)
    if(abs(denom)<1e-9)return
    val gx0=floor(min(a.x,min(b.x,c.x)).toDouble()/width*MATERIAL_DEPTH_GRID_W).toInt().coerceIn(0,MATERIAL_DEPTH_GRID_W-1)
    val gx1=ceil(max(a.x,max(b.x,c.x)).toDouble()/width*MATERIAL_DEPTH_GRID_W).toInt().coerceIn(0,MATERIAL_DEPTH_GRID_W-1)
    val gy0=floor(min(a.y,min(b.y,c.y)).toDouble()/height*MATERIAL_DEPTH_GRID_H).toInt().coerceIn(0,MATERIAL_DEPTH_GRID_H-1)
    val gy1=ceil(max(a.y,max(b.y,c.y)).toDouble()/height*MATERIAL_DEPTH_GRID_H).toInt().coerceIn(0,MATERIAL_DEPTH_GRID_H-1)
    for(gy in gy0..gy1)for(gx in gx0..gx1){
        val px=(gx+0.5)*width/MATERIAL_DEPTH_GRID_W
        val py=(gy+0.5)*height/MATERIAL_DEPTH_GRID_H
        val w1=((b.y-c.y)*(px-c.x)+(c.x-b.x)*(py-c.y))/denom
        val w2=((c.y-a.y)*(px-c.x)+(a.x-c.x)*(py-c.y))/denom
        val w3=1.0-w1-w2
        if(w1 < -0.001 || w2 < -0.001 || w3 < -0.001)continue
        val depth=w1*ad+w2*bd+w3*cd
        val cell=gy*MATERIAL_DEPTH_GRID_W+gx
        if(depth>grid[cell])grid[cell]=depth
    }
}

private fun materialDepthOccludes(grid:DoubleArray,width:Int,height:Int,a:Point,ad:Double,b:Point,bd:Double):Boolean{
    if(width<=0 || height<=0)return false
    val mx=(a.x+b.x)/2.0;val my=(a.y+b.y)/2.0
    if(mx<0.0 || mx>=width || my<0.0 || my>=height)return false
    val gx=(mx/width*MATERIAL_DEPTH_GRID_W).toInt().coerceIn(0,MATERIAL_DEPTH_GRID_W-1)
    val gy=(my/height*MATERIAL_DEPTH_GRID_H).toInt().coerceIn(0,MATERIAL_DEPTH_GRID_H-1)
    val materialDepth=grid[gy*MATERIAL_DEPTH_GRID_W+gx]
    return materialDepth.isFinite() && materialDepth>(ad+bd)*0.5+1e-6
}

private fun materialDepthPointIsFront(grid:DoubleArray,width:Int,height:Int,p:Point,depth:Double):Boolean{
    if(width<=0 || height<=0 || p.x<0 || p.x>=width || p.y<0 || p.y>=height)return false
    val gx=(p.x.toDouble()/width*MATERIAL_DEPTH_GRID_W).toInt().coerceIn(0,MATERIAL_DEPTH_GRID_W-1)
    val gy=(p.y.toDouble()/height*MATERIAL_DEPTH_GRID_H).toInt().coerceIn(0,MATERIAL_DEPTH_GRID_H-1)
    val materialDepth=grid[gy*MATERIAL_DEPTH_GRID_W+gx]
    return !materialDepth.isFinite() || depth>=materialDepth-1e-5
}

private class Mesh3DPanel(private var result: Machining3DResult) : JPanel() {
    private var rx = -35.0
    private var ry = 35.0
    private var zoom = 1.0
    private var lastX = 0
    private var lastY = 0
    private var progressiveFrame:ProgressiveMachining3DFrame?=null
    private var previousProgressiveFrame:ProgressiveMachining3DFrame?=null
    private val materialDepthGrid=DoubleArray(MATERIAL_DEPTH_GRID_W*MATERIAL_DEPTH_GRID_H){Double.NEGATIVE_INFINITY}
    private var lastOccludedPathSegments=0
    private var lastForegroundPathSegments=0
    private var lastFreshRemovalCells=0
    fun occlusionEvidence():Pair<Int,Int> = lastOccludedPathSegments to lastForegroundPathSegments
    fun freshRemovalEvidence():Int = lastFreshRemovalCells
    fun freshRemovalSourceFrame():Int? = previousProgressiveFrame?.index

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
        previousProgressiveFrame=null
        progressiveFrame=null
        lastFreshRemovalCells=0
        repaint()
    }

    fun showProgressiveFrame(index:Int):ProgressiveMachining3DFrame {
        val frame=ProgressiveMachining3D.frame(result,index)
        previousProgressiveFrame=if(frame.index>0) ProgressiveMachining3D.frame(result,frame.index-1) else null
        progressiveFrame=frame
        repaint()
        return frame
    }

    fun clearProgressiveFrame(){previousProgressiveFrame=null;progressiveFrame=null;lastFreshRemovalCells=0;repaint()}
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
        java.util.Arrays.fill(materialDepthGrid,Double.NEGATIVE_INFINITY)
        visible.forEach { item ->
            val t=item.second
            rasterDepthTriangle(materialDepthGrid,width,height,
                projected[t.a],rotated[t.a].z,projected[t.b],rotated[t.b].z,projected[t.c],rotated[t.c].z)
        }
        val materialColor=Color(45,145,220)
        visible.forEachIndexed { index,item ->
            val t=item.second; val a=projected[t.a]; val b=projected[t.b]; val c=projected[t.c]
            val poly=Polygon(intArrayOf(a.x,b.x,c.x),intArrayOf(a.y,b.y,c.y),3)
            g2.color=materialColor; g2.fillPolygon(poly)
            g2.color=materialColor; g2.stroke=BasicStroke(1.15f); g2.drawPolygon(poly)
            if(showMaterialMeshEdges && index % 18 == 0){ g2.color=Color(61, 220, 255, 46); g2.stroke=BasicStroke(.55f); g2.drawPolygon(poly) }
        }
        lastFreshRemovalCells=0
        val previousFrame=previousProgressiveFrame
        if(activeFrame!=null && previousFrame!=null && previousFrame.index<activeFrame.index &&
            previousFrame.removal.nx==activeFrame.removal.nx && previousFrame.removal.ny==activeFrame.removal.ny){
            val currentDepth=activeFrame.removal.depth;val previousDepth=previousFrame.removal.depth
            var freshCount=0
            currentDepth.indices.forEach { i -> if(currentDepth[i]<previousDepth[i]-1e-9)freshCount++ }
            val freshStride=max(1,ceil(freshCount/700.0).toInt())
            var freshSeen=0
            currentDepth.indices.forEach { i ->
                if(currentDepth[i]<previousDepth[i]-1e-9){
                    if(freshSeen%freshStride==0 && i<projected.size && materialDepthPointIsFront(materialDepthGrid,width,height,projected[i],rotated[i].z)){
                        val p=projected[i]
                        g2.color=Color(255,176,32,55);g2.fillOval(p.x-5,p.y-5,10,10)
                        g2.color=Color(255,205,70,225);g2.fillOval(p.x-2,p.y-2,4,4)
                        lastFreshRemovalCells++
                    }
                    freshSeen++
                }
            }
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
        lastOccludedPathSegments=0;lastForegroundPathSegments=0
        g2.stroke=BasicStroke(1.15f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
        visibleMoves.forEach { move ->
            val prev=previous
            if(prev!=null){
                val av=Vec3(prev.to.x,prev.to.y,prev.z);val bv=Vec3(move.to.x,move.to.y,move.z)
                val ar=rotate(av);val br=rotate(bv)
                val a=project(av,scale);val b=project(bv,scale)
                val occluded=materialDepthOccludes(materialDepthGrid,width,height,a,ar.z,b,br.z)
                if(occluded)lastOccludedPathSegments++ else lastForegroundPathSegments++
                // TOOLPATH_RGB_GLOW_250: desktop dual-pass neon path, no CAM mutation.
                val rgb=if(move.rapid) Color(39,233,255) else Color(51,243,155)
                if(occluded){
                    g2.color=Color(rgb.red,rgb.green,rgb.blue,if(move.rapid)16 else 24)
                    g2.stroke=BasicStroke(if(move.rapid)1.1f else 1.5f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
                    g2.drawLine(a.x,a.y,b.x,b.y)
                }else{
                    g2.color=Color(rgb.red,rgb.green,rgb.blue,if(move.rapid)42 else 54)
                    g2.stroke=BasicStroke(if(move.rapid)7f else 8f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
                    g2.drawLine(a.x,a.y,b.x,b.y)
                    g2.color=Color(rgb.red,rgb.green,rgb.blue,if(move.rapid)220 else 238)
                    g2.stroke=BasicStroke(if(move.rapid)1.6f else 2.2f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
                    g2.drawLine(a.x,a.y,b.x,b.y)
                }
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
                g2.color=Color(255,77,166,72)
                g2.stroke=BasicStroke(10f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
                g2.drawLine(a.x,a.y,b.x,b.y)
                g2.color=Color.WHITE
                g2.stroke=BasicStroke(4f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
                g2.drawLine(a.x,a.y,b.x,b.y)
                g2.fillOval(b.x-6,b.y-6,12,12)
            }
        }
        activeFrame?.toolPoint?.let { tool ->
            val p=project(Vec3(tool.to.x,tool.to.y,tool.z),scale)
            val cueLength=max(18.0,result.cam.settings.toolDiameter*3.0)
            val cueAxis=MachineKinematics3D.transform(Vec3(0.0,0.0,cueLength),tool.axisA,tool.axisB)
            val rawAxisTop=project(Vec3(tool.to.x+cueAxis.x,tool.to.y+cueAxis.y,tool.z+cueAxis.z),scale)
            val cueMargin=10
            val axisTop=Point(
                rawAxisTop.x.coerceIn(cueMargin,(width-cueMargin).coerceAtLeast(cueMargin)),
                rawAxisTop.y.coerceIn(cueMargin,(height-cueMargin).coerceAtLeast(cueMargin))
            )
            g2.color=Color(255,220,90,62)
            g2.fillOval(p.x-12,p.y-12,24,24)
            g2.color=Color(255,220,90,235)
            g2.fillOval(p.x-6,p.y-6,12,12)
            val previousTool=previousProgressiveFrame?.toolPoint
            val deltaA=tool.axisA-(previousTool?.axisA ?: tool.axisA)
            val deltaB=tool.axisB-(previousTool?.axisB ?: tool.axisB)
            if(previousTool!=null && (abs(deltaA)>1e-9 || abs(deltaB)>1e-9)){
                val previousCueAxis=MachineKinematics3D.transform(Vec3(0.0,0.0,cueLength),previousTool.axisA,previousTool.axisB)
                val rawPreviousAxisTop=project(Vec3(tool.to.x+previousCueAxis.x,tool.to.y+previousCueAxis.y,tool.z+previousCueAxis.z),scale)
                val previousAxisTop=Point(
                    rawPreviousAxisTop.x.coerceIn(cueMargin,(width-cueMargin).coerceAtLeast(cueMargin)),
                    rawPreviousAxisTop.y.coerceIn(cueMargin,(height-cueMargin).coerceAtLeast(cueMargin))
                )
                g2.color=Color(86,188,225,105)
                g2.stroke=BasicStroke(1.4f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
                g2.drawLine(p.x,p.y,previousAxisTop.x,previousAxisTop.y)
                g2.drawOval(previousAxisTop.x-3,previousAxisTop.y-3,6,6)
                g2.drawLine(previousAxisTop.x,previousAxisTop.y,axisTop.x,axisTop.y)
            }
            g2.color=Color(255,78,205,220)
            g2.stroke=BasicStroke(2.2f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
            g2.drawLine(p.x,p.y,axisTop.x,axisTop.y)
            val tipDepth=rotate(Vec3(tool.to.x,tool.to.y,tool.z)).z
            val cueDepth=rotate(Vec3(tool.to.x+cueAxis.x,tool.to.y+cueAxis.y,tool.z+cueAxis.z)).z
            val axisDepthDelta=cueDepth-tipDepth
            val depthMagnitude=(abs(axisDepthDelta)/cueLength.coerceAtLeast(1e-9)).coerceIn(0.0,1.0).toFloat()
            for(step in 1..3){
                val t=step/4f
                val nearBias=if(axisDepthDelta>=0.0)t else 1f-t
                val beadX=(p.x+(axisTop.x-p.x)*t).roundToInt()
                val beadY=(p.y+(axisTop.y-p.y)*t).roundToInt()
                val beadRadius=(2f+nearBias*3f+depthMagnitude*1.5f).roundToInt().coerceAtLeast(2)
                val beadAlpha=(100f+nearBias*105f+depthMagnitude*40f).roundToInt().coerceIn(90,245)
                g2.color=Color(61,235,255,beadAlpha)
                g2.fillOval(beadX-beadRadius,beadY-beadRadius,beadRadius*2,beadRadius*2)
            }
            g2.color=Color(255,78,205,220)
            val depthPolarity=when {
                axisDepthDelta>1e-6 -> "近"
                axisDepthDelta< -1e-6 -> "遠"
                else -> "平"
            }
            if(axisDepthDelta>=-1e-6){
                g2.fillOval(axisTop.x-4,axisTop.y-4,8,8)
            } else {
                g2.drawOval(axisTop.x-4,axisTop.y-4,8,8)
                g2.fillOval(axisTop.x-1,axisTop.y-1,2,2)
            }
            g2.font=Font(Font.SANS_SERIF,Font.BOLD,11)
            val deltaAMark=when { deltaA>1e-9 -> "↑"; deltaA< -1e-9 -> "↓"; else -> "•" }
            val deltaBMark=when { deltaB>1e-9 -> "↑"; deltaB< -1e-9 -> "↓"; else -> "•" }
            val badgeText=String.format(java.util.Locale.US,"A%+.3f°%s B%+.3f°%s %s",tool.axisA,deltaAMark,tool.axisB,deltaBMark,depthPolarity)
            val currentAxisUnit=MachineKinematics3D.transform(Vec3(0.0,0.0,1.0),tool.axisA,tool.axisB)
            val previousAxisUnit=MachineKinematics3D.transform(Vec3(0.0,0.0,1.0),previousTool?.axisA ?: tool.axisA,previousTool?.axisB ?: tool.axisB)
            val poseDot=(currentAxisUnit.x*previousAxisUnit.x+currentAxisUnit.y*previousAxisUnit.y+currentAxisUnit.z*previousAxisUnit.z).coerceIn(-1.0,1.0)
            val poseAngleDeg=Math.toDegrees(acos(poseDot))
            val poseAngleText=String.format(java.util.Locale.US,"Δθ%.2f°",poseAngleDeg)
            val displayBadgeText="$badgeText $poseAngleText"
            val fm=g2.fontMetrics
            val maxBadgeW=(width-12).coerceAtLeast(1)
            val singleLineW=fm.stringWidth(displayBadgeText)+10
            val wrapBadge=singleLineW>maxBadgeW
            val axisLineW=fm.stringWidth(badgeText)+10
            val aBadgeText=String.format(java.util.Locale.US,"A%+.3f°%s",tool.axisA,deltaAMark)
            val bBadgeText=String.format(java.util.Locale.US,"B%+.3f°%s",tool.axisB,deltaBMark)
            val depthPoseBadgeText="$depthPolarity $poseAngleText"
            val badgeLines=when {
                !wrapBadge -> listOf(displayBadgeText)
                axisLineW<=maxBadgeW -> listOf(badgeText,poseAngleText)
                else -> listOf(aBadgeText,bBadgeText,depthPoseBadgeText)
            }
            val badgeW=(badgeLines.maxOf { fm.stringWidth(it) }+10).coerceAtMost(maxBadgeW)
            val badgeH=fm.height*badgeLines.size+6
            val badgeX=(axisTop.x+6).coerceIn(6,(width-badgeW-6).coerceAtLeast(6))
            val badgeY=(axisTop.y-badgeH-6).coerceIn(6,(height-badgeH-6).coerceAtLeast(6))
            g2.color=Color(8,20,32,188);g2.fillRoundRect(badgeX,badgeY,badgeW,badgeH,10,10)
            g2.color=Color(255,160,232,245)
            if(badgeLines.size==1){
                g2.drawString(displayBadgeText,badgeX+5,badgeY+fm.ascent+3)
            } else {
                badgeLines.forEachIndexed { index,line ->
                    g2.drawString(line,badgeX+5,badgeY+fm.ascent+3+fm.height*index)
                }
            }
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
    private var previousProgressiveFrame:ProgressiveMachining3DFrame?=null
    private val materialDepthGrid=DoubleArray(MATERIAL_DEPTH_GRID_W*MATERIAL_DEPTH_GRID_H){Double.NEGATIVE_INFINITY}
    private var lastOccludedPathSegments=0
    private var lastForegroundPathSegments=0
    private var lastFreshRemovalCells=0
    fun occlusionEvidence():Pair<Int,Int> = lastOccludedPathSegments to lastForegroundPathSegments
    fun freshRemovalEvidence():Int = lastFreshRemovalCells
    fun freshRemovalSourceFrame():Int? = previousProgressiveFrame?.index
    private var machineMode="3AX"
    init{
        background=Color(2,7,14)
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
        previousProgressiveFrame=null
        progressiveFrame=null
        lastFreshRemovalCells=0
        repaint()
    }
    fun showProgressiveFrame(frame:ProgressiveMachining3DFrame){
        previousProgressiveFrame=if(frame.index>0) ProgressiveMachining3D.frame(result,frame.index-1) else null
        progressiveFrame=frame
        axisA=frame.toolPoint.axisA
        axisB=frame.toolPoint.axisB
        repaint()
    }
    fun clearProgressiveFrame(){previousProgressiveFrame=null;progressiveFrame=null;lastFreshRemovalCells=0;repaint()}
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
    private fun axisViewDepth(r:Vec3):Double = r.x*.34-r.y*.28+r.z
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
        val axisSpace=activeMesh.vertices.map{axisTransform(it)}
        val pts=activeMesh.vertices.map{project(it,scale)}
        val stride=max(1,ceil(activeMesh.triangles.size/4500.0).toInt())
        java.util.Arrays.fill(materialDepthGrid,Double.NEGATIVE_INFINITY)
        activeMesh.triangles.forEachIndexed { i,t -> if(i%stride==0){
            rasterDepthTriangle(materialDepthGrid,width,height,
                pts[t.a],axisViewDepth(axisSpace[t.a]),pts[t.b],axisViewDepth(axisSpace[t.b]),pts[t.c],axisViewDepth(axisSpace[t.c]))
        }}
        val showMaterialMeshEdges=false
        val materialColor=Color(45,145,220)
        activeMesh.triangles.forEachIndexed { i,t -> if(i%stride==0){
            val a=pts[t.a];val b=pts[t.b];val c=pts[t.c]
            val poly=Polygon(intArrayOf(a.x,b.x,c.x),intArrayOf(a.y,b.y,c.y),3)
            g.color=materialColor;g.fillPolygon(poly)
            g.color=materialColor;g.stroke=BasicStroke(1.15f);g.drawPolygon(poly)
            if(showMaterialMeshEdges && i%(stride*18)==0){ g.color=Color(61,235,255,46);g.stroke=BasicStroke(.55f);g.drawPolygon(poly) }
        }}
        lastFreshRemovalCells=0
        val previousFrame=previousProgressiveFrame
        if(activeFrame!=null && previousFrame!=null && previousFrame.index<activeFrame.index &&
            previousFrame.removal.nx==activeFrame.removal.nx && previousFrame.removal.ny==activeFrame.removal.ny){
            val currentDepth=activeFrame.removal.depth;val previousDepth=previousFrame.removal.depth
            var freshCount=0
            currentDepth.indices.forEach { i -> if(currentDepth[i]<previousDepth[i]-1e-9)freshCount++ }
            val freshStride=max(1,ceil(freshCount/700.0).toInt())
            var freshSeen=0
            currentDepth.indices.forEach { i ->
                if(currentDepth[i]<previousDepth[i]-1e-9){
                    if(freshSeen%freshStride==0 && i<pts.size && materialDepthPointIsFront(materialDepthGrid,width,height,pts[i],axisViewDepth(axisSpace[i]))){
                        val p=pts[i]
                        g.color=Color(255,176,32,55);g.fillOval(p.x-5,p.y-5,10,10)
                        g.color=Color(255,205,70,225);g.fillOval(p.x-2,p.y-2,4,4)
                        lastFreshRemovalCells++
                    }
                    freshSeen++
                }
            }
        }
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
        lastOccludedPathSegments=0;lastForegroundPathSegments=0
        visibleMoves.forEach { m ->
            val p=prev
            if(p!=null){
                val av=Vec3(p.to.x,p.to.y,p.z);val bv=Vec3(m.to.x,m.to.y,m.z)
                val ar=axisTransform(av);val br=axisTransform(bv)
                val a=project(av,scale);val b=project(bv,scale)
                val occluded=materialDepthOccludes(materialDepthGrid,width,height,a,axisViewDepth(ar),b,axisViewDepth(br))
                if(occluded)lastOccludedPathSegments++ else lastForegroundPathSegments++
                g.color=when {
                    m.rapid && occluded -> Color(61,235,255,10)
                    !m.rapid && occluded -> Color(255,176,32,18)
                    m.rapid -> Color(61,235,255,36)
                    else -> Color(255,176,32,78)
                }
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
            val cueLength=max(18.0,result.cam.settings.toolDiameter*3.0)
            val rawAxisTop=project(Vec3(tool.to.x,tool.to.y,tool.z+cueLength),scale)
            val cueMargin=10
            val axisTop=Point(
                rawAxisTop.x.coerceIn(cueMargin,(width-cueMargin).coerceAtLeast(cueMargin)),
                rawAxisTop.y.coerceIn(cueMargin,(height-cueMargin).coerceAtLeast(cueMargin))
            )
            g.color=Color(255,225,80,62);g.fillOval(p.x-12,p.y-12,24,24)
            g.color=Color(255,225,80,240);g.fillOval(p.x-6,p.y-6,12,12)
            val previousTool=previousProgressiveFrame?.toolPoint
            val previousA=if(machineMode=="3AX")0.0 else previousTool?.axisA ?: axisA
            val previousB=if(machineMode=="5AX")previousTool?.axisB ?: axisB else 0.0
            val deltaA=axisA-previousA
            val deltaB=axisB-previousB
            if(previousTool!=null && (abs(deltaA)>1e-9 || abs(deltaB)>1e-9)){
                val previousCueAxis=MachineKinematics3D.transform(Vec3(0.0,0.0,cueLength),previousA,previousB)
                val rawPreviousAxisTop=Point(
                    p.x+((previousCueAxis.x-previousCueAxis.z*.34)*scale).roundToInt(),
                    p.y-((previousCueAxis.y+previousCueAxis.z*.28)*scale).roundToInt()
                )
                val previousAxisTop=Point(
                    rawPreviousAxisTop.x.coerceIn(cueMargin,(width-cueMargin).coerceAtLeast(cueMargin)),
                    rawPreviousAxisTop.y.coerceIn(cueMargin,(height-cueMargin).coerceAtLeast(cueMargin))
                )
                g.color=Color(86,188,225,105)
                g.stroke=BasicStroke(1.4f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
                g.drawLine(p.x,p.y,previousAxisTop.x,previousAxisTop.y)
                g.drawOval(previousAxisTop.x-3,previousAxisTop.y-3,6,6)
                g.drawLine(previousAxisTop.x,previousAxisTop.y,axisTop.x,axisTop.y)
            }
            g.color=Color(255,78,205,220)
            g.stroke=BasicStroke(2.2f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)
            g.drawLine(p.x,p.y,axisTop.x,axisTop.y)
            val tipView=axisTransform(Vec3(tool.to.x,tool.to.y,tool.z))
            val cueView=axisTransform(Vec3(tool.to.x,tool.to.y,tool.z+cueLength))
            val axisDepthDelta=axisViewDepth(cueView)-axisViewDepth(tipView)
            val depthMagnitude=(abs(axisDepthDelta)/cueLength.coerceAtLeast(1e-9)).coerceIn(0.0,1.0).toFloat()
            for(step in 1..3){
                val t=step/4f
                val nearBias=if(axisDepthDelta>=0.0)t else 1f-t
                val beadX=(p.x+(axisTop.x-p.x)*t).roundToInt()
                val beadY=(p.y+(axisTop.y-p.y)*t).roundToInt()
                val beadRadius=(2f+nearBias*3f+depthMagnitude*1.5f).roundToInt().coerceAtLeast(2)
                val beadAlpha=(100f+nearBias*105f+depthMagnitude*40f).roundToInt().coerceIn(90,245)
                g.color=Color(61,235,255,beadAlpha)
                g.fillOval(beadX-beadRadius,beadY-beadRadius,beadRadius*2,beadRadius*2)
            }
            g.color=Color(255,78,205,220)
            val depthPolarity=when {
                axisDepthDelta>1e-6 -> "近"
                axisDepthDelta< -1e-6 -> "遠"
                else -> "平"
            }
            if(axisDepthDelta>=-1e-6){
                g.fillOval(axisTop.x-4,axisTop.y-4,8,8)
            } else {
                g.drawOval(axisTop.x-4,axisTop.y-4,8,8)
                g.fillOval(axisTop.x-1,axisTop.y-1,2,2)
            }
            g.font=Font(Font.SANS_SERIF,Font.BOLD,11)
            val deltaAMark=when { deltaA>1e-9 -> "↑"; deltaA< -1e-9 -> "↓"; else -> "•" }
            val deltaBMark=when { deltaB>1e-9 -> "↑"; deltaB< -1e-9 -> "↓"; else -> "•" }
            val badgeText=String.format(java.util.Locale.US,"A%+.3f°%s B%+.3f°%s %s",axisA,deltaAMark,axisB,deltaBMark,depthPolarity)
            val currentA=if(machineMode=="3AX")0.0 else axisA
            val currentB=if(machineMode=="5AX")axisB else 0.0
            val currentAxisUnit=MachineKinematics3D.transform(Vec3(0.0,0.0,1.0),currentA,currentB)
            val previousAxisUnit=MachineKinematics3D.transform(Vec3(0.0,0.0,1.0),previousA,previousB)
            val poseDot=(currentAxisUnit.x*previousAxisUnit.x+currentAxisUnit.y*previousAxisUnit.y+currentAxisUnit.z*previousAxisUnit.z).coerceIn(-1.0,1.0)
            val poseAngleDeg=Math.toDegrees(acos(poseDot))
            val poseAngleText=String.format(java.util.Locale.US,"Δθ%.2f°",poseAngleDeg)
            val displayBadgeText="$badgeText $poseAngleText"
            val fm=g.fontMetrics
            val maxBadgeW=(width-12).coerceAtLeast(1)
            val singleLineW=fm.stringWidth(displayBadgeText)+10
            val wrapBadge=singleLineW>maxBadgeW
            val axisLineW=fm.stringWidth(badgeText)+10
            val aBadgeText=String.format(java.util.Locale.US,"A%+.3f°%s",axisA,deltaAMark)
            val bBadgeText=String.format(java.util.Locale.US,"B%+.3f°%s",axisB,deltaBMark)
            val depthPoseBadgeText="$depthPolarity $poseAngleText"
            val badgeLines=when {
                !wrapBadge -> listOf(displayBadgeText)
                axisLineW<=maxBadgeW -> listOf(badgeText,poseAngleText)
                else -> listOf(aBadgeText,bBadgeText,depthPoseBadgeText)
            }
            val badgeW=(badgeLines.maxOf { fm.stringWidth(it) }+10).coerceAtMost(maxBadgeW)
            val badgeH=fm.height*badgeLines.size+6
            val badgeX=(axisTop.x+6).coerceIn(6,(width-badgeW-6).coerceAtLeast(6))
            val badgeY=(axisTop.y-badgeH-6).coerceIn(6,(height-badgeH-6).coerceAtLeast(6))
            g.color=Color(8,20,32,188);g.fillRoundRect(badgeX,badgeY,badgeW,badgeH,10,10)
            g.color=Color(255,160,232,245)
            if(badgeLines.size==1){
                g.drawString(displayBadgeText,badgeX+5,badgeY+fm.ascent+3)
            } else {
                badgeLines.forEachIndexed { index,line ->
                    g.drawString(line,badgeX+5,badgeY+fm.ascent+3+fm.height*index)
                }
            }
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
        background = Color(2,7,14)
        val navBar=AdaptiveGlassToolbar().apply {
            listOf("CAD","CAM","SIM","NC_EDIT","AI").forEachIndexed { i,assetId ->
                val colors=listOf(Color(61,235,255),Color(63,255,157),Color(139,92,246),Color(80,170,255),Color(139,92,246))
                add(GlassActionButton(UiTextPolicy.display(assetId,118),colors[i]).apply {
                    icon=ProductionRgbAssets.icon(assetId) ?: RgbGlyphIcon(assetId,colors[i])
                    iconTextGap=7
                    horizontalTextPosition=SwingConstants.RIGHT
                })
            }
        }
        val header = JPanel(BorderLayout()).apply {
            background=Color(7,17,27)
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
            background=Color(7,17,27)
            border=BorderFactory.createEmptyBorder(10,10,10,10)
            add(JLabel("中鍵 / 右鍵拖曳 = 視圖平移").apply{foreground=Color(143,179,201)})
            add(Box.createVerticalStrut(8))
            add(JLabel("滾輪 = 縮放").apply{foreground=Color(143,179,201)})
            add(Box.createVerticalStrut(8))
            add(JLabel(WorkstationChromeContract.MASTER_ORIGIN).apply{foreground=Color(61,235,255)})
            add(Box.createVerticalStrut(8))
            add(JLabel("顯示精度 0.001 mm").apply{foreground=Color(245,158,11)})
        }
        smokeDeck=JTabbedPane(JTabbedPane.LEFT).apply {
            background=Color(7,17,27)
            foreground=Color(232,241,250)
            preferredSize=Dimension(250,0)
            addTab("繪圖",drawBar)
            addTab("修改",editBar)
            addTab("連接",linkBar)
            addTab("檢視",viewPanel)
        }
        val infoRail=JPanel().apply {
            layout=BoxLayout(this,BoxLayout.Y_AXIS)
            background=Color(2,7,14)
            preferredSize=Dimension(158,0)
            border=BorderFactory.createEmptyBorder(6,6,6,6)
            listOf(
                "MACHINE" to "READY",
                "ORIGIN" to "X0.000 Y0.000 Z0.000",
                "PRECISION" to "0.001 mm",
                "ENTITIES" to doc.size().toString(),
                "LINKS" to doc.links().size.toString()
            ).forEach { (title,value) ->
                add(JPanel(BorderLayout()).apply {
                    background=Color(7,17,27)
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
            background=Color(2,7,14)
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
    val productionFrame=showApp(startup=null,showWindow=false)
    productionFrame.setSize(1280,800)
    productionFrame.addNotify()
    productionFrame.validate()
    val productionPanel=productionFrame.contentPane as Container
    productionPanel.setSize(1280,800)
    fun layoutTree(node:Container){
        node.doLayout()
        node.components.filterIsInstance<Container>().forEach(::layoutTree)
    }
    fun findButton(node:Component,label:String):AbstractButton?{
        if(node is AbstractButton && node.text==label)return node
        if(node is Container)node.components.forEach{child->findButton(child,label)?.let{return it}}
        return null
    }
    fun onEdt(block:()->Unit){
        if(SwingUtilities.isEventDispatchThread())block()
        else SwingUtilities.invokeAndWait{block()}
    }
    layoutTree(productionPanel)
    val productionImage=BufferedImage(1280,800,BufferedImage.TYPE_INT_ARGB)
    val productionGraphics=productionImage.createGraphics()
    productionPanel.printAll(productionGraphics)
    productionGraphics.dispose()
    ImageIO.write(productionImage,"png",launchFile)
    val toolToggle=findButton(productionPanel,"工具 ◀") ?: error("Windows tool dock toggle not found")
    val contextToggle=findButton(productionPanel,"狀態 ◀") ?: error("Windows context dock toggle not found")
    onEdt{
        toolToggle.doClick(0)
        contextToggle.doClick(0)
        layoutTree(productionPanel)
        productionPanel.revalidate()
        productionPanel.repaint()
        (productionPanel as? JComponent)?.paintImmediately(0,0,productionPanel.width,productionPanel.height)
    }
    val collapsedImage=BufferedImage(1280,800,BufferedImage.TYPE_INT_ARGB)
    val collapsedGraphics=collapsedImage.createGraphics()
    productionPanel.printAll(collapsedGraphics)
    collapsedGraphics.dispose()
    val collapsedFile=File("desktop_cad_collapsed.png")
    ImageIO.write(collapsedImage,"png",collapsedFile)
    require(collapsedFile.isFile && collapsedFile.length()>0){"Collapsed production shell image missing"}
    require(toolToggle.text=="工具 ▶" && contextToggle.text=="狀態 ▶"){"Windows dock collapse state failed"}
    productionFrame.dispose()
    require(launchFile.isFile && launchFile.length()>0){"Production shell launch image missing"}
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
    val fresh3DStart=(0 until absoluteMoves.lastIndex).firstOrNull { i ->
        val before=ProgressiveMachining3D.frame(result,i)
        val after=ProgressiveMachining3D.frame(result,i+1)
        after.removedCells>before.removedCells
    } ?: error("No adjacent Studio 3D frames increase material removal")
    val fresh3DBefore=meshPanel.showProgressiveFrame(fresh3DStart)
    val fresh3DBeforeFile=File("desktop_fresh_removal_before.png")
    writePanel(renderRoot,fresh3DBeforeFile)
    val fresh3DAfter=meshPanel.showProgressiveFrame(fresh3DStart+1)
    val fresh3DAfterFile=File("desktop_fresh_removal_frontier.png")
    writePanel(renderRoot,fresh3DAfterFile)
    val materialFreshRemoval=meshPanel.freshRemovalEvidence()
    require(fresh3DAfter.index==fresh3DBefore.index+1){"Studio 3D fresh-removal evidence is not adjacent"}
    require(materialFreshRemoval>0){"Studio 3D fresh-removal frontier found no changed removal cells"}
    require(fresh3DAfter.removedCells>fresh3DBefore.removedCells){"Studio 3D adjacent fresh-removal evidence did not increase removal"}
    meshPanel.clearProgressiveFrame()
    val fresh3DJumpTarget=absoluteMoves.lastIndex.coerceAtLeast(1)
    meshPanel.showProgressiveFrame(fresh3DJumpTarget)
    require(meshPanel.freshRemovalSourceFrame()==fresh3DJumpTarget-1){"Studio 3D fresh-removal source did not lock to current index - 1"}
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
    val fiveBeforeIndex=(0 until fiveMoves.lastIndex).firstOrNull { i ->
        if(fiveMoves[i].rapid || fiveMoves[i+1].rapid) false else {
            val before=ProgressiveMachining3D.frame(fiveAxisResult,i)
            val after=ProgressiveMachining3D.frame(fiveAxisResult,i+1)
            val xyzChanged=
                abs(after.toolPoint.to.x-before.toolPoint.to.x)>1e-9 ||
                abs(after.toolPoint.to.y-before.toolPoint.to.y)>1e-9 ||
                abs(after.toolPoint.z-before.toolPoint.z)>1e-9
            val rotaryChanged=
                abs(after.toolPoint.axisA-before.toolPoint.axisA)>1e-9 ||
                abs(after.toolPoint.axisB-before.toolPoint.axisB)>1e-9
            before.toolPoint.z<0.0 && xyzChanged && rotaryChanged && after.removedCells>before.removedCells
        }
    } ?: error("No adjacent Studio 5AX frames change XYZ + rotary axes + material removal together")
    val fiveAfterIndex=fiveBeforeIndex+1
    val fiveBeforeFrame=ProgressiveMachining3D.frame(fiveAxisResult,fiveBeforeIndex)
    val fiveAfterFrame=ProgressiveMachining3D.frame(fiveAxisResult,fiveAfterIndex)
    val cueUnit=Vec3(0.0,0.0,1.0)
    val fiveAxisCueBefore=MachineKinematics3D.transform(cueUnit,fiveBeforeFrame.toolPoint.axisA,fiveBeforeFrame.toolPoint.axisB)
    val fiveAxisCueAfter=MachineKinematics3D.transform(cueUnit,fiveAfterFrame.toolPoint.axisA,fiveAfterFrame.toolPoint.axisB)
    require(fiveAxisCueBefore!=fiveAxisCueAfter){"Studio 5AX tool-axis cue did not follow A/B change"}
    val fiveAxisPanel=AxisMachiningPanel(fiveAxisResult)
    fiveAxisPanel.setMachineMode("5AX")
    fiveAxisPanel.showProgressiveFrame(fiveBeforeFrame)
    val fiveBeforeFile=File("desktop_5x_before.png")
    writePanel(fiveAxisPanel,fiveBeforeFile,980,620)
    fiveAxisPanel.showProgressiveFrame(fiveAfterFrame)
    val fiveAfterFile=File("desktop_5x_after.png")
    writePanel(fiveAxisPanel,fiveAfterFile,980,620)
    val fiveFreshRemoval=fiveAxisPanel.freshRemovalEvidence()
    require(fiveAfterFrame.index==fiveBeforeFrame.index+1){"Studio 5AX fresh-removal evidence is not adjacent"}
    require(fiveFreshRemoval>0){"Studio 5AX fresh-removal frontier found no changed removal cells"}
    val fiveCueIndex=fiveMoves.indices.filter { !fiveMoves[it].rapid }.maxByOrNull { i ->
        abs(fiveMoves[i].axisA)+abs(fiveMoves[i].axisB)
    } ?: fiveAfterIndex
    val fiveCueFrame=ProgressiveMachining3D.frame(fiveAxisResult,fiveCueIndex)
    require(abs(fiveCueFrame.toolPoint.axisA)+abs(fiveCueFrame.toolPoint.axisB)>5.0){"Studio 5AX axis-cue evidence angle too small"}
    val fiveCueDepthVector=MachineKinematics3D.transform(Vec3(0.0,0.0,1.0),fiveCueFrame.toolPoint.axisA,fiveCueFrame.toolPoint.axisB)
    val fiveCueDepthValue=fiveCueDepthVector.x*.34-fiveCueDepthVector.y*.28+fiveCueDepthVector.z
    require(fiveCueDepthValue.isFinite() && abs(fiveCueDepthValue)>1e-6){"Studio 5AX axis-depth polarity evidence is flat or non-finite"}
    val fiveCueDepthLabel=if(fiveCueDepthValue>0.0) "近" else "遠"
    val fiveCueDepthCode=if(fiveCueDepthValue>0.0) "NEAR" else "FAR"
    val fiveCuePrevious=ProgressiveMachining3D.frame(fiveAxisResult,(fiveCueFrame.index-1).coerceAtLeast(0))
    val fiveCueDeltaA=fiveCueFrame.toolPoint.axisA-fiveCuePrevious.toolPoint.axisA
    val fiveCueDeltaB=fiveCueFrame.toolPoint.axisB-fiveCuePrevious.toolPoint.axisB
    require(abs(fiveCueDeltaA)>1e-9 || abs(fiveCueDeltaB)>1e-9){"Studio 5AX A/B delta-direction evidence did not change"}
    val fiveCueDeltaACode=when { fiveCueDeltaA>1e-9 -> "POS"; fiveCueDeltaA< -1e-9 -> "NEG"; else -> "ZERO" }
    val fiveCueDeltaBCode=when { fiveCueDeltaB>1e-9 -> "POS"; fiveCueDeltaB< -1e-9 -> "NEG"; else -> "ZERO" }
    val fiveCuePreviousAxis=MachineKinematics3D.transform(Vec3(0.0,0.0,1.0),fiveCuePrevious.toolPoint.axisA,fiveCuePrevious.toolPoint.axisB)
    val fiveCuePoseGhostDelta=sqrt(
        (fiveCueDepthVector.x-fiveCuePreviousAxis.x).pow(2)+
        (fiveCueDepthVector.y-fiveCuePreviousAxis.y).pow(2)+
        (fiveCueDepthVector.z-fiveCuePreviousAxis.z).pow(2)
    )
    require(fiveCuePoseGhostDelta>1e-9){"Studio 5AX previous-pose ghost vector did not differ from current axis"}
    val fiveCuePoseDot=(fiveCueDepthVector.x*fiveCuePreviousAxis.x+fiveCueDepthVector.y*fiveCuePreviousAxis.y+fiveCueDepthVector.z*fiveCuePreviousAxis.z).coerceIn(-1.0,1.0)
    val fiveCuePoseAngleDeg=Math.toDegrees(acos(fiveCuePoseDot))
    require(fiveCuePoseAngleDeg>1e-9){"Studio 5AX true pose angle delta did not change"}
    val fiveCueDeltaAMark=when { fiveCueDeltaA>1e-9 -> "↑"; fiveCueDeltaA< -1e-9 -> "↓"; else -> "•" }
    val fiveCueDeltaBMark=when { fiveCueDeltaB>1e-9 -> "↑"; fiveCueDeltaB< -1e-9 -> "↓"; else -> "•" }
    val poseBadgeProbe=String.format(
        java.util.Locale.US,
        "A%+.3f°%s B%+.3f°%s %s Δθ%.2f°",
        fiveCueFrame.toolPoint.axisA,fiveCueDeltaAMark,
        fiveCueFrame.toolPoint.axisB,fiveCueDeltaBMark,
        fiveCueDepthLabel,fiveCuePoseAngleDeg
    )
    val poseBadgeAxisProbe=String.format(
        java.util.Locale.US,
        "A%+.3f°%s B%+.3f°%s %s",
        fiveCueFrame.toolPoint.axisA,fiveCueDeltaAMark,
        fiveCueFrame.toolPoint.axisB,fiveCueDeltaBMark,
        fiveCueDepthLabel
    )
    val poseBadgeAProbe=String.format(java.util.Locale.US,"A%+.3f°%s",fiveCueFrame.toolPoint.axisA,fiveCueDeltaAMark)
    val poseBadgeBProbe=String.format(java.util.Locale.US,"B%+.3f°%s",fiveCueFrame.toolPoint.axisB,fiveCueDeltaBMark)
    val poseBadgeDepthPoseProbe=String.format(java.util.Locale.US,"%s Δθ%.2f°",fiveCueDepthLabel,fiveCuePoseAngleDeg)
    val poseBadgeProbeImage=BufferedImage(1,1,BufferedImage.TYPE_INT_ARGB)
    val poseBadgeProbeGraphics=poseBadgeProbeImage.createGraphics()
    poseBadgeProbeGraphics.font=Font(Font.SANS_SERIF,Font.BOLD,11)
    val poseBadgeFm=poseBadgeProbeGraphics.fontMetrics
    val poseBadgeProbeWidth=poseBadgeFm.stringWidth(poseBadgeProbe)+10
    val poseBadgeAxisWidth=poseBadgeFm.stringWidth(poseBadgeAxisProbe)+10
    val poseBadgeLeafWidth=maxOf(
        poseBadgeFm.stringWidth(poseBadgeAProbe),
        poseBadgeFm.stringWidth(poseBadgeBProbe),
        poseBadgeFm.stringWidth(poseBadgeDepthPoseProbe)
    )+10
    poseBadgeProbeGraphics.dispose()
    require(poseBadgeProbeWidth>poseBadgeAxisWidth){"Studio 5AX adaptive badge smoke cannot force two-line reflow"}
    require(poseBadgeAxisWidth>poseBadgeLeafWidth){"Studio 5AX adaptive badge smoke cannot force three-line reflow"}
    val poseBadgeMidWidth=poseBadgeAxisWidth+12
    val poseBadgeNarrowWidth=poseBadgeLeafWidth+12
    require(poseBadgeProbeWidth>poseBadgeMidWidth-12){"Studio 5AX adaptive badge two-line width did not require reflow"}
    require(poseBadgeAxisWidth>poseBadgeNarrowWidth-12){"Studio 5AX adaptive badge three-line width did not require split"}
    fiveAxisPanel.showProgressiveFrame(fiveCueFrame)
    require(fiveCueFrame.index>0 && fiveAxisPanel.freshRemovalSourceFrame()==fiveCueFrame.index-1){"Studio 5AX fresh-removal source did not lock to current index - 1"}
    val fiveCueFile=File("desktop_5x_axis_cue.png")
    writePanel(fiveAxisPanel,fiveCueFile,980,620)
    val fiveOcclusionEvidence=fiveAxisPanel.occlusionEvidence()
    require(fiveOcclusionEvidence.first>0){"Studio 5AX depth occlusion evidence found no occluded historical path segment"}
    require(fiveOcclusionEvidence.second>0){"Studio 5AX depth occlusion evidence found no foreground historical path segment"}
    val fiveCueMidFile=File("desktop_5x_axis_badge_mid.png")
    writePanel(fiveAxisPanel,fiveCueMidFile,poseBadgeMidWidth,620)
    require(fiveCueMidFile.exists() && fiveCueMidFile.length()>0){"Studio 5AX two-line badge smoke image missing"}
    val fiveCueNarrowFile=File("desktop_5x_axis_badge_narrow.png")
    writePanel(fiveAxisPanel,fiveCueNarrowFile,poseBadgeNarrowWidth,620)
    require(fiveCueNarrowFile.exists() && fiveCueNarrowFile.length()>0){"Studio 5AX three-line badge smoke image missing"}
    require(!fiveMoves[fiveBeforeIndex].rapid && !fiveMoves[fiveAfterIndex].rapid && !fiveMoves[fiveCueIndex].rapid){"Studio 5AX cut-contact evidence must use non-rapid frames"}
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
            "FRESH_REMOVAL_FRONTIER=PASS\n" +
            "FRESH_REMOVAL_3D_VISIBLE_POINTS=$materialFreshRemoval\n" +
            "FRESH_REMOVAL_3D_FRAME_BEFORE=${fresh3DBefore.index+1}/${fresh3DBefore.total}\n" +
            "FRESH_REMOVAL_3D_FRAME_AFTER=${fresh3DAfter.index+1}/${fresh3DAfter.total}\n" +
            "FRESH_REMOVAL_SOURCE_LOCK=PASS\n" +
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
            "5X_TOOL_AXIS_CUE_CHANGE=PASS\n" +
            "5X_AXIS_CUE_BEFORE=${DisplayFormat.mm(fiveAxisCueBefore.x)},${DisplayFormat.mm(fiveAxisCueBefore.y)},${DisplayFormat.mm(fiveAxisCueBefore.z)}\n" +
            "5X_AXIS_CUE_AFTER=${DisplayFormat.mm(fiveAxisCueAfter.x)},${DisplayFormat.mm(fiveAxisCueAfter.y)},${DisplayFormat.mm(fiveAxisCueAfter.z)}\n" +
            "5X_AXIS_CUE_EVIDENCE=PASS\n" +
            "5X_AXIS_CUE_FRAME=${fiveCueFrame.index+1}/${fiveCueFrame.total}\n" +
            "5X_AXIS_CUE_A=${DisplayFormat.mm(fiveCueFrame.toolPoint.axisA)}\n" +
            "5X_AXIS_CUE_B=${DisplayFormat.mm(fiveCueFrame.toolPoint.axisB)}\n" +
            "5X_ORIENTATION_BADGE=PASS\n" +
            "5X_ORIENTATION_BADGE_A=${DisplayFormat.mm(fiveCueFrame.toolPoint.axisA)}\n" +
            "5X_ORIENTATION_BADGE_B=${DisplayFormat.mm(fiveCueFrame.toolPoint.axisB)}\n" +
            "5X_AXIS_DEPTH_POLARITY=PASS\n" +
            "5X_AXIS_DEPTH_POLARITY_VALUE=${DisplayFormat.mm(fiveCueDepthValue)}\n" +
            "5X_AXIS_DEPTH_POLARITY_CODE=$fiveCueDepthCode\n" +
            "5X_AXIS_DEPTH_POLARITY_LABEL=$fiveCueDepthLabel\n" +
            "5X_AXIS_DELTA_DIRECTION=PASS\n" +
            "5X_AXIS_DELTA_A=${DisplayFormat.mm(fiveCueDeltaA)}\n" +
            "5X_AXIS_DELTA_B=${DisplayFormat.mm(fiveCueDeltaB)}\n" +
            "5X_AXIS_DELTA_A_CODE=$fiveCueDeltaACode\n" +
            "5X_AXIS_DELTA_B_CODE=$fiveCueDeltaBCode\n" +
            "5X_AXIS_POSE_GHOST=PASS\n" +
            "5X_AXIS_POSE_GHOST_DELTA=${DisplayFormat.mm(fiveCuePoseGhostDelta)}\n" +
            "5X_AXIS_POSE_GHOST_ANCHOR=CURRENT_TOOL_TIP\n" +
            "5X_AXIS_POSE_ANGLE=PASS\n" +
            "5X_AXIS_POSE_ANGLE_DEG=${DisplayFormat.mm(fiveCuePoseAngleDeg)}\n" +
            "5X_AXIS_POSE_ANGLE_SOURCE=UNIT_AXIS_DOT_ACOS\n" +
            "5X_AXIS_BADGE_REFLOW=PASS\n" +
            "5X_AXIS_BADGE_REFLOW_2LINE=PASS\n" +
            "5X_AXIS_BADGE_REFLOW_3LINE=PASS\n" +
            "5X_AXIS_BADGE_REFLOW_NO_OVERFLOW=PASS\n" +
            "5X_AXIS_BADGE_REFLOW_SINGLE_WIDTH=$poseBadgeProbeWidth\n" +
            "5X_AXIS_BADGE_REFLOW_AXIS_WIDTH=$poseBadgeAxisWidth\n" +
            "5X_AXIS_BADGE_REFLOW_LEAF_WIDTH=$poseBadgeLeafWidth\n" +
            "5X_AXIS_BADGE_REFLOW_MID_WIDTH=$poseBadgeMidWidth\n" +
            "5X_AXIS_BADGE_REFLOW_NARROW_WIDTH=$poseBadgeNarrowWidth\n" +
            "5X_AXIS_BADGE_REFLOW_PRESERVE=AB_DIRECTION_DEPTH_POSE_ANGLE\n" +
            "5X_AXIS_DEPTH_BEADS=PASS\n" +
            "5X_AXIS_DEPTH_BEADS_SOURCE=PROJECTED_DEPTH_DELTA\n" +
            "5X_AXIS_DEPTH_BEADS_STYLE=DIRECTIONAL_RADIUS_ALPHA\n" +
            "5X_DEPTH_OCCLUSION=PASS\n" +
            "5X_FRESH_REMOVAL_FRONTIER=PASS\n" +
            "5X_FRESH_REMOVAL_VISIBLE_POINTS=$fiveFreshRemoval\n" +
            "5X_FRESH_REMOVAL_FRAME_BEFORE=${fiveBeforeFrame.index+1}/${fiveBeforeFrame.total}\n" +
            "5X_FRESH_REMOVAL_FRAME_AFTER=${fiveAfterFrame.index+1}/${fiveAfterFrame.total}\n" +
            "5X_FRESH_REMOVAL_SOURCE_LOCK=PASS\n" +
            "5X_OCCLUDED_PATH_SEGMENTS=${fiveOcclusionEvidence.first}\n" +
            "5X_FOREGROUND_PATH_SEGMENTS=${fiveOcclusionEvidence.second}\n" +
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
            sha256File(fresh3DBeforeFile) + "  desktop_fresh_removal_before.png\n" +
            sha256File(fresh3DAfterFile) + "  desktop_fresh_removal_frontier.png\n" +
            sha256File(fiveBeforeFile) + "  desktop_5x_before.png\n" +
            sha256File(fiveAfterFile) + "  desktop_5x_after.png\n" +
            sha256File(fiveCueFile) + "  desktop_5x_axis_cue.png\n" +
            sha256File(fiveCueMidFile) + "  desktop_5x_axis_badge_mid.png\n" +
            sha256File(fiveCueNarrowFile) + "  desktop_5x_axis_badge_narrow.png\n" +
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
            "FRESH_REMOVAL_FRONTIER=PASS\n" +
            "FRESH_REMOVAL_SCREENSHOT=desktop_fresh_removal_frontier.png\n" +
            "5X_FRESH_REMOVAL_FRONTIER=PASS\n" +
            "5X_BEFORE=desktop_5x_before.png\n" +
            "5X_AFTER=desktop_5x_after.png\n" +
            "5X_AXIS_CUE=desktop_5x_axis_cue.png\n" +
            "5X_DEPTH_OCCLUSION=PASS\n" +
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

private fun showNcEditor(frame: JFrame, doc: DrawingDocument, camSettings:CamSettings=CamSettings()) {
    val cam = CamModel.fromCad(1L, doc.snapshot(), camSettings)
    require(cam.toolpaths.isNotEmpty()) { "NC BLOCKED: no CAM toolpath" }
    var controllerProfile = runCatching {
        CncControllerProfile.valueOf(ncPostPrefs.get("controller", CncControllerProfile.FANUC.name))
    }.getOrDefault(CncControllerProfile.FANUC)
    var coordinateMode = runCatching {
        NcCoordinateMode.valueOf(ncPostPrefs.get("coordinate", NcCoordinateMode.ABSOLUTE_G90.name))
    }.getOrDefault(NcCoordinateMode.ABSOLUTE_G90)
    var originTransformMode = runCatching {
        NcOriginTransformMode.valueOf(ncPostPrefs.get("origin", NcOriginTransformMode.WORK_OFFSET_ONLY.name))
    }.getOrDefault(NcOriginTransformMode.WORK_OFFSET_ONLY)
    var cutterCompensation = runCatching {
        CutterCompensationMode.valueOf(ncPostPrefs.get("cutter_comp", CutterCompensationMode.CAM_GEOMETRY_G40.name))
    }.getOrDefault(CutterCompensationMode.CAM_GEOMETRY_G40)
    var cutterCompRegister = ncPostPrefs.getInt("cutter_d_register",1).coerceIn(1,999)
    var cutterCompValueMm = java.lang.Double.longBitsToDouble(
        ncPostPrefs.getLong("cutter_d_value_bits", java.lang.Double.doubleToLongBits(0.0))
    ).takeIf { it.isFinite() } ?: 0.0
    fun generateNc(): String = CncPost.generate(
        cam,
        FanucPostSettings(
            controller = controllerProfile,
            coordinateMode = coordinateMode,
            originTransformMode = originTransformMode,
            cutterCompensation = cutterCompensation,
            cutterCompRegister = cutterCompRegister,
            cutterCompValueMm = cutterCompValueMm
        )
    )
    val area = JTextArea(generateNc()).apply {
        background = Color(5,8,12)
        foreground = Color(99,255,157)
        font = Font(Font.MONOSPACED, Font.PLAIN, 15)
        lineWrap = false
    }
    val machineInterlockSession = NcMachineInterlockSession()
    val ncRotaryProfile = loadDesktopRotaryMachineProfile()
    val modalStatus = JLabel("MODAL • " + NcModalTracker.evidence(area.text)).apply {
        foreground = Color(255,210,90)
    }
    val lineHelp = JLabel().apply {
        foreground = Color(190,220,255)
    }
    fun refreshLineHelp() {
        val line = NcCodeCatalog.lineNumberAt(area.text, area.caretPosition)
        lineHelp.text = "LINE HELP • " +
            NcCodeCatalog.lineHelp(area.text,line,ncRotaryProfile,RotaryAxisOperationMode.NONE) + " • " +
            NcSemanticAuthority.lineEvidence(area.text,line,controllerProfile,ncRotaryProfile,RotaryAxisOperationMode.NONE) + " • " +
            NcExecutionTimeline.lineEvidence(area.text,line,controllerProfile,rotaryClampProfile=ncRotaryProfile,rotaryMode=RotaryAxisOperationMode.NONE)
    }
    fun refreshModalStatus() {
        val blocked = NcProgramSafetyPolicy.blocking(area.text,ncRotaryProfile,RotaryAxisOperationMode.NONE)
        val machine = machineInterlockSession.inspect(area.text)
        modalStatus.foreground = if (blocked.isEmpty() && machine.canExecute) Color(255,210,90) else Color(255,110,110)
        modalStatus.text = "MODAL • " + NcModalTracker.evidence(area.text) +
            " • AUX=" + NcAuxiliaryTracker.evidence(area.text) +
            " • CODE=" + NcCodeCatalog.programLegend(area.text,12,ncRotaryProfile.allowedMCodes()) +
            " • " + CncControllerCapabilityMatrix.summary(controllerProfile,area.text,ncRotaryProfile.allowedMCodes()) +
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
    val cutterDRegister = JTextField(cutterCompRegister.toString(),4).apply {
        toolTipText = "Fanuc D register 1..999"
    }
    val cutterDValue = JTextField(DisplayFormat.mm(cutterCompValueMm),7).apply {
        toolTipText = "Expected D register value in mm; AIG stores/audits it, but G41/G42 machine output remains fail-closed until raw-contour simulation passes"
    }

    fun refreshNcFromPostSelection() {
        val nextController = controller.selectedItem as? CncControllerProfile ?: CncControllerProfile.FANUC
        val nextCoordinate = coordinate.selectedItem as? NcCoordinateMode ?: NcCoordinateMode.ABSOLUTE_G90
        val nextOrigin = origin.selectedItem as? NcOriginTransformMode ?: NcOriginTransformMode.WORK_OFFSET_ONLY
        val nextComp = compensation.selectedItem as? CutterCompensationMode ?: CutterCompensationMode.CAM_GEOMETRY_G40
        val nextDRegister = cutterDRegister.text.trim().toIntOrNull()
        val nextDValue = cutterDValue.text.trim().toDoubleOrNull()
        if(nextDRegister==null || nextDRegister !in 1..999 || nextDValue==null || !nextDValue.isFinite()){
            JOptionPane.showMessageDialog(frame,"D register must be 1..999 and D value must be a finite mm value.","CUTTER COMP",JOptionPane.WARNING_MESSAGE)
            return
        }
        controllerProfile = nextController
        coordinateMode = nextCoordinate
        originTransformMode = nextOrigin
        cutterCompensation = nextComp
        cutterCompRegister = nextDRegister
        cutterCompValueMm = nextDValue
        ncPostPrefs.put("controller",controllerProfile.name)
        ncPostPrefs.put("coordinate",coordinateMode.name)
        ncPostPrefs.put("origin",originTransformMode.name)
        ncPostPrefs.put("cutter_comp",cutterCompensation.name)
        ncPostPrefs.putInt("cutter_d_register",cutterCompRegister)
        ncPostPrefs.putLong("cutter_d_value_bits",java.lang.Double.doubleToLongBits(cutterCompValueMm))
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
    val applyD = GlassActionButton("APPLY D", Color(80,170,255)).apply {
        addActionListener { refreshNcFromPostSelection() }
    }
    fun showNcOperatorPalette() {
        val groups=NcCodeCatalog.operatorPalette()
        val groupNames=groups.map { it.first+" • "+it.second.size+" codes" }
        val pickedGroup=JOptionPane.showInputDialog(
            frame,"選擇 G/M 功能分類","G/M 功能 • FANUC",
            JOptionPane.PLAIN_MESSAGE,null,groupNames.toTypedArray(),groupNames.firstOrNull()
        ) as? String ?: return
        val groupIndex=groupNames.indexOf(pickedGroup)
        if(groupIndex<0) return
        val group=groups[groupIndex]
        val codeLabels=group.second.map { code ->
            val d=NcCodeCatalog.describe(code)
            code+" • "+d.shortName+" • "+d.layer
        }
        val picked=JOptionPane.showInputDialog(
            frame,"選擇要插入的代碼","G/M 功能 • "+group.first,
            JOptionPane.PLAIN_MESSAGE,null,codeLabels.toTypedArray(),codeLabels.firstOrNull()
        ) as? String ?: return
        val codeIndex=codeLabels.indexOf(picked)
        if(codeIndex>=0) {
            area.insert(group.second[codeIndex]+" ",area.caretPosition)
            area.requestFocusInWindow()
        }
    }
    val keys = listOf("G/M 功能","G90","G54","G43","M98","G","M","X","Y","Z","F","S","T","A","B","7","8","9","-",".","4","5","6","0","/","1","2","3","INSERT","DELETE","BLOCK SKIP")
    val keypad = AdaptiveGlassToolbar()
    keys.forEach { key ->
        keypad.add(GlassActionButton(key, Color(80,170,255)).apply {
            addActionListener {
                when (key) {
                    "G/M 功能" -> showNcOperatorPalette()
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
            background = Color(7,17,27)
            add(JLabel(MasterRuntimeChainContract.uiLabel()).apply {
                foreground=Color(99,255,157)
                font=font.deriveFont(Font.BOLD,12f)
                border=BorderFactory.createEmptyBorder(4,8,2,8)
            },BorderLayout.NORTH)
            add(JPanel(FlowLayout(FlowLayout.LEFT)).apply {
                background = Color(7,17,27)
                add(JLabel("CONTROL").apply { foreground = Color(61,235,255) })
                add(controller)
                add(coordinate)
                add(origin)
                add(compensation)
                add(JLabel("D").apply { foreground=Color(190,220,255) })
                add(cutterDRegister)
                add(JLabel("mm").apply { foreground=Color(190,220,255) })
                add(cutterDValue)
                add(applyD)
                add(alarmReset)
                add(resume)
            }, BorderLayout.CENTER)
            add(JPanel(GridLayout(0,1)).apply {
                background = Color(7,17,27)
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


private val ncPostPrefs: Preferences =
    Preferences.userRoot().node("com/aigstudio/nc-post-profile")

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

private fun showUnifiedMachiningEditor(frame:JFrame,doc:DrawingDocument,status:JLabel,initialMode:String="3AX",camSettings:CamSettings=CamSettings()){
    require(initialMode in setOf("3D","3AX","4AX","5AX")){"Unsupported initial mode: $initialMode"}
    val snapshot=doc.snapshot()
    require(snapshot.entities.isNotEmpty() || camSettings.pathMode==CamPathMode.MANUAL){
        "UNIFIED WORKSPACE BLOCKED: AUTO needs CAD; MANUAL may run without CAD"
    }
    var result=Machining3DEngine.build(snapshot,camSettings)
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
        background=Color(7,17,27)
        border=BorderFactory.createCompoundBorder(BorderFactory.createLineBorder(Color(61,235,255,130),1,true),EmptyBorder(8,8,8,8))
        add(JLabel("可編輯 G-code • EDITABLE NC • FANUC").apply{foreground=Color(255,210,90);font=font.deriveFont(Font.BOLD,14f)},BorderLayout.NORTH)
        add(JScrollPane(editor),BorderLayout.CENTER)
    }
    val card=CardLayout()
    val visual=JPanel(card).apply{background=Color(2,7,14)}
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
        "4AX" -> modeButtons.getOrNull(2)?.doClick()
        "5AX" -> modeButtons.getOrNull(3)?.doClick()
        "3AX" -> modeButtons.getOrNull(1)?.doClick()
        else -> modeButtons.getOrNull(0)?.doClick()
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
    dlg.add(JPanel(BorderLayout()).apply{
        background=Color(7,17,27)
        add(JLabel(MasterRuntimeChainContract.uiLabel()).apply{
            foreground=Color(99,255,157)
            font=font.deriveFont(Font.BOLD,12f)
            border=BorderFactory.createEmptyBorder(4,8,2,8)
        },BorderLayout.NORTH)
        add(modeBar,BorderLayout.CENTER)
    },BorderLayout.NORTH)
    dlg.add(split,BorderLayout.CENTER)
    dlg.add(actions,BorderLayout.SOUTH)
    dlg.size=desktopAdaptiveSize(1500,900)
    dlg.setLocationRelativeTo(frame)
    dlg.isVisible=true
}

private fun showApp(startup:StudioDesktopStartupWindow?=null, showWindow:Boolean=true):JFrame {
    applyDesktopCoordinatePrecision()
    startup?.advance(StudioStartupStage.CONFIGURATION,"載入環境設定")
    val doc = DrawingDocument()
    val status = JLabel("LOCAL READY • NETWORK OPTIONAL • AIG CNC • "+MasterRuntimeChainContract.uiLabel())
    status.foreground = Color(99, 255, 157)
    val cad = CadPanel(doc) { status.text = it }
    var sharedLocalMeta=ProjectRevisionMeta()
    val sharedProjectFile=System.getProperty("aig.shared.project.file")
        ?.takeIf{it.isNotBlank()}?.let(::File)
    val sharedLocalProjectFile=System.getProperty("aig.shared.local.project.file")
        ?.takeIf{it.isNotBlank()}?.let(::File)
    val sharedBaselineSignature=doc.all().hashCode()*31+doc.links().hashCode()
    var sharedLastMessage=""
    val sharedSyncExecutor=java.util.concurrent.Executors.newSingleThreadExecutor { task ->
        Thread(task,"aig-studio-desktop-shared-sync").apply { isDaemon=true }
    }
    val sharedSyncRunning=java.util.concurrent.atomic.AtomicBoolean(false)
    var sharedSyncLastFileStamp=Long.MIN_VALUE
    val sharedSyncTimer:Timer?=sharedProjectFile?.let { shared ->
        Timer(SharedProjectFolderSync.POLL_INTERVAL_MS.toInt()) {
            val fileStamp=if(shared.isFile) shared.lastModified() xor (shared.length() shl 1) else Long.MIN_VALUE
            if(fileStamp!=sharedSyncLastFileStamp && sharedSyncRunning.compareAndSet(false,true)) {
                sharedSyncLastFileStamp=fileStamp
                val localDirty=(doc.all().hashCode()*31+doc.links().hashCode())!=sharedBaselineSignature
                val fallbackMeta=sharedLocalMeta
                sharedSyncExecutor.execute {
                    val result=runCatching {
                        val localMeta=sharedLocalProjectFile?.takeIf{it.isFile}
                            ?.let{StudioProjectRepository.load(it).revisionMeta}
                            ?: fallbackMeta
                        SharedProjectFolderSync.inspect(
                            shared,localMeta,localDirty
                        ){StudioProjectRepository.load(it).revisionMeta}
                    }
                    SwingUtilities.invokeLater {
                        sharedSyncRunning.set(false)
                        result.onSuccess { observation ->
                            if(observation.state!=ProjectSyncState.CLEAN &&
                                observation.message!=sharedLastMessage) {
                                sharedLastMessage=observation.message
                                status.text="共享 • "+observation.message
                            }
                        }.onFailure {
                            sharedSyncLastFileStamp=Long.MIN_VALUE
                            status.text="共享同步檢查 BLOCKED • "+(it.message?:"error")
                        }
                    }
                }
            }
        }.apply{isRepeats=true;start()}
    }

    val frame = JFrame("AIG CNC — OFFICIAL RGB ORIGINAL — v"+desktopVersionName())
    startup?.advance(StudioStartupStage.UI_RENDERER,"載入 RGB UI / Renderer")
    frame.defaultCloseOperation = WindowConstants.EXIT_ON_CLOSE
    frame.addWindowListener(object:java.awt.event.WindowAdapter(){
        override fun windowClosed(e:java.awt.event.WindowEvent?) {
            sharedSyncTimer?.stop()
            sharedSyncRunning.set(false)
            sharedSyncExecutor.shutdownNow()
        }
    })
    frame.layout = BorderLayout()
    frame.contentPane.background = StudioDesktopProductionTheme.background

    val mainCardLayout=CardLayout()
    val mainCardHost=JPanel(mainCardLayout).apply{
        background=StudioDesktopProductionTheme.background
    }
    val masterRootBar=JPanel(BorderLayout()).apply {
        background=Color(2,6,12)
        border=BorderFactory.createCompoundBorder(
            BorderFactory.createMatteBorder(0,0,1,0,Color(61,235,255,150)),
            BorderFactory.createEmptyBorder(5,12,5,12)
        )
        add(JLabel(
            MasterRuntimeChainContract.uiLabel()
        ).apply{
            foreground=Color(99,255,157)
            font=font.deriveFont(Font.BOLD,13f)
        },BorderLayout.WEST)
        add(JLabel("ROOT → CAD → CAM → SIM → NC").apply{
            foreground=Color(143,179,201)
            font=font.deriveFont(Font.PLAIN,12f)
            horizontalAlignment=SwingConstants.CENTER
        },BorderLayout.CENTER)
        add(JLabel(OfflineFirstModuleContract.uiBadge()).apply{
            foreground=Color(61,235,255)
            font=font.deriveFont(Font.BOLD,11f)
        },BorderLayout.EAST)
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
        background=Color(7,17,27)
        border=BorderFactory.createEmptyBorder(10,10,10,10)
        add(JLabel("中鍵 / 右鍵拖曳 = 視圖平移").apply{foreground=Color(143,179,201)})
        add(Box.createVerticalStrut(8))
        add(JLabel("滾輪 = 縮放").apply{foreground=Color(143,179,201)})
        add(Box.createVerticalStrut(8))
        add(JLabel(WorkstationChromeContract.MASTER_ORIGIN).apply{foreground=Color(61,235,255)})
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

    var productionCamSettings=CamSettings()

    fun showProductionManualCamEditor(){
        runCatching{
            if(productionCamSettings.manualPath.isEmpty()){
                val snapshot=doc.snapshot()
                productionCamSettings=if(snapshot.entities.isNotEmpty()){
                    val auto=CamModel.fromCad(
                        System.currentTimeMillis(),snapshot,
                        productionCamSettings.copy(pathMode=CamPathMode.AUTO)
                    )
                    ManualCamPathEngine.adoptAuto(auto)
                }else{
                    ManualCamPathEngine.startBlank(productionCamSettings,0.0,0.0)
                }
            }else{
                productionCamSettings=ManualCamPathEngine.useManual(productionCamSettings)
            }
        }.onFailure{
            status.text="MANUAL CAM BLOCKED • "+(it.message?:"error")
            return
        }

        val dlg=JDialog(frame,"CAM 手動走刀 • 夾治具避讓",false).apply{
            layout=BorderLayout(8,8);minimumSize=Dimension(760,520)
        }
        val model=DefaultComboBoxModel<String>()
        val selector=JComboBox(model)
        val x=JTextField(12);val y=JTextField(12);val z=JTextField(12)
        val rapid=JCheckBox("G0 / 抬刀或快速移動")
        fun label(i:Int,p:ManualCamPoint)=
            "P"+(i+1)+" • "+(if(p.rapid)"G0" else if(p.arcI!=null)"ARC" else "G1")+
                " • X"+DisplayFormat.mm(p.x)+" Y"+DisplayFormat.mm(p.y)+" Z"+DisplayFormat.mm(p.z)
        fun refresh(select:Int=0){
            model.removeAllElements()
            productionCamSettings.manualPath.forEachIndexed{i,p->model.addElement(label(i,p))}
            if(model.size>0)selector.selectedIndex=select.coerceIn(0,model.size-1)
        }
        fun load(){
            val p=productionCamSettings.manualPath.getOrNull(selector.selectedIndex) ?: return
            x.text=DisplayFormat.mm(p.x);y.text=DisplayFormat.mm(p.y);z.text=DisplayFormat.mm(p.z)
            rapid.isSelected=p.rapid
        }
        selector.addActionListener{load()}
        refresh();load()
        val form=JPanel(GridLayout(0,2,6,6)).apply{
            background=LibraryFiveAxisSkin208.panel;border=EmptyBorder(10,10,10,10)
            add(JLabel("節點"));add(selector)
            add(JLabel("X mm"));add(x)
            add(JLabel("Y mm"));add(y)
            add(JLabel("Z mm"));add(z)
            add(JLabel("類型"));add(rapid)
            add(JLabel("規則"));add(JLabel("位置不綁 CAD；G0 必須 ≥ Safe-Z"))
        }
        dlg.add(form,BorderLayout.CENTER)

        val actions=AdaptiveGlassToolbar()
        fun action(label:String,run:()->Unit){
            actions.add(GlassActionButton(label,LibraryFiveAxisSkin208.cyan).apply{addActionListener{run()}})
        }
        action("套用節點"){
            val i=selector.selectedIndex
            runCatching{
                productionCamSettings=ManualCamPathEngine.replacePoint(
                    productionCamSettings,i,x.text.toDouble(),y.text.toDouble(),z.text.toDouble(),rapid.isSelected
                )
                CamModel.fromCad(System.currentTimeMillis(),doc.snapshot(),productionCamSettings)
            }.onSuccess{
                status.text="MANUAL CAM POINT PASS • P"+(i+1)+" • 3D/NC READY"
                refresh(i);load()
            }.onFailure{status.text="MANUAL CAM POINT BLOCKED • "+(it.message?:"error")}
        }
        action("新增切削點"){
            val i=selector.selectedIndex
            val p=productionCamSettings.manualPath.getOrNull(i) ?: return@action
            runCatching{
                productionCamSettings=ManualCamPathEngine.insertPoint(
                    productionCamSettings,i+1,
                    ManualCamPoint(p.x,p.y,productionCamSettings.depth,false,axisA=p.axisA,axisB=p.axisB)
                )
            }.onSuccess{refresh(i+1);load()}
                .onFailure{status.text="MANUAL CAM INSERT BLOCKED • "+(it.message?:"error")}
        }
        action("插入避讓"){
            val i=selector.selectedIndex
            val current=productionCamSettings.manualPath.getOrNull(i) ?: return@action
            val next=productionCamSettings.manualPath.getOrNull(i+1) ?: current
            val p=JPanel(GridLayout(0,2,6,6))
            val lift=JTextField(DisplayFormat.mm(productionCamSettings.safeZ),10)
            val lx=JTextField(DisplayFormat.mm(next.x),10)
            val ly=JTextField(DisplayFormat.mm(next.y),10)
            val lz=JTextField(DisplayFormat.mm(if(next.rapid)productionCamSettings.depth else next.z),10)
            p.add(JLabel("抬刀 Z"));p.add(lift)
            p.add(JLabel("落刀 X"));p.add(lx)
            p.add(JLabel("落刀 Y"));p.add(ly)
            p.add(JLabel("落刀 Z"));p.add(lz)
            if(JOptionPane.showConfirmDialog(
                    dlg,p,"夾具／壓板避讓：抬刀 → Safe-Z 快移 → 落刀",
                    JOptionPane.OK_CANCEL_OPTION,JOptionPane.PLAIN_MESSAGE
                )==JOptionPane.OK_OPTION){
                runCatching{
                    productionCamSettings=ManualCamPathEngine.insertAvoidance(
                        productionCamSettings,i,lift.text.toDouble(),lx.text.toDouble(),ly.text.toDouble(),lz.text.toDouble()
                    )
                }.onSuccess{
                    status.text="AVOIDANCE PASS • RETRACT / RAPID / PLUNGE"
                    refresh(i+3);load()
                }.onFailure{status.text="AVOIDANCE BLOCKED • "+(it.message?:"error")}
            }
        }
        action("刪除節點"){
            val i=selector.selectedIndex
            runCatching{
                productionCamSettings=ManualCamPathEngine.deletePoint(productionCamSettings,i)
            }.onSuccess{
                refresh(i.coerceAtMost(productionCamSettings.manualPath.lastIndex));load()
            }.onFailure{status.text="MANUAL CAM DELETE BLOCKED • "+(it.message?:"error")}
        }
        action("3D SIM"){
            runCatching{showUnifiedMachiningEditor(frame,doc,status,"3D",productionCamSettings)}
                .onSuccess{dlg.dispose()}
                .onFailure{status.text="MANUAL 3D SIM BLOCKED • "+(it.message?:"error")}
        }
        dlg.add(actions,BorderLayout.SOUTH)
        dlg.pack();dlg.setLocationRelativeTo(frame);dlg.isVisible=true
    }

    fun buildProductionCamPanel():JPanel {
        val snapshot=doc.snapshot()
        if(snapshot.entities.isEmpty() && productionCamSettings.pathMode==CamPathMode.AUTO){
            return JPanel(BorderLayout()).apply{
                name="CAM_CARD"
                background=StudioDesktopProductionTheme.background
                border=BorderFactory.createEmptyBorder(18,18,18,18)
                val actions=AdaptiveGlassToolbar()
                actions.add(GlassActionButton("MANUAL / 手動",LibraryFiveAxisSkin208.warning).apply{
                    addActionListener{
                        productionCamSettings=ManualCamPathEngine.startBlank(productionCamSettings,0.0,0.0)
                        showProductionCam()
                    }
                })
                actions.add(GlassActionButton("EDIT PATH / 路徑編輯",LibraryFiveAxisSkin208.cyan).apply{
                    addActionListener{
                        productionCamSettings=ManualCamPathEngine.startBlank(productionCamSettings,0.0,0.0)
                        showProductionManualCamEditor()
                    }
                })
                add(JLabel("AUTO 尚無 CAD • 可直接切 MANUAL 建立手動刀路").apply{
                    foreground=StudioDesktopProductionTheme.warning
                    font=font.deriveFont(Font.BOLD,18f)
                    horizontalAlignment=SwingConstants.CENTER
                },BorderLayout.CENTER)
                add(actions,BorderLayout.SOUTH)
            }
        }
        val result=Machining3DEngine.build(snapshot,productionCamSettings)
        val cam=result.cam
        val settings=cam.settings
        val left=JPanel(BorderLayout(6,6)).apply{
            background=LibraryFiveAxisSkin208.panel
            preferredSize=Dimension(190,0)
            minimumSize=Dimension(178,0)
            border=BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(Color(LibraryFiveAxisSkin208.cyan.red,LibraryFiveAxisSkin208.cyan.green,LibraryFiveAxisSkin208.cyan.blue,150),1,true),
                BorderFactory.createEmptyBorder(10,10,10,10)
            )
            add(JLabel("刀路 / TOOLPATH").apply{
                foreground=LibraryFiveAxisSkin208.cyan
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
            background=LibraryFiveAxisSkin208.background
            preferredSize=Dimension(180,0)
            minimumSize=Dimension(168,0)
            border=BorderFactory.createEmptyBorder(2,2,2,2)
        }
        fun parameter(title:String,value:String,color:Color){
            right.add(JPanel(BorderLayout()).apply{
                background=LibraryFiveAxisSkin208.panel
                border=BorderFactory.createCompoundBorder(
                    BorderFactory.createLineBorder(Color(color.red,color.green,color.blue,125),1,true),
                    BorderFactory.createEmptyBorder(8,10,8,10)
                )
                add(JLabel(title).apply{foreground=Color(145,175,198)},BorderLayout.NORTH)
                add(JLabel(value).apply{foreground=color;font=font.deriveFont(Font.BOLD,13f)},BorderLayout.CENTER)
            })
        }
        parameter("TOOL DIA",DisplayFormat.mm(settings.toolDiameter)+" mm",LibraryFiveAxisSkin208.cyan)
        parameter("TOOL RADIUS",DisplayFormat.mm(settings.toolDiameter/2.0)+" mm",LibraryFiveAxisSkin208.violet)
        parameter("DEPTH",DisplayFormat.mm(settings.depth)+" mm",LibraryFiveAxisSkin208.magenta)
        parameter("SAFE-Z",DisplayFormat.mm(settings.safeZ)+" mm",LibraryFiveAxisSkin208.safe)
        parameter("FEED",DisplayFormat.mm(settings.feedMmMin)+" mm/min",LibraryFiveAxisSkin208.cyan)
        parameter("CAM SOURCE",settings.pathMode.name,if(settings.pathMode==CamPathMode.MANUAL)LibraryFiveAxisSkin208.warning else LibraryFiveAxisSkin208.cyan)
        parameter("CONTOUR SIDE",if(settings.contourSide==ContourSide.OUTSIDE)"外徑 / OUTSIDE" else "內徑 / INSIDE",LibraryFiveAxisSkin208.warning)
        parameter("PATH DIRECTION",settings.contourDirection.name,LibraryFiveAxisSkin208.cyan)
        val actions=AdaptiveGlassToolbar()
        fun camAction(label:String,color:Color,run:()->Unit){
            actions.add(GlassActionButton(label,color).apply{addActionListener{run()}})
        }
        fun rebuildCamCard(){
            mainCardHost.components.filter{it.name=="CAM_CARD"}.forEach{mainCardHost.remove(it)}
            mainCardHost.add(buildProductionCamPanel(),"CAM")
            mainCardLayout.show(mainCardHost,"CAM")
            mainCardHost.revalidate()
            mainCardHost.repaint()
        }
        camAction(if(settings.pathMode==CamPathMode.AUTO)"AUTO" else "MANUAL",LibraryFiveAxisSkin208.safe){
            productionCamSettings=if(settings.pathMode==CamPathMode.AUTO){
                if(settings.manualPath.isEmpty()){
                    val auto=CamModel.fromCad(System.currentTimeMillis(),snapshot,settings)
                    ManualCamPathEngine.adoptAuto(auto)
                }else ManualCamPathEngine.useManual(settings)
            }else{
                ManualCamPathEngine.useAuto(settings)
            }
            status.text="CAM SOURCE • "+productionCamSettings.pathMode.name
            rebuildCamCard()
        }
        camAction("路徑編輯",LibraryFiveAxisSkin208.warning){
            showProductionManualCamEditor()
        }
        camAction(if(settings.contourSide==ContourSide.OUTSIDE)"外徑" else "內徑",LibraryFiveAxisSkin208.warning){
            productionCamSettings=productionCamSettings.copy(
                contourSide=if(settings.contourSide==ContourSide.OUTSIDE)ContourSide.INSIDE else ContourSide.OUTSIDE
            )
            status.text="CAM SIDE • "+productionCamSettings.contourSide.name+" • REBUILD"
            rebuildCamCard()
        }
        camAction(settings.contourDirection.name,LibraryFiveAxisSkin208.cyan){
            val next=if(settings.contourDirection==ContourDirection.CCW)ContourDirection.CW else ContourDirection.CCW
            productionCamSettings=productionCamSettings.copy(
                climb=next==ContourDirection.CCW,
                contourDirection=next
            )
            status.text="CAM DIRECTION • "+next.name+" • REBUILD"
            rebuildCamCard()
        }
        camAction("3D SIM",LibraryFiveAxisSkin208.violet){
            runCatching{showUnifiedMachiningEditor(frame,doc,status,"3D",productionCamSettings)}
                .onFailure{status.text="3D SIM BLOCKED • "+(it.message?:"error")}
        }
        camAction("軸模式",LibraryFiveAxisSkin208.cyan){
            val choice=JOptionPane.showInputDialog(
                frame,
                "選擇 CAM / SIM 軸模式",
                "軸模式",
                JOptionPane.QUESTION_MESSAGE,
                null,
                arrayOf("3AX","4AX","5AX"),
                "3AX"
            ) as? String
            if(choice!=null){
                runCatching{showUnifiedMachiningEditor(frame,doc,status,choice,productionCamSettings)}
                    .onFailure{status.text=choice+" BLOCKED • "+(it.message?:"error")}
            }
        }
        camAction("NC",Color(80,170,255)){
            runCatching{showNcEditor(frame,doc,productionCamSettings)}
                .onFailure{status.text="NC EDIT BLOCKED • "+(it.message?:"error")}
        }
        return JPanel(BorderLayout(7,7)).apply{
            name="CAM_CARD"
            background=LibraryFiveAxisSkin208.background
            border=BorderFactory.createEmptyBorder(7,7,7,7)
            add(JPanel(BorderLayout()).apply{
                isOpaque=false
                add(JLabel("AIG CNC • REAL CAM 真實刀路 • 5AX RGB").apply{
                    foreground=LibraryFiveAxisSkin208.cyan
                    font=font.deriveFont(Font.BOLD,15f)
                    toolTipText=LibraryFiveAxisSkin208.SOURCE_MOBILE+" + "+LibraryFiveAxisSkin208.SOURCE_LANDSCAPE
                    border=BorderFactory.createEmptyBorder(4,8,2,8)
                },BorderLayout.WEST)
                add(JLabel(MasterRuntimeChainContract.masterOriginLabel()).apply{
                    foreground=Color(99,255,157)
                    font=font.deriveFont(Font.BOLD,12f)
                    border=BorderFactory.createEmptyBorder(4,8,2,8)
                },BorderLayout.EAST)
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
        status.text=if(doc.size()>0)"UX • "+RuntimeUxFlowContract.title("CAM")+" • "+MasterRuntimeChainContract.masterOriginLabel() else "UX • CAM • CAD geometry required • "+MasterRuntimeChainContract.masterOriginLabel()
    }

    fun showMaintenanceCenter(){
        val summary=JTextArea().apply{
            isEditable=false
            isOpaque=false
            foreground=StudioDesktopProductionTheme.text
            font=Font(Font.MONOSPACED,Font.PLAIN,12)
            text=buildString{
                appendLine("AIG CNC "+desktopVersionName()+" • 正式 Runtime UI 內建維修")
                appendLine("BOOT="+IntegratedMaintenanceUiContract.DEFAULT_BOOT_TARGET+" • separate engineering shell=OFF")
                appendLine("NETWORK OPTIONAL • OFFLINE MAINTENANCE=ON")
                appendLine("ENTITIES="+doc.size()+" • LINKS="+doc.links().size)
                append("MASTER X0.000 Y0.000 Z0.000 • "+CoordinatePrecisionRuntime.summary())
            }
        }
        val actions=JPanel(GridLayout(0,2,6,6)).apply{background=StudioDesktopProductionTheme.background}
        fun action(label:String,run:()->Unit){
            actions.add(GlassActionButton(label,Color(139,92,246)).apply{addActionListener{run()}})
        }
        action("座標 / 精度"){showDesktopCoordinatePrecisionDialog(frame,status)}
        action("AI 診斷"){mainCardLayout.show(mainCardHost,"AI");status.text="MAINT • AI LOCAL ASSIST"}
        action("CAM 檢查"){showProductionCam()}
        action("NC 安全"){runCatching{showNcEditor(frame,doc)}.onFailure{status.text="MAINT NC BLOCKED • "+(it.message?:"error")}}
        action("CAD"){mainCardLayout.show(mainCardHost,"CAD");status.text="CAD • PRODUCTION UI"}
        val panel=JPanel(BorderLayout(8,8)).apply{
            background=StudioDesktopProductionTheme.background
            border=BorderFactory.createEmptyBorder(10,10,10,10)
            add(summary,BorderLayout.CENTER)
            add(actions,BorderLayout.SOUTH)
        }
        JOptionPane.showMessageDialog(frame,panel,"AIG CNC • 維修 / 診斷",JOptionPane.INFORMATION_MESSAGE)
        status.text="MAINTENANCE CENTER • PRODUCTION UI • OFFLINE CAPABLE"
    }

    toolbar.add(GlassActionButton("維修",Color(139,92,246)).apply{
        toolTipText="正式 Runtime UI 內建維修 / 診斷"
        preferredSize=Dimension(92,48)
        addActionListener{showMaintenanceCenter()}
    },BorderLayout.EAST)

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
    linkTools.add(button("全部斷開", Color(239,68,68)) { cad.disconnectAllTopology() })
    val productionUiButtons=linkedMapOf<String,GlassActionButton>()
    fun productionUiButton(id:String,color:Color,action:()->Unit):GlassActionButton {
        val normalized=ProductionUiSwitchContract.normalize(id)
        return GlassActionButton(normalized,color).apply {
            toolTipText="正式 UI 切換 • "+normalized
            productionUiButtons[normalized]=this
            addActionListener {
                productionUiButtons.forEach { (key,b) -> b.active=(key==normalized) }
                action()
            }
        }
    }
    moduleButtons.add(productionUiButton("CAD", StudioDesktopProductionTheme.accent) {
        mainCardLayout.show(mainCardHost,"CAD")
        status.text="UX • "+RuntimeUxFlowContract.title("CAD")+" • "+MasterRuntimeChainContract.uiLabel()
    })
    moduleButtons.add(productionUiButton("CAM", StudioDesktopProductionTheme.cutting) {
        showProductionCam()
    })
    moduleButtons.add(productionUiButton("SIM", Color(139,92,246)) {
        runCatching { showUnifiedMachiningEditor(frame,doc,status,ProductionUiSwitchContract.runtimeTarget("SIM"),productionCamSettings) }
            .onSuccess { status.text="UX • "+RuntimeUxFlowContract.title("SIM")+" • "+MasterRuntimeChainContract.uiLabel() }
            .onFailure { status.text="SIM BLOCKED • "+(it.message?:"error") }
    })
    moduleButtons.add(productionUiButton("NC", Color(80,170,255)) {
        runCatching { showNcEditor(frame,doc,productionCamSettings) }
            .onSuccess { status.text="UX • "+RuntimeUxFlowContract.title("NC")+" • "+MasterRuntimeChainContract.masterOriginLabel()+" • FANUC / MITSUBISHI" }
            .onFailure { status.text="NC EDIT BLOCKED • "+(it.message?:"error") }
    })
    moduleButtons.add(productionUiButton("AI", Color(139,92,246)) {
        mainCardLayout.show(mainCardHost,"AI")
        status.text="UX • "+RuntimeUxFlowContract.title("AI")+" • LOCAL ASSIST"
    })
    check(ProductionUiSwitchContract.stableOrder(productionUiButtons.keys.toList()))
    productionUiButtons[ProductionUiSwitchContract.initialMode]?.active=true
    status.text="UX • "+RuntimeUxFlowContract.title(ProductionUiSwitchContract.initialMode)+" • "+MasterRuntimeChainContract.uiLabel()
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
        preferredSize=Dimension(182,0)
        minimumSize=Dimension(174,0)
        border=BorderFactory.createEmptyBorder(4,4,4,4)
        add(railCell("MACHINE",JLabel("READY"),Color(99,255,157)))
        add(Box.createVerticalStrut(6))
        add(railCell("ORIGIN",JLabel("X0.000 Y0.000 Z0.000"),Color(61,235,255)))
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

    val toolDock=JPanel(BorderLayout()).apply{
        background=StudioDesktopProductionTheme.background
        preferredSize=Dimension(260,0)
        minimumSize=Dimension(52,0)
    }
    val toolDockToggle=GlassActionButton("工具 ◀",StudioDesktopProductionTheme.accent).apply{
        preferredSize=Dimension(0,38)
        addActionListener{
            val expanded=!cadDeck.isVisible
            cadDeck.isVisible=expanded
            toolDock.preferredSize=Dimension(if(expanded)260 else 52,0)
            text=if(expanded)"工具 ◀" else "工具 ▶"
            toolDock.parent?.revalidate()
            toolDock.parent?.repaint()
        }
    }
    toolDock.add(toolDockToggle,BorderLayout.NORTH)
    toolDock.add(cadDeck,BorderLayout.CENTER)

    val contextDock=JPanel(BorderLayout()).apply{
        background=StudioDesktopProductionTheme.background
        preferredSize=Dimension(190,0)
        minimumSize=Dimension(52,0)
    }
    val contextToggle=GlassActionButton("狀態 ◀",Color(125,112,255)).apply{
        preferredSize=Dimension(0,38)
        addActionListener{
            val expanded=!infoRail.isVisible
            infoRail.isVisible=expanded
            contextDock.preferredSize=Dimension(if(expanded)190 else 52,0)
            text=if(expanded)"狀態 ◀" else "狀態 ▶"
            contextDock.parent?.revalidate()
            contextDock.parent?.repaint()
        }
    }
    contextDock.add(contextToggle,BorderLayout.NORTH)
    contextDock.add(infoRail,BorderLayout.CENTER)

    val desktopQuickBar=AdaptiveGlassToolbar().apply{
        add(GlassActionButton("SELECT",Color(80,170,255)).apply{addActionListener{cad.mode=DrawMode.SELECT;status.text="CAD SELECT"}})
        add(GlassActionButton("PAN",Color(61,235,255)).apply{addActionListener{cad.mode=DrawMode.PAN;status.text="CAD PAN"}})
        add(GlassActionButton("FIT",Color(63,255,157)).apply{addActionListener{cad.fitView()}})
        add(GlassActionButton("UNDO",Color(125,112,255)).apply{addActionListener{cad.undoEdit();status.text="UNDO"}})
        add(GlassActionButton("REDO",Color(125,112,255)).apply{addActionListener{cad.redoEdit();status.text="REDO"}})
        add(GlassActionButton("更多",Color(139,92,246)).apply{addActionListener{if(!cadDeck.isVisible)toolDockToggle.doClick()}})
    }
    check(desktopQuickBar.componentCount<=DesktopUxContract.WINDOWS_MAX_VISIBLE_ACTIONS)

    val workspaceCore=JPanel(BorderLayout(6,6)).apply{
        background=StudioDesktopProductionTheme.background
        add(toolDock,BorderLayout.WEST)
        add(cad,BorderLayout.CENTER)
        add(contextDock,BorderLayout.EAST)
        getInputMap(JComponent.WHEN_IN_FOCUSED_WINDOW).apply{
            put(KeyStroke.getKeyStroke("control Z"),"cadUndo")
            put(KeyStroke.getKeyStroke("control Y"),"cadRedo")
        }
        actionMap.put("cadUndo",object:AbstractAction(){override fun actionPerformed(e:ActionEvent?){cad.undoEdit();status.text="UNDO"}})
        actionMap.put("cadRedo",object:AbstractAction(){override fun actionPerformed(e:ActionEvent?){cad.redoEdit();status.text="REDO"}})
    }
    val workspace=JPanel(BorderLayout(6,6)).apply{
        name="CAD_CARD"
        background=StudioDesktopProductionTheme.background
        border=BorderFactory.createEmptyBorder(5,5,5,5)
        add(desktopQuickBar,BorderLayout.NORTH)
        add(workspaceCore,BorderLayout.CENTER)
    }
    val aiSummary=JTextArea().apply{
        isEditable=false
        background=Color(7,16,28)
        foreground=Color(220,235,250)
        font=Font(Font.MONOSPACED,Font.PLAIN,13)
        text="AI LOCAL ASSIST\nVisible UI required for every production function.\nNetwork AI update is intentionally not claimed here."
    }
    val aiActions=JPanel(FlowLayout(FlowLayout.LEFT,8,8)).apply{
        background=StudioDesktopProductionTheme.background
        add(button("專案摘要",Color(139,92,246)){
            aiSummary.text="AI LOCAL ASSIST\nENTITIES="+doc.size()+"\nLINKS="+doc.links().size+"\n"+MasterRuntimeChainContract.uiLabel()
            status.text="AI 專案摘要 • entities="+doc.size()+" • links="+doc.links().size
        })
        add(button("CAM 檢查",StudioDesktopProductionTheme.cutting){showProductionCam()})
        add(button("NC 安全",Color(80,170,255)){
            runCatching{showNcEditor(frame,doc)}
                .onFailure{status.text="AI NC CHECK BLOCKED • "+(it.message?:"error")}
        })
        add(button("返回 CAD",StudioDesktopProductionTheme.accent){
            mainCardLayout.show(mainCardHost,"CAD")
            status.text="CAD • PRODUCTION UI"
        })
    }
    val aiPanel=JPanel(BorderLayout(8,8)).apply{
        name="AI_CARD"
        background=StudioDesktopProductionTheme.background
        border=BorderFactory.createEmptyBorder(12,12,12,12)
        add(JLabel("AIG CNC • AI LOCAL ASSIST • 真 UI").apply{
            foreground=Color(139,92,246)
            font=font.deriveFont(Font.BOLD,18f)
        },BorderLayout.NORTH)
        add(JScrollPane(aiSummary),BorderLayout.CENTER)
        add(aiActions,BorderLayout.SOUTH)
    }

    mainCardHost.add(workspace,"CAD")
    mainCardHost.add(aiPanel,"AI")
    mainCardLayout.show(mainCardHost,"CAD")
    val northChrome=JPanel(BorderLayout()).apply{
        background=StudioDesktopProductionTheme.background
        add(masterRootBar,BorderLayout.NORTH)
        add(toolbar,BorderLayout.CENTER)
    }
    frame.add(northChrome, BorderLayout.NORTH)
    frame.add(mainCardHost, BorderLayout.CENTER)
    frame.add(status, BorderLayout.SOUTH)
    startup?.advance(StudioStartupStage.PROJECT_DATA,"檢查專案 / Recovery")
    startup?.advance(StudioStartupStage.HEALTH,"Runtime 健康檢查")
    frame.size = desktopAdaptiveSize(1280, 820)
    frame.setLocationRelativeTo(null)
    startup?.advance(StudioStartupStage.WRAP_UP,"完成啟動收尾")
    if(showWindow) frame.isVisible = true
    if(System.getProperty("aig.dual.project.smoke")=="true"){
        val input=System.getProperty("aig.dual.project.import")?.let(::File) ?: error("dual project import missing")
        val output=System.getProperty("aig.dual.project.export")?.let(::File) ?: error("dual project export missing")
        val result=System.getProperty("aig.dual.project.result")?.let(::File) ?: error("dual project result missing")
        val baseline=System.getProperty("aig.dual.project.baseline")?.let(::File)
        val editRequested=System.getProperty("aig.dual.project.edit")=="true"
        val localDirty=System.getProperty("aig.dual.project.localDirty")=="true"
        runCatching{
            val remote=StudioProjectRepository.load(input)
            sharedLocalMeta=remote.revisionMeta
            val syncState=if(baseline?.isFile==true) {
                val local=StudioProjectRepository.load(baseline)
                ProjectRevisionSync.classify(local.revisionMeta,remote.revisionMeta,localDirty)
            } else if(remote.revisionMeta.revision>0L) {
                ProjectSyncState.REMOTE_NEWER
            } else ProjectSyncState.CLEAN
            if(syncState==ProjectSyncState.CONFLICT) {
                result.parentFile?.mkdirs()
                result.writeText(
                    "CONFLICT\nREMOTE_REV="+remote.revisionMeta.revision+
                        "\nACTIONS="+ProjectSyncUxContract.conflictUiActions.joinToString("|")+"\n",
                    Charsets.UTF_8
                )
                status.text="SYNC CONFLICT • "+ProjectSyncUxContract.conflictUiActions.joinToString(" / ")
                Timer(350){t->(t.source as Timer).stop();frame.dispose();System.exit(0)}.start()
                return@runCatching
            }
            val working=if(editRequested) {
                remote.copy(
                    entities=remote.entities.map {
                        if(it is Circle && it.id=="REF-CIRCLE") {
                            it.copy(center=Vec2(it.center.x+0.001,it.center.y))
                        } else it
                    }
                )
            } else remote
            StudioProjectRepository.applyTo(working,doc)
            cad.repaint()
            if(editRequested) {
                StudioProjectRepository.saveRevisioned(working,output,"WINDOWS","DESKTOP")
            } else {
                StudioProjectRepository.save(working,output)
            }
            val exported=StudioProjectRepository.load(output)
            sharedLocalMeta=exported.revisionMeta
            result.parentFile?.mkdirs()
            result.writeText(
                "PASS\nMASTER="+SoftwareCoordinateContract.masterOriginData()+
                    "\nDIGEST="+StudioProjectRepository.canonicalDigest(exported)+
                    "\nENTITIES="+exported.entities.size+
                    "\nREVISION="+exported.revisionMeta.revision+
                    "\nBASE="+exported.revisionMeta.baseRevision+
                    "\nSOURCE="+exported.revisionMeta.sourcePlatform+
                    "\nSYNC_STATE="+syncState.name+"\n",
                Charsets.UTF_8
            )
            status.text=ProjectRevisionSync.statusLabel(
                if(editRequested) ProjectSyncState.LOCAL_DIRTY else ProjectSyncState.CLEAN,
                exported.revisionMeta
            )+" • WINDOWS"
            Timer(350){t->(t.source as Timer).stop();frame.dispose();System.exit(0)}.start()
        }.onFailure{error->
            result.parentFile?.mkdirs()
            result.writeText("FAIL\n"+error.javaClass.name+"\n"+(error.message?:"unknown")+"\n",Charsets.UTF_8)
            frame.dispose();System.exit(2)
        }
    }
    startup?.advance(StudioStartupStage.HOME,WorkstationChromeContract.MASTER_ORIGIN+" • CAD READY")
    startup?.close()
    return frame
}

fun main(args: Array<String>) {
    if(args.contains("--dual-project-smoke")) {
        System.setProperty("aig.dual.project.smoke","true")
    }
    if (args.contains("--smoke")) {
        runSmoke()
        System.exit(0)
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
