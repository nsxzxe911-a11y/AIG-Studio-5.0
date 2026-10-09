package com.aigstudio.production.runtime

data class CleanAxisSnapshot(val mode:String,val a:Double,val b:Double,val c:Double)

class CleanAxisSession(val mode:String) {
    private var a=0.0; private var b=0.0; private var c=0.0
    init { require(mode in setOf("4AX","5AX","6AX")) }
    @Synchronized fun rotateA(delta:Double){ a=wrap(a+delta) }
    @Synchronized fun rotateB(delta:Double){ require(mode in setOf("5AX","6AX")); b=wrap(b+delta) }
    @Synchronized fun rotateC(delta:Double){ require(mode=="6AX"); c=wrap(c+delta) }
    @Synchronized fun snapshot()=CleanAxisSnapshot(mode,a,b,c)
    private fun wrap(v:Double):Double { var x=v; while(x>360.0)x-=720.0; while(x<-360.0)x+=720.0; return x }
}
