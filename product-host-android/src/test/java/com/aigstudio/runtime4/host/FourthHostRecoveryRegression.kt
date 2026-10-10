package com.aigstudio.runtime4.host

import org.junit.Assert.*
import org.junit.Test
import java.io.File

class FourthHostRecoveryRegression {
    @Test fun oneFirstFrameRecoveryPlanCompletesAndSavesCadCamNcTogether() {
        val completed=mutableListOf<String>();val saved=mutableListOf<String>()
        val plan=FourthRuntimeRecoveryPlan(
            cadComplete={completed+="CAD";RecoveryDomainStatus("CAD",true,false)},
            camComplete={completed+="CAM";RecoveryDomainStatus("CAM",true,false)},
            ncComplete={completed+="NC";RecoveryDomainStatus("NC",true,false)},
            cadSave={saved+="CAD"},camSave={saved+="CAM"},ncSave={saved+="NC"},
        )
        val statuses=plan.completeAll()
        assertEquals(listOf("CAD","CAM","NC"),completed)
        assertEquals(listOf("CAD","CAM","NC"),statuses.map{it.domain})
        plan.saveAll()
        assertEquals(listOf("CAD","CAM","NC"),saved)
    }

    @Test fun officialActivityOwnsNcRecoveryAndSharedPlan() {
        val names=FourthMainActivity::class.java.declaredFields.map{it.name}.toSet()
        assertTrue("ncRuntime" in names)
        assertTrue("recoveryPlan" in names)
    }

    @Test fun ncMilestoneVersionMovesForwardWithoutChangingApplicationId() {
        val file=sequenceOf(File("build.gradle.kts"),File("product-host-android/build.gradle.kts")).firstOrNull{it.isFile} ?: error("product-host build.gradle.kts not found")
        val text=file.readText()
        assertTrue(text.contains("applicationId = \"com.aigstudio.production.fourth395\""))
        val versionCode=Regex("versionCode = (\\d+)").find(text)?.groupValues?.get(1)?.toInt() ?: error("versionCode missing")
        val versionName=Regex("versionName = \"([^\"]+)\"").find(text)?.groupValues?.get(1) ?: error("versionName missing")
        val major=versionName.substringBefore('-').toIntOrNull() ?: error("numeric version prefix missing")
        assertTrue("versionCode must not regress",versionCode >= 398001)
        assertTrue("versionName must not regress",major >= 398)
        assertTrue("Fourth Runtime milestone name required",versionName.contains("fourth-"))
    }}