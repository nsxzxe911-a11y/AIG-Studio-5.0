package com.aigstudio.core

enum class RuntimeLinkStatus(val colorToken:String) {
    CONNECTED("CYAN_GREEN"),
    DISCONNECTED("GRAY"),
    WARNING("YELLOW"),
    ALARM("RED")
}

enum class RuntimeLinkId(
    val displayName:String,
    val cockpitLeft:String?=null,
    val cockpitRight:String?=null
) {
    CAD_CAM("CAD ↔ CAM","CAD","CAM"),
    CAM_SIM("CAM ↔ 3D SIM","CAM","3D SIM"),
    SIM_NC("3D SIM ↔ NC","3D SIM","NC"),
    GPU_3D("3D GPU"),
    MACHINE("機台連線")
}

data class RuntimeLinkSnapshot(
    private val values:Map<RuntimeLinkId,RuntimeLinkStatus>
) {
    fun status(id:RuntimeLinkId):RuntimeLinkStatus=
        values[id] ?: RuntimeLinkStatus.DISCONNECTED
    fun asMap():Map<RuntimeLinkId,RuntimeLinkStatus> = values.toMap()
}

object RuntimeLinkContract {
    const val DISCONNECT_POLICY="DATA_FLOW_ONLY_PRESERVE_RUNTIME_DATA"
    const val MACHINE_LINK_POLICY="PHYSICAL_HANDSHAKE_REQUIRED_NO_UI_TOGGLE"
    val PRESERVED_DOMAINS=setOf("CAD_GEOMETRY","CAM_TOOLPATH","SIM_STATE","NC_GCODE")
    val cockpitLinks=listOf(RuntimeLinkId.CAD_CAM,RuntimeLinkId.CAM_SIM,RuntimeLinkId.SIM_NC)
    val managedLinks=listOf(
        RuntimeLinkId.CAD_CAM,RuntimeLinkId.CAM_SIM,RuntimeLinkId.SIM_NC,
        RuntimeLinkId.GPU_3D,RuntimeLinkId.MACHINE
    )
}

class RuntimeLinkStore {
    private val values=linkedMapOf<RuntimeLinkId,RuntimeLinkStatus>().apply {
        RuntimeLinkContract.managedLinks.forEach { id ->
            put(id,if(id==RuntimeLinkId.MACHINE) RuntimeLinkStatus.DISCONNECTED else RuntimeLinkStatus.CONNECTED)
        }
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
        require(id!=RuntimeLinkId.MACHINE || status!=RuntimeLinkStatus.CONNECTED) {
            "MACHINE_LINK_UNVERIFIED_HANDSHAKE_BLOCKED"
        }
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

    fun toggle(id:RuntimeLinkId):RuntimeLinkStatus {
        require(id!=RuntimeLinkId.MACHINE) {
            "MACHINE_LINK_CANNOT_BE_TOGGLED_WITHOUT_TRANSPORT"
        }
        val next=if(status(id)==RuntimeLinkStatus.CONNECTED)
            RuntimeLinkStatus.DISCONNECTED else RuntimeLinkStatus.CONNECTED
        return set(id,next)
    }
}
