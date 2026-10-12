package com.aig.fifth432

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import com.aig.core.ui.R as UiR
import com.aig.core.ui.RgbGlassButton
import com.aig.core.ui.UiKit
import com.aig.feature.home.HomeFeatureView
import com.aig.feature.cad.CadFeatureView
import com.aig.feature.cam.CamFeatureView
import com.aig.feature.nc.NcFeatureView
import com.aig.renderer.unity.api.AxisPose
import com.aig.renderer.unity.api.MachineGlView
import com.aig.renderer.unity.api.MachineMode

class MainActivity : Activity() {
    private lateinit var content: FrameLayout
    private val nav = linkedMapOf<String, RgbGlassButton>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(2, 4, 7)
        window.navigationBarColor = Color.rgb(2, 4, 7)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(2, 4, 7))
        }

        content = FrameLayout(this).apply {
            setBackgroundColor(Color.rgb(2, 4, 7))
        }
        root.addView(
            content,
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
        )

        val navRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(UiKit.dp(this@MainActivity, 6), UiKit.dp(this@MainActivity, 4), UiKit.dp(this@MainActivity, 6), UiKit.dp(this@MainActivity, 6))
        }
        listOf("HOME", "CAD", "CAM", "SIM", "3AX", "4AX", "5AX", "6AX", "NC", "AI").forEach { name ->
            val button = RgbGlassButton(this).apply {
                text = name
                contentDescription = name
                setOnClickListener { open(name) }
            }
            nav[name] = button
            navRow.addView(
                button,
                LinearLayout.LayoutParams(UiKit.dp(this, 82), UiKit.dp(this, 52)).apply {
                    setMargins(UiKit.dp(this@MainActivity, 3), 0, UiKit.dp(this@MainActivity, 3), 0)
                }
            )
        }

        val navScroll = HorizontalScrollView(this).apply {
            isHorizontalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_NEVER
            setBackgroundColor(Color.rgb(2, 4, 7))
            addView(navRow)
        }
        root.addView(
            navScroll,
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                UiKit.dp(this, 62)
            )
        )

        setContentView(root)
        open("HOME")
    }

    private fun open(name: String) {
        nav.forEach { (key, button) -> button.setActive(key == name) }
        val view: View = when (name) {
            "HOME" -> HomeFeatureView.create(this)
            "CAD" -> CadFeatureView.create(this)
            "CAM" -> CamFeatureView.create(this)
            "NC" -> NcFeatureView.create(this)
            "SIM" -> machinePage("SIM", UiR.drawable.aig_sim, MachineMode.SIM, emptyList(), false)
            "3AX" -> machinePage("3AX", UiR.drawable.aig_axis3, MachineMode.AXIS3, emptyList(), false)
            "4AX" -> machinePage("4AX", UiR.drawable.aig_axis4, MachineMode.AXIS4, listOf('A'), false)
            "5AX" -> machinePage("5AX", UiR.drawable.aig_axis5, MachineMode.AXIS5, listOf('A', 'B'), false)
            "6AX" -> machinePage("6AX", UiR.drawable.aig_machine, MachineMode.AXIS6, listOf('A', 'B', 'C'), true)
            else -> offlineAi()
        }
        content.removeAllViews()
        content.addView(
            view,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
    }

    private fun machinePage(
        name: String,
        skin: Int,
        mode: MachineMode,
        axes: List<Char>,
        verticalOnly: Boolean
    ): View {
        val root = UiKit.column(this)
        root.addView(UiKit.skinBanner(this, skin, 68))
        val status = UiKit.statusLabel(
            this,
            if (mode == MachineMode.SIM) "SIM • 材料移除 0.000 mm³" else "$name • 0.001 mm"
        )
        root.addView(status)

        val gl = MachineGlView(this, mode)
        gl.statusListener = { s -> status.text = s }
        root.addView(
            gl,
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
        )

        if (mode == MachineMode.SIM) {
            val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
            UiKit.addWeightedButton(row, "重設材料") {
                gl.resetSimulation()
                status.text = "SIM • 材料已重設 • 0.000 mm³"
            }
            UiKit.addWeightedButton(row, "移除量") {
                status.text = "已移除 ${"%.3f".format(gl.removedVolumeMm3())} mm³"
            }
            root.addView(row)
        } else if (axes.isNotEmpty()) {
            val controls = UiKit.toolGrid(this, axes.size * 2)
            axes.forEach { axis ->
                UiKit.addGridButton(controls, "$axis−") {
                    status.text = pose(name, gl.nudgeAxis(axis, -5.0))
                }
                UiKit.addGridButton(controls, "$axis+") {
                    status.text = pose(name, gl.nudgeAxis(axis, 5.0))
                }
            }
            root.addView(controls)
        }
        return root
    }

    private fun pose(name: String, pose: AxisPose): String =
        "$name • A ${"%.3f".format(pose.a)}° • B ${"%.3f".format(pose.b)}° • C ${"%.3f".format(pose.c)}°"

    private fun offlineAi(): View = UiKit.column(this).apply {
        addView(UiKit.statusLabel(this@MainActivity, "AI • 尚未連線"))
        addView(
            UiKit.panel(this@MainActivity).apply {
                addView(UiKit.label(this@MainActivity, "離線時 CAD / CAM / SIM / NC 仍可正常使用。", 15f))
            },
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
        )
    }
}
