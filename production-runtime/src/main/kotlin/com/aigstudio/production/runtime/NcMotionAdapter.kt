package com.aigstudio.production.runtime

import com.aigstudio.core.*
import com.aigstudio.runtime4.contract.*
import java.security.MessageDigest
import kotlin.math.abs
import kotlin.math.round

object NcMotionAdapter {
    private val word=Regex("""(?i)([A-Z])\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?=\s|[A-Z]|;|$)""")
    private val cycleCodes=setOf("G73","G81","G82","G83","G84","G85","G86","G87","G88","G89")

    fun parse(program:String,profile:NcMachineProfileSnapshot,revision:Long):Pair<MotionProgram,List<NcDiagnostic>> {
        val normalized=program.replace("\r\n","\n").replace('\r','\n')
        val diagnostics=mutableListOf<NcDiagnostic>()
        val limits=NcMachineTravelLimits(
            x=profile.x?.let{NcAxisTravelRange(it.min,it.max)},y=profile.y?.let{NcAxisTravelRange(it.min,it.max)},
            z=profile.z?.let{NcAxisTravelRange(it.min,it.max)},a=profile.a?.let{NcAxisTravelRange(it.min,it.max)},
            b=profile.b?.let{NcAxisTravelRange(it.min,it.max)},c=profile.c?.let{NcAxisTravelRange(it.min,it.max)},
        )
        val g34=when(profile.g34Profile.uppercase()){
            "XY_J0_I_DIAMETER_K_COUNT"->G34VendorProfile.xyJ0IDiameterKCount()
            else->G34VendorProfile.unconfigured()
        }
        val rotaryProfile=RotaryAxisClampProfile.configured(
            installedOptionalCodes=profile.customCodes,
            g34VendorProfile=g34,
        )
        NcEditorAlarmRouter.firstAlarm(
            normalized,CncControllerProfile.FANUC,limits,rotaryProfile,RotaryAxisOperationMode.NONE
        )?.let{a->diagnostics+=NcDiagnostic(a.lineNumber,MessageSeverity.WARNING,a.code,a.compact())}

        normalized.lineSequence().forEachIndexed{index,raw->
            val words=words(raw)
            fun used(axis:Char)=words.any{it.first==axis}
            if(profile.axisCount<4 && used('A')) diagnostics+=profileDiagnostic(index+1,'A')
            if(profile.axisCount<5 && used('B')) diagnostics+=profileDiagnostic(index+1,'B')
            if(profile.axisCount<6 && used('C')) diagnostics+=profileDiagnostic(index+1,'C')
        }

        var absolute=true
        var modalMotion=NcMotionKind.NONE
        var activeCycle:String?=null
        var workOffset:String?="G54"
        var feed:Double?=null;var spindle:Double?=null;var tool:Int?=null
        val pos=mutableMapOf('X' to 0.0,'Y' to 0.0,'Z' to 0.0,'A' to 0.0,'B' to 0.0,'C' to 0.0)
        val blocks=mutableListOf<MotionBlockSnapshot>()
        normalized.split("\n").forEachIndexed{index,raw->
            if(raw.isBlank()) return@forEachIndexed
            val ws=words(raw)
            val gCodes=ws.filter{it.first=='G'}.map{normalizeCode('G',it.second)}
            val mCodes=ws.filter{it.first=='M'}.map{normalizeCode('M',it.second)}
            if("G90" in gCodes) absolute=true
            if("G91" in gCodes) absolute=false
            gCodes.firstOrNull{it in setOf("G54","G55","G56","G57","G58","G59")}?.let{workOffset=it}
            gCodes.firstOrNull{it in setOf("G0","G1","G2","G3")}?.let{modalMotion=when(it){"G0"->NcMotionKind.G0;"G1"->NcMotionKind.G1;"G2"->NcMotionKind.G2;else->NcMotionKind.G3}}
            if("G80" in gCodes) activeCycle=null
            gCodes.firstOrNull{it in cycleCodes}?.let{activeCycle=it}
            ws.lastOrNull{it.first=='F'}?.second?.let{feed=it}
            ws.lastOrNull{it.first=='S'}?.second?.let{spindle=it}
            ws.lastOrNull{it.first=='T'}?.second?.let{tool=round(it).toInt()}
            val hasAxis=ws.any{it.first in setOf('X','Y','Z','A','B','C')}
            val explicitCycle=gCodes.firstOrNull{it in cycleCodes}
            val motion=when {
                explicitCycle!=null -> NcMotionKind.CYCLE
                activeCycle!=null && hasAxis -> NcMotionKind.CYCLE
                hasAxis && modalMotion!=NcMotionKind.NONE -> modalMotion
                else -> NcMotionKind.NONE
            }
            if(motion!=NcMotionKind.NONE){
                ws.filter{it.first in pos.keys}.forEach{(axis,value)->pos[axis]=if(absolute)value else pos.getValue(axis)+value}
            }
            val hasMotion=motion!=NcMotionKind.NONE
            fun p(axis:Char)=if(hasMotion)pos.getValue(axis) else null
            blocks+=MotionBlockSnapshot(
                lineNumber=index+1,raw=raw,x=p('X'),y=p('Y'),z=p('Z'),a=p('A'),b=p('B'),c=p('C'),motion=motion,
                arcI=ws.lastOrNull{it.first=='I'}?.second,arcJ=ws.lastOrNull{it.first=='J'}?.second,arcK=ws.lastOrNull{it.first=='K'}?.second,
                feed=feed,spindle=spindle,tool=tool,mCodes=mCodes,cycleCode=if(motion==NcMotionKind.CYCLE)activeCycle else null,sourceWorkOffset=workOffset
            )
        }
        val digest=sha256(normalized+"\nPROFILE="+profile.id+"|"+profile.revision+"|"+profile.digest+"|AX="+profile.axisCount)
        return MotionProgram("MP"+revision,revision,digest,blocks) to diagnostics.distinctBy{Triple(it.lineNumber,it.code,it.message)}
    }

    private fun profileDiagnostic(line:Int,axis:Char)=NcDiagnostic(line,MessageSeverity.WARNING,"AXIS_"+axis+"_UNSUPPORTED_BY_PROFILE","Axis "+axis+" is preserved in NC text but not supported by the selected machine profile")
    private fun words(raw:String):List<Pair<Char,Double>>{
        val clean=raw.replace(Regex("""\([^)]*\)""")," ").substringBefore(';').uppercase()
        return word.findAll(clean).mapNotNull{m->m.groupValues[2].toDoubleOrNull()?.takeIf{it.isFinite()}?.let{m.groupValues[1].uppercase()[0] to it}}.toList()
    }
    private fun normalizeCode(prefix:Char,value:Double):String{
        val v=if(abs(value-round(value))<=1e-9)round(value).toLong().toString() else java.math.BigDecimal.valueOf(value).stripTrailingZeros().toPlainString()
        return prefix.uppercaseChar()+v
    }
    private fun sha256(text:String)=MessageDigest.getInstance("SHA-256").digest(text.toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}
}