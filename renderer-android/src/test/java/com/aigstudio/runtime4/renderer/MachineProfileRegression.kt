package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.renderer.machine.*
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MachineProfileRegression {
    @Test fun axis4HasOnePhysicalRotaryAAndNoTwinTrunnionDependency() {
        val rotary=MachineProfile4AxHrtStyle.joints.filter{it.kind==JointKind.ROTARY}
        assertEquals(listOf(MachineAxis.A),rotary.map{it.axis})
        assertFalse(MachineProfile4AxHrtStyle.parts.any{it.id.contains("SUPPORT_LEFT") || it.id.contains("SUPPORT_RIGHT") || it.id.contains("TRUNNION")})
    }

    @Test fun axis5NestsBRotaryInsideATilt() {
        val a=MachineProfile5AxTrunnionStyle.joints.single{it.axis==MachineAxis.A}
        val b=MachineProfile5AxTrunnionStyle.joints.single{it.axis==MachineAxis.B}
        assertEquals(JointKind.ROTARY,a.kind)
        assertEquals(JointKind.ROTARY,b.kind)
        assertEquals(a.id,b.parentId)
    }

    @Test fun axis6CarriesXYZAndNestedABC() {
        val p=MachineProfile6AxNicStyle
        assertTrue(listOf(MachineAxis.X,MachineAxis.Y,MachineAxis.Z).all{axis->p.joints.any{it.axis==axis && it.kind==JointKind.LINEAR}})
        val a=p.joints.single{it.axis==MachineAxis.A};val b=p.joints.single{it.axis==MachineAxis.B};val c=p.joints.single{it.axis==MachineAxis.C}
        assertEquals(a.id,b.parentId)
        assertEquals(b.id,c.parentId)
    }

    @Test fun allProfilesHaveUniqueIdsFiniteAnchorsPivotsAndLimits() {
        val profiles=listOf(MachineProfile3Ax,MachineProfile4AxHrtStyle,MachineProfile5AxTrunnionStyle,MachineProfile6AxNicStyle)
        assertEquals(profiles.size,profiles.map{it.profileId}.toSet().size)
        profiles.forEach{p->
            fun finite(v:MachineVec3)=listOf(v.x,v.y,v.z).all{it.isFinite()}
            assertTrue(finite(p.workpieceAnchor));assertTrue(finite(p.toolAnchor))
            p.joints.forEach{j->assertTrue(finite(j.pivot));assertTrue(j.min.isFinite());assertTrue(j.max.isFinite());assertTrue(j.min<=j.max)}
        }
    }
}