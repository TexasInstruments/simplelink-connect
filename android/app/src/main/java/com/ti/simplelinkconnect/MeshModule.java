package com.ti.connectivity.simplelinkconnect;

import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.NODE_CONNECTED;
import static com.ti.simplelinkconnect.mesh.MeshRepository.bytesToHexString;
import static com.ti.simplelinkconnect.mesh.Utils.supportsModelBinding;
import static com.ti.simplelinkconnect.mesh.Utils.supportsModelPublication;
import static com.ti.simplelinkconnect.mesh.Utils.supportsModelSubscriptions;

import static no.nordicsemi.android.mesh.models.SigModelParser.CONFIGURATION_CLIENT;
import static no.nordicsemi.android.mesh.models.SigModelParser.CONFIGURATION_SERVER;

import android.graphics.ColorSpace;
import android.net.Network;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.ti.simplelinkconnect.mesh.BleMeshManagerProvider;
import com.ti.simplelinkconnect.mesh.ExtendedBluetoothDevice;
import com.ti.simplelinkconnect.mesh.ExtendedConnectedDevice;
import com.ti.simplelinkconnect.mesh.MeshModuleEvents;
import com.ti.simplelinkconnect.mesh.MeshRepository;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;

import no.nordicsemi.android.mesh.AllocatedGroupRange;
import no.nordicsemi.android.mesh.AllocatedSceneRange;
import no.nordicsemi.android.mesh.AllocatedUnicastRange;
import no.nordicsemi.android.mesh.ApplicationKey;
import no.nordicsemi.android.mesh.Features;
import no.nordicsemi.android.mesh.Group;
import no.nordicsemi.android.mesh.MeshManagerApi;
import no.nordicsemi.android.mesh.MeshNetwork;
import no.nordicsemi.android.mesh.NetworkKey;
import no.nordicsemi.android.mesh.Provisioner;
import no.nordicsemi.android.mesh.models.ConfigurationClientModel;
import no.nordicsemi.android.mesh.models.SigModel;
import no.nordicsemi.android.mesh.models.VendorModel;
import no.nordicsemi.android.mesh.provisionerstates.UnprovisionedMeshNode;
import no.nordicsemi.android.mesh.transport.ConfigAppKeyAdd;
import no.nordicsemi.android.mesh.transport.ConfigAppKeyDelete;
import no.nordicsemi.android.mesh.transport.ConfigDefaultTtlSet;
import no.nordicsemi.android.mesh.transport.ConfigGattProxyGet;
import no.nordicsemi.android.mesh.transport.ConfigGattProxySet;
import no.nordicsemi.android.mesh.transport.ConfigModelAppBind;
import no.nordicsemi.android.mesh.transport.ConfigModelAppUnbind;
import no.nordicsemi.android.mesh.transport.ConfigModelPublicationGet;
import no.nordicsemi.android.mesh.transport.ConfigModelPublicationSet;
import no.nordicsemi.android.mesh.transport.ConfigModelSubscriptionAdd;
import no.nordicsemi.android.mesh.transport.ConfigModelSubscriptionDelete;
import no.nordicsemi.android.mesh.transport.ConfigModelSubscriptionVirtualAddressAdd;
import no.nordicsemi.android.mesh.transport.ConfigNetKeyAdd;
import no.nordicsemi.android.mesh.transport.ConfigNetKeyDelete;
import no.nordicsemi.android.mesh.transport.ConfigNodeReset;
import no.nordicsemi.android.mesh.transport.ConfigSigModelSubscriptionGet;
import no.nordicsemi.android.mesh.transport.ConfigVendorModelSubscriptionGet;
import no.nordicsemi.android.mesh.transport.Element;
import no.nordicsemi.android.mesh.transport.MeshMessage;
import no.nordicsemi.android.mesh.transport.MeshModel;
import no.nordicsemi.android.mesh.transport.ProvisionedMeshNode;
import no.nordicsemi.android.mesh.transport.ProxyConfigAddAddressToFilter;
import no.nordicsemi.android.mesh.transport.ProxyConfigRemoveAddressFromFilter;
import no.nordicsemi.android.mesh.transport.ProxyConfigSetFilterType;
import no.nordicsemi.android.mesh.transport.SensorGet;
import no.nordicsemi.android.mesh.transport.VendorModelMessageAcked;
import no.nordicsemi.android.mesh.utils.AddressArray;
import no.nordicsemi.android.mesh.utils.AddressType;
import no.nordicsemi.android.mesh.utils.CompanyIdentifiers;
import no.nordicsemi.android.mesh.utils.MeshAddress;
import no.nordicsemi.android.mesh.utils.MeshParserUtils;
import no.nordicsemi.android.mesh.utils.ProxyFilterType;

import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.ti.simplelinkconnect.mesh.ObservableVariable;
import com.ti.simplelinkconnect.mesh.PublicationSettingsHelper;
import com.ti.simplelinkconnect.mesh.Utils;

public class MeshModule extends ReactContextBaseJavaModule {
    private MeshManagerApi meshManagerApi;
    private MeshRepository meshRepository;
    private BleMeshManagerProvider bleMeshManagerProvider;
    private ReactApplicationContext mContext;
    private NetworkKey newNetworkKey;
    private ApplicationKey newApplicationKey;
    public List<ExtendedBluetoothDevice> scanResults = new ArrayList<ExtendedBluetoothDevice>();
    ObservableVariable<List<ExtendedConnectedDevice>> connectedDevices = new ObservableVariable<>(new ArrayList<ExtendedConnectedDevice>());

    public MeshModule(ReactApplicationContext context) {
        super(context);
        mContext = context;
        connectedDevices.addListener(newValue -> {
            List<String> addressList = newValue.stream().map(ExtendedConnectedDevice::getAddress).toList(); // Extract addresses from the devices
            Log.i("MeshModule", "Connected device addresses: " + addressList.toString()); // Print the address list
        });

    }

    private List<ExtendedConnectedDevice> getConnectedDevices() {
        return connectedDevices.getValue();
    }

    public void addConnectedDevice(ExtendedConnectedDevice newDevice) {
        List<ExtendedConnectedDevice> currentList = new ArrayList<>(getConnectedDevices());
        currentList.add(newDevice);
        connectedDevices.setValue(currentList);
    }

    public void removeConnectedDevice(String deviceAddress) {
        List<ExtendedConnectedDevice> currentList = new ArrayList<>(connectedDevices.getValue());
        boolean isRemoved = currentList.removeIf(device -> device.getAddress().equals(deviceAddress));
        if (isRemoved) {
            connectedDevices.setValue(currentList); // Notify listeners of the change
        }
    }


    @NonNull
    @Override
    public String getName() {
        return "MeshModule";
    }

