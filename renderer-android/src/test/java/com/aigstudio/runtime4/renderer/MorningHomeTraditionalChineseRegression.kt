package com.aigstudio.runtime4.renderer
import org.junit.Assert.*
import org.junit.Test
class MorningHomeTraditionalChineseRegression {
 @Test fun landscapeUsesTraditionalChineseTopLabels(){assertEquals(listOf("首頁","CAD製圖","CAM加工","3D走刀","多功能","NC程式","AI智慧"),MorningHomeTraditionalChinesePlan.labels(1920f,1080f).map{it.text})}
 @Test fun portraitKeepsMultifunctionEntriesInTraditionalChinese(){assertEquals(listOf("首頁","CAD製圖","CAM加工","3D走刀","多功能","3D走刀","3軸","4軸","5軸","6軸","NC程式","AI智慧"),MorningHomeTraditionalChinesePlan.labels(1080f,1920f).map{it.text})}
}
