package com.aigstudio.core.tutorial

enum class BanterLevel { OFF, LIGHT, NORMAL, MAX }
enum class AiExpression { NEUTRAL, SMILE, LAUGH, THINK, TEACHER, WARN, BANTER }

data class TutorialFact(
    val lessonId:String,
    val factualText:String,
    val actionTarget:String?
)

data class TutorialPresentation(
    val fact:TutorialFact,
    val secondaryText:String?,
    val expression:AiExpression,
    val emoji:String?
)

fun presentTutorialFact(
    fact:TutorialFact,
    banter:BanterLevel,
    expression:AiExpression
):TutorialPresentation {
    val secondary=when(banter) {
        BanterLevel.OFF -> null
        BanterLevel.LIGHT -> "提醒一下，這步別跳過。"
        BanterLevel.NORMAL -> "這步先做完，機台可不會替你猜。"
        BanterLevel.MAX -> "資料都在眼前了，別跟流程比誰比較硬，照步驟來。"
    }
    val emoji=when(expression) {
        AiExpression.NEUTRAL -> null
        AiExpression.SMILE -> "🙂"
        AiExpression.LAUGH, AiExpression.BANTER -> "🤣"
        AiExpression.THINK -> "🤔"
        AiExpression.TEACHER -> "🎓"
        AiExpression.WARN -> "⚠️"
    }
    return TutorialPresentation(fact,secondary,expression,emoji)
}
