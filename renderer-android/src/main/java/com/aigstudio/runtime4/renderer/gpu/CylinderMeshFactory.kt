package com.aigstudio.runtime4.renderer.gpu

import kotlin.math.cos
import kotlin.math.sin

object CylinderMeshFactory {
    fun alongX(length:Float,radius:Float,segments:Int=32):FloatArray=build(length,radius,segments,true)
    fun alongY(length:Float,radius:Float,segments:Int=32):FloatArray=build(length,radius,segments,false)
    private fun build(length:Float,radius:Float,segments:Int,alongX:Boolean):FloatArray{
        require(length>0f&&radius>0f&&segments>=8);val h=length/2f;val out=ArrayList<Float>(segments*12*6)
        fun emit(axial:Float,u:Float,v:Float,na:Float,nu:Float,nv:Float){if(alongX){out+=axial;out+=u;out+=v;out+=na;out+=nu;out+=nv}else{out+=u;out+=axial;out+=v;out+=nu;out+=na;out+=nv}}
        for(i in 0 until segments){val a0=(Math.PI*2.0*i/segments).toFloat();val a1=(Math.PI*2.0*(i+1)/segments).toFloat();val u0=cos(a0)*radius;val v0=sin(a0)*radius;val u1=cos(a1)*radius;val v1=sin(a1)*radius;val nu0=cos(a0);val nv0=sin(a0);val nu1=cos(a1);val nv1=sin(a1)
            emit(-h,u0,v0,0f,nu0,nv0);emit(h,u0,v0,0f,nu0,nv0);emit(h,u1,v1,0f,nu1,nv1);emit(-h,u0,v0,0f,nu0,nv0);emit(h,u1,v1,0f,nu1,nv1);emit(-h,u1,v1,0f,nu1,nv1)
            emit(-h,0f,0f,-1f,0f,0f);emit(-h,u1,v1,-1f,0f,0f);emit(-h,u0,v0,-1f,0f,0f);emit(h,0f,0f,1f,0f,0f);emit(h,u0,v0,1f,0f,0f);emit(h,u1,v1,1f,0f,0f)}
        return out.toFloatArray()
    }
}