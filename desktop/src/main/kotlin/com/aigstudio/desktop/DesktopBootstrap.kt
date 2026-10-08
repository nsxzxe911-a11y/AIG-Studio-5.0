package com.aigstudio.bootstrap

import com.aigstudio.desktop.AigRgbDesktopSkinRuntime
import com.aigstudio.desktop.HomeRgbDesktopInstaller
import com.aigstudio.desktop.RuntimeSurfaceDesktopInstaller
import com.aigstudio.desktop.RuntimeLocalizationDesktopInstaller

/** Installs validated RGB skin/HOME/surface/localization/tutorial layers, then delegates to the existing production runtime. */
fun main(args:Array<String>) {
    val smoke=args.contains("--smoke")
    if(!smoke) {
        AigRgbDesktopSkinRuntime.install()
        HomeRgbDesktopInstaller.install()
        RuntimeSurfaceDesktopInstaller.install()
        RuntimeLocalizationDesktopInstaller.install()
        installOptionalTutorial()
    }

    // The real RGB product frame is the first visible surface.
    val entry=Class.forName("com.aigstudio.desktop.DesktopAppKt")
        .getMethod("main",Array<String>::class.java)
    entry.invoke(null,args as Any)
}

private fun installOptionalTutorial() {
    runCatching {
        val type=Class.forName("com.aigstudio.desktop.tutorial.TutorialDesktopInstaller")
        val instance=type.getField("INSTANCE").get(null)
        type.getMethod("install").invoke(instance)
    }.onFailure {
        System.err.println("OPTIONAL_MODULE_SKIP|TUTORIAL_V1|WINDOWS|STATUS_ONLY|NO_ROLLBACK|"+it.javaClass.simpleName)
    }
}
