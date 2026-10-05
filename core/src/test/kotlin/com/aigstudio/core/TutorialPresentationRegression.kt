package com.aigstudio.core.tutorial

fun main() {
    val fact=TutorialFact("nc.fanuc","X125.432 F1200 T012 G54 G41","NC.G54")
    val protected=listOf("X125.432","F1200","T012","G54","G41")
    BanterLevel.entries.forEach { level ->
        AiExpression.entries.forEach { expression ->
            val shown=presentTutorialFact(fact,level,expression)
            check(shown.fact==fact)
            check(shown.fact.lessonId=="nc.fanuc")
            check(shown.fact.actionTarget=="NC.G54")
            check(shown.fact.factualText=="X125.432 F1200 T012 G54 G41")
            protected.forEach { token -> check(token in shown.fact.factualText) }
        }
    }
    check(presentTutorialFact(fact,BanterLevel.OFF,AiExpression.NEUTRAL).secondaryText==null)
    check(presentTutorialFact(fact,BanterLevel.LIGHT,AiExpression.SMILE).secondaryText!=null)
    check(presentTutorialFact(fact,BanterLevel.NORMAL,AiExpression.THINK).secondaryText!=null)
    check(presentTutorialFact(fact,BanterLevel.MAX,AiExpression.BANTER).secondaryText!=null)
    check(presentTutorialFact(fact,BanterLevel.NORMAL,AiExpression.LAUGH).emoji=="🤣")
    check(presentTutorialFact(fact,BanterLevel.NORMAL,AiExpression.WARN).emoji=="⚠️")
    println("TUTORIAL_PRESENTATION_PASS|FACT_IMMUTABLE|BANTER_4_LEVELS|EXPRESSIONS_7")
}
