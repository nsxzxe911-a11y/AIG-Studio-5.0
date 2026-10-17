package com.aigstudio.core

object NcSixAxisCompatibility {
    private val cWord=Regex("""(?i)(?<![A-Z])C\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?=\s|[A-Z]|;|$)""")
    private val cAddress=Regex("""(?i)(?<![A-Z])C(?=\s|[+\-.\d])""")

    private fun clean(raw:String)=raw.replace(Regex("""\([^)]*\)""")," ").substringBefore(';')

    fun cFindings(program:String):List<NcRuntimeInterlockFinding>{
        val out=mutableListOf<NcRuntimeInterlockFinding>()
        program.split("\n").forEachIndexed{index,raw->
            val line=clean(raw)
            val matches=cWord.findAll(line).toList()
            val addresses=cAddress.findAll(line).toList()
            if(addresses.size>matches.size) out+=NcRuntimeInterlockFinding(
                index+1,"MALFORMED_NUMERIC_WORD_C","Address C requires a finite numeric value."
            )
            if(matches.size>1) out+=NcRuntimeInterlockFinding(
                index+1,"DUPLICATE_AXIS_WORD_C","Axis C appears ${matches.size} times in one block; execution is fail-closed."
            )
            matches.forEach{m->
                val value=m.groupValues[1].toDoubleOrNull()
                if(value==null || !value.isFinite()) out+=NcRuntimeInterlockFinding(
                    index+1,"NON_FINITE_NUMERIC_WORD_C","Axis C must contain a finite numeric value."
                ) else if(kotlin.math.abs(value)>360.0) out+=NcRuntimeInterlockFinding(
                    index+1,"AXIS_C_TRAVEL_LIMIT_EXCEEDED","Axis C target $value exceeds verified rotary travel [-360.0,360.0]."
                )
            }
        }
        return out.distinctBy{Triple(it.lineNumber,it.code,it.message)}
    }

    fun legacyProgram(program:String):String = program.split("\n").joinToString("\n"){raw->
        val semicolon=raw.indexOf(';')
        val body=if(semicolon>=0)raw.substring(0,semicolon) else raw
        val comment=if(semicolon>=0)raw.substring(semicolon) else ""
        cWord.replace(body," ")+comment
    }

    fun hasC(program:String):Boolean=program.lineSequence().any{cWord.containsMatchIn(clean(it))}
}
