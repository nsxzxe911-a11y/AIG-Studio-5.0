package com.aigstudio.app

import com.aigstudio.core.ThermalSensorPolicy
import java.io.File

data class CpuGpuTemperatures(
    val cpuC: Double?,
    val gpuC: Double?
)

object CpuGpuTemperatureProbe {
    private val thermalRoot = File("/sys/class/thermal")

    fun read(): CpuGpuTemperatures {
        val zones = thermalRoot.listFiles()
            ?.filter { it.isDirectory && it.name.startsWith("thermal_zone") }
            .orEmpty()

        val cpu = mutableListOf<Double>()
        val gpu = mutableListOf<Double>()

        zones.forEach { zone ->
            val type = runCatching { File(zone, "type").readText().trim() }.getOrNull() ?: return@forEach
            val raw = runCatching { File(zone, "temp").readText().trim().toDouble() }.getOrNull() ?: return@forEach
            val c = ThermalSensorPolicy.normalizeCelsius(raw) ?: return@forEach
            when {
                ThermalSensorPolicy.isGpuType(type) -> gpu += c
                ThermalSensorPolicy.isCpuType(type) -> cpu += c
            }
        }

        return CpuGpuTemperatures(
            cpuC = cpu.maxOrNull(),
            gpuC = gpu.maxOrNull()
        )
    }

    fun format(value: Double?): String =
        value?.let { String.format("%.1f°C", it) } ?: "N/A"
}
