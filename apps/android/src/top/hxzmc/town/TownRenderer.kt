package top.hxzmc.town

import android.os.Build
import com.mio.data.Renderer

object TownRenderer {
    fun initial(): String {
        val emulator = Build.HARDWARE == "ranchu" || Build.HARDWARE == "goldfish"
        return if (emulator && Build.SUPPORTED_ABIS.firstOrNull() == "x86_64") Renderer.ID_GL4ES else Renderer.ID_NGGL4ES
    }
}
