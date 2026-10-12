package com.aig.feature.home
import android.content.Context
import android.graphics.Color
import android.view.Gravity
import android.view.View
import android.widget.*
import com.aig.core.settings.RuntimeSettings
import com.aig.core.ui.R as UiR
import com.aig.core.ui.UiKit
object HomeFeatureView{fun create(c:Context):View=FrameLayout(c).apply{setBackgroundColor(Color.rgb(2,4,7));addView(ImageView(c).apply{setImageResource(UiR.drawable.aig_home);scaleType=ImageView.ScaleType.CENTER_CROP;contentDescription="AIG RGB HOME official skin"},FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT,FrameLayout.LayoutParams.MATCH_PARENT));val o=UiKit.panel(c).apply{gravity=Gravity.CENTER_HORIZONTAL;val s=RuntimeSettings();addView(UiKit.label(c,"AIG-II / AIG CNC 434",25f));addView(UiKit.label(c,"正式 RGB HOME • Android 官方 Runtime",16f));addView(UiKit.statusLabel(c,"0.001 mm • ${s.fps.fps}Hz • GPU 3D ${if(s.gpu3d)"ON" else "OFF"} • 本機離線可用"));addView(UiKit.label(c,"CAD / CAM / NC 已連核心；SIM / 3AX / 4AX / 5AX / 6AX 使用 Runtime OpenGL ES，SIM 顯示數值材料移除證據。",12f))};addView(o,FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT,FrameLayout.LayoutParams.WRAP_CONTENT,Gravity.BOTTOM).apply{setMargins(UiKit.dp(c,12),UiKit.dp(c,12),UiKit.dp(c,12),UiKit.dp(c,16))})}}
