package com.aigstudio.core

data class UiDualIdBinding(
    val viewId:String,
    val buttonId:String,
)

object UiDualIdContract {
    const val VIEW_PREFIX="VIEW."

    private val navigationButtons=linkedSetOf(
        "NAV_HOME","NAV_CAD","NAV_CAM","NAV_SIM","NAV_3AX",
        "NAV_4AX","NAV_5AX","NAV_6AX","NAV_NC","NAV_AI",
    )

    fun viewIdForButton(buttonId:String):String {
        PageCommandCatalog.requireDefinition(buttonId)
        return VIEW_PREFIX+buttonId
    }

    fun buttonIdForView(viewId:String):String {
        require(viewId.startsWith(VIEW_PREFIX)){"UI View ID must start with VIEW.: $viewId"}
        require(!viewId.startsWith("VIEW.NAV.")){"Navigation View ID cannot dispatch a page command: $viewId"}
        val buttonId=viewId.removePrefix(VIEW_PREFIX)
        PageCommandCatalog.requireDefinition(buttonId)
        require(viewId==viewIdForButton(buttonId)){"UI View/Button ID mismatch: $viewId / $buttonId"}
        return buttonId
    }

    fun navigationViewId(buttonId:String):String {
        require(buttonId in navigationButtons){"Unknown production navigation Button ID: $buttonId"}
        return "VIEW.NAV."+buttonId.removePrefix("NAV_")
    }

    fun navigationButtonId(viewId:String):String {
        require(viewId.startsWith("VIEW.NAV.")){"Not a production navigation View ID: $viewId"}
        val buttonId="NAV_"+viewId.removePrefix("VIEW.NAV.")
        require(buttonId in navigationButtons){"Unknown production navigation View ID: $viewId"}
        require(viewId==navigationViewId(buttonId)){"Navigation View/Button ID mismatch: $viewId / $buttonId"}
        return buttonId
    }

    fun bindingForButton(buttonId:String)=UiDualIdBinding(viewIdForButton(buttonId),buttonId)
    fun navigationBinding(buttonId:String)=UiDualIdBinding(navigationViewId(buttonId),buttonId)
}
