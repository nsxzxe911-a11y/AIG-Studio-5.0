package com.aigstudio.runtime4.renderer.gpu

import kotlin.math.cos
import kotlin.math.sin

object CylinderMeshFactory {
    fun alongX(length:Float,radius:Float,segments:Int=32):FloatArray {
        require(length>0f && radius>0f && segments>=8)
        val x0=-length/2f;val x1=length/2f;val out=ArrayList<Float>(segments*12*6)
        fun v(x:Float,y:Float,z:Float,nx:Float,ny:Float,nz:Float){out+=x;out+=y;out+=z;out+=nx;out+=ny;out+=nz}
        for(i in 0 until segments){
            val a0=(Math.PI*2.0*i/segments).toFloat();val a1=(Math.PI*2.0*(i+1)/segments).toFloat()
            val y0=cos(a0)*radius;val z0=sin(a0)*radius;val y1=cos(a1)*radius;val z1=sin(a1)*radius
            val ny0=cos(a0);val nz0=sin(a0);val ny1=cos(a1);val nz1=sin(a1)
            v(x0,y0,z0,0f,ny0,nz0);v(x1,y0,z0,0f,ny0,nz0);v(x1,y1,z1,0f,ny1,nz1)
            v(x0,y0,z0,0f,ny0,nz0);v(x1,y1,z1,0f,ny1,nz1);v(x0,y1,z1,0f,ny1,nz1)
            v(x0,0f,0f,-1f,0f,0f);v(x0,y1,z1,-1f,0f,0f);v(x0,y0,z0,-1f,0f,0f)
            v(x1,0f,0f,1f,0f,0f);v(x1,y0,z0,1f,0f,0f);v(x1,y1,z1,1f,0f,0f)
        }
        return out.toFloatArray()
    }
}