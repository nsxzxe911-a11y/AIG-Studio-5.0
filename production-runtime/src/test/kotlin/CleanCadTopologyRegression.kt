import com.aigstudio.production.runtime.CleanCadSession
fun main(){
    val s=CleanCadSession()
    s.addLine(0.0,0.0,10.0,0.0)
    s.addLine(10.0,0.0,20.0,0.0)
    check(s.entityCount()==2)
    check(s.selectNearest(5.0,0.0,false,1.0)); check(s.selectNearest(15.0,0.0,true,1.0))
    s.connectSelected(); check(s.topologyCount()==1); check(s.entityCount()==2)
    check(s.selectNearest(5.0,0.0,false,1.0)); check(s.selectNearest(15.0,0.0,true,1.0))
    s.disconnectSelected(); check(s.topologyCount()==0); check(s.entityCount()==2)
    println("CLEAN_CAD_TOPOLOGY_PASS|AIG_CNC|CONNECT|DISCONNECT|GEOMETRY_UNCHANGED|0.001MM")
}
