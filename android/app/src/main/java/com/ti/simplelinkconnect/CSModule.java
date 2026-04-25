package com.ti.connectivity.simplelinkconnect;

import static android.ranging.RangingPreference.DEVICE_ROLE_INITIATOR;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import android.ranging.RangingData;
import android.ranging.RangingDevice;
import android.ranging.RangingManager;
import android.ranging.RangingPreference;
import android.ranging.RangingSession;
import android.ranging.SensorFusionParams;
import android.ranging.SessionConfig;
import android.ranging.ble.cs.BleCsRangingCapabilities;
import android.ranging.ble.cs.BleCsRangingParams;
import android.ranging.raw.RawInitiatorRangingConfig;
import android.ranging.raw.RawRangingDevice;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.modules.core.PermissionAwareActivity;
import com.facebook.react.modules.core.PermissionListener;

import java.util.UUID;
import java.util.concurrent.Executor;

/**
 * CSModule - Channel Sounding Module for React Native
 *
 * This module provides Channel Sounding (CS) functionality for BLE devices,
 * enabling precise distance measurement between devices using the Bluetooth
 * Channel Sounding feature introduced in Bluetooth 5.4.
 *
 * Key Features:
 * - BLE scanning for CS-capable devices
 * - GATT connection and service discovery
 * - Device bonding management
 * - Channel Sounding ranging sessions
 * - Real-time distance measurements
 *
 * @author Texas Instruments
 * @version 1.0
 */
public class CSModule extends ReactContextBaseJavaModule {

    // ============================================================================
    // Constants
    // ============================================================================

    private static final String TAG = "CSModule";

    /** Permission request code for Android RANGING permission */
    private static final int REQ_RANGING_PERMISSION = 9001;


    // ============================================================================
    // Instance Variables
    // ============================================================================

    private final ReactApplicationContext reactContext;

    /** Manager for creating and managing ranging sessions */
    private RangingManager rangingManager;

    /** Active ranging session for distance measurements */
    private RangingSession currentRangingSession;


    // ============================================================================
    // Constructor & Initialization
    // ============================================================================

    /**
     * Initializes the CSModule with React Native context.
     * Sets up ranging manager and registers broadcast receivers for bonding events.
     *
     * @param context React Native application context
     */
    public CSModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;

