package com.aigstudio.core

enum class RuntimeLinkStatus(val colorToken:String) {
    CONNECTED("CYAN_GREEN"),
    DEGRADED("YELLOW"),
    DISCONNECTED("GRAY")
}

enum class RuntimeLinkId(
    val displayName:String,
    val cockpitLeft:String?=null,
    val cockpitRight:String?=null
) {
    CAD_CAM("CAD ? CAM","CAD","CAM"),
    CAM_SIM("CAM ? 3D SIM","CAM","3D SIM"),
    SIM_NC("3D SIM ? NC","3D SIM","NC"),
    GPU_3D("3D GPU"),
    MACHINE("????")
}

data class RuntimeLinkSnapshot(
    private val values:Map<RuntimeLinkId,RuntimeLinkStatus>
) {
    fun status(id:RuntimeLinkId):RuntimeLinkStatus=
        values[id] ?: RuntimeLinkStatus.DISCONNECTED
    fun asMap():Map<RuntimeLinkId,RuntimeLinkStatus> = values.toMap()
    fun allAvailable(ids:Collection<RuntimeLinkId>):Boolean=ids.all{status(it)!=RuntimeLinkStatus.DISCONNECTED}
    fun allHealthy(ids:Collection<RuntimeLinkId>):Boolean=ids.all{status(it)==RuntimeLinkStatus.CONNECTED}
    fun anyDegraded(ids:Collection<RuntimeLinkId>):Boolean=ids.any{status(it)==RuntimeLinkStatus.DEGRADED}
}

object RuntimeLinkContract {
    const val DISCONNECT_POLICY="DATA_FLOW_ONLY_PRESERVE_RUNTIME_DATA"
    val PRESERVED_DOMAINS=setOf("CAD_GEOMETRY","CAM_TOOLPATH","SIM_STATE","NC_GCODE")
    val cockpitLinks=listOf(RuntimeLinkId.CAD_CAM,RuntimeLinkId.CAM_SIM,RuntimeLinkId.SIM_NC)
    val managedLinks=listOf(
        RuntimeLinkId.CAD_CAM,RuntimeLinkId.CAM_SIM,RuntimeLinkId.SIM_NC,
        RuntimeLinkId.GPU_3D,RuntimeLinkId.MACHINE
    )
    val userToggleableLinks=cockpitLinks.toSet()
    val runtimeOwnedLinks=managedLinks.filterNot { it in userToggleableLinks }.toSet()
    fun defaultStatus(id:RuntimeLinkId):RuntimeLinkStatus=
        if(id in userToggleableLinks) RuntimeLinkStatus.CONNECTED else RuntimeLinkStatus.DISCONNECTED
}

class RuntimeLinkStore {
    private val values=linkedMapOf<RuntimeLinkId,RuntimeLinkStatus>().apply {
        RuntimeLinkContract.managedLinks.forEach { put(it,RuntimeLinkContract.defaultStatus(it)) }
    }
    private val observers=linkedSetOf<(RuntimeLinkSnapshot)->Unit>()

    @Synchronized fun status(id:RuntimeLinkId):RuntimeLinkStatus=
        values[id] ?: RuntimeLinkStatus.DISCONNECTED

    @Synchronized fun snapshot():RuntimeLinkSnapshot=RuntimeLinkSnapshot(values.toMap())

    fun observe(observer:(RuntimeLinkSnapshot)->Unit):()->Unit {
        val first= synchronized(this) { observers += observer; RuntimeLinkSnapshot(values.toMap()) }
        observer(first)
        return { synchronized(this) { observers -= observer } }
    }

    fun set(id:RuntimeLinkId,status:RuntimeLinkStatus):RuntimeLinkStatus {
        val targets:List<(RuntimeLinkSnapshot)->Unit>
        val snap:RuntimeLinkSnapshot
        synchronized(this) {
            if(values[id]==status) return status
            values[id]=status
            snap=RuntimeLinkSnapshot(values.toMap())
            targets=observers.toList()
        }
        targets.forEach { it(snap) }
        return status
    }

    fun reportHealth(id:RuntimeLinkId,transportAvailable:Boolean,dataFlowHealthy:Boolean):RuntimeLinkStatus {
        val next=when {
            !transportAvailable -> RuntimeLinkStatus.DISCONNECTED
            dataFlowHealthy -> RuntimeLinkStatus.CONNECTED
            else -> RuntimeLinkStatus.DEGRADED
        }
        return set(id,next)
    }

    fun toggle(id:RuntimeLinkId):RuntimeLinkStatus {
        if(id !in RuntimeLinkContract.userToggleableLinks) return status(id)
        val next=if(status(id)==RuntimeLinkStatus.CONNECTED)
            RuntimeLinkStatus.DISCONNECTED else RuntimeLinkStatus.CONNECTED
        return set(id,next)
    }
}
