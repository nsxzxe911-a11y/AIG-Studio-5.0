package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.renderer.gpu.AigGlesView
import org.junit.Assert.*
import org.junit.Test

class NcInputConnectionRegression {
    private class FakePort:NcRuntimePort {
        val commands=mutableListOf<NcCommand>()
        private var state=NcState.initial()
        override fun snapshot()=state
        override fun dispatch(command:NcCommand):NcDispatchResult { commands+=command; return NcDispatchResult(true,state) }
    }
    @Test fun pureTextBridgeDispatchesImeOperationsWithoutEditTextState() {
        val runtime=FakePort();var invalidations=0
        val bridge=NcTextInputBridge(runtime){invalidations++}
        assertTrue(bridge.commitText("G90 "))
        assertTrue(bridge.backspace())
        assertTrue(bridge.deleteForward())
        assertTrue(bridge.newBlock())
        assertEquals(listOf<NcCommand>(NcCommand.InsertText("G90 "),NcCommand.Backspace,NcCommand.DeleteForward,NcCommand.NewBlock),runtime.commands)
        assertEquals(4,invalidations)
    }
    @Test fun glesViewDeclaresOwnInputConnectionWithoutHiddenEditText() {
        val names=AigGlesView::class.java.declaredMethods.map{it.name}.toSet()
        assertTrue("onCreateInputConnection" in names)
        assertTrue("onCheckIsTextEditor" in names)
        assertFalse(AigGlesView::class.java.declaredFields.any{it.type.name=="android.widget.EditText"})
    }
}