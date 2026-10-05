package com.aigstudio.desktop

/** Installs the validated HOME visual layer, then delegates to the existing production runtime. */
fun main(args: Array<String>) {
    HomeRgbDesktopInstaller.install()
    val entry = Class.forName("com.aigstudio.desktop.DesktopAppKt")
        .getMethod("main", Array<String>::class.java)
    entry.invoke(null, args as Any)
}