        // Initialize ranging manager (requires API 36+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.BAKLAVA) {
            this.rangingManager = context.getSystemService(RangingManager.class);
            // Request RANGING permission on initialization if not already granted
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.RANGING)
                    != PackageManager.PERMISSION_GRANTED) {
                Log.i(TAG, "RANGING permission not granted, will request when needed");
            }
        }
    }

    @NonNull
    @Override
    public String getName() {
        return "CSModule";
    }

    /**
     * Ensures that the RANGING permission is granted.
     * If not granted, requests it from the user using React Native's permission system.
     *
     * Note: RANGING permission is required for distance measurement APIs
     * introduced in Android API level 36.
     *
     * @return true if permission is already granted, false if requesting
     */
    @RequiresApi(api = Build.VERSION_CODES.BAKLAVA)
    private boolean ensureRangingPermission() {
        // Check if permission is already granted
        if (ContextCompat.checkSelfPermission(
                reactContext,
                Manifest.permission.RANGING
        ) == PackageManager.PERMISSION_GRANTED) {
            return true;
        }

        // Need to request permission - requires an active activity
        Activity currentActivity = getCurrentActivity();
        if (currentActivity == null) {
            Log.e(TAG, "No activity attached, cannot request RANGING permission");
            return false;
        }

        // Use React Native's PermissionAwareActivity for proper permission handling
        if (currentActivity instanceof PermissionAwareActivity) {
            PermissionAwareActivity permissionAwareActivity = (PermissionAwareActivity) currentActivity;

            permissionAwareActivity.requestPermissions(
                    new String[]{ Manifest.permission.RANGING },
                    REQ_RANGING_PERMISSION,
                    permissionListener
            );
        } else {
            Log.e(TAG, "Current activity is not PermissionAwareActivity");
            return false;
        }

        return false; // Permission not yet granted
    }

    /**
     * Permission listener for handling RANGING permission results.
     * Called by React Native's permission system when user responds to permission dialog.
     */
    private final PermissionListener permissionListener = new PermissionListener() {
        @Override
        public boolean onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
            if (requestCode == REQ_RANGING_PERMISSION) {
                // Check if permission was granted
                if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    Log.i(TAG, "RANGING permission granted by user");
                    sendEvent("onRangingPermissionGranted", null);

                    // Auto-start ranging if there's a pending request
                    if (pendingDeviceAddress != null) {
                        Log.i(TAG, "Auto-starting ranging for pending device: " + pendingDeviceAddress);
                        String deviceAddress = pendingDeviceAddress;
                        pendingDeviceAddress = null; // Clear pending request

                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.BAKLAVA) {
                                startRangingSession(deviceAddress);
                            }
                        } catch (Exception e) {
                            Log.e(TAG, "Error auto-starting ranging: " + e.getMessage(), e);
                            sendError("START_ERROR", -1);
                        }
                    }
                } else {
                    Log.e(TAG, "RANGING permission denied by user");
                    pendingDeviceAddress = null; // Clear pending request
                    sendEvent("onRangingPermissionDenied", null);
                }
                return true; // We handled this permission request
            }
            return false; // Not our permission request
        }
    };

    // ============================================================================
    // React Native Methods - Channel Sounding Control
    // ============================================================================

    /**
     * Stops an active Channel Sounding ranging session and closes connections.
     * Cleans up both the ranging session and GATT connection.
     *
     * Events emitted:
     * - None (session callbacks will fire)
     *
     * @param promise Resolves with true on success, rejects on error
     */
    @RequiresApi(Build.VERSION_CODES.BAKLAVA)
    @ReactMethod
    public void stopChannelSounding(Promise promise) {
        try {
            // Stop and close the ranging session
            if (currentRangingSession != null) {
                Log.i(TAG, "Stopping ranging session");
                currentRangingSession.stop();
                currentRangingSession.close();
                currentRangingSession = null;
            }

            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error stopping channel sounding: " + e.getMessage());
            promise.reject("STOP_ERROR", e);
        }
    }

    /** Stores the ranging update rate configuration from React Native */
    private int rangingUpdateRate = RawRangingDevice.UPDATE_RATE_NORMAL;

    /** Stores the device address when permission request is pending */
    private String pendingDeviceAddress = null;

    /**
     * Initiates Channel Sounding with a remote device.
     * This method:
     * 1. Validates API level support (requires API 36+)
     * 2. Checks RANGING permission
     * 3. Establishes GATT connection
     * 4. Discovers Channel Sounding service
     * 5. Initiates bonding if needed
     * 6. Starts ranging session
     *
     * Events emitted:
     * - "onCsServiceFound": When CS service is discovered
     * - "onDeviceBonded": When device is bonded
     * - "onRangingStarted": When ranging starts
     * - "onRangingData": For each distance measurement
     * - Various error events
     *
     * @param deviceAddress MAC address of the remote device
     * @param updateRate Ranging update rate (1=Normal, 2=Infrequent, 3=Frequent)
     */
    @ReactMethod
    public void startChannelSounding(String deviceAddress, int updateRate) {
        // Validate API level - Channel Sounding requires API 36+
        if (Build.VERSION.SDK_INT < 36) {
            Log.e(TAG, "Ranging API requires API level 36+");
            sendError("API_VERSION_ERROR", -1);
            return;
        }

        try {
            Log.i(TAG, "Starting channel sounding for device: " + deviceAddress);

            // Store the update rate BEFORE permission check so it's available after permission is granted
            rangingUpdateRate = updateRate;
            Log.i(TAG, "Update rate set to: " + rangingUpdateRate);

            // Ensure RANGING permission is granted
            if (!ensureRangingPermission()) {
                Log.i(TAG, "RANGING permission requested, will auto-start after grant");
                // Store device address to auto-start after permission is granted
                pendingDeviceAddress = deviceAddress;
                return;
            }

            startRangingSession(deviceAddress);

        } catch (Exception e) {
            Log.e(TAG, "Error in startChannelSounding: " + e.getMessage(), e);
            sendError("START_ERROR", -1);
        }
    }

    // ============================================================================
    // Internal Methods - Ranging Session Management
    // ============================================================================

    /**
     * Starts the actual ranging session after GATT connection and bonding are complete.
     * Configures ranging parameters and initiates distance measurements.
     *
     * @param deviceAddress The bonded Bluetooth device address to range with
     */

    @RequiresApi(Build.VERSION_CODES.BAKLAVA)
    private void startRangingSession(String deviceAddress) {
        try {
            Log.i(TAG, "Starting ranging session for device: " + deviceAddress);

            // Get the RangingManager system service
            RangingManager rm = this.rangingManager;
            if (rm == null) {
                Log.e(TAG, "RangingManager not available - device may not support ranging");
                sendError("RANGING_MANAGER_ERROR", -1);
                return;
            }
            // Create a new ranging session with callback
            Executor executor = ContextCompat.getMainExecutor(reactContext);
            currentRangingSession = rm.createRangingSession(executor, rangingSessionCallback);

            if (currentRangingSession == null) {
                Log.e(TAG, "Could not create ranging session");
                sendError("SESSION_CREATE_ERROR", -1);
                return;
            }

            // Configure ranging parameters using the stored update rate
            Log.i(TAG, "Using update rate: " + rangingUpdateRate);

            // Build the ranging device identifier
            RangingDevice rangingDevice = new RangingDevice.Builder()
                    .setUuid(UUID.nameUUIDFromBytes(deviceAddress.getBytes()))
                    .build();


            // Configure BLE Channel Sounding parameters
            BleCsRangingParams csRangingParams = new BleCsRangingParams
                    .Builder(deviceAddress)
                    .setRangingUpdateRate(rangingUpdateRate)
                    .setSecurityLevel(BleCsRangingCapabilities.CS_SECURITY_LEVEL_ONE)
                    .build();

            // Build raw ranging device with CS parameters
            RawRangingDevice rawRangingDevice = new RawRangingDevice.Builder()
                    .setRangingDevice(rangingDevice)
                    .setCsRangingParams(csRangingParams)
                    .build();

            // Build raw initiator ranging configuration
            RawInitiatorRangingConfig rawRangingDeviceConfig = new RawInitiatorRangingConfig.Builder()
                    .addRawRangingDevice(rawRangingDevice)
                    .build();

            // Create ranging preference with session configuration
            RangingPreference rangingPreference = getRangingPreference(rawRangingDeviceConfig);

            // Start the ranging session
            Log.i(TAG, "Starting ranging session...");
            currentRangingSession.start(rangingPreference);

            Log.i(TAG, "Ranging session started successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error starting ranging session: " + e.getMessage(), e);
            sendError("RANGING_START_ERROR", -1);
        }
    }

    /**
     * Builds a RangingPreference object with session configuration.
     * Configures:
     * - Device role as initiator (measures distance)
     * - Sensor fusion for improved accuracy
     * - Angle of arrival measurements
     *
     * @param rawRangingDeviceConfig The raw ranging device configuration
     * @return Configured RangingPreference object
     */

    @RequiresApi(Build.VERSION_CODES.BAKLAVA)
    private static RangingPreference getRangingPreference(RawInitiatorRangingConfig rawRangingDeviceConfig) {
        // Enable sensor fusion for improved accuracy using device sensors
        SensorFusionParams sensorFusionParams = new SensorFusionParams.Builder()
                .setSensorFusionEnabled(true)
                .build();

        // Configure session parameters
        SessionConfig sessionConfig = new SessionConfig.Builder()
                .setRangingMeasurementsLimit(1000) // Maximum number of measurements per session
                .setAngleOfArrivalNeeded(true)     // Enable angle of arrival measurements
                .setSensorFusionParams(sensorFusionParams)
                .build();

        // Build ranging preference as initiator (phone measures distance to device)
        // This device initiates ranging

        return new RangingPreference.Builder(
                        DEVICE_ROLE_INITIATOR, // This device initiates ranging
                        rawRangingDeviceConfig
                )
                .setSessionConfig(sessionConfig)
                .build();
    }

    // ============================================================================
    // Event Handlers & Utility Methods
    // ============================================================================


    /**
     * Sends error information to React Native.
     *
     * @param type Error type identifier
     * @param code Error code (or -1 if not applicable)
     */
    private void sendError(String type, int code) {
        WritableMap map = Arguments.createMap();
        map.putString("type", type);
        map.putInt("code", code);
        sendEvent("onScanError", map);
    }

    /**
     * Sends a generic event to React Native JavaScript layer.
     *
     * @param eventName The name of the event
     * @param params Event parameters (can be null)
     */
    private void sendEvent(String eventName, WritableMap params) {
        getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }

    // ============================================================================
    // Ranging Session Callback - Handles ranging events and distance measurements
    // ============================================================================

    /**
     * Callback for ranging session events.
     * Receives distance measurements and session state changes.
     */
    @RequiresApi(Build.VERSION_CODES.BAKLAVA)
    private final RangingSession.Callback rangingSessionCallback = new RangingSession.Callback() {

        /**
         * Called when the ranging session is closed.
         */
        @Override
        public void onClosed(int reason) {
            Log.i(TAG, "Ranging session closed - reason: " + reason);
            WritableMap event = Arguments.createMap();
            event.putInt("reason", reason);
            sendEvent("onRangingClosed", event);
        }

        /**
         * Called when the ranging session fails to open.
         */
        @Override
        public void onOpenFailed(int reason) {
            Log.e(TAG, "Ranging session failed to open - reason: " + reason);
            WritableMap event = Arguments.createMap();
            event.putInt("reason", reason);
            sendEvent("onOpenFailed", event);
        }

        /**
         * Called when the ranging session opens successfully.
         */
        @Override
        public void onOpened() {
            Log.i(TAG, "✓ Ranging session opened successfully");
            sendEvent("onOpened", null);
        }

        /**
         * Called for each distance measurement result.
         * This is the main callback for receiving ranging data.
         */
        @Override
        public void onResults(@NonNull RangingDevice rangingDevice, @NonNull RangingData rangingData) {
            Log.i(TAG, "📡 Ranging data received: " + rangingData.toString());

            try {
                WritableMap event = Arguments.createMap();
                event.putString("deviceUuid", rangingDevice.getUuid().toString());

                // Timestamp (in milliseconds)
                long timestampMillis = rangingData.getTimestampMillis();
                event.putDouble("timestampMillis", (double) timestampMillis);

                // Distance measurement - this is the primary data
                if (rangingData.getDistance() != null) {
                    double distanceMeters = rangingData.getDistance().getMeasurement();
                    double distanceConfidence = rangingData.getDistance().getConfidence();
                    event.putDouble("distanceMeters", distanceMeters);
                    event.putDouble("distanceConfidence", distanceConfidence);
                    Log.i(TAG, String.format("  Distance: %.2f m (confidence: %.2f)", distanceMeters, distanceConfidence));
                }

                // Try to get RSSI if available
                try {
                    double rssi = rangingData.getRssi();
                    event.putDouble("rssi", rssi);
                    Log.i(TAG, String.format("  RSSI: %.1f dBm", rssi));
                } catch (Exception e) {
                    Log.d(TAG, "RSSI not available: " + e.getMessage());
                }


                // Try to get angle data if available (may not be supported by all devices/firmware)
                try {
                    // Azimuth angle (horizontal angle) - method name might be getAzimuth() not getAzimuthAngle()
                    if (rangingData.getAzimuth() != null) {
                        double azimuthDegrees = rangingData.getAzimuth().getMeasurement();
                        double azimuthConfidence = rangingData.getAzimuth().getConfidence();
                        event.putDouble("azimuthDegrees", azimuthDegrees);
                        event.putDouble("azimuthConfidence", azimuthConfidence);
                        Log.i(TAG, String.format("  Azimuth: %.2f° (confidence: %.2f)", azimuthDegrees, azimuthConfidence));
                    }
                } catch (Exception e) {
                    // Azimuth data not available or method doesn't exist
                    Log.d(TAG, "Azimuth data not available: " + e.getMessage());
                }

                try {
                    // Elevation angle (vertical angle) - method name might be getElevation() not getElevationAngle()
                    if (rangingData.getElevation() != null) {
                        double elevationDegrees = rangingData.getElevation().getMeasurement();
                        double elevationConfidence = rangingData.getElevation().getConfidence();
                        event.putDouble("elevationDegrees", elevationDegrees);
                        event.putDouble("elevationConfidence", elevationConfidence);
                        Log.i(TAG, String.format("  Elevation: %.2f° (confidence: %.2f)", elevationDegrees, elevationConfidence));
                    }
                } catch (Exception e) {
                    // Elevation data not available or method doesn't exist
                    Log.d(TAG, "Elevation data not available: " + e.getMessage());
                }

                sendEvent("onRangingData", event);

            } catch (Exception e) {
                Log.e(TAG, "Error processing ranging results: " + e.getMessage(), e);
            }
        }

        /**
         * Called when ranging starts for a device.
         */
        @Override
        public void onStarted(@NonNull RangingDevice rangingDevice, int technology) {
            Log.i(TAG, "✓ Ranging started - device: " + rangingDevice.getUuid() + ", technology: " + technology);
            WritableMap event = Arguments.createMap();
            event.putString("deviceUuid", rangingDevice.getUuid().toString());
            event.putInt("technology", technology);
            sendEvent("onRangingStarted", event);
        }

        /**
         * Called when ranging stops for a device.
         */
        @Override
        public void onStopped(@NonNull RangingDevice rangingDevice, int reason) {
            Log.i(TAG, "Ranging stopped - device: " + rangingDevice.getUuid() + ", reason: " + reason);
            WritableMap event = Arguments.createMap();
            event.putString("deviceUuid", rangingDevice.getUuid().toString());
            event.putInt("reason", reason);
            sendEvent("onRangingStopped", event);
        }
    };

}
