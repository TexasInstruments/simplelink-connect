/*
 * Copyright (c) 2023, Texas Instruments Incorporated
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * *  Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *
 * *  Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * *  Neither the name of Texas Instruments Incorporated nor the names of
 *    its contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

package com.ti.connectivity.simplelinkconnect;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGattServer;
import android.bluetooth.BluetoothGattServerCallback;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.AdvertisingSet;
import android.bluetooth.le.AdvertisingSetCallback;
import android.bluetooth.le.AdvertisingSetParameters;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.bluetooth.le.PeriodicAdvertisingParameters;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.ParcelUuid;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.UUID;

public class BleAdvertiserModule extends ReactContextBaseJavaModule {
    private static final String TAG = "BleAdvertiserModule";

    // Advertising intervals (0.625ms units)
    private static final int INTERVAL_MIN = 160;    // 100ms
    private static final int INTERVAL_MAX = 16384;  // 10.24s
    private static final int INTERVAL_LOW = 1600;   // 1s (default)

    private final ReactApplicationContext reactContext;
    private BluetoothLeAdvertiser bluetoothLeAdvertiser;
    private BluetoothManager bluetoothManager;
    private BluetoothGattServer bluetoothGattServer;

    // Separate storage for legacy and extended advertisements
    private final Map<String, AdvertiseCallback> legacyAdvertisements = new HashMap<>();
    private final Map<String, AdvertisingSet> extendedAdvertisements = new HashMap<>();
    private final Map<String, AdvertisingSetCallback> extendedCallbacks = new HashMap<>();

    // Helper method to convert 16-bit UUID to full 128-bit UUID
    private UUID convertToFullUUID(String uuidString) {
        try {
            // Remove any whitespace or extra dashes
            String cleanUuid = uuidString.replaceAll("\\s+", "").replaceAll("-", "");

            // If original string has dashes and is full length (36 chars), use it directly
            if (uuidString.contains("-") && uuidString.length() == 36) {
                return UUID.fromString(uuidString.toUpperCase());
            }

            // 16-bit UUID (4 hex characters)
            if (cleanUuid.length() == 4) {
                return UUID.fromString(String.format(
                    "0000%s-0000-1000-8000-00805F9B34FB",
                    cleanUuid.toUpperCase()
                ));
            }

            // 32-bit UUID (8 hex characters)
            if (cleanUuid.length() == 8) {
                return UUID.fromString(String.format(
                    "%s-0000-1000-8000-00805F9B34FB",
                    cleanUuid.toUpperCase()
                ));
            }

            // 128-bit UUID without dashes (32 hex characters)
            if (cleanUuid.length() == 32) {
                return UUID.fromString(String.format(
                    "%s-%s-%s-%s-%s",
                    cleanUuid.substring(0, 8),
                    cleanUuid.substring(8, 12),
                    cleanUuid.substring(12, 16),
                    cleanUuid.substring(16, 20),
                    cleanUuid.substring(20, 32)
                ).toUpperCase());
            }

            // Try to parse as-is
            return UUID.fromString(uuidString.toUpperCase());

        } catch (IllegalArgumentException e) {
            Log.e(TAG, "Invalid UUID format: " + uuidString, e);
            throw new IllegalArgumentException("Invalid UUID format: " + uuidString + ". Use 16-bit (180F), 32-bit, or 128-bit UUID format.", e);
        }
    }

    public BleAdvertiserModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;

        // Get BluetoothLeAdvertiser
        bluetoothManager = (BluetoothManager) reactContext.getSystemService(Context.BLUETOOTH_SERVICE);
        if (bluetoothManager != null) {
            BluetoothAdapter bluetoothAdapter = bluetoothManager.getAdapter();
            if (bluetoothAdapter != null) {
                bluetoothLeAdvertiser = bluetoothAdapter.getBluetoothLeAdvertiser();
            }
        }
    }

    @NonNull
    @Override
    public String getName() {
        return "BleAdvertiserModule";
    }

    private void sendEvent(String eventName, WritableMap params) {
        reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }

    private final BluetoothGattServerCallback gattServerCallback = new BluetoothGattServerCallback() {
        @Override
        public void onConnectionStateChange(android.bluetooth.BluetoothDevice device, int status, int newState) {
            super.onConnectionStateChange(device, status, newState);
            if (newState == android.bluetooth.BluetoothProfile.STATE_CONNECTED) {
                Log.d(TAG, "Central device connected: " + device.getAddress() + ", Name: " + device.getName());

                // Emit event to React Native
                WritableMap eventMap = Arguments.createMap();
                eventMap.putString("deviceId", device.getAddress());
                eventMap.putString("deviceName", device.getName() != null ? device.getName() : "Unknown");
                eventMap.putString("deviceAddress", device.getAddress());
                sendEvent("BleAdvertiserCentralConnected", eventMap);

            }

            else if (newState == android.bluetooth.BluetoothProfile.STATE_DISCONNECTED) {
                Log.d(TAG, "Central device disconnected: " + device.getAddress());

                // Emit event to React Native
                WritableMap eventMap = Arguments.createMap();
                eventMap.putString("deviceId", device.getAddress());
                eventMap.putString("deviceAddress", device.getAddress());
                sendEvent("BleAdvertiserCentralDisconnected", eventMap);
            }
        }
    };

    @ReactMethod
    public void startAdvertising(String advertisementId, ReadableMap config, Callback callback) {
        Log.i(TAG, "startAdvertising: " + advertisementId);

        // Check for BLUETOOTH_ADVERTISE permission on Android 12+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(reactContext,
                    android.Manifest.permission.BLUETOOTH_ADVERTISE)
                    != PackageManager.PERMISSION_GRANTED) {
                WritableMap errorMap = Arguments.createMap();
                errorMap.putString("error", "BLUETOOTH_ADVERTISE permission not granted. Please enable Bluetooth permissions in Settings.");
                callback.invoke(errorMap);

                // Send error event
                WritableMap eventMap = Arguments.createMap();
                eventMap.putString("advertisementId", advertisementId);
                eventMap.putString("error", "Missing BLUETOOTH_ADVERTISE permission");
                sendEvent("BleAdvertiserError", eventMap);
                return;
            }
        }

        if (bluetoothLeAdvertiser == null) {
            WritableMap errorMap = Arguments.createMap();
            errorMap.putString("error", "Bluetooth LE Advertiser not available");
            callback.invoke(errorMap);
            return;
        }

        // Check if extended advertising is requested
        boolean useExtended = config.hasKey("advertisingExtension")
            && config.getBoolean("advertisingExtension");

        if (useExtended) {
            // Verify API level
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                WritableMap errorMap = Arguments.createMap();
                errorMap.putString("error", "Extended advertising requires Android 8.0+ (API 26). Current API: " + Build.VERSION.SDK_INT);
                callback.invoke(errorMap);

                // Send error event
                WritableMap eventMap = Arguments.createMap();
                eventMap.putString("advertisementId", advertisementId);
                eventMap.putString("error", "Extended advertising not supported on this Android version");
                sendEvent("BleAdvertiserError", eventMap);
                return;
            }

            // Verify hardware support
            BluetoothAdapter adapter = bluetoothManager.getAdapter();
            if (adapter == null || !adapter.isLeExtendedAdvertisingSupported()) {
                WritableMap errorMap = Arguments.createMap();
                errorMap.putString("error", "Device does not support BLE Extended Advertising");
                callback.invoke(errorMap);

                // Send error event
                WritableMap eventMap = Arguments.createMap();
                eventMap.putString("advertisementId", advertisementId);
                eventMap.putString("error", "Extended advertising not supported on this device");
                sendEvent("BleAdvertiserError", eventMap);
                return;
            }

            startExtendedAdvertising(advertisementId, config, callback);
        } else {
            startLegacyAdvertising(advertisementId, config, callback);
        }
    }

    private void startLegacyAdvertising(String advertisementId, ReadableMap config, Callback callback) {
        Log.d(TAG, "Starting legacy advertising: " + advertisementId);

        try {
            // Create GATT server if needed
            if (bluetoothGattServer == null && bluetoothManager != null) {
                bluetoothGattServer = bluetoothManager.openGattServer(reactContext, gattServerCallback);
            }

            // Clear existing services from GATT server
            if (bluetoothGattServer != null) {
                bluetoothGattServer.clearServices();
            }
            // Build AdvertiseSettings
            AdvertiseSettings.Builder settingsBuilder = new AdvertiseSettings.Builder();
            settingsBuilder.setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY);

            boolean isConnectable = config.hasKey("connectable") && config.getBoolean("connectable");

            settingsBuilder.setConnectable(isConnectable);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                settingsBuilder.setDiscoverable(true);
            }

            settingsBuilder.setTimeout(0); // Advertise indefinitely

            // Set TX power if available
            if (config.hasKey("txPower")) {
                int txPower = config.getInt("txPower");
                if (txPower >= -21 && txPower <= 1) {
                    // Map TX power to Android constants
                    if (txPower >= -10) {
                        settingsBuilder.setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH);
                    } else if (txPower >= -15) {
                        settingsBuilder.setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM);
                    } else {
                        settingsBuilder.setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_LOW);
                    }
                }
            }

            AdvertiseSettings settings = settingsBuilder.build();

            // Build AdvertiseData
            AdvertiseData.Builder dataBuilder = new AdvertiseData.Builder();
            // Exclude device name from primary advertisement to save space for service UUIDs and manufacturer data
            dataBuilder.setIncludeDeviceName(false);
            dataBuilder.setIncludeTxPowerLevel(false);

            // Note: Android does not support per-advertisement custom local names.
            // The system Bluetooth device name is always used and is included in scan response below.

            // Add service UUIDs
            if (config.hasKey("serviceUUIDs")) {
                ReadableArray serviceUUIDs = config.getArray("serviceUUIDs");
                if (serviceUUIDs != null) {
                    for (int i = 0; i < serviceUUIDs.size(); i++) {
                        String uuidString = serviceUUIDs.getString(i);
                        try {
                            UUID uuid = convertToFullUUID(uuidString);
                            ParcelUuid parcelUuid = new ParcelUuid(uuid);

                            // Add to advertisement data
                            dataBuilder.addServiceUuid(parcelUuid);

                            // Add to GATT server to make device scannable/connectable
                            if (bluetoothGattServer != null) {
                                BluetoothGattService gattService = new BluetoothGattService(
                                    uuid,
                                    BluetoothGattService.SERVICE_TYPE_PRIMARY
                                );
                                bluetoothGattServer.addService(gattService);
                                Log.d(TAG, "Added GATT service: " + uuidString + " -> " + uuid.toString());
                            }
                        } catch (IllegalArgumentException e) {
                            Log.e(TAG, "Invalid UUID: " + uuidString, e);
                        }
                    }
                }
            }

            // Add manufacturer data
            if (config.hasKey("manufacturerData")) {
                ReadableMap manufacturerData = config.getMap("manufacturerData");
                if (manufacturerData != null && manufacturerData.hasKey("companyId") && manufacturerData.hasKey("data")) {
                    int companyId = manufacturerData.getInt("companyId");
                    ReadableArray dataArray = manufacturerData.getArray("data");
                    if (dataArray != null) {
                        byte[] manufacturerBytes = new byte[dataArray.size()];
                        for (int i = 0; i < dataArray.size(); i++) {
                            manufacturerBytes[i] = (byte) dataArray.getInt(i);
                        }
                        dataBuilder.addManufacturerData(companyId, manufacturerBytes);
                    }
                }
            }

            AdvertiseData advertiseData = dataBuilder.build();

            // Build scan response data
            // Scan response includes the system Bluetooth device name for discoverability
            AdvertiseData.Builder scanResponseBuilder = new AdvertiseData.Builder();
            scanResponseBuilder.setIncludeDeviceName(true);
            AdvertiseData scanResponse = scanResponseBuilder.build();

            // Create callback
            AdvertiseCallback advertiseCallback = new AdvertiseCallback() {
                @Override
                public void onStartSuccess(AdvertiseSettings settingsInEffect) {
                    super.onStartSuccess(settingsInEffect);
                    Log.d(TAG, "Advertising started successfully: " + advertisementId);

                    WritableMap successMap = Arguments.createMap();
                    successMap.putBoolean("success", true);
                    callback.invoke(null, successMap);

                    // Send event
                    WritableMap eventMap = Arguments.createMap();
                    eventMap.putString("advertisementId", advertisementId);
                    eventMap.putBoolean("isActive", true);
                    sendEvent("BleAdvertiserStateChanged", eventMap);
                }

                @Override
                public void onStartFailure(int errorCode) {
                    super.onStartFailure(errorCode);
                    String errorMessage = "Advertising failed with error code: " + errorCode;
                    Log.e(TAG, errorMessage);

                    WritableMap errorMap = Arguments.createMap();
                    errorMap.putString("error", errorMessage);
                    callback.invoke(errorMap);

                    // Send error event
                    WritableMap eventMap = Arguments.createMap();
                    eventMap.putString("advertisementId", advertisementId);
                    eventMap.putString("error", errorMessage);
                    sendEvent("BleAdvertiserError", eventMap);
                }
            };

            // Store callback in legacy advertisements
            legacyAdvertisements.put(advertisementId, advertiseCallback);

            // Start advertising
            bluetoothLeAdvertiser.startAdvertising(settings, advertiseData, scanResponse, advertiseCallback);

        } catch (Exception e) {
            Log.e(TAG, "Error starting advertising", e);
            WritableMap errorMap = Arguments.createMap();
            errorMap.putString("error", "Error starting advertising: " + e.getMessage());
            callback.invoke(errorMap);
        }
    }

    @androidx.annotation.RequiresApi(api = Build.VERSION_CODES.O)
    private void startExtendedAdvertising(String advertisementId, ReadableMap config, Callback callback) {
        Log.d(TAG, "Starting extended advertising: " + advertisementId);

        try {
            // Create GATT server if needed
            if (bluetoothGattServer == null && bluetoothManager != null) {
                bluetoothGattServer = bluetoothManager.openGattServer(reactContext, gattServerCallback);
            }

            // Clear existing services
            if (bluetoothGattServer != null) {
                bluetoothGattServer.clearServices();
            }

            // Build AdvertisingSetParameters
            AdvertisingSetParameters.Builder paramsBuilder = new AdvertisingSetParameters.Builder();

            // Disable legacy mode for extended advertising
            paramsBuilder.setLegacyMode(false);

            // Connectable and Scannable - read from config
            boolean isConnectable = config.hasKey("connectable") && config.getBoolean("connectable");
            boolean isScannable = config.hasKey("scannable") && config.getBoolean("scannable");

            // Validate: In extended advertising, connectable and scannable cannot both be true (Android BLE 5.0 constraint)
            if (isConnectable && isScannable) {
                WritableMap errorMap = Arguments.createMap();
                errorMap.putString("error", "Extended advertising cannot be both connectable and scannable. Please enable only one or disable both.");
                callback.invoke(errorMap);
                return;
            }

            paramsBuilder.setConnectable(isConnectable);
            paramsBuilder.setScannable(isScannable);
            Log.d(TAG, "Extended advertising: connectable=" + isConnectable + ", scannable=" + isScannable);

            // Primary PHY
            String primaryPhy = config.hasKey("primaryPhy") ? config.getString("primaryPhy") : "LE_1M";
            switch (primaryPhy) {
                case "LE_CODED":
                    paramsBuilder.setPrimaryPhy(BluetoothDevice.PHY_LE_CODED);
                    Log.d(TAG, "Using Coded PHY (long range)");
                    break;
                case "LE_1M":
                default:
                    paramsBuilder.setPrimaryPhy(BluetoothDevice.PHY_LE_1M);
                    Log.d(TAG, "Using 1M PHY (standard)");
                    break;
            }

            // Secondary PHY
            String secondaryPhy = config.hasKey("secondaryPhy") ? config.getString("secondaryPhy") : "LE_2M";
            switch (secondaryPhy) {
                case "LE_2M":
                    paramsBuilder.setSecondaryPhy(BluetoothDevice.PHY_LE_2M);
                    Log.d(TAG, "Using 2M PHY (high speed)");
                    break;
                case "LE_CODED":
                    paramsBuilder.setSecondaryPhy(BluetoothDevice.PHY_LE_CODED);
                    Log.d(TAG, "Using Coded PHY (long range)");
                    break;
                case "LE_1M":
                default:
                    paramsBuilder.setSecondaryPhy(BluetoothDevice.PHY_LE_1M);
                    Log.d(TAG, "Using 1M PHY (standard)");
                    break;
            }

            // Advertising interval
            int interval = config.hasKey("advertisingInterval") ? config.getInt("advertisingInterval") : INTERVAL_LOW;
            if (interval >= INTERVAL_MIN && interval <= INTERVAL_MAX) {
                paramsBuilder.setInterval(interval);
                Log.d(TAG, "Advertising interval: " + (interval * 0.625) + "ms");
            } else {
                paramsBuilder.setInterval(INTERVAL_LOW);
                Log.w(TAG, "Invalid interval, using default: 1000ms");
            }

            // TX Power
            if (config.hasKey("txPower")) {
                int txPower = config.getInt("txPower");
                if (txPower >= -127 && txPower <= 1) {
                    if (txPower >= -10) {
                        paramsBuilder.setTxPowerLevel(AdvertisingSetParameters.TX_POWER_HIGH);
                    } else if (txPower >= -15) {
                        paramsBuilder.setTxPowerLevel(AdvertisingSetParameters.TX_POWER_MEDIUM);
                    } else if (txPower >= -21) {
                        paramsBuilder.setTxPowerLevel(AdvertisingSetParameters.TX_POWER_LOW);
                    } else {
                        paramsBuilder.setTxPowerLevel(AdvertisingSetParameters.TX_POWER_ULTRA_LOW);
                    }
                }
            }

            AdvertisingSetParameters params = paramsBuilder.build();

            // Build advertising data (up to 254 bytes) - will be implemented in Phase 5
            AdvertiseData advertiseData = buildExtendedAdvertiseData(config);

            // Build scan response (up to 254 bytes) - will be implemented in Phase 5
            AdvertiseData scanResponse = buildExtendedScanResponse(config);

            // Periodic advertising parameters (optional)
            PeriodicAdvertisingParameters periodicParams = null;
            AdvertiseData periodicData = null;

            boolean usePeriodicAdvertising = config.hasKey("periodicAdvertising")
                && config.getBoolean("periodicAdvertising");

            if (usePeriodicAdvertising) {
                PeriodicAdvertisingParameters.Builder periodicParamsBuilder =
                    new PeriodicAdvertisingParameters.Builder();

                int periodicInterval = config.hasKey("periodicInterval")
                    ? config.getInt("periodicInterval") : 80;
                periodicParamsBuilder.setInterval(periodicInterval);

                periodicParams = periodicParamsBuilder.build();
                periodicData = buildPeriodicAdvertiseData(config); // Will be implemented in Phase 5
                Log.d(TAG, "Periodic advertising enabled, interval: " + (periodicInterval * 1.25) + "ms");
            }

            // Create advertising callback
            final String finalAdvertisementId = advertisementId;
            AdvertisingSetCallback advertisingCallback = new AdvertisingSetCallback() {
                @Override
                public void onAdvertisingSetStarted(AdvertisingSet advertisingSet, int txPower, int status) {
                    if (status == AdvertisingSetCallback.ADVERTISE_SUCCESS) {
                        Log.d(TAG, "Extended advertising started successfully: " + finalAdvertisementId + ", TX Power: " + txPower + " dBm");

                        // Store the advertising set and callback
                        extendedAdvertisements.put(finalAdvertisementId, advertisingSet);
                        extendedCallbacks.put(finalAdvertisementId, this);

                        WritableMap successMap = Arguments.createMap();
                        successMap.putBoolean("success", true);
                        successMap.putBoolean("extended", true);
                        successMap.putInt("txPower", txPower);
                        callback.invoke(null, successMap);

                        // Send state changed event
                        WritableMap eventMap = Arguments.createMap();
                        eventMap.putString("advertisementId", finalAdvertisementId);
                        eventMap.putBoolean("isActive", true);
                        eventMap.putBoolean("extended", true);
                        sendEvent("BleAdvertiserStateChanged", eventMap);
                    } else {
                        Log.e(TAG, "Extended advertising failed: " + finalAdvertisementId + ", status: " + status);

                        WritableMap errorMap = Arguments.createMap();
                        errorMap.putString("error", "Extended advertising failed with status: " + status);
                        callback.invoke(errorMap);

                        WritableMap eventMap = Arguments.createMap();
                        eventMap.putString("advertisementId", finalAdvertisementId);
                        eventMap.putString("error", "Failed to start extended advertising: " + status);
                        sendEvent("BleAdvertiserError", eventMap);
                    }
                }

                @Override
                public void onAdvertisingSetStopped(AdvertisingSet advertisingSet) {
                    Log.d(TAG, "Extended advertising stopped: " + finalAdvertisementId);
                    extendedAdvertisements.remove(finalAdvertisementId);
                    extendedCallbacks.remove(finalAdvertisementId);
                }

                @Override
                public void onAdvertisingEnabled(AdvertisingSet advertisingSet, boolean enable, int status) {
                    Log.d(TAG, "Advertising enabled: " + enable + ", status: " + status);
                }

                @Override
                public void onPeriodicAdvertisingEnabled(AdvertisingSet advertisingSet, boolean enable, int status) {
                    Log.d(TAG, "Periodic advertising enabled: " + enable + ", status: " + status);
                }

                @Override
                public void onAdvertisingDataSet(AdvertisingSet advertisingSet, int status) {
                    Log.d(TAG, "Advertising data set, status: " + status);
                }

                @Override
                public void onScanResponseDataSet(AdvertisingSet advertisingSet, int status) {
                    Log.d(TAG, "Scan response data set, status: " + status);
                }

                @Override
                public void onAdvertisingParametersUpdated(AdvertisingSet advertisingSet, int txPower, int status) {
                    Log.d(TAG, "Advertising parameters updated, TX Power: " + txPower + ", status: " + status);
                }
            };

            // Start extended advertising
            bluetoothLeAdvertiser.startAdvertisingSet(
                params,
                advertiseData,
                scanResponse,
                periodicParams,
                periodicData,
                advertisingCallback
            );

        } catch (Exception e) {
            Log.e(TAG, "Error starting extended advertising", e);
            WritableMap errorMap = Arguments.createMap();
            errorMap.putString("error", "Error starting extended advertising: " + e.getMessage());
            callback.invoke(errorMap);
        }
    }

    @androidx.annotation.RequiresApi(api = Build.VERSION_CODES.O)
    private AdvertiseData buildExtendedAdvertiseData(ReadableMap config) {
        AdvertiseData.Builder dataBuilder = new AdvertiseData.Builder();
        dataBuilder.setIncludeDeviceName(false);
        dataBuilder.setIncludeTxPowerLevel(true); // Can include in extended mode
        // Service UUIDs
        if (config.hasKey("serviceUUIDs")) {
            ReadableArray serviceUUIDs = config.getArray("serviceUUIDs");
            if (serviceUUIDs != null) {
                for (int i = 0; i < serviceUUIDs.size(); i++) {
                    String uuidString = serviceUUIDs.getString(i);
                    try {
                        UUID uuid = convertToFullUUID(uuidString);
                        ParcelUuid parcelUuid = new ParcelUuid(uuid);
                        dataBuilder.addServiceUuid(parcelUuid);

                        // Add to GATT server
                        if (bluetoothGattServer != null) {
                            BluetoothGattService gattService = new BluetoothGattService(
                                uuid,
                                BluetoothGattService.SERVICE_TYPE_PRIMARY
                            );
                            bluetoothGattServer.addService(gattService);
                            Log.d(TAG, "Added GATT service: " + uuidString);
                        }
                    } catch (IllegalArgumentException e) {
                        Log.e(TAG, "Invalid UUID: " + uuidString, e);
                    }
                }
            }
        }

        // Manufacturer data (now can use more bytes!)
        if (config.hasKey("manufacturerData")) {
            ReadableMap manufacturerData = config.getMap("manufacturerData");
            if (manufacturerData != null && manufacturerData.hasKey("companyId") && manufacturerData.hasKey("data")) {
                int companyId = manufacturerData.getInt("companyId");
                ReadableArray dataArray = manufacturerData.getArray("data");
                if (dataArray != null) {
                    byte[] manufacturerBytes = new byte[dataArray.size()];
                    for (int i = 0; i < dataArray.size(); i++) {
                        manufacturerBytes[i] = (byte) dataArray.getInt(i);
                    }
                    dataBuilder.addManufacturerData(companyId, manufacturerBytes);
                    Log.d(TAG, "Added manufacturer data: " + manufacturerBytes.length + " bytes");
                }
            }
        }

        return dataBuilder.build();
    }

    @androidx.annotation.RequiresApi(api = Build.VERSION_CODES.O)
    private AdvertiseData buildExtendedScanResponse(ReadableMap config) {
        AdvertiseData.Builder scanResponseBuilder = new AdvertiseData.Builder();
        // Extended mode has more space (254 bytes), but still uses system Bluetooth device name
        scanResponseBuilder.setIncludeDeviceName(true);
        return scanResponseBuilder.build();
    }

    @androidx.annotation.RequiresApi(api = Build.VERSION_CODES.O)
    private AdvertiseData buildPeriodicAdvertiseData(ReadableMap config) {
        // Periodic data can include manufacturer data or service data
        // For now, replicate the main advertisement data
        return buildExtendedAdvertiseData(config);
    }

    @ReactMethod
    public void stopAdvertising(String advertisementId, Callback callback) {
        Log.d(TAG, "Stopping advertising: " + advertisementId);

        if (bluetoothLeAdvertiser == null) {
            WritableMap errorMap = Arguments.createMap();
            errorMap.putString("error", "Bluetooth LE Advertiser not available");
            callback.invoke(errorMap);
            return;
        }

        boolean stopped = false;

        // Try to stop extended advertising first (API 26+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AdvertisingSet advertisingSet = extendedAdvertisements.get(advertisementId);
            AdvertisingSetCallback advertisingCallback = extendedCallbacks.get(advertisementId);

            if (advertisingSet != null && advertisingCallback != null) {
                try {
                    bluetoothLeAdvertiser.stopAdvertisingSet(advertisingCallback);
                    extendedAdvertisements.remove(advertisementId);
                    extendedCallbacks.remove(advertisementId);
                    stopped = true;
                    Log.d(TAG, "Extended advertising stopped: " + advertisementId);
                } catch (Exception e) {
                    Log.e(TAG, "Error stopping extended advertising", e);
                }
            }
        }

        // Also check legacy advertising (defensive: shouldn't coexist but be safe)
        AdvertiseCallback advertiseCallback = legacyAdvertisements.get(advertisementId);
        if (advertiseCallback != null) {
            try {
                bluetoothLeAdvertiser.stopAdvertising(advertiseCallback);
                legacyAdvertisements.remove(advertisementId);
                stopped = true;
                Log.d(TAG, "Legacy advertising stopped: " + advertisementId);
            } catch (Exception e) {
                Log.e(TAG, "Error stopping legacy advertising", e);
            }
        }

        // Close GATT server only if this was the last advertisement
        if (stopped && legacyAdvertisements.isEmpty() && extendedAdvertisements.isEmpty()) {
            if (bluetoothGattServer != null) {
                try {
                    bluetoothGattServer.clearServices();
                    bluetoothGattServer.close();
                    bluetoothGattServer = null;
                    Log.d(TAG, "GATT server closed and services cleared");
                } catch (Exception e) {
                    Log.e(TAG, "Error closing GATT server", e);
                }
            }
        }

        // Always return success (idempotent operation)
        WritableMap successMap = Arguments.createMap();
        successMap.putBoolean("success", true);
        callback.invoke(null, successMap);

        // Send state change event if we actually stopped something
        if (stopped) {
            WritableMap eventMap = Arguments.createMap();
            eventMap.putString("advertisementId", advertisementId);
            eventMap.putBoolean("isActive", false);
            sendEvent("BleAdvertiserStateChanged", eventMap);
        }
    }

    @ReactMethod
    public void isExtendedAdvertisingSupported(Callback callback) {
        boolean supported = false;
        int maxDataLength = 31; // Legacy default

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            BluetoothAdapter adapter = bluetoothManager.getAdapter();
            if (adapter != null) {
                supported = adapter.isLeExtendedAdvertisingSupported();
                if (supported) {
                    maxDataLength = 254; // Extended advertising max
                }
            }
        }

        WritableMap resultMap = Arguments.createMap();
        resultMap.putBoolean("supported", supported);
        resultMap.putInt("maxDataLength", maxDataLength);
        resultMap.putInt("apiLevel", Build.VERSION.SDK_INT);
        callback.invoke(null, resultMap);
    }

    @ReactMethod
    public void getMaxAdvertisingSets(Callback callback) {
        int maxSets = 0;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            BluetoothAdapter adapter = bluetoothManager.getAdapter();
            if (adapter != null && adapter.isLeExtendedAdvertisingSupported()) {
                // Most devices support 4-16 sets
                maxSets = 4; // Conservative estimate
            }
        }

        WritableMap resultMap = Arguments.createMap();
        resultMap.putInt("maxSets", maxSets);
        callback.invoke(null, resultMap);
    }

    @ReactMethod
    public void getBluetoothDeviceName(Callback callback) {
        String deviceName = "Unknown";

        if (bluetoothManager != null) {
            BluetoothAdapter adapter = bluetoothManager.getAdapter();
            if (adapter != null) {
                String name = adapter.getName();
                if (name != null && !name.isEmpty()) {
                    deviceName = name;
                }
            }
        }

        WritableMap resultMap = Arguments.createMap();
        resultMap.putString("deviceName", deviceName);
        callback.invoke(null, resultMap);
    }


    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        Log.d(TAG, "Module being destroyed, cleaning up resources");

        // Stop all legacy advertisements
        for (String advertisementId : new HashSet<>(legacyAdvertisements.keySet())) {
            AdvertiseCallback callback = legacyAdvertisements.get(advertisementId);
            if (callback != null) {
                try {
                    bluetoothLeAdvertiser.stopAdvertising(callback);
                } catch (Exception e) {
                    Log.e(TAG, "Error stopping legacy advertising", e);
                }
            }
        }
        legacyAdvertisements.clear();

        // Stop all extended advertisements
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            for (Map.Entry<String, AdvertisingSetCallback> entry : extendedCallbacks.entrySet()) {
                try {
                    bluetoothLeAdvertiser.stopAdvertisingSet(entry.getValue());
                } catch (Exception e) {
                    Log.e(TAG, "Error stopping extended advertising set", e);
                }
            }
            extendedAdvertisements.clear();
            extendedCallbacks.clear();
        }

        // Force close GATT server if still open
        if (bluetoothGattServer != null) {
            try {
                bluetoothGattServer.clearServices();
                bluetoothGattServer.close();
            } catch (Exception e) {
                Log.e(TAG, "Error closing GATT server during cleanup", e);
            } finally {
                bluetoothGattServer = null;
            }
        }
    }
}
