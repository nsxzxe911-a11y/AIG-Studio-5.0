package com.aigstudio.runtime4.renderer.gpu

enum class Axis3Part { BASE, COLUMN, TABLE, WORKPIECE, SPINDLE, TOOL }

data class Axis3PartMesh(val part: Axis3Part, val vertices: FloatArray)

object Axis3Mesh {
    fun parts(): List<Axis3PartMesh> = listOf(
        Axis3PartMesh(Axis3Part.BASE, cuboid(6.4f, 0.8f, 5.0f)),
        Axis3PartMesh(Axis3Part.COLUMN, cuboid(1.2f, 5.2f, 1.4f)),
        Axis3PartMesh(Axis3Part.TABLE, cuboid(4.4f, 0.5f, 3.2f)),
        Axis3PartMesh(Axis3Part.WORKPIECE, cuboid(2.8f, 0.8f, 2.0f)),
        Axis3PartMesh(Axis3Part.SPINDLE, cuboid(0.9f, 1.8f, 0.9f)),
        Axis3PartMesh(Axis3Part.TOOL, cuboid(0.22f, 2.0f, 0.22f)),
    )

    private fun cuboid(width: Float, height: Float, depth: Float): FloatArray {
        val x = width / 2f; val y = height / 2f; val z = depth / 2f
        val out = ArrayList<Float>(36 * 6)
        fun face(nx:Float,ny:Float,nz:Float,a:FloatArray,b:FloatArray,c:FloatArray,d:FloatArray){
            fun v(p:FloatArray){ out += p[0]; out += p[1]; out += p[2]; out += nx; out += ny; out += nz }
            v(a);v(b);v(c);v(a);v(c);v(d)
        }
        val nnn=floatArrayOf(-x,-y,-z); val pnn=floatArrayOf(x,-y,-z); val ppn=floatArrayOf(x,y,-z); val npn=floatArrayOf(-x,y,-z)
        val nnp=floatArrayOf(-x,-y,z); val pnp=floatArrayOf(x,-y,z); val ppp=floatArrayOf(x,y,z); val npp=floatArrayOf(-x,y,z)
        face(0f,0f,-1f,pnn,nnn,npn,ppn)
        face(0f,0f,1f,nnp,pnp,ppp,npp)
        face(-1f,0f,0f,nnn,nnp,npp,npn)
        face(1f,0f,0f,pnp,pnn,ppn,ppp)
        face(0f,-1f,0f,nnn,pnn,pnp,nnp)
        face(0f,1f,0f,npn,npp,ppp,ppn)
        return out.toFloatArray()
    }
}