    // Initialize the Mesh Manager
    private void initializeMeshManager() {
        // Initialize mesh manager only once
        if (meshManagerApi == null) {
            meshManagerApi = new MeshManagerApi(mContext);
            bleMeshManagerProvider = new BleMeshManagerProvider();
            meshRepository = new MeshRepository(meshManagerApi, bleMeshManagerProvider, mContext, this);
        }

    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    @ReactMethod
    public void meshInit(Promise promise) {
        Log.i("mesh", "meshInit");

        try {
            initializeMeshManager();
            promise.resolve("success");

        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void getMeshNetworkName(Promise promise) {
        try {
            String name = meshRepository.getMeshNetworkLiveData().getNetworkName();
            if (name != null) {
                promise.resolve(name);
            }
            else {
                promise.reject("Mesh network name is null");
            }
        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void loadMeshNetwork(Promise promise) {
        meshRepository.loadMeshNetwork();
        promise.resolve("success");

    }

    @ReactMethod
    public void setMeshNetworkName(String newNetName, Promise promise) {
        try {
            meshRepository.getMeshNetworkLiveData().setNetworkName(newNetName);
            promise.resolve("success");

        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void getMeshNetworkTimestamp(Promise promise) {
        try {
            long timestamp = meshRepository.getMeshNetworkLiveData().getMeshNetwork().getTimestamp();

            promise.resolve(Long.toString(timestamp));


        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void getProvisionedMeshNodes(Promise promise) {
        try {
            final List<ProvisionedMeshNode> nodes = new ArrayList<>();
            WritableArray array = new WritableNativeArray();
            MeshNetwork net = meshRepository.getMeshNetworkLiveData().getMeshNetwork();
            for (final ProvisionedMeshNode node : net.getNodes()) {
                if (!node.getUuid().equalsIgnoreCase(net.getSelectedProvisioner().getProvisionerUuid())) {
                    nodes.add(node);
                    WritableMap nodeMap = new WritableNativeMap();
                    nodeMap.putString("name", node.getNodeName());
                    nodeMap.putInt("unicastAddress", node.getUnicastAddress());
                    nodeMap.putString("deviceKey", bytesToHexString(node.getDeviceKey()));

                    WritableArray features = getNodeFeatures(node);

                    nodeMap.putArray("features", features);
                    nodeMap.putString("company", CompanyIdentifiers.getCompanyName(node.getCompanyIdentifier().shortValue()));
                    nodeMap.putInt("numberOfElements", node.getNumberOfElements());

                    int numberOfModels = 0;
                    Map<Integer, Element> elementMap = node.getElements();

                    for (Integer key : elementMap.keySet()) {
                        Element e = elementMap.get(key);
                        assert e != null;
                        numberOfModels += (e.getSigModelCount() + e.getVendorModelCount());
                    }
                    nodeMap.putInt("numberOfModels", numberOfModels);

                    array.pushMap(nodeMap);
                }
            }

            if (array != null) {
                promise.resolve(array);
            }
            else {
                promise.reject("Mesh network name is null");
            }
        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void getProvisionedNode(int unicastAddress, Promise promise) {
        try {
            MeshNetwork net = meshRepository.getMeshNetworkLiveData().getMeshNetwork();
            ProvisionedMeshNode node = net.getNode(unicastAddress);
            WritableMap nodeMap = new WritableNativeMap();
            nodeMap.putString("uuid", node.getUuid());
            nodeMap.putString("name", node.getNodeName());
            nodeMap.putInt("unicastAddress", node.getUnicastAddress());
            nodeMap.putString("deviceKey", bytesToHexString(node.getDeviceKey()));

            WritableArray features = getNodeFeatures(node);

            nodeMap.putArray("features", features);
            nodeMap.putString("company", CompanyIdentifiers.getCompanyName(node.getCompanyIdentifier().shortValue()));
            nodeMap.putInt("ttl", node.getTtl());
            nodeMap.putInt("addedNetworkKeysNum", node.getAddedNetKeys().size());
            nodeMap.putInt("addedApplicationKeysNum", node.getAddedAppKeys().size());

            int numberOfModels = 0;
            Map<Integer, Element> elementsMap = node.getElements();
            WritableArray elementsArray = new WritableNativeArray();

            for (Integer key : elementsMap.keySet()) {
                Element e = elementsMap.get(key);
                WritableMap elementItem = new WritableNativeMap();
                WritableArray modelsArray = new WritableNativeArray();

                assert e != null;
                numberOfModels += (e.getSigModelCount() + e.getVendorModelCount());

                elementItem.putString("name", e.getName());
                elementItem.putInt("address", e.getElementAddress());

                Map<Integer, MeshModel> modelsMap = e.getMeshModels();
                for (Map.Entry<Integer, MeshModel> entry : modelsMap.entrySet()) {
                    MeshModel m = entry.getValue();
                    WritableMap modelItem = new WritableNativeMap();

                    assert m != null;
                    modelItem.putString("name", m.getModelName());
                    modelItem.putInt("id", m.getModelId());
                    if (entry.getValue() instanceof SigModel) {
                        modelItem.putString("type", "Bluetooth SIG");
                    }
                    else if (entry.getValue() instanceof VendorModel) {
                        modelItem.putString("type", ((VendorModel) entry.getValue()).getCompanyName());
                    }
                    modelItem.putBoolean("isBindingSupported", supportsModelBinding(m));
                    modelItem.putBoolean("isSubscribeSupported", supportsModelSubscriptions(m));
                    modelItem.putBoolean("isPublishSupported", supportsModelPublication(m));
                    modelsArray.pushMap(modelItem);
                }

                elementItem.putArray("models", modelsArray);
                elementsArray.pushMap(elementItem);
            }

            nodeMap.putArray("elements", elementsArray);
            nodeMap.putInt("numberOfModels", numberOfModels);

            if (!nodeMap.toHashMap().isEmpty()) {
                promise.resolve(nodeMap);
            }
            else {
                promise.reject("node not found");
            }
        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    public WritableArray getNodeFeatures(ProvisionedMeshNode node){
        WritableArray features = new WritableNativeArray();
        Features f = node.getNodeFeatures();

        WritableMap friendMap = new WritableNativeMap();
        friendMap.putString("name", "F");
        friendMap.putInt("state", f.getFriend());

        WritableMap proxyMap = new WritableNativeMap();
        proxyMap.putString("name", "P");
        proxyMap.putInt("state", f.getProxy());

        WritableMap lowPowerMap = new WritableNativeMap();
        lowPowerMap.putString("name", "LP");
        lowPowerMap.putInt("state", f.getLowPower());

        WritableMap relayMap = new WritableNativeMap();
        relayMap.putString("name", "R");
        relayMap.putInt("state", f.getRelay());


        features.pushMap(friendMap);
        features.pushMap(proxyMap);
        features.pushMap(lowPowerMap);
        features.pushMap(relayMap);

        return features;
    }
    public boolean isNetKeyAddedToNode(ProvisionedMeshNode node, final int keyIndex) {
        if (node != null) {
            return MeshParserUtils.isNodeKeyExists(node.getAddedNetKeys(), keyIndex);
        }
        return false;
    }

    public boolean isAppKeyAddedToNode(ProvisionedMeshNode node, final int keyIndex) {
        if (node != null) {
            return MeshParserUtils.isNodeKeyExists(node.getAddedAppKeys(), keyIndex);
        }
        return false;
    }

    @ReactMethod
    public void getProvisionedNodeNetworkKeys(int unicastAddress, Promise promise) {
        try {
            MeshNetwork net = meshRepository.getMeshNetworkLiveData().getMeshNetwork();
            ProvisionedMeshNode node = net.getNode(unicastAddress);
            WritableArray keysList = new WritableNativeArray();

            for (NetworkKey networkKey : net.getNetKeys()) {
                if (isNetKeyAddedToNode(node, networkKey.getKeyIndex())) {
                    keysList.pushMap(convertNetworkKeyToMap(networkKey));
                }
            }
            promise.resolve(keysList);

        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void getProvisionedNodeAppKeys(int unicastAddress, Promise promise) {
        try {
            MeshNetwork net = meshRepository.getMeshNetworkLiveData().getMeshNetwork();
            ProvisionedMeshNode node = net.getNode(unicastAddress);
            WritableArray keysList = new WritableNativeArray();

            for (ApplicationKey appKey : net.getAppKeys()) {
                if (isAppKeyAddedToNode(node, appKey.getKeyIndex())) {
                    keysList.pushMap(convertAppKeyToMap(appKey));
                }
            }
            promise.resolve(keysList);

        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void addNodeNetworkKeys(int unicastAddress, int keyIndex, Promise promise) {
        try {
            MeshNetwork net = meshRepository.getMeshNetworkLiveData().getMeshNetwork();
            ProvisionedMeshNode node = net.getNode(unicastAddress);

            NetworkKey netKeyToAdd = net.getNetKey(keyIndex);
            MeshMessage meshMessage = new ConfigNetKeyAdd(netKeyToAdd);
            meshRepository.getMeshManagerApi().createMeshPdu(node.getUnicastAddress(), meshMessage);

            Log.i("addNodeNetworkKeys", meshMessage.toString());
            promise.resolve("success");

        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void addNodeAppKey(int unicastAddress, int keyIndex, Promise promise) {
        try {
            MeshNetwork net = meshRepository.getMeshNetworkLiveData().getMeshNetwork();
            ProvisionedMeshNode node = net.getNode(unicastAddress);

            ApplicationKey appKeyToAdd = net.getAppKey(keyIndex);
            NetworkKey primaryNetKey = meshRepository.getMeshNetworkLiveData().getMeshNetwork().getPrimaryNetworkKey();

            MeshMessage meshMessage = new ConfigAppKeyAdd(primaryNetKey, appKeyToAdd);
            meshRepository.getMeshManagerApi().createMeshPdu(node.getUnicastAddress(), meshMessage);

            Log.i("addNodeAppKeys", meshMessage.toString());
            promise.resolve("success");

        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void removeNodeNetworkKeys(int unicastAddress, int keyIndex, Promise promise) {
        try {
            MeshNetwork net = meshRepository.getMeshNetworkLiveData().getMeshNetwork();
            ProvisionedMeshNode node = net.getNode(unicastAddress);

            NetworkKey netKeyToRemove = net.getNetKey(keyIndex);
            MeshMessage meshMessage = new ConfigNetKeyDelete(netKeyToRemove);
            meshRepository.getMeshManagerApi().createMeshPdu(node.getUnicastAddress(), meshMessage);

            Log.i("removeNodeNetworkKeys", meshMessage.toString());
            promise.resolve("success");

        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void removeNodeAppKeys(int unicastAddress, int keyIndex, Promise promise) {
        try {
            MeshNetwork net = meshRepository.getMeshNetworkLiveData().getMeshNetwork();
            ProvisionedMeshNode node = net.getNode(unicastAddress);

            ApplicationKey appKeyToRemove = net.getAppKey(keyIndex);
            NetworkKey primaryNetKey = meshRepository.getMeshNetworkLiveData().getMeshNetwork().getPrimaryNetworkKey();

            MeshMessage meshMessage = new ConfigAppKeyDelete(primaryNetKey, appKeyToRemove);
            meshRepository.getMeshManagerApi().createMeshPdu(node.getUnicastAddress(), meshMessage);

            Log.i("removeNodeAppKeys", meshMessage.toString());
            promise.resolve("success");

        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    private WritableMap convertNetworkKeyToMap(NetworkKey key) {
        WritableMap map = Arguments.createMap();
        map.putString("name", key.getName());
        map.putInt("index", key.getKeyIndex());
        map.putDouble("timestamp", key.getTimestamp());
        map.putString("key", bytesToHex(key.getKey()));
        return map;
    }

    private WritableMap convertAppKeyToMap(ApplicationKey key) {
        WritableMap map = Arguments.createMap();
        map.putString("name", key.getName());
        map.putInt("index", key.getKeyIndex());
        map.putString("key", bytesToHex(key.getKey()));
        return map;
    }

    private byte[] hexStringToByteArray(String s) {
        int len = s.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4) + Character.digit(s.charAt(i + 1), 16));
        }
        return data;
    }

    @ReactMethod
    public void getMeshPrimaryNetworksKey(Promise promise) {
        try {
            NetworkKey primaryKey = meshRepository.getMeshNetworkLiveData().getMeshNetwork().getPrimaryNetworkKey();

            if (primaryKey != null) {
                WritableMap primaryKeyMap = convertNetworkKeyToMap(primaryKey);
                promise.resolve(primaryKeyMap);
            }
            else {
                promise.resolve(null);
            }

        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void getMeshSubNetworksKeys(Promise promise) {
        try {
            List<NetworkKey> keys = meshRepository.getMeshNetworkLiveData().getNetworkKeys();
            NetworkKey primaryKey = meshRepository.getMeshNetworkLiveData().getMeshNetwork().getPrimaryNetworkKey();
            WritableArray jsonArray = Arguments.createArray();

            if (keys != null && !keys.isEmpty()) {
                for (NetworkKey key : keys) {
                    // Add only sub keys
                    if (key.getKey() != primaryKey.getKey()) {
                        WritableMap keyMap = convertNetworkKeyToMap(key);
                        jsonArray.pushMap(keyMap);
                    }
                }

            }
            promise.resolve(jsonArray);

        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void getMeshApplicationsKeys(Promise promise) {
        try {
            List<ApplicationKey> keys = meshRepository.getMeshNetworkLiveData().getAppKeys();

            if (keys != null && !keys.isEmpty()) {
                WritableArray jsonArray = Arguments.createArray();

                for (ApplicationKey key : keys) {
                    WritableMap keyMap = convertAppKeyToMap(key);
                    jsonArray.pushMap(keyMap);
                }

                promise.resolve(jsonArray);
            }
            else {
                promise.resolve(null);
            }
        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void generateNetworksKey(Promise promise) {
        try {
            NetworkKey newKey = meshRepository.getMeshNetworkLiveData().getMeshNetwork().createNetworkKey();
            newNetworkKey = newKey;

            promise.resolve(convertNetworkKeyToMap(newKey));

        } catch (Exception e) {
            promise.resolve(e.getMessage());  // Pass the error to the callback
        }
    }

    @ReactMethod
    public void generateAppKey(Promise promise) {
        try {
            ApplicationKey newKey = meshRepository.getMeshNetworkLiveData().getMeshNetwork().createAppKey();
            newApplicationKey = newKey;

            promise.resolve(convertAppKeyToMap(newKey));

        } catch (Exception e) {
            promise.resolve(e.getMessage());
        }
    }

    @ReactMethod
    public void addNetworksKey(String name, String hexKeyString, Promise promise) {
        try {

            // Convert hex string to byte array
            byte[] keyBytes = hexStringToByteArray(hexKeyString);

            // Create and set the new network key
            newNetworkKey.setKey(keyBytes);
            newNetworkKey.setName(name);

            // Add the network key to the repository
            meshRepository.getMeshNetworkLiveData().getMeshNetwork().addNetKey(newNetworkKey);

            // Prepare the result as a WritableNativeMap
            WritableNativeMap resultMap = new WritableNativeMap();
            resultMap.putString("name", newNetworkKey.getName());
            resultMap.putString("key", hexKeyString);
            resultMap.putInt("index", newNetworkKey.getKeyIndex());
            resultMap.putDouble("timestamp", newNetworkKey.getTimestamp());

            // Log the result for debugging

            // Pass the result back to the JavaScript side
            promise.resolve(resultMap);

        } catch (Exception e) {
            // Pass the error to the callback
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void addAppKey(String name, String hexKeyString, Promise promise) {
        try {
            // Convert hex string to byte array
            byte[] keyBytes = hexStringToByteArray(hexKeyString);

            // Create and set the new network key
            newApplicationKey.setKey(keyBytes);
            newApplicationKey.setName(name);

            // Add the network key to the repository
            meshRepository.getMeshNetworkLiveData().getMeshNetwork().addAppKey(newApplicationKey);

            // Prepare the result as a WritableNativeMap
            WritableMap resultMap = convertAppKeyToMap(newApplicationKey);

            // Pass the result back to the JavaScript side
            promise.resolve(resultMap);

        } catch (Exception e) {
            // Pass the error to the callback
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void removeNetworksKey(Integer keyIndex, Promise promise) {
        try {
            NetworkKey keyToRemove = meshRepository.getMeshNetworkLiveData().getMeshNetwork().getNetKey(keyIndex);

            // Add the network key to the repository
            meshRepository.getMeshNetworkLiveData().getMeshNetwork().removeNetKey(keyToRemove);

            // Pass the result back to the JavaScript side
            promise.resolve(keyIndex);

        } catch (Exception e) {
            // Pass the error to the callback
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void removeAppKey(Integer keyIndex, Promise promise) {
        try {
            ApplicationKey keyToRemove = meshRepository.getMeshNetworkLiveData().getMeshNetwork().getAppKey(keyIndex);

            // Add the network key to the repository
            meshRepository.getMeshNetworkLiveData().getMeshNetwork().removeAppKey(keyToRemove);

            // Pass the result back to the JavaScript side
            promise.resolve(keyIndex);

        } catch (Exception e) {
            // Pass the error to the callback
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void editNetworksKey(Integer keyIndex, String newName, String hexKeyString, Promise promise) {
        try {
            NetworkKey keyToEdit = meshRepository.getMeshNetworkLiveData().getMeshNetwork().getNetKey(keyIndex);
            keyToEdit.setName(newName);
            byte[] keyBytes = hexStringToByteArray(hexKeyString);
            keyToEdit.setKey(keyBytes);

            meshRepository.getMeshNetworkLiveData().getMeshNetwork().updateNetKey(keyToEdit);

            // Pass the result back to the JavaScript side
            promise.resolve(convertNetworkKeyToMap(keyToEdit));

        } catch (Exception e) {
            // Pass the error to the callback
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void editAppKey(Integer keyIndex, String newName, String hexKeyString, Promise promise) {
        try {
            ApplicationKey keyToEdit = meshRepository.getMeshNetworkLiveData().getMeshNetwork().getAppKey(keyIndex);
            keyToEdit.setName(newName);
            byte[] keyBytes = hexStringToByteArray(hexKeyString);
            keyToEdit.setKey(keyBytes);

            meshRepository.getMeshNetworkLiveData().getMeshNetwork().updateAppKey(keyToEdit);

            // Pass the result back to the JavaScript side
            promise.resolve(convertAppKeyToMap(keyToEdit));

        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void startScan(Promise promise) {
        this.scanResults.clear();
        meshRepository.startScanForUnprovisionedNode();
        promise.resolve("success");
    }

    @ReactMethod
    public void stopScan(Promise promise) {
        meshRepository.stopScan();
        promise.resolve("success");
    }

    public void stopScan() {
        meshRepository.stopScan();
    }

    @ReactMethod
    public void selectUnprovisionedNode(String nodeId, Promise promise) {
        ExtendedBluetoothDevice chosenDevice = null;
        String deviceName = "";
        String deviceAddress = "";
        final UnprovisionedMeshNode node = meshRepository.getUnprovisionedMeshNode();

//        if (node != null) {
//            Log.i("mesh", "Node already identified");
//            WritableMap map = Arguments.createMap();
//            map.putString("name", node.getNodeName());
//            map.putString("networkKey", bytesToHexString(node.getNetworkKey()));
//            map.putInt("numberOfElement", node.getNumberOfElements());
//            map.putInt("unicastAddress", node.getUnicastAddress());
//            sendEvent(NODE_IDENTIFIED, map);
//            sendEvent(STATE_CHANGES, "Connected (unprovisioned)");
//            return;
//        }

        // find node id in scan results
        for (ExtendedBluetoothDevice device : scanResults) {
            if (Objects.equals(device.getDevice().getAddress(), nodeId)) {
                chosenDevice = device;
                deviceName = chosenDevice.getName();
                deviceAddress = chosenDevice.getAddress();

                meshRepository.setSelectedBluetoothDevice(device);
            }
        }

        if (chosenDevice != null) {
            meshRepository.connect(mContext, chosenDevice, false);
            stopScan();
        }
    }

    @ReactMethod
    public void identifyNode(Promise promise) {
        meshRepository.identifyNode(Objects.requireNonNull(meshRepository.getSelectedBluetoothDevice().getValue()));
        promise.resolve("success");
    }

    public void sendEvent(MeshModuleEvents eventName, Object message) {
        Log.i("mesh", eventName + ": " + message);
        mContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit(eventName.getState(), message);

    }

    @ReactMethod
    public void startProvisioningNode(Promise promise) {
        final UnprovisionedMeshNode node = meshRepository.getUnprovisionedMeshNode();
        meshRepository.getMeshManagerApi().startProvisioning(node);
        promise.resolve("success");

    }

    public WritableMap getUnprovisionedNodeData(UnprovisionedMeshNode node) {
        WritableMap map = Arguments.createMap();
        map.putString("name", node.getNodeName());
        map.putString("networkKey", bytesToHexString(node.getNetworkKey()));

        ApplicationKey selectedAppKey = meshRepository.getMeshNetworkLiveData().getSelectedAppKey();
        if (selectedAppKey != null) {
            map.putString("appKey", bytesToHexString(selectedAppKey.getKey()));
        }
        else {
            map.putString("appKey", "No app keys available");
        }
        map.putInt("numberOfElement", node.getNumberOfElements());
        map.putInt("unicastAddress", node.getUnicastAddress());

        return map;
    }

    @ReactMethod
    public void editUnprovisionedNodeName(String newNodeName, Promise promise) {
        try {
            final UnprovisionedMeshNode node = meshRepository.getUnprovisionedMeshNode();
            node.setNodeName(newNodeName);

            UnprovisionedMeshNode updatedNode = meshRepository.getUnprovisionedMeshNode();
            WritableMap map = getUnprovisionedNodeData(updatedNode);

            promise.resolve(map);
        } catch (Exception e) {
            promise.reject(e);
        }
    }

    @ReactMethod
    public void editProvisionedNodeName(int unicastAddr, String newNodeName, Promise promise) {
        try {
            ProvisionedMeshNode nodeToEdit = meshRepository.getMeshNetworkLiveData().getMeshNetwork().getNode(unicastAddr);

            boolean edited = meshRepository.getMeshNetworkLiveData().getMeshNetwork().updateNodeName(nodeToEdit, newNodeName);

            promise.resolve(edited);
        } catch (Exception e) {
            promise.reject(e);
        }
    }

    @ReactMethod
    public void editProvisionedNodeTtl(int unicastAddr, int newTtl, Promise promise) {
        try {
            ProvisionedMeshNode nodeToEdit = meshRepository.getMeshNetworkLiveData().getMeshNetwork().getNode(unicastAddr);
            nodeToEdit.setTtl(newTtl);

            final ConfigDefaultTtlSet ttlSet = new ConfigDefaultTtlSet(newTtl);

            meshRepository.getMeshManagerApi().createMeshPdu(nodeToEdit.getUnicastAddress(), ttlSet);

            promise.resolve("success");
        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void editUnprovisionedNodeAddr(int unicastAddr, Promise promise) {
        try {
            final UnprovisionedMeshNode node = meshRepository.getUnprovisionedMeshNode();
            meshRepository.getMeshNetworkLiveData().getMeshNetwork().assignUnicastAddress(unicastAddr);
            node.setUnicastAddress(unicastAddr);

            UnprovisionedMeshNode updatedNode = meshRepository.getUnprovisionedMeshNode();

            WritableMap map = getUnprovisionedNodeData(updatedNode);

            promise.resolve(map);

        } catch (Exception e) {
            promise.reject(e);
        }
    }

    @ReactMethod
    public void resetNetwork(Promise promise) {
        meshRepository.getMeshManagerApi().resetMeshNetwork();
        promise.resolve("success");
    }

    @ReactMethod
    public void removeNodeFromNetwork(int unicastAddr, Promise promise) {
        try {
            ProvisionedMeshNode nodeToRemove = meshRepository.getMeshNetworkLiveData().getMeshNetwork().getNode(unicastAddr);

            boolean removed = meshRepository.getMeshNetworkLiveData().getMeshNetwork().deleteNode(nodeToRemove);
            Log.i("mesh", "removeNodeFromNetwork: " + removed);
            promise.resolve(removed);

        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void isDeviceConnected(int unicastAddr, Promise promise) {
        try {
            // Check if the device with the given unicast address is connected
            boolean isConnected = false;
            for (ExtendedConnectedDevice device : getConnectedDevices()) {
                if (device.getUnicastAddress() == unicastAddr) {
                    meshRepository.currentBleManager = meshRepository.mBleMeshManagerProvider.getOrCreateManager(device.getDevice(), mContext);
                    isConnected = true;
                    break;
                }
            }

            // Resolve the promise with the connection status
            promise.resolve(isConnected);
        } catch (Exception e) {
            promise.reject(e.getMessage());
        }
    }

    @ReactMethod
    public void reconnectToProxy(int nodeUnicastAddr, Promise promise) {
        this.scanResults.clear();

        // already connected
        if (isDeviceConnected(nodeUnicastAddr)) {
            Log.i("reconnectToProxy", "Device already connected");
            sendEvent(NODE_CONNECTED, "connected");
        }
        else {
            ProvisionedMeshNode node = meshRepository.getMeshNetworkLiveData().getMeshNetwork().getNode(nodeUnicastAddr);
            if (node == null) {
                Log.e("mesh", "Node Not Found with address" + nodeUnicastAddr);
                return;
            }
            meshRepository.setSelectedMeshNode(node);
            meshRepository.startScanForProxyNode();
        }
        promise.resolve("success");
    }

    public boolean isDeviceConnected(int unicastAddr) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            return connectedDevices.getValue().stream().anyMatch(o -> {
                if (o.getUnicastAddress() == unicastAddr) {
                    meshRepository.currentBleManager = meshRepository.mBleMeshManagerProvider.getOrCreateManager(o.getDevice(), mContext);
                    return true;
                }
                else {
                    return false;
                }
            });
        }
        return false;
    }

    public boolean isDeviceConnected(String address) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            return connectedDevices.getValue().stream().anyMatch(o -> {
                if (Objects.equals(o.getAddress(), address)) {
                    meshRepository.currentBleManager = meshRepository.mBleMeshManagerProvider.getOrCreateManager(o.getDevice(), mContext);
                    return true;
                }
                else {
                    return false;
                }
            });
        }
        return false;
    }

    @ReactMethod
    public void selectProvisionedNodeToConnect(String nodeId, int unicastAddress, String identifier, Promise promise) {
        ExtendedBluetoothDevice chosenDevice = null;
        String deviceName = "";
        String deviceAddress = "";

        // find node id in scan results
        for (ExtendedBluetoothDevice device : scanResults) {
            if (Objects.equals(device.getDevice().getAddress(), nodeId)) {
                chosenDevice = device;
                deviceName = chosenDevice.getName();
                deviceAddress = chosenDevice.getAddress();

                meshRepository.setSelectedBluetoothDevice(device);
            }
        }
        assert chosenDevice != null;

        if (chosenDevice != null) {
            meshRepository.connect(mContext, chosenDevice, false);
            stopScan();
        }
        promise.resolve("success");
    }

    @ReactMethod
    public void disconnect(Promise promise) {
        // Initialize the CompletableFuture
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            meshRepository.disconnectFuture = new CompletableFuture<>();
        }

        // Call the disconnect method from the mesh repository
        meshRepository.disconnect();

        // Wait for the future to complete and resolve the promise
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            meshRepository.disconnectFuture.whenComplete((result, throwable) -> {
                if (throwable != null) {
                    promise.reject("DISCONNECT_ERROR", throwable);
                }
                else {
                    promise.resolve("success");
                }
            });
        }
    }

    @ReactMethod
    public void selectModel(int nodeUnicastAddr, int elementAddr, int modelId, boolean isSigModel, Promise promise) {
        try {
            MeshNetwork net = meshRepository.getMeshNetworkLiveData().getMeshNetwork();
            ProvisionedMeshNode node = net.getNode(nodeUnicastAddr);
            for (Element element : node.getElements().values()) {
                if (element.getElementAddress() == elementAddr) {
                    meshRepository.setSelectedElement(element);
                    for (MeshModel meshModel : element.getMeshModels().values()) {
                        if (meshModel.getModelId() == modelId) {
                            meshRepository.setSelectedModel(meshModel);
                            meshRepository.setCurrentPublicationSettings(new PublicationSettingsHelper(element, meshModel));

                            promise.resolve("success");
                            return;
                        }
                    }
                }
            }

            promise.resolve("model not found");

        } catch (Exception exception) {
            promise.reject(exception);
        }
    }

    @ReactMethod
    public void getModelBoundKeys(Promise promise) {
        final MeshModel model = meshRepository.getSelectedModel().getValue();
        if (model == null) {
            promise.resolve("model is null");
        }
        else {
            WritableArray map = new WritableNativeArray();
            for (int index : model.getBoundAppKeyIndexes()) {
                map.pushInt(index);
            }
            promise.resolve(map);
        }
    }

    @ReactMethod
    public void bindAppKey(int nodeUnicastAddr, final int appKeyIndex, Promise promise) {
        MeshNetwork net = meshRepository.getMeshNetworkLiveData().getMeshNetwork();
        ProvisionedMeshNode node = net.getNode(nodeUnicastAddr);
        if (node != null) {
            final Element element = meshRepository.getSelectedElement().getValue();
            if (element != null) {
                final MeshModel model = meshRepository.getSelectedModel().getValue();
                if (model != null) {
                    final ConfigModelAppBind configModelAppBind = new ConfigModelAppBind(element.getElementAddress(), model.getModelId(), appKeyIndex);
                    meshRepository.getMeshManagerApi().createMeshPdu(node.getUnicastAddress(), configModelAppBind);
                }
            }
        }
        promise.resolve("success");
    }

    @ReactMethod
    public void unbindAppKey(final int keyIndex, int nodeUnicastAddr, Promise promise) {
        MeshNetwork net = meshRepository.getMeshNetworkLiveData().getMeshNetwork();
        ProvisionedMeshNode meshNode = net.getNode(nodeUnicastAddr);

        if (meshNode != null) {
            final Element element = meshRepository.getSelectedElement().getValue();
            if (element != null) {
                final MeshModel model = meshRepository.getSelectedModel().getValue();
                if (model != null) {
                    final ConfigModelAppUnbind configModelAppUnbind = new ConfigModelAppUnbind(element.getElementAddress(), model.getModelId(), keyIndex);
                    meshRepository.getMeshManagerApi().createMeshPdu(meshNode.getUnicastAddress(), configModelAppUnbind);
                }
            }
        }
        promise.resolve("success");

    }

    /* Publication */
    @ReactMethod
    public void setPublicationToModelList(int unicastAddress, String groupAddress, ReadableArray models,
                                          int appKeyIndex, int publishTtl, int publishPeriodInterval, String publishPeriodResolution,
                                          int retransmitCount, int retransmitInterval,
                                          Promise promise) {
        meshRepository.setPublicationSettingsToModelList(unicastAddress, groupAddress, models, appKeyIndex, publishTtl, publishPeriodInterval, publishPeriodResolution, retransmitCount, retransmitInterval);
        promise.resolve("success");
    }

    @ReactMethod
    public void getPublicationSettings(int unicastAddress, Promise promise) {
        final ConfigModelPublicationGet publicationSet = new ConfigModelPublicationGet(meshRepository.getSelectedElement().getValue().getElementAddress(), meshRepository.getSelectedModel().getValue().getModelId());
        ProvisionedMeshNode node = meshRepository.getMeshNetworkLiveData().getMeshNetwork().getNode(unicastAddress);

        meshRepository.getMeshManagerApi().createMeshPdu(node.getUnicastAddress(), publicationSet);
        promise.resolve("success");
    }

    @ReactMethod
    public void removePublication(int unicastAddress, Promise promise) {
        final ConfigModelPublicationSet publicationSet = new ConfigModelPublicationSet(meshRepository.getSelectedElement().getValue().getElementAddress(), meshRepository.getSelectedModel().getValue().getModelId());
        ProvisionedMeshNode node = meshRepository.getMeshNetworkLiveData().getMeshNetwork().getNode(unicastAddress);

        meshRepository.getMeshManagerApi().createMeshPdu(node.getUnicastAddress(), publicationSet);
        promise.resolve("success");
    }

    public boolean validateUnicastAddressInput(@NonNull final String input) {

        try {
            if (input.length() % 4 != 0 || !input.matches(Utils.HEX_PATTERN)) {
                Log.i("validateUnicast", "not hex pattern");
                return false;
            }

            final int address = Integer.parseInt(input, 16);
            return MeshAddress.isValidUnicastAddress(address);
        } catch (IllegalArgumentException ex) {
            return false;
        }

    }

    @ReactMethod
    public void setPublication(
            int nodeUnicastAddr,
            int addressType,
            int appKeyIndex,
            int publishTtl,
            String publishAddress,
            int publishPeriodInterval,
            String publishPeriodResolution,
            int retransmitCount,
            int retransmitInterval,
            Promise promise
    ) {
        try {
            if (addressType == AddressType.UNICAST_ADDRESS.getType()) {
                if (!validateUnicastAddressInput(publishAddress)) {
                    promise.reject("Invalid unicast Address");
                    return;
                }
            }

            PublicationSettingsHelper publicationSettings = meshRepository.getCurrentPublicationSettings();
            publicationSettings.setAppKeyIndex(appKeyIndex);
            publicationSettings.setPublishTtl(publishTtl);
            publicationSettings.setPublishAddress(Integer.parseInt(publishAddress, 16));
            publicationSettings.setPublicationPeriodResolutionResource(publishPeriodInterval, publishPeriodResolution);
            publicationSettings.setRetransmitCount(retransmitCount);
            publicationSettings.setRetransmitIntervalSteps(retransmitInterval);

            meshRepository.applyPublication(nodeUnicastAddr);
            promise.resolve("success");

        } catch (Exception e) {
            promise.reject(e);
        }

    }


    /* Subscribe */
    @ReactMethod
    public void subscribeModels(int unicastAddress, String groupAddress, ReadableArray models, Promise promise) {
        meshRepository.subscribeToModels(unicastAddress, groupAddress, models);
        promise.resolve("success");
    }


    @ReactMethod
    public void getSubscriptions(int unicastAddress, Promise promise) {
        ProvisionedMeshNode node = meshRepository.getMeshNetworkLiveData().getMeshNetwork().getNode(unicastAddress);
        final Element element = meshRepository.getSelectedElement().getValue();
        final MeshModel model = meshRepository.getSelectedModel().getValue();

        if (model instanceof SigModel) {
            ConfigSigModelSubscriptionGet configSigModelSubscriptionGet = new ConfigSigModelSubscriptionGet(element.getElementAddress(), model.getModelId());
            meshRepository.getMeshManagerApi().createMeshPdu(node.getUnicastAddress(), configSigModelSubscriptionGet);
        }
        else {
            ConfigVendorModelSubscriptionGet configVendorModelSubscriptionGet = new ConfigVendorModelSubscriptionGet(element.getElementAddress(), model.getModelId());
            meshRepository.getMeshManagerApi().createMeshPdu(node.getUnicastAddress(), configVendorModelSubscriptionGet);
        }
        promise.resolve("success");
    }

    @ReactMethod
    public void unsubscribe(final int subscriptionIndex, final int nodeAddress, Promise promise) {
        final ProvisionedMeshNode meshNode = meshRepository.getSelectedMeshNode().getValue();
        if (meshNode != null) {
            final Element element = meshRepository.getSelectedElement().getValue();
            if (element != null) {
                final int elementAddress = element.getElementAddress();
                final MeshModel model = meshRepository.getSelectedModel().getValue();
                if (model != null) {
                    final int modelIdentifier = model.getModelId();
                    int subscriptionAddress = model.getSubscribedAddresses().get(subscriptionIndex);
                    meshRepository.getMeshManagerApi().createMeshPdu(meshNode.getUnicastAddress(), new ConfigModelSubscriptionDelete(elementAddress, subscriptionAddress, modelIdentifier));
                }
            }
        }
        promise.resolve("success");

    }

    @ReactMethod
    public void subscribe(final int unicastAddress, final int address, Promise promise) {
        final ProvisionedMeshNode meshNode = meshRepository.getSelectedMeshNode().getValue();
        if (meshNode != null) {
            final Element element = meshRepository.getSelectedElement().getValue();
            if (element != null) {
                final int elementAddress = element.getElementAddress();
                final MeshModel model = meshRepository.getSelectedModel().getValue();
                if (model != null) {
                    final int modelIdentifier = model.getModelId();
                    meshRepository.getMeshManagerApi().createMeshPdu(meshNode.getUnicastAddress(), new ConfigModelSubscriptionAdd(elementAddress, address, modelIdentifier));
                }
            }
        }
        promise.resolve("success");

    }

    public void subscribeToGroup(final int unicastAddress, Group group) {
        final ProvisionedMeshNode meshNode = meshRepository.getSelectedMeshNode().getValue();
        if (meshNode != null) {
            final Element element = meshRepository.getSelectedElement().getValue();
            if (element != null) {
                final int elementAddress = element.getElementAddress();
                final MeshModel model = meshRepository.getSelectedModel().getValue();
                if (model != null) {
                    final int modelIdentifier = model.getModelId();
                    final MeshMessage configModelSubscriptionAdd;

                    if (group.getAddressLabel() == null) {
                        configModelSubscriptionAdd = new ConfigModelSubscriptionAdd(elementAddress, group.getAddress(), modelIdentifier);
                    }
                    else {
                        configModelSubscriptionAdd = new ConfigModelSubscriptionVirtualAddressAdd(elementAddress, group.getAddressLabel(), modelIdentifier);
                    }
                    meshRepository.getMeshManagerApi().createMeshPdu(meshNode.getUnicastAddress(), configModelSubscriptionAdd);

                }
            }
        }
    }

    /* Groups */
    @ReactMethod
    public void getGroups(Promise promise) {
        List<Group> groups = meshRepository.getMeshNetworkLiveData().getMeshNetwork().getGroups();
        WritableArray groupsList = new WritableNativeArray();

        for (Group g : groups) {
            WritableMap groupMap = new WritableNativeMap();
            groupMap.putString("name", g.getName());
            groupMap.putInt("address", g.getAddress());

            groupsList.pushMap(groupMap);
        }

        promise.resolve(groupsList);
    }

    @ReactMethod
    public void editGroupName(int groupAddress, String groupName, Promise promise) {
        MeshNetwork network = meshRepository.getMeshNetworkLiveData().getMeshNetwork();
        Group group = network.getGroup(groupAddress);
        if (group != null){
            group.setName(groupName);
            network.updateGroup(group);
            promise.resolve("success");
        }
        else {
            promise.reject("Group not found");
        }
    }


    @ReactMethod
    public void subscribeToNewGroup(int unicastAddress, String groupName, int groupAddress, Promise promise) {
        Provisioner provisioner = meshRepository.getMeshNetworkLiveData().getProvisioner();
        try {
            Group group = Objects.requireNonNull(meshManagerApi.getMeshNetwork()).createGroup(provisioner, groupAddress, groupName);
            meshRepository.getMeshNetworkLiveData().getMeshNetwork().addGroup(group);
            subscribeToGroup(unicastAddress, group);
            promise.resolve("success");
        } catch (Exception exception) {
            promise.reject(exception);
        }
    }

    @ReactMethod
    public void removeGroup(int groupAddress, Promise promise) {
        try {
            MeshNetwork network = meshRepository.getMeshNetworkLiveData().getMeshNetwork();
            Group group = network.getGroup(groupAddress);
            if(group != null){
                meshRepository.getMeshNetworkLiveData().getMeshNetwork().removeGroup(group);
                promise.resolve("success");
            }
            else {
                promise.reject("Group not found");
            }
        } catch (Exception exception) {
            promise.reject(exception);
        }
    }

    @ReactMethod
    public void createNewGroup(String groupName, int groupAddress, Promise promise) {
        Provisioner provisioner = meshRepository.getMeshNetworkLiveData().getProvisioner();
        try {
            Group group = Objects.requireNonNull(meshManagerApi.getMeshNetwork()).createGroup(provisioner, groupAddress, groupName);
            meshRepository.getMeshNetworkLiveData().getMeshNetwork().addGroup(group);
            WritableMap map = new WritableNativeMap();
            map.putBoolean("success", true);
            map.putInt("address", group.getAddress());
            promise.resolve(map);
        }
        catch (Exception exception) {
                WritableMap map = new WritableNativeMap();
                map.putBoolean("success", false);
                map.putInt("address", -1); // dummy value
                map.putString("error", exception.getLocalizedMessage());
                promise.resolve(map);
            }
    }

    @ReactMethod
    public void subscribeToExistingGroup(int unicastAddress, int groupAddress, Promise promise) {
        try {
            Group group = Objects.requireNonNull(meshManagerApi.getMeshNetwork()).getGroup(groupAddress);
            if (group != null) {
                subscribeToGroup(this.meshRepository.getSelectedMeshNode().getValue().getUnicastAddress(), group);
                promise.resolve("success");

            }
            else {
                promise.reject("Group not found");

            }
        } catch (Exception exception) {
            promise.reject(exception);
        }
    }

    @ReactMethod
    public void generateGroupAddress(String groupName, Promise promise) {
        Provisioner provisioner = meshRepository.getMeshNetworkLiveData().getProvisioner();
        Group group = Objects.requireNonNull(meshManagerApi.getMeshNetwork()).createGroup(provisioner, groupName);
        if (group != null) {
            promise.resolve(group.getAddress());

        }
        else {
            promise.resolve(-1);
        }
    }

    /* General */
    @ReactMethod
    public void sendSensorGet(final int unicastAddr, Promise promise) {
        final Element element = meshRepository.getSelectedElement().getValue();
        if (element != null) {
            if (meshRepository.getSelectedModel().getValue().getBoundAppKeyIndexes().size() > 0) {
                final Integer keyIndex = meshRepository.getSelectedModel().getValue().getBoundAppKeyIndexes().get(0);
                if (keyIndex != null) {
                    final ApplicationKey key = meshRepository.getMeshManagerApi().getMeshNetwork().getAppKey(keyIndex);
                    meshRepository.getMeshManagerApi().createMeshPdu(element.getElementAddress(), new SensorGet(key, null));
                }
            }
        }
        promise.resolve("success");
    }

    @ReactMethod
    public void exportNetwork(Promise promise) throws IllegalArgumentException {
        try {
            String net = meshRepository.getMeshManagerApi().exportMeshNetwork();
            promise.resolve(net);

        } catch (Exception e) {
            promise.reject(e);
        }

    }

    @ReactMethod
    public void sendVendorModelMessage(int nodeUnicastAddress, int opcode, String parameters, Promise promise) {
        byte[] parameterBytes = hexStringToByteArray(parameters);
        final Element element = meshRepository.getSelectedElement().getValue();
        if (element != null) {
            final VendorModel model = (VendorModel) meshRepository.getSelectedModel().getValue();
            if (model != null) {
                final int appKeyIndex = model.getBoundAppKeyIndexes().get(0);
                final ApplicationKey appKey = meshRepository.getMeshNetworkLiveData().getMeshNetwork().getAppKey(appKeyIndex);
                MeshMessage meshMessage = new VendorModelMessageAcked(appKey, model.getModelId(), model.getCompanyIdentifier(), opcode, parameterBytes);
                meshRepository.getMeshManagerApi().createMeshPdu(element.getElementAddress(), meshMessage);
            }
        }
        promise.resolve("success");
    }

    /*  Proxy Filter */

    @ReactMethod
    public void getProxyStatus(Promise promise) {
        WritableMap map = new WritableNativeMap();
        map.putBoolean("isConnected", meshRepository.isConnectedToProxy());
        map.putString("proxyName", meshRepository.getConnectedProxy());
        promise.resolve(map);
    }

    @ReactMethod
    public void addProxyFilterAddresses(ReadableArray addresses, Promise promise) {
        ArrayList<AddressArray> addressesArray = new ArrayList<>();

        if (addresses.size() == 0) {
            promise.resolve("success");
            return;
        }

        for (int i = 0; i < addresses.size(); i++) {
            String addressVal = addresses.getString(i);
            addressVal = String.format("%04X", Integer.parseInt(addressVal.replace("0x", ""), 16));
            final byte[] address = MeshParserUtils.toByteArray(addressVal);
            addressesArray.add(new AddressArray(address[0], address[1]));
        }

        final ProxyConfigAddAddressToFilter addAddressToFilter = new ProxyConfigAddAddressToFilter(addressesArray);

        meshRepository.getMeshManagerApi().createMeshPdu(MeshAddress.UNASSIGNED_ADDRESS, addAddressToFilter);

        promise.resolve("success");
    }

    @ReactMethod
    public void removeProxyFilterAddress(String address, Promise promise) {
        ArrayList<AddressArray> addressesArray = new ArrayList<>();

        String addressVal = String.format("%04X", Integer.parseInt(address.replace("0x", ""), 16));
        final byte[] byteArray = MeshParserUtils.toByteArray(addressVal);
        AddressArray addressArray = new AddressArray(byteArray[0], byteArray[1]);
        addressesArray.add(addressArray);

        final ProxyConfigRemoveAddressFromFilter removeAddress = new ProxyConfigRemoveAddressFromFilter(addressesArray);

        meshRepository.getMeshManagerApi().createMeshPdu(MeshAddress.UNASSIGNED_ADDRESS, removeAddress);

        promise.resolve("success");
    }

    @ReactMethod
    public void setProxyFilterType(int filterType, Promise promise) {
        ProxyFilterType proxyFilterType = new ProxyFilterType(filterType);
        final ProxyConfigSetFilterType setFilterType = new ProxyConfigSetFilterType(proxyFilterType);
        meshRepository.getMeshManagerApi().createMeshPdu(MeshAddress.UNASSIGNED_ADDRESS, setFilterType);

        promise.resolve("success");
    }

    /* Application Keys */
    @ReactMethod
    public void bindAppKeyToModels(int unicastAddress, int appKeyIndex, ReadableArray models, Promise promise) {
        meshRepository.bindAppKeyToModels(unicastAddress, appKeyIndex, models);
        promise.resolve("success");
    }

    /* Provisioners */

    @ReactMethod
    public void getProvisioners(Promise promise) {
        WritableArray provisionersArray = this.meshRepository.getProvisioners();
        promise.resolve(provisionersArray);
    }

    @ReactMethod
    public void editProvisionerName(int provisionerUnicastAddress, String newName, Promise promise) {
        String res = this.meshRepository.editProvisionerName(provisionerUnicastAddress, newName);
        promise.resolve(res);
    }

    @ReactMethod
    public void editProvisionerUnicastAddress(int provisionerUnicastAddress, int newAddress, Promise promise) {
        String res = this.meshRepository.editProvisionerUnicastAddress(provisionerUnicastAddress, newAddress);
        promise.resolve(res);
    }

    @ReactMethod
    public void editProvisionerTtl(int provisionerUnicastAddress, int ttl, Promise promise) {
        String res = this.meshRepository.editProvisionerTtl(provisionerUnicastAddress, ttl);
        promise.resolve(res);
    }

    @ReactMethod
    public void editProvisionerUnicastRanges(int provisionerUnicastAddress, ReadableArray ranges, Promise promise) {
        try {
            List<AllocatedUnicastRange> allocatedUnicastRangeList = this.meshRepository.convertUnicastRangesArrayToList(ranges);
            String res = this.meshRepository.editProvisionerUnicastRanges(provisionerUnicastAddress, allocatedUnicastRangeList);
            promise.resolve(res);
        } catch (Exception e) {
            promise.resolve(e.getMessage());
        }
    }

    @ReactMethod
    public void editProvisionerGroupRanges(int provisionerUnicastAddress, ReadableArray ranges, Promise promise) {
        try {
            List<AllocatedGroupRange> allocatedGroupRanges = this.meshRepository.convertGroupRangesArrayToList(ranges);
            String res = this.meshRepository.editProvisionerGroupRanges(provisionerUnicastAddress, allocatedGroupRanges);
            promise.resolve(res);
        } catch (Exception e) {
            promise.resolve(e.getMessage());
        }
    }

    @ReactMethod
    public void editProvisionerScenesRanges(int provisionerUnicastAddress, ReadableArray ranges, Promise promise) {
        try {
            List<AllocatedSceneRange> allocatedSceneRanges = this.meshRepository.convertSenceRangesArrayToList(ranges);
            String res = this.meshRepository.editProvisionerSceneRanges(provisionerUnicastAddress, allocatedSceneRanges);
            promise.resolve(res);
        } catch (Exception e) {
            promise.resolve(e.getMessage());
        }
    }

    @ReactMethod
    public void resetNode(final int nodeUnicastAddr, Promise promise) {
        MeshNetwork net = meshRepository.getMeshNetworkLiveData().getMeshNetwork();
        ProvisionedMeshNode node = net.getNode(nodeUnicastAddr);
        if (node != null) {
            final ConfigNodeReset configNodeReset = new ConfigNodeReset();
            meshRepository.getMeshManagerApi().createMeshPdu(node.getUnicastAddress(), configNodeReset);
        }
        promise.resolve("success");
    }
    
    @ReactMethod
    public void readProxyState(int provisionerUnicastAddress,  Promise promise) {
        try {
            ConfigGattProxyGet meshMessage = new ConfigGattProxyGet();
            meshRepository.getMeshManagerApi().createMeshPdu(provisionerUnicastAddress, meshMessage);
            promise.resolve("success");
        } catch (Exception e) {
            promise.resolve(e.getMessage());
        }
    }

    @ReactMethod
    public void toggleProxyState(int provisionerUnicastAddress,int state,  Promise promise) {
        try {
            Log.i("toggleProxyState", String.valueOf(state));
            ConfigGattProxySet meshMessage = new ConfigGattProxySet(state);
            meshRepository.getMeshManagerApi().createMeshPdu(provisionerUnicastAddress, meshMessage);
            promise.resolve("success");
        } catch (Exception e) {
            promise.resolve(e.getMessage());
        }
    }

}


