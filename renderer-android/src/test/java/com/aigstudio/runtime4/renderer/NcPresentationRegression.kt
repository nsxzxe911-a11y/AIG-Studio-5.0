package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import org.junit.Assert.*
import org.junit.Test

class NcPresentationRegression {
    @Test fun presentationKeepsWorkingCandidateCursorAndLocalDiagnosticsSeparate() {
        val program="G90 G54\nG999 X0.\nG0 X0. C35.\nM30"
        val candidate=NcCandidate("C8",8,"d2","G90 G54\nG0 X1.\nM30",NcCandidateSourceKind.CAM_POST)
        val diagnostic=NcDiagnostic(2,MessageSeverity.WARNING,"UNSUPPORTED_GCODE","Unsupported G-code")
        val state=NcState.initial().copy(
            working=NcWorkingCopy("NC12",12,"d1",program,program.indexOf("C35"),false),
            camLink=NcCamLinkState.DISCONNECTED,candidate=candidate,previewCandidateId="C8",
            diagnostics=listOf(diagnostic),message=RuntimeMessage(MessageSeverity.WARNING,"L2 Unsupported G-code")
        )
        val p=NcPresentation.from(state)
        assertEquals("NC12",p.workingId);assertEquals(12L,p.revision)
        assertEquals("C8",p.candidateId);assertEquals("C8",p.previewCandidateId)
        assertEquals(NcCamLinkState.DISCONNECTED,p.camLink)
        assertEquals(4,p.lines.size)
        assertEquals(2,p.lines.first{it.number==2}.diagnostic?.lineNumber)
        assertEquals(3,p.cursorLine)
        assertEquals(MessageSeverity.WARNING,p.localMessage?.severity)
        assertFalse(p.frozen)
    }
}