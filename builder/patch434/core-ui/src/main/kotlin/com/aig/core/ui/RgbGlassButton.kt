package com.aig.core.ui
import android.content.Context
import android.graphics.*
import android.graphics.drawable.Drawable
import android.view.Gravity
import android.view.MotionEvent
import android.widget.TextView
class RgbGlassButton(c:Context):TextView(c){private val g=RgbGlassDrawable();init{setTextColor(Color.WHITE);textSize=12f;gravity=Gravity.CENTER;setPadding(dp(10),dp(8),dp(10),dp(8));background=g;isClickable=true;isFocusable=true;setOnTouchListener{v,e->when(e.actionMasked){MotionEvent.ACTION_DOWN->v.alpha=.66f;MotionEvent.ACTION_UP,MotionEvent.ACTION_CANCEL->v.alpha=1f};false}};fun setActive(a:Boolean){g.active=a;setTextColor(if(a)Color.rgb(130,245,255)else Color.WHITE);invalidate()};private fun dp(v:Int)=(v*resources.displayMetrics.density).toInt()}
private class RgbGlassDrawable:Drawable(){var active=false;private val f=Paint(Paint.ANTI_ALIAS_FLAG).apply{style=Paint.Style.FILL};private val s=Paint(Paint.ANTI_ALIAS_FLAG).apply{style=Paint.Style.STROKE;strokeWidth=3f};override fun draw(c:Canvas){val r=RectF(bounds).apply{inset(2f,2f)};f.color=if(active)Color.argb(230,5,38,54)else Color.argb(210,7,17,27);c.drawRoundRect(r,18f,18f,f);s.shader=LinearGradient(r.left,r.top,r.right,r.bottom,intArrayOf(Color.CYAN,Color.MAGENTA,Color.YELLOW,Color.GREEN,Color.CYAN),null,Shader.TileMode.CLAMP);s.strokeWidth=if(active)5f else 3f;c.drawRoundRect(r,18f,18f,s)};override fun setAlpha(a:Int){f.alpha=a;s.alpha=a};override fun setColorFilter(x:ColorFilter?){f.colorFilter=x;s.colorFilter=x};@Deprecated("Deprecated in Java")override fun getOpacity()=PixelFormat.TRANSLUCENT}
