package com.ti.connectivity.simplelinkconnect;

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.uimanager.ViewManager;

import android.os.Build;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class CSPackage implements ReactPackage {

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        // Only load CSModule on Android 16+ (API 36) where android.ranging.* APIs exist
        // On older devices, use CSModuleStub which returns
        // isChannelSoundingSupported=false
        boolean csSupported = Build.VERSION.SDK_INT_FULL >= Build.VERSION_CODES_FULL.BAKLAVA_1;

        if (csSupported) {
            modules.add(new com.ti.connectivity.simplelinkconnect.CSModule(reactContext));
        }
        modules.add(new com.ti.connectivity.simplelinkconnect.CSModuleBase(reactContext));

        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();

    }
};
