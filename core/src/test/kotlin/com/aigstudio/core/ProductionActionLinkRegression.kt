package com.aigstudio.core

import java.io.File

private fun productSource(vararg candidates:String):String {
    val file=candidates.map(::File).firstOrNull{it.exists()} ?: error("source missing: ${candidates.joinToString()}")
    return file.readText()
}

fun main() {
    val ids=ProductionActionContract.actions.map{it.id}
    check(ids.size==ids.toSet().size) { "duplicate action id" }
    check(ProductionPage.entries.all { page->ProductionActionContract.actions.any{it.page==page} })
    ProductionActionContract.actions.forEach { action->
        listOf(action.android,action.windows).forEach { state->
            if(state.availability==ProductionActionAvailability.DISABLED) {
                val key=state.reasonKey ?: error("disabled ${action.id} missing reason")
                UiLocalizationRegistry.supportedLocales.forEach { locale->
                    check(UiLocalizationRegistry.text(locale,key)!=key) { "missing disabled reason $locale/$key" }
                }
            }
        }
    }

    val desktop=productSource(
        "desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt",
        "../desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt"
    )
    check("fun chamferSelected(distance:Double)" in desktop)
    check("chamferCommand(doc" in desktop)
    check("button(\"CHAMFER\"" in desktop)
    check("fun filletSelected(radius:Double)" in desktop)
    check("filletCommand(doc" in desktop)
    check("button(\"FILLET\"" in desktop)
    check("var ncSingleBlock=false" in desktop)
    check("var ncDryRun=false" in desktop)
    check("GlassActionButton(\"SINGLE BLOCK\"" in desktop)
    check("GlassActionButton(\"DRY RUN\"" in desktop)
    check("NcExecutionTimeline.build(" in desktop && "area.text" in desktop)

    val android=productSource(
        "app/src/main/java/com/aigstudio/app/MainActivity.kt",
        "../app/src/main/java/com/aigstudio/app/MainActivity.kt"
    )
    check("Tool.CHAMFER" in android && "Tool.FILLET" in android)
    check("ncDryRun" in android && "SINGLE BLOCK" in android)
    check("CamPathMode.MANUAL" in android || "CamPathMode.AUTO" in android)

    val camCore=productSource(
        "core/src/main/kotlin/com/aigstudio/core/Cam.kt",
        "src/main/kotlin/com/aigstudio/core/Cam.kt"
    )
    check("enum class CamPathMode { AUTO, MANUAL }" in camCore)
    check("fun insertAvoidance(" in camCore)
    check("safeZ" in camCore)

    val machiningCore=productSource(
        "core/src/main/kotlin/com/aigstudio/core/Machining3D.kt",
        "src/main/kotlin/com/aigstudio/core/Machining3D.kt"
    )
    check("object MaterialRemoval3D" in machiningCore)
    check("object MachiningRiskScanner" in machiningCore)

    val envCore=productSource(
        "core/src/main/kotlin/com/aigstudio/core/EnvironmentSettings.kt",
        "src/main/kotlin/com/aigstudio/core/EnvironmentSettings.kt"
    )
    check("data class SixAxisRuntimeState" in envCore)
    check("fun step(state:SixAxisRuntimeState" in envCore)

    check("CamPathMode.MANUAL" in desktop && "ManualCamPathEngine.insertAvoidance(" in desktop)
    check("showUnifiedMachiningEditor(" in desktop && "\"6AX\"" in desktop)
    check("MachiningRiskScanner" in android && "RuntimeLinkStore()" in android)

    check(ProductionActionContract.spec("CAD_LAYER").windows.availability==ProductionActionAvailability.DISABLED)
    check(ProductionActionContract.spec("AI_WORKING_COPY").android.availability==ProductionActionAvailability.DISABLED)
    check(ProductionActionContract.spec("AI_WORKING_COPY").windows.availability==ProductionActionAvailability.DISABLED)
    check(ProductionActionContract.spec("SETTINGS_VISUAL_RUNTIME").windows.availability==ProductionActionAvailability.CONNECTED)

    println("AIGCNC_PRODUCTION_ACTION_LINK_PASS|HOME_CAD_CAM_SIM_AXIS_NC_AI_SETTINGS|NO_ENABLED_NOOP|DISABLED_REASONED")
}
