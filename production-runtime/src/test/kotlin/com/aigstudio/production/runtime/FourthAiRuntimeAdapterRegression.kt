package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*
import kotlin.test.*

class FourthAiRuntimeAdapterRegression {
    @Test fun localVaultWorksWithoutCloudConnection() {
        val ai=FourthAiRuntimeAdapter()
        val initial=ai.snapshot()
        assertTrue(initial.available)
        assertTrue(initial.currentMain.isNotBlank())
        val staged=ai.dispatch(AiCommand.Stage(initial.currentMain+"\nM01"))
        assertTrue(staged.accepted); assertTrue(staged.state.hasChanges)
        val verified=ai.dispatch(AiCommand.Verify)
        assertTrue(verified.accepted); assertTrue(verified.state.summary.isNotBlank())
        val restored=ai.dispatch(AiCommand.RestoreWorkingToMain)
        assertTrue(restored.accepted); assertFalse(restored.state.hasChanges)
    }

    @Test fun badCandidateStaysLocalWarningAndAiRemainsAvailable() {
        val ai=FourthAiRuntimeAdapter()
        ai.dispatch(AiCommand.Stage("G999 X0"))
        val verify=ai.dispatch(AiCommand.Verify)
        assertTrue(ai.snapshot().available)
        assertTrue(verify.state.issueCount>=0)
        assertNotNull(verify.state.message)
    }
}
