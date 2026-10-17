package com.aigstudio.core

import kotlin.math.abs
import kotlin.math.round

object FanucM98RepeatCompatibility {
    private val numericWord=Regex("""(?i)([A-Z])\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?=\s|[A-Z]|;|$)""")
    private fun clean(raw:String)=raw.replace(Regex("""\([^)]*\)""")," ").substringBefore(';').trim().uppercase()
    private fun isM98(words:List<Pair<Char,Double>>)=words.any{it.first=='M' && abs(it.second-98.0)<=1e-9}

    fun findings(program:String):List<NcRuntimeInterlockFinding>{
        val out=mutableListOf<NcRuntimeInterlockFinding>()
        program.lineSequence().forEachIndexed{index,raw->
            val line=clean(raw)
            if(line.isBlank()) return@forEachIndexed
            val words=numericWord.findAll(line).mapNotNull{m->
                m.groupValues[2].toDoubleOrNull()?.takeIf{it.isFinite()}?.let{m.groupValues[1].uppercase()[0] to it}
            }.toList()
            if(!isM98(words)) return@forEachIndexed
            val repeats=words.filter{it.first=='L'}.map{it.second}
            if(repeats.size>1) out+=NcRuntimeInterlockFinding(index+1,"M98_FORMAT_DUPLICATE_L","M98 repeat L may appear only once per block.")
            repeats.forEach{value->
                if(value<=0.0) out+=NcRuntimeInterlockFinding(index+1,"M98_FORMAT_L_NONPOSITIVE","M98 repeat L must be > 0.")
                if(abs(value-round(value))>1e-9) out+=NcRuntimeInterlockFinding(index+1,"M98_FORMAT_L_NOT_INTEGER","M98 repeat L must be an integer.")
            }
        }
        return out.distinctBy{Triple(it.lineNumber,it.code,it.message)}
    }

    fun legacyProgram(program:String):String = program.lineSequence().map{raw->
        val line=clean(raw)
        val words=numericWord.findAll(line).mapNotNull{m->
            m.groupValues[2].toDoubleOrNull()?.takeIf{it.isFinite()}?.let{m.groupValues[1].uppercase()[0] to it}
        }.toList()
        if(!isM98(words)||findings(raw).isNotEmpty()) raw
        else raw.replace(Regex("""(?i)(?<![A-Z0-9_.])L\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?=\s|[A-Z]|;|$)""")," ")
            .replace(Regex("[ \\t]+")," ").trimEnd()
    }.joinToString("\n")
}

object StudioFanucProgramCompatibility {
    fun findings(program:String):List<NcRuntimeInterlockFinding> =
        (NcSixAxisCompatibility.cFindings(program)+FanucM98RepeatCompatibility.findings(program))
            .distinctBy{Triple(it.lineNumber,it.code,it.message)}

    fun legacyProgram(program:String):String =
        FanucM98RepeatCompatibility.legacyProgram(NcSixAxisCompatibility.legacyProgram(program))
}
