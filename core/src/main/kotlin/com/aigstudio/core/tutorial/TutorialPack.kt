package com.aigstudio.core.tutorial

data class TutorialStep(
    val fact:String,
    val actionTarget:String?,
    val expressionId:String
)

data class TutorialLesson(
    val lessonId:String,
    val mode:String,
    val pageTargets:List<String>,
    val actionTargets:List<String>,
    val titleZhTw:String,
    val steps:List<TutorialStep>
)

class TutorialPack private constructor(
    val lessons:List<TutorialLesson>,
    private val pageDefaults:Map<String,String>,
    val unavailableReason:String?
) {
    companion object {
        const val TUTORIAL_UNAVAILABLE="TUTORIAL_UNAVAILABLE"

        fun loadFromClassLoader(
            classLoader:ClassLoader=TutorialPack::class.java.classLoader,
            basePath:String=""
        ):TutorialPack = loadFromReader { path ->
            val resource=if(basePath.isBlank()) path else basePath.trimEnd('/')+"/"+path
            classLoader.getResourceAsStream(resource)?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }
        }

        fun loadFromReader(readText:(String)->String?):TutorialPack = runCatching {
            val indexText=readText("tutorial-index.json") ?: error("INDEX_MISSING")
            val index=MiniJson(indexText).parse().asObject()
            require(index.string("pack_version")=="1.0.0") { "INDEX_VERSION" }
            val files=index.stringList("lesson_files")
            val defaults=index.objectValue("page_defaults").mapValues { (_,value) -> value.asString() }
            val lessons=files.map { name ->
                val text=readText("lessons/$name") ?: error("LESSON_MISSING:$name")
                val obj=MiniJson(text).parse().asObject()
                val steps=obj.arrayValue("steps").map { raw ->
                    val step=raw.asObject()
                    TutorialStep(
                        fact=step.string("fact"),
                        actionTarget=step.optionalString("action_target"),
                        expressionId=step.optionalString("expression_id") ?: "NEUTRAL"
                    )
                }
                TutorialLesson(
                    lessonId=obj.string("lesson_id"),
                    mode=obj.string("mode"),
                    pageTargets=obj.stringList("page_targets"),
                    actionTargets=obj.stringList("action_targets"),
                    titleZhTw=obj.string("title_zh_tw"),
                    steps=steps
                )
            }
            require(lessons.map { it.lessonId }.distinct().size==lessons.size) { "DUPLICATE_LESSON_ID" }
            TutorialPack(lessons,defaults.mapKeys { it.key.trim().uppercase() },null)
        }.getOrElse { error ->
            TutorialPack(emptyList(),emptyMap(),"$TUTORIAL_UNAVAILABLE|${error.message ?: error::class.java.simpleName}")
        }
    }

    val isAvailable:Boolean get()=unavailableReason==null

    fun lessonForPage(pageTarget:String):String? =
        pageDefaults[pageTarget.trim().uppercase()]?.takeIf { lessonById(it)!=null }

    fun lessonById(lessonId:String):TutorialLesson? = lessons.firstOrNull { it.lessonId==lessonId }
}

private fun Any?.asObject():Map<String,Any?> =
    this as? Map<String,Any?> ?: error("EXPECTED_OBJECT")
private fun Any?.asArray():List<Any?> =
    this as? List<Any?> ?: error("EXPECTED_ARRAY")
private fun Any?.asString():String =
    this as? String ?: error("EXPECTED_STRING")
private fun Map<String,Any?>.string(key:String):String = this[key].asString()
private fun Map<String,Any?>.optionalString(key:String):String? = when(val value=this[key]) {
    null -> null
    is String -> value
    else -> error("EXPECTED_STRING:$key")
}
private fun Map<String,Any?>.stringList(key:String):List<String> = arrayValue(key).map { it.asString() }
private fun Map<String,Any?>.arrayValue(key:String):List<Any?> = this[key].asArray()
private fun Map<String,Any?>.objectValue(key:String):Map<String,Any?> = this[key].asObject()

private class MiniJson(private val source:String) {
    private var index=0

    fun parse():Any? {
        val value=parseValue()
        skipWhitespace()
        require(index==source.length) { "TRAILING_JSON" }
        return value
    }

    private fun parseValue():Any? {
        skipWhitespace()
        require(index<source.length) { "UNEXPECTED_END" }
        return when(source[index]) {
            '{' -> parseObject()
            '[' -> parseArray()
            '"' -> parseString()
            't' -> { expect("true"); true }
            'f' -> { expect("false"); false }
            'n' -> { expect("null"); null }
            '-', in '0'..'9' -> parseNumber()
            else -> error("UNEXPECTED_TOKEN@${index}")
        }
    }

    private fun parseObject():Map<String,Any?> {
        expectChar('{')
        skipWhitespace()
        val result=linkedMapOf<String,Any?>()
        if(peek('}')) { index++; return result }
        while(true) {
            skipWhitespace()
            val key=parseString()
            skipWhitespace(); expectChar(':')
            result[key]=parseValue()
            skipWhitespace()
            when {
                peek(',') -> index++
                peek('}') -> { index++; return result }
                else -> error("OBJECT_SEPARATOR@${index}")
            }
        }
    }

    private fun parseArray():List<Any?> {
        expectChar('[')
        skipWhitespace()
        val result=mutableListOf<Any?>()
        if(peek(']')) { index++; return result }
        while(true) {
            result += parseValue()
            skipWhitespace()
            when {
                peek(',') -> index++
                peek(']') -> { index++; return result }
                else -> error("ARRAY_SEPARATOR@${index}")
            }
        }
    }

    private fun parseString():String {
        expectChar('"')
        val out=StringBuilder()
        while(index<source.length) {
            val ch=source[index++]
            when(ch) {
                '"' -> return out.toString()
                '\\' -> {
                    require(index<source.length) { "BAD_ESCAPE" }
                    when(val esc=source[index++]) {
                        '"','\\','/' -> out.append(esc)
                        'b' -> out.append('\b')
                        'f' -> out.append('\u000C')
                        'n' -> out.append('\n')
                        'r' -> out.append('\r')
                        't' -> out.append('\t')
                        'u' -> {
                            require(index+4<=source.length) { "BAD_UNICODE_ESCAPE" }
                            out.append(source.substring(index,index+4).toInt(16).toChar())
                            index+=4
                        }
                        else -> error("BAD_ESCAPE:$esc")
                    }
                }
                else -> out.append(ch)
            }
        }
        error("UNTERMINATED_STRING")
    }

    private fun parseNumber():Number {
        val start=index
        if(peek('-')) index++
        while(index<source.length && source[index].isDigit()) index++
        if(peek('.')) {
            index++
            while(index<source.length && source[index].isDigit()) index++
        }
        if(index<source.length && (source[index]=='e' || source[index]=='E')) {
            index++
            if(peek('+') || peek('-')) index++
            while(index<source.length && source[index].isDigit()) index++
        }
        val token=source.substring(start,index)
        return token.toLongOrNull() ?: token.toDoubleOrNull() ?: error("BAD_NUMBER:$token")
    }

    private fun skipWhitespace() {
        while(index<source.length && source[index].isWhitespace()) index++
    }

    private fun peek(ch:Char):Boolean = index<source.length && source[index]==ch

    private fun expectChar(ch:Char) {
        skipWhitespace()
        require(peek(ch)) { "EXPECTED_$ch@${index}" }
        index++
    }

    private fun expect(token:String) {
        require(source.startsWith(token,index)) { "EXPECTED_$token@${index}" }
        index+=token.length
    }
}
