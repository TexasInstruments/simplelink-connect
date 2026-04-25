package com.ti.connectivity.simplelinkconnect;

import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

/**
 * CSModuleStub - Stub implementation of CSModule for devices running Android < 16 (API < 36)
 *
 * This stub provides the same React Native interface as CSModule but returns
 * unsupported/no-op responses. This allows the app to run on older Android
 * versions without crashing due to missing android.ranging.* classes.
 */
public class CSModuleBase extends ReactContextBaseJavaModule {
    private  String TAG= "CSModuleBase";
    public CSModuleBase(ReactApplicationContext context) {
        super(context);
    }

    @NonNull
    @Override
    public String getName() {
        return "CSModuleBase";
    }

    @ReactMethod
    public void isChannelSoundingSupported(Promise promise) {
        boolean supported = Build.VERSION.SDK_INT_FULL >= Build.VERSION_CODES_FULL.BAKLAVA_1;
        Log.i(TAG, "Channel Sounding supported: " + supported + " (SDK_INT_FULL: " + Build.VERSION.SDK_INT_FULL + ")");
        promise.resolve(supported);
    }

    @ReactMethod
    public void startChannelSounding(String deviceAddress, int updateRate) {
        // No-op on unsupported devices
    }

    @ReactMethod
    public void stopChannelSounding(Promise promise) {
        promise.resolve(true);
    }
}
