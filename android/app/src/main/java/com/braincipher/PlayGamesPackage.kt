package com.braincipher

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

@Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
class PlayGamesPackage : ReactPackage {
    @Deprecated("Deprecated in Java")
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(PlayGamesModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
