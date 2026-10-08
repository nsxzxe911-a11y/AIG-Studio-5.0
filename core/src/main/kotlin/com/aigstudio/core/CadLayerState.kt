package com.aigstudio.core

enum class CadLayerId { WORKPIECE, DIMENSIONS, CENTERLINE, TOOLPATH, SIMULATION, ORIGIN }

data class CadLayerSnapshot(
    val activeLayer:CadLayerId=CadLayerId.WORKPIECE,
    val visibility:Map<CadLayerId,Boolean> = CadLayerId.entries.associateWith { true },
    val entityLayers:Map<EntityId,CadLayerId> = emptyMap()
)

class CadLayerState {
    private var active=CadLayerId.WORKPIECE
    private val visibility=CadLayerId.entries.associateWith{true}.toMutableMap()
    private val entityLayers=linkedMapOf<EntityId,CadLayerId>()

    fun activeLayer():CadLayerId=active
    fun setActiveLayer(layer:CadLayerId){ active=layer }
    fun isVisible(layer:CadLayerId):Boolean=visibility[layer]!=false
    fun setVisible(layer:CadLayerId,visible:Boolean){visibility[layer]=visible}
    fun layerOf(id:EntityId):CadLayerId=entityLayers[id] ?: CadLayerId.WORKPIECE
    fun onPut(id:EntityId){entityLayers.putIfAbsent(id,active)}
    fun onRemove(id:EntityId){entityLayers.remove(id)}
    fun assign(ids:Collection<EntityId>,layer:CadLayerId){ids.forEach{entityLayers[it]=layer}}
    fun clear(){active=CadLayerId.WORKPIECE;visibility.keys.forEach{visibility[it]=true};entityLayers.clear()}
    fun snapshot(liveIds:Collection<EntityId>):CadLayerSnapshot {
        val live=liveIds.toSet()
        return CadLayerSnapshot(
            activeLayer=active,
            visibility=CadLayerId.entries.associateWith{isVisible(it)},
            entityLayers=live.associateWith{layerOf(it)}
        )
    }
    fun restore(snapshot:CadLayerSnapshot,liveIds:Collection<EntityId>){
        val live=liveIds.toSet()
        active=snapshot.activeLayer
        CadLayerId.entries.forEach{visibility[it]=snapshot.visibility[it]!=false}
        entityLayers.clear()
        live.forEach{id->entityLayers[id]=snapshot.entityLayers[id] ?: CadLayerId.WORKPIECE}
    }
}
