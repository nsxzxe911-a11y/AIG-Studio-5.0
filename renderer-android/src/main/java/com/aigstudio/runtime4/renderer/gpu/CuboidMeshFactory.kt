package com.aigstudio.runtime4.renderer.gpu

object CuboidMeshFactory {
    fun vertices(width:Float,height:Float,depth:Float):FloatArray {
        require(width>0f && height>0f && depth>0f) { "Cuboid dimensions must be positive" }
        val x=width/2f; val y=height/2f; val z=depth/2f
        val out=ArrayList<Float>(36*6)
        fun face(nx:Float,ny:Float,nz:Float,a:FloatArray,b:FloatArray,c:FloatArray,d:FloatArray){
            fun v(p:FloatArray){out+=p[0];out+=p[1];out+=p[2];out+=nx;out+=ny;out+=nz}
            v(a);v(b);v(c);v(a);v(c);v(d)
        }
        val nnn=floatArrayOf(-x,-y,-z);val pnn=floatArrayOf(x,-y,-z);val ppn=floatArrayOf(x,y,-z);val npn=floatArrayOf(-x,y,-z)
        val nnp=floatArrayOf(-x,-y,z);val pnp=floatArrayOf(x,-y,z);val ppp=floatArrayOf(x,y,z);val npp=floatArrayOf(-x,y,z)
        face(0f,0f,-1f,pnn,nnn,npn,ppn)
        face(0f,0f,1f,nnp,pnp,ppp,npp)
        face(-1f,0f,0f,nnn,nnp,npp,npn)
        face(1f,0f,0f,pnp,pnn,ppn,ppp)
        face(0f,-1f,0f,nnn,pnn,pnp,nnp)
        face(0f,1f,0f,npn,npp,ppp,ppn)
        return out.toFloatArray()
    }
}