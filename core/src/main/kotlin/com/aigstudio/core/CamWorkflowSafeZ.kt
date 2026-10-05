package com.aigstudio.core

fun CamWorkflowEngine.updateSafeZ(settings:CamSettings,newSafeZ:Double):CamSettings {
    require(newSafeZ.isFinite() && newSafeZ>0.0){"Safe-Z must be positive and finite"}
    val path=if(settings.pathMode==CamPathMode.MANUAL) {
        settings.manualPath.map { p ->
            if(p.rapid && p.z+EPS<newSafeZ) p.copy(z=newSafeZ) else p
        }
    } else settings.manualPath
    return settings.copy(safeZ=newSafeZ,manualPath=path)
}
