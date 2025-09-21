package com.ti.connectivity.simplelinkconnect;

import static io.runtime.mcumgr.dfu.FirmwareUpgradeManager.Mode.CONFIRM_ONLY;
import static io.runtime.mcumgr.dfu.FirmwareUpgradeManager.Mode.NONE;
import static io.runtime.mcumgr.dfu.FirmwareUpgradeManager.Mode.TEST_AND_CONFIRM;
import static io.runtime.mcumgr.dfu.FirmwareUpgradeManager.Mode.TEST_ONLY;

import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.jetbrains.annotations.NotNull;

import java.io.File;
import java.io.FileInputStream;

import io.runtime.mcumgr.McuMgrCallback;
import io.runtime.mcumgr.McuMgrTransport;
import io.runtime.mcumgr.ble.McuMgrBleTransport;
import io.runtime.mcumgr.dfu.FirmwareUpgradeCallback;
import io.runtime.mcumgr.dfu.FirmwareUpgradeController;
import io.runtime.mcumgr.dfu.FirmwareUpgradeManager;
import io.runtime.mcumgr.dfu.model.McuMgrImageSet;
import io.runtime.mcumgr.exception.McuMgrException;
import io.runtime.mcumgr.managers.DefaultManager;
import io.runtime.mcumgr.managers.ImageManager;
import io.runtime.mcumgr.response.McuMgrResponse;
import io.runtime.mcumgr.response.dflt.McuMgrAppInfoResponse;
import io.runtime.mcumgr.response.dflt.McuMgrBootloaderInfoResponse;
import io.runtime.mcumgr.response.dflt.McuMgrParamsResponse;
import io.runtime.mcumgr.response.img.McuMgrImageResponse;
import io.runtime.mcumgr.response.img.McuMgrImageStateResponse;


public class DFUModule extends ReactContextBaseJavaModule {
    private static final String TAG = "DFUModule";
    private FirmwareUpgradeManager firmwareUpgradeManager;
    private DefaultManager defaultManager;
    private ImageManager imageManager;
    private final ReactApplicationContext reactContext;

    FirmwareUpgradeCallback firmwareUpgradeCallback = new FirmwareUpgradeCallback() {
        @Override
        public void onUploadProgressChanged(int byteSent, int imageSize, long timeStamp) {
            double percent = ((double) byteSent / imageSize) * 100;
            Log.d(TAG, "DFU Progress: " + percent + "%");
            WritableMap map = Arguments.createMap();
            map.putDouble("percent", percent);
            map.putInt("bytesSent", byteSent);
            map.putInt("imageSize", imageSize);
            sendEvent("DFUProgress", map);
        }

        @Override
        public void onUpgradeCompleted() {
            Log.i(TAG, "DFU Completed!");
            WritableMap map = Arguments.createMap();
            map.putString("state", "completed");
            sendEvent("DFUStateChanged", map);
        }

        @Override
        public void onUpgradeFailed(FirmwareUpgradeManager.State state, McuMgrException e) {
            Log.e(TAG, "DFU Error: " + e.getMessage() + state.name());
            WritableMap map = Arguments.createMap();
            map.putString("state", "error");
            map.putString("error", "DFU Error: " + e.getMessage());
            sendEvent("DFUStateChanged", map);
        }

        @Override
        public void onUpgradeStarted(FirmwareUpgradeController firmwareUpgradeController) {
            Log.i(TAG, "onUpgradeStarted " + firmwareUpgradeController.toString());

        }

        @Override
        public void onStateChanged(FirmwareUpgradeManager.State state, FirmwareUpgradeManager.State state1) {
            Log.i(TAG, "onStateChanged from " + state.name() + " to " + state1.name());
        }

        @Override
        public void onUpgradeCanceled(FirmwareUpgradeManager.State state) {
            Log.i(TAG, "onUpgradeCanceled");
            WritableMap map = Arguments.createMap();
            map.putString("state", "aborted");
            sendEvent("DFUStateChanged", map);
        }

    };

    private String bootloaderModeToString(int mode) {
        switch (mode) {
            case 0:
                return "Single Application";
            case 1:
                return "Swap using Scratch";
            case 2:
                return "Overwrite Only";
            case 3:
                return "Swap without Scratch";
            case 4:
                return "DirectXIP";
            case 5:
                return "DirectXIP with Revert";
            case 6:
                return "RAM Loader";
            default:
                return "Unknown";
        }
    }

    public DFUModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @NonNull
    @Override
    public String getName() {
        return "DFUModule";
    }

    private byte[] readFileToByteArray(File file) throws Exception {
        FileInputStream fis = new FileInputStream(file);
        byte[] data = new byte[(int) file.length()];
        int readBytes = fis.read(data);
        fis.close();
        return data;
    }

    @ReactMethod
    public void dfuInit(String deviceAddress, Promise promise) {
        Log.i(TAG, "dfuInit");
        try {
            BluetoothAdapter bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
            if (bluetoothAdapter == null) {
                promise.reject("BT_ERROR", "Bluetooth not supported");
                return;
            }

            BluetoothDevice device = bluetoothAdapter.getRemoteDevice(deviceAddress);
            McuMgrTransport transport = new McuMgrBleTransport(reactContext, device);
            this.defaultManager = new DefaultManager(transport);
            this.imageManager = new ImageManager(transport);
            this.firmwareUpgradeManager = new FirmwareUpgradeManager(transport);

            promise.resolve("success");

        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void cancelDfu(Promise promise) {
        Log.i(TAG, "cancelDfu");

        try {
            this.firmwareUpgradeManager.cancel();
            promise.resolve("success");

        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void eraseImage(int imagePosition, Promise promise) {

        try {
            this.imageManager.erase(imagePosition, new McuMgrCallback<McuMgrImageResponse>() {
                @Override
                public void onResponse(@NotNull McuMgrImageResponse mcuMgrImageResponse) {
                    Log.i("erase onResponse", mcuMgrImageResponse.toString());
                    WritableMap response = new WritableNativeMap();
                    response.putString("status", "success");
                    response.putString("message", "Image " + imagePosition + " Erased Successfully");
                    sendEvent("DFUImagesUpdated", response);
                }

                @Override
                public void onError(@NotNull McuMgrException e) {
                    Log.i("erase onError", e.toString());
                    WritableMap response = new WritableNativeMap();
                    response.putString("status", "failed");
                    response.putString("message", "Error erasing image: " + e.getLocalizedMessage());
                    sendEvent("DFUImagesUpdated", response);

                }
            });
            promise.resolve("success");

        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void confirmImage(String imageHash, int imagePosition, Promise promise) {

        try {
            byte[] imgBytes = hexToBytes(imageHash);
            this.imageManager.confirm(imgBytes, new McuMgrCallback<McuMgrImageStateResponse>() {

                @Override
                public void onResponse(@NotNull McuMgrImageStateResponse mcuMgrImageStateResponse) {
                    Log.i("confirm onResponse", mcuMgrImageStateResponse.toString());
                    WritableMap response = new WritableNativeMap();
                    response.putString("status", "success");
                    response.putString("message", "Image " + imagePosition + " Confirmed Successfully");
                    sendEvent("DFUImagesUpdated", response);
                }

                @Override
                public void onError(@NotNull McuMgrException e) {
                    Log.i("confirm onError", e.toString());
                    WritableMap response = new WritableNativeMap();
                    response.putString("status", "failed");
                    response.putString("message", "Error confirm image: " + e.getLocalizedMessage());
                    sendEvent("DFUImagesUpdated", response);

                }
            });
            promise.resolve("success");

        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void testImage(String imageHash, int imagePosition, Promise promise) {

        try {
            byte[] imgBytes = hexToBytes(imageHash);
            this.imageManager.test(imgBytes, new McuMgrCallback<McuMgrImageStateResponse>() {

                @Override
                public void onResponse(@NotNull McuMgrImageStateResponse mcuMgrImageStateResponse) {
                    Log.i("test onResponse", mcuMgrImageStateResponse.toString());
                    WritableMap response = new WritableNativeMap();
                    response.putString("status", "success");
                    response.putString("message", "Image " + imagePosition + " Tested Successfully");
                    sendEvent("DFUImagesUpdated", response);
                }

                @Override
                public void onError(@NotNull McuMgrException e) {
                    Log.i("test onError", e.toString());
                    WritableMap response = new WritableNativeMap();
                    response.putString("status", "failed");
                    response.putString("message", "Error test image: " + e.getLocalizedMessage());
                    sendEvent("DFUImagesUpdated", response);

                }
            });
            promise.resolve("success");

        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void startDfu(String filePath, Boolean eraseStorage, int swapTimeSeconds, int memoryAlignment, int numMcuMgrBuffers, String upgradeMode, Promise promise) {
        Log.d(TAG, "Starting DFU " + filePath);

        String realPath = filePath.startsWith("file://") ? filePath.substring(7) : filePath;
        File firmwareFile = new File(realPath);
        if (!firmwareFile.exists()) {
            promise.reject("ENOENT", "Firmware file not found: " + realPath);
            return;
        }

        this.firmwareUpgradeManager.setFirmwareUpgradeCallback(firmwareUpgradeCallback);
        this.firmwareUpgradeManager.setMemoryAlignment(memoryAlignment);
        this.firmwareUpgradeManager.setEstimatedSwapTime(swapTimeSeconds * 1000);
        this.firmwareUpgradeManager.setWindowUploadCapacity(numMcuMgrBuffers);

        switch (upgradeMode) {
            case "Test and Confirm":
                this.firmwareUpgradeManager.setMode(TEST_AND_CONFIRM);
                break;
            case "Test Only":
                this.firmwareUpgradeManager.setMode(TEST_ONLY);
                break;
            case "Confirm Only":
                this.firmwareUpgradeManager.setMode(CONFIRM_ONLY);
                break;
            default:
                this.firmwareUpgradeManager.setMode(NONE);
                break;
        }

        try {
            byte[] data = readFileToByteArray(firmwareFile);
            McuMgrImageSet set = new McuMgrImageSet();
            set.add(data);
            this.firmwareUpgradeManager.start(set, eraseStorage);

            promise.resolve("DFU started");
        } catch (Exception e) {
            promise.reject("DFU_INIT_ERROR", e);
        }
    }


    private WritableMap getImagesInfoMap(McuMgrImageStateResponse response) {
        WritableMap result = Arguments.createMap();
        result.putInt("splitStatus", response.splitStatus);

        WritableArray imagesArray = Arguments.createArray();

        for (int i = 0; i < response.images.length; i++) {
            McuMgrImageStateResponse.ImageSlot imageResponse = response.images[i];

            WritableMap imageMap = Arguments.createMap();
            imageMap.putInt("slot", imageResponse.slot);
            imageMap.putString("version", imageResponse.version == null ? "Unknown" : imageResponse.version.toString());
            imageMap.putString("hash", imageResponse.hash == null ? "" : bytesToHex(imageResponse.hash));


            WritableArray flags = Arguments.createArray();

            if (imageResponse.bootable) flags.pushString("Bootable");
            if (imageResponse.pending) flags.pushString("Pending");
            if (imageResponse.confirmed) flags.pushString("Confirmed");
            if (imageResponse.active) flags.pushString("Active");
            if (imageResponse.permanent) flags.pushString("Permanent");

            if (flags.size() == 0) {
                flags.pushString("None");
            }

            imageMap.putArray("flags", flags);
            imagesArray.pushMap(imageMap);
        }

        result.putArray("images", imagesArray);
        return result;
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02X", b));
        }
        return sb.toString();
    }

    private static byte[] hexToBytes(String hex) {
        if (hex == null) {
            throw new IllegalArgumentException("Hex string cannot be null");
        }
        int len = hex.length();
        if (len % 2 != 0) {
            throw new IllegalArgumentException("Hex string must have even length");
        }

        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
//            data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
//                    + Character.digit(hex.charAt(i+1), 16));
            int digit1 = Character.digit(hex.charAt(i), 16);
            int digit2 = Character.digit(hex.charAt(i + 1), 16);
            if (digit1 < 0 || digit2 < 0) {
                throw new IllegalArgumentException("Invalid hex character in string");
            }
            data[i / 2] = (byte) ((digit1 << 4) + digit2);
        }
        return data;
    }

    @ReactMethod
    public void getDeviceImagesList(Promise promise) {
        Log.i("getDeviceImagesList", this.imageManager.toString());
        this.imageManager.list(new McuMgrCallback<McuMgrImageStateResponse>() {
            @Override
            public void onResponse(@NotNull McuMgrImageStateResponse response) {
                WritableMap map = getImagesInfoMap(response);
                sendEvent("DFUDeviceImagesInfo", map);
                promise.resolve(null);
            }

            @Override
            public void onError(@NotNull McuMgrException error) {
                Log.e(TAG, "ImageManager error: " + error.getMessage());
                promise.reject("IMG_ERROR", error);
            }
        });
    }

    @ReactMethod
    public void readMcuMgrInfo(Promise promise) throws McuMgrException {
        // Read sequentially:
        // 1. MCU Manager parameters
        // 2. Application info (parameter: "sv" will return the kernel name and version)
        // 3. Bootloader name
        // and, if the bootloader is "MCUboot":
        // 4. Bootloader mode
        readMcuMgrParams(() -> readAppInfo("sv", () -> readBootloaderName((name) -> {
            if ("MCUboot".equals(name)) {
                readMcuBootMode(() -> promise.resolve(null));
            }
            else {
                promise.resolve(null);
            }
        })));


    }


    /**
     * Reads the MCU Manager parameters.
     *
     * @param then a callback to be invoked when the parameters are read.
     */
    private void readMcuMgrParams(@Nullable final Runnable then) {
        defaultManager.params(new McuMgrCallback<McuMgrParamsResponse>() {
            @Override
            public void onResponse(@NotNull final McuMgrParamsResponse response) {
                Log.i(TAG, "McuMgrParamsResponse" + response);
                WritableMap map = Arguments.createMap();
                map.putInt("bufCount", response.bufCount);
                map.putInt("bufSize", response.bufSize);
                sendEvent("DFUDeviceParams", map);

                if (then != null) {
                    then.run();
                }
            }

            @Override
            public void onError(@NotNull final McuMgrException error) {
                Log.i(TAG, "onError" + error);
                if (then != null) {
                    then.run();
                }
            }
        });
    }

    /**
     * Reads application info.
     *
     * @param format See {@link DefaultManager#appInfo(String)} for details.
     *
     * @noinspection SameParameterValue
     */
    private void readAppInfo(@Nullable final String format, @Nullable final Runnable then) {
        defaultManager.appInfo(format, new McuMgrCallback<McuMgrAppInfoResponse>() {
            @Override
            public void onResponse(@NotNull McuMgrAppInfoResponse response) {
                Log.i(TAG, "McuMgrAppInfoResponse" + response);
                WritableMap map = Arguments.createMap();
                map.putString("output", response.output);
                sendEvent("DFUDeviceParams", map);
                if (then != null) {
                    then.run();
                }
            }

            @Override
            public void onError(@NotNull McuMgrException error) {
                Log.i(TAG, "onError" + error);

                if (then != null) {
                    then.run();
                }
            }
        });
    }

    /**
     * A callback to be invoked when the bootloader name is read.
     */
    private interface BootloaderNameCallback {
        void onBootloaderNameReceived(@NonNull String bootloaderName);
    }

    /**
     * Reads the name of the bootloader.
     *
     * @param then a callback to be invoked when the name is read.
     */
    private void readBootloaderName(@Nullable final BootloaderNameCallback then) {
        defaultManager.bootloaderInfo(DefaultManager.BOOTLOADER_INFO_QUERY_BOOTLOADER, new McuMgrCallback<McuMgrBootloaderInfoResponse>() {
            @Override
            public void onResponse(@NotNull McuMgrBootloaderInfoResponse response) {
                Log.i(TAG, "McuMgrBootloaderInfoResponse" + response);
                WritableMap map = Arguments.createMap();
                map.putString("bootloader", response.bootloader);
                map.putInt("rc", response.rc);
                map.putString("mode", bootloaderModeToString(response.mode));
                sendEvent("DFUDeviceParams", map);
                if (then != null) {
                    then.onBootloaderNameReceived(response.bootloader);
                }
            }

            @Override
            public void onError(@NotNull McuMgrException error) {

            }
        });
    }

    /**
     * Reads the mode of the bootloader.
     * This method is only supported by MCUboot bootloader.
     *
     * @param then a callback to be invoked when the mode is read.
     *
     * @noinspection SameParameterValue
     */
    private void readMcuBootMode(@Nullable final Runnable then) {
        defaultManager.bootloaderInfo(DefaultManager.BOOTLOADER_INFO_MCUBOOT_QUERY_MODE, new McuMgrCallback<McuMgrBootloaderInfoResponse>() {
            @Override
            public void onResponse(@NotNull McuMgrBootloaderInfoResponse response) {
                Log.i(TAG, "McuMgrBootloaderInfoResponse" + response);
                WritableMap map = Arguments.createMap();
                map.putString("mode", bootloaderModeToString(response.mode));
                sendEvent("DFUDeviceParams", map);
                if (then != null) {
                    then.run();
                }
            }

            @Override
            public void onError(@NotNull McuMgrException error) {
                Log.i(TAG, "onError" + error);
                if (then != null) {
                    then.run();
                }
            }
        });
    }

    private void sendEvent(String eventName, Object params) {
        getReactApplicationContext().getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }
}
