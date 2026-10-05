package com.aigstudio.bootstrap

import com.aigstudio.desktop.HomeRgbDesktopInstaller
import com.aigstudio.desktop.tutorial.TutorialDesktopInstaller

/** Installs validated HOME/tutorial visual layers, then delegates to the existing production runtime. */
fun main(args:Array<String>) {
    if(!args.contains("--smoke")) {
        HomeRgbDesktopInstaller.install()
        TutorialDesktopInstaller.install()
    }
    val entry=Class.forName("com.aigstudio.desktop.DesktopAppKt")
        .getMethod("main",Array<String>::class.java)
    entry.invoke(null,args as Any)
}
