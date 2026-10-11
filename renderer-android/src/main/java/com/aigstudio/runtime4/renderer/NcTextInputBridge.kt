package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*

class NcTextInputBridge(private val runtime:NcRuntimePort,private val invalidate:()->Unit={}){
    fun commitText(text:String)=dispatch(NcCommand.InsertText(text))
    fun backspace()=dispatch(NcCommand.Backspace)
    fun deleteForward()=dispatch(NcCommand.DeleteForward)
    fun newBlock()=dispatch(NcCommand.NewBlock)
    private fun dispatch(command:NcCommand):Boolean{val result=runtime.dispatch(command);invalidate();return result.accepted}
}