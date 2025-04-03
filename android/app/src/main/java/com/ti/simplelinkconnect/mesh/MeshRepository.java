package com.ti.simplelinkconnect.mesh;

import android.bluetooth.BluetoothDevice;
import android.content.Context;
import android.net.Uri;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;
import android.util.Log;

import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import javax.inject.Inject;
import javax.inject.Singleton;

import androidx.annotation.NonNull;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import no.nordicsemi.android.log.LogSession;
import no.nordicsemi.android.log.Logger;
import no.nordicsemi.android.mesh.AllocatedGroupRange;
import no.nordicsemi.android.mesh.AllocatedSceneRange;
import no.nordicsemi.android.mesh.AllocatedUnicastRange;
import no.nordicsemi.android.mesh.ApplicationKey;
import no.nordicsemi.android.mesh.Group;
import no.nordicsemi.android.mesh.MeshManagerApi;
import no.nordicsemi.android.mesh.MeshManagerCallbacks;
import no.nordicsemi.android.mesh.MeshNetwork;
import no.nordicsemi.android.mesh.MeshProvisioningStatusCallbacks;
import no.nordicsemi.android.mesh.MeshStatusCallbacks;
import no.nordicsemi.android.mesh.NetworkKey;
import no.nordicsemi.android.mesh.Provisioner;
import no.nordicsemi.android.mesh.UnprovisionedBeacon;
import no.nordicsemi.android.mesh.models.SigModelParser;
import no.nordicsemi.android.mesh.opcodes.ApplicationMessageOpCodes;
import no.nordicsemi.android.mesh.opcodes.ProxyConfigMessageOpCodes;
import no.nordicsemi.android.mesh.provisionerstates.ProvisioningState;
import no.nordicsemi.android.mesh.provisionerstates.UnprovisionedMeshNode;
import no.nordicsemi.android.mesh.sensorutils.DeviceProperty;
import no.nordicsemi.android.mesh.sensorutils.DevicePropertyCharacteristic;
import no.nordicsemi.android.mesh.sensorutils.MarshalledSensorData;
import no.nordicsemi.android.mesh.transport.ConfigAppKeyAdd;
import no.nordicsemi.android.mesh.transport.ConfigAppKeyStatus;
import no.nordicsemi.android.mesh.transport.ConfigCompositionDataGet;
import no.nordicsemi.android.mesh.transport.ConfigCompositionDataStatus;
import no.nordicsemi.android.mesh.transport.ConfigDefaultTtlGet;
import no.nordicsemi.android.mesh.transport.ConfigDefaultTtlStatus;
import no.nordicsemi.android.mesh.transport.ConfigGattProxyStatus;
import no.nordicsemi.android.mesh.transport.ConfigModelAppStatus;
import no.nordicsemi.android.mesh.transport.ConfigModelPublicationStatus;
import no.nordicsemi.android.mesh.transport.ConfigModelSubscriptionStatus;
import no.nordicsemi.android.mesh.transport.ConfigNetKeyStatus;
import no.nordicsemi.android.mesh.transport.ConfigNetworkTransmitSet;
import no.nordicsemi.android.mesh.transport.ConfigNetworkTransmitStatus;
import no.nordicsemi.android.mesh.transport.ConfigNodeResetStatus;
import no.nordicsemi.android.mesh.transport.ConfigRelayStatus;
import no.nordicsemi.android.mesh.transport.ConfigSigModelSubscriptionList;
import no.nordicsemi.android.mesh.transport.ConfigVendorModelSubscriptionList;
import no.nordicsemi.android.mesh.transport.ControlMessage;
import no.nordicsemi.android.mesh.transport.Element;
import no.nordicsemi.android.mesh.transport.GenericLevelStatus;
import no.nordicsemi.android.mesh.transport.GenericOnOffStatus;
import no.nordicsemi.android.mesh.transport.MeshMessage;
import no.nordicsemi.android.mesh.transport.MeshModel;
import no.nordicsemi.android.mesh.transport.ProvisionedMeshNode;
import no.nordicsemi.android.mesh.transport.ProxyConfigFilterStatus;
import no.nordicsemi.android.mesh.transport.SceneRegisterStatus;
import no.nordicsemi.android.mesh.transport.SceneStatus;
import no.nordicsemi.android.mesh.transport.SensorStatus;
import no.nordicsemi.android.mesh.transport.VendorModelMessageStatus;
import no.nordicsemi.android.mesh.utils.MeshAddress;

import no.nordicsemi.android.mesh.utils.MeshParserUtils;
import no.nordicsemi.android.support.v18.scanner.BluetoothLeScannerCompat;
import no.nordicsemi.android.support.v18.scanner.ScanCallback;
import no.nordicsemi.android.support.v18.scanner.ScanFilter;
import no.nordicsemi.android.support.v18.scanner.ScanRecord;
import no.nordicsemi.android.support.v18.scanner.ScanResult;
import no.nordicsemi.android.support.v18.scanner.ScanSettings;

import static no.nordicsemi.android.mesh.opcodes.ApplicationMessageOpCodes.GENERIC_LEVEL_STATUS;
import static no.nordicsemi.android.mesh.opcodes.ApplicationMessageOpCodes.GENERIC_ON_OFF_STATUS;
import static no.nordicsemi.android.mesh.opcodes.ApplicationMessageOpCodes.SCENE_REGISTER_STATUS;
import static no.nordicsemi.android.mesh.opcodes.ApplicationMessageOpCodes.SCENE_STATUS;
import static no.nordicsemi.android.mesh.opcodes.ConfigMessageOpCodes.CONFIG_APPKEY_STATUS;
import static no.nordicsemi.android.mesh.opcodes.ConfigMessageOpCodes.CONFIG_COMPOSITION_DATA_STATUS;
import static no.nordicsemi.android.mesh.opcodes.ConfigMessageOpCodes.CONFIG_DEFAULT_TTL_STATUS;
import static no.nordicsemi.android.mesh.opcodes.ConfigMessageOpCodes.CONFIG_GATT_PROXY_STATUS;
import static no.nordicsemi.android.mesh.opcodes.ConfigMessageOpCodes.CONFIG_HEARTBEAT_PUBLICATION_STATUS;
import static no.nordicsemi.android.mesh.opcodes.ConfigMessageOpCodes.CONFIG_HEARTBEAT_SUBSCRIPTION_STATUS;
import static no.nordicsemi.android.mesh.opcodes.ConfigMessageOpCodes.CONFIG_MODEL_APP_STATUS;
import static no.nordicsemi.android.mesh.opcodes.ConfigMessageOpCodes.CONFIG_MODEL_PUBLICATION_STATUS;
import static no.nordicsemi.android.mesh.opcodes.ConfigMessageOpCodes.CONFIG_MODEL_SUBSCRIPTION_STATUS;
import static no.nordicsemi.android.mesh.opcodes.ConfigMessageOpCodes.CONFIG_NETKEY_STATUS;
import static no.nordicsemi.android.mesh.opcodes.ConfigMessageOpCodes.CONFIG_NETWORK_TRANSMIT_STATUS;
import static no.nordicsemi.android.mesh.opcodes.ConfigMessageOpCodes.CONFIG_NODE_RESET_STATUS;
import static no.nordicsemi.android.mesh.opcodes.ConfigMessageOpCodes.CONFIG_RELAY_STATUS;
import static no.nordicsemi.android.mesh.opcodes.ConfigMessageOpCodes.CONFIG_SIG_MODEL_SUBSCRIPTION_LIST;
import static no.nordicsemi.android.mesh.opcodes.ConfigMessageOpCodes.CONFIG_VENDOR_MODEL_SUBSCRIPTION_LIST;

import static com.ti.simplelinkconnect.mesh.BleMeshManager.MESH_PROVISIONING_UUID;
import static com.ti.simplelinkconnect.mesh.BleMeshManager.MESH_PROXY_UUID;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.APP_KEYS_UPDATED;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.COMPOSITION_DATA_STATUS_GET;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.MODELS_SET_PUBLICATION_DONE;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.MODELS_SUBSCRIBE_DONE;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.MODEL_APP_KEY_UPDATED;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.MODEL_BIND_DONE;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.NETWORK_KEYS_UPDATED;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.PROV_SCAN_RESULT;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.PROXY_FILTER_UPDATED;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.PUBLICATION_UPDATED;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.SENSOR_GET;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.STATE_CHANGES;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.NETWORK_LOADED;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.NODE_CONNECTED;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.NODE_IDENTIFIED;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.PROVISION_COMPLETED;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.SCAN_FAILED;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.SCAN_RESULT;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.SUBSCRIPTION_ADDED;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.SUBSCRIPTION_FAILED;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.SUBSCRIPTION_RECEIVED;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.UPDATE_PROVISIONING_PROGRESS;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;
import com.ti.connectivity.simplelinkconnect.MeshModule;


@Singleton
public class MeshRepository implements MeshProvisioningStatusCallbacks, MeshStatusCallbacks, MeshManagerCallbacks, BleMeshManagerCallbacks {

    private static final String TAG = MeshRepository.class.getSimpleName();
    private static final int ATTENTION_TIMER = 5;
    static final String EXPORT_PATH = Environment.getExternalStorageDirectory() + File.separator +
            "Nordic Semiconductor" + File.separator + "nRF Mesh" + File.separator;
    private static final String EXPORTED_PATH = "sdcard" + File.separator + "Nordic Semiconductor" + File.separator + "nRF Mesh" + File.separator;

    // Connection States Connecting, Connected, Disconnecting, Disconnected etc.
    private final MutableLiveData<String> mConnectedProxy = new MutableLiveData<>();

    // Live data flag containing connected state.
    private MutableLiveData<Boolean> mIsConnected;

    // LiveData to notify when device is ready
    private final MutableLiveData<Void> mOnDeviceReady = new MutableLiveData<>();

    public boolean isNetworkLoaded = false;

    // Updates the connection state while connecting to a peripheral
    private final MutableLiveData<String> mConnectionState = new MutableLiveData<>();

    // Flag to determine if a reconnection is in the progress when provisioning has completed
    private final SingleLiveEvent<Boolean> mIsReconnecting = new SingleLiveEvent<>();
    //    private final MutableLiveData<UnprovisionedMeshNode> mUnprovisionedMeshNodeLiveData = new MutableLiveData<>();
//    private final UnprovisionedMeshNode mUnprovisionedMeshNodeLiveData = null;
    private final MutableLiveData<ProvisionedMeshNode> mProvisionedMeshNodeLiveData = new MutableLiveData<>();
    private final SingleLiveEvent<Integer> mConnectedProxyAddress = new SingleLiveEvent<>();

    public boolean mIsProvisioningComplete = false; // Flag to determine if provisioning was completed

    // Holds the selected MeshNode to configure
    private final MutableLiveData<ProvisionedMeshNode> mExtendedMeshNode = new MutableLiveData<>();

    // Holds the selected Element to configure
    private final MutableLiveData<Element> mSelectedElement = new MutableLiveData<>();

    // Holds the selected mesh model to configure
    private final MutableLiveData<MeshModel> mSelectedModel = new MutableLiveData<>();
    // Holds the selected app key to configure
    private final MutableLiveData<NetworkKey> mSelectedNetKey = new MutableLiveData<>();
    // Holds the selected app key to configure
    private final MutableLiveData<ApplicationKey> mSelectedAppKey = new MutableLiveData<>();
    // Holds the selected provisioner when adding/editing
    private final MutableLiveData<Provisioner> mSelectedProvisioner = new MutableLiveData<>();

    // Holds the selected device when selecting
    private final MutableLiveData<ExtendedBluetoothDevice> mSelectedBluetoothDevice = new MutableLiveData<>();

    private final MutableLiveData<Group> mSelectedGroupLiveData = new MutableLiveData<>();

    // Composition data status
    final SingleLiveEvent<ConfigCompositionDataStatus> mCompositionDataStatus = new SingleLiveEvent<>();

    // App key add status
    final SingleLiveEvent<ConfigAppKeyStatus> mAppKeyStatus = new SingleLiveEvent<>();

    //Contains the MeshNetwork
    private final MeshNetworkLiveData mMeshNetworkLiveData = new MeshNetworkLiveData();
    private final SingleLiveEvent<String> mNetworkImportState = new SingleLiveEvent<>();
    private final SingleLiveEvent<MeshMessage> mMeshMessageLiveData = new SingleLiveEvent<>();

    // Contains the provisioned nodes
    private final MutableLiveData<List<ProvisionedMeshNode>> mProvisionedNodes = new MutableLiveData<>();

    private final MutableLiveData<List<Group>> mGroups = new MutableLiveData<>();

    private final MutableLiveData<TransactionStatus> mTransactionStatus = new SingleLiveEvent<>();

    private final MeshManagerApi mMeshManagerApi;
    public BleMeshManagerProvider mBleMeshManagerProvider;
    public BleMeshManager currentBleManager;
    private final Handler mHandler;
    private UnprovisionedMeshNode mUnprovisionedMeshNode;
    private ProvisionedMeshNode mProvisionedMeshNode;
    private boolean mIsReconnectingFlag;
    private boolean mIsScanning;
    private boolean mSetupProvisionedNode;
    private ProvisioningStatusLiveData mProvisioningStateLiveData;
    private MeshNetwork mMeshNetwork;
    private boolean mIsCompositionDataReceived;
    private boolean mIsDefaultTtlReceived;
    private boolean mIsAppKeyAddCompleted;
    private boolean mIsNetworkRetransmitSetCompleted;
    private Uri uri;
    private Context mContext;
    public CompletableFuture<Void> disconnectFuture;

    private MeshModule meshModule;

    private final Runnable mReconnectRunnable = this::startScanForProxyNodeToProvision;

    private final Runnable mScannerTimeout = () -> {
//        stopScan();
        mIsReconnecting.postValue(false);
    };

    private PublicationSettingsHelper currentPublicationSettings;

    @Inject
    public MeshRepository(final MeshManagerApi meshManagerApi,
                          final BleMeshManagerProvider bleMeshManagerProvider,
                          Context context,
                          MeshModule meshModule) {
        //Initialize the mesh api
        mMeshManagerApi = meshManagerApi;
        mMeshManagerApi.setMeshManagerCallbacks(this);
        mMeshManagerApi.setProvisioningStatusCallbacks(this);
        mMeshManagerApi.setMeshStatusCallbacks(this);
        mMeshManagerApi.loadMeshNetwork();

        //Initialize the ble manager
        mBleMeshManagerProvider = bleMeshManagerProvider;
        mHandler = new Handler(Looper.getMainLooper());
        mContext = context;
        this.meshModule = meshModule;
    }

    public void loadMeshNetwork() {
        mMeshManagerApi.loadMeshNetwork();
    }


    /**
     * Returns {@link SingleLiveEvent} containing the device ready state.
     */
    LiveData<Void> isDeviceReady() {
        return mOnDeviceReady;
    }

    /**
     * Returns {@link SingleLiveEvent} containing the device ready state.
     */
    LiveData<String> getConnectionState() {
        return mConnectionState;
    }

    public void setCurrentPublicationSettings(PublicationSettingsHelper publicationSettings) {
        currentPublicationSettings = publicationSettings;
    }

    public PublicationSettingsHelper getCurrentPublicationSettings() {
        return currentPublicationSettings;
    }

    /**
     * Returns {@link SingleLiveEvent} containing the device ready state.
     */
    LiveData<Boolean> isConnected() {
        return mIsConnected;
    }

    /**
     * Returns {@link SingleLiveEvent} containing the device ready state.
     */
    public Boolean isConnectedToProxy() {
        return mConnectedProxy.getValue() != null;
    }

    public String getConnectedProxy() {
        return mConnectedProxy.getValue();
    }

    LiveData<Boolean> isReconnecting() {
        return mIsReconnecting;
    }

    boolean isProvisioningComplete() {
        return mIsProvisioningComplete;
    }

    boolean isCompositionDataStatusReceived() {
        return mIsCompositionDataReceived;
    }

    boolean isDefaultTtlReceived() {
        return mIsDefaultTtlReceived;
    }

    boolean isAppKeyAddCompleted() {
        return mIsAppKeyAddCompleted;
    }

    boolean isNetworkRetransmitSetCompleted() {
        return mIsNetworkRetransmitSetCompleted;
    }

    public final MeshNetworkLiveData getMeshNetworkLiveData() {
        return mMeshNetworkLiveData;
    }

    LiveData<List<ProvisionedMeshNode>> getNodes() {
        return mProvisionedNodes;
    }

    LiveData<List<Group>> getGroup1s() {
        return mGroups;
    }

    LiveData<String> getNetworkLoadState() {
        return mNetworkImportState;
    }

    public ProvisioningStatusLiveData getProvisioningState() {
        return mProvisioningStateLiveData;
    }

    LiveData<TransactionStatus> getTransactionStatus() {
        return mTransactionStatus;
    }

    /**
     * Clears the transaction status
     */
    void clearTransactionStatus() {
        if (mTransactionStatus.getValue() != null) {
            mTransactionStatus.postValue(null);
        }
    }

    /**
     * Returns the mesh manager api
     *
     * @return {@link MeshManagerApi}
     */
    public MeshManagerApi getMeshManagerApi() {
        return mMeshManagerApi;
    }


    /**
     * Returns the {@link} live data object containing the mesh message
     */
    LiveData<MeshMessage> getMeshMessageLiveData() {
        return mMeshMessageLiveData;
    }

    LiveData<Group> getSelectedGroup() {
        return mSelectedGroupLiveData;
    }

    /**
     * Reset mesh network
     */
    void resetMeshNetwork() {
        disconnect();
        mMeshManagerApi.resetMeshNetwork();
    }

    /**
     * Connect to peripheral
     *
     * @param context          Context
     * @param device           {@link ExtendedBluetoothDevice} device
     * @param connectToNetwork True if connecting to an unprovisioned node or proxy node
     */
    public void connect(final Context context, final ExtendedBluetoothDevice device, final boolean connectToNetwork) {
        mMeshNetworkLiveData.setNodeName(device.getName());
        mIsProvisioningComplete = false;
        mIsCompositionDataReceived = false;
        mIsDefaultTtlReceived = false;
        mIsAppKeyAddCompleted = false;
        mIsNetworkRetransmitSetCompleted = false;
        //clearExtendedMeshNode();
        final LogSession logSession = Logger.newSession(context, null, device.getAddress(), device.getName());
        BleMeshManager bleMeshManager = mBleMeshManagerProvider.getOrCreateManager(device.getDevice(), mContext);
        bleMeshManager.setGattCallbacks(this);
        currentBleManager = bleMeshManager;
        bleMeshManager.setLogger(logSession);
        initIsConnectedLiveData(connectToNetwork);
        mConnectionState.postValue("Connecting....");
        meshModule.sendEvent(STATE_CHANGES, "Connecting....");

        //Added a 1 second delay for connection, mostly to wait for a disconnection to complete before connecting, in case a device was previously connected.
        Log.d("AA", "Connect issued to device " + device.getAddress());
        Log.i("isConnected()", String.valueOf(bleMeshManager.isConnected()));

        bleMeshManager.connect(device.getDevice()).retry(3, 200).enqueue();


    }

    /**
     * Connect to peripheral
     *
     * @param device bluetooth device
     */
    private void connectToProxy(final ExtendedBluetoothDevice device) {
        initIsConnectedLiveData(true);
        mConnectionState.postValue("Connecting....");
        BleMeshManager bleMeshManager = mBleMeshManagerProvider.getOrCreateManager(device.getDevice(), mContext);
        bleMeshManager.setGattCallbacks(this);
        currentBleManager = bleMeshManager;
        bleMeshManager.connect(device.getDevice()).retry(3, 200).enqueue();
    }

    private void initIsConnectedLiveData(final boolean connectToNetwork) {
        if (connectToNetwork) {
            mIsConnected = new SingleLiveEvent<>();
        }
        else {
            mIsConnected = new MutableLiveData<>();
        }
    }

    /**
     * Disconnects from peripheral
     */
    public void disconnect() {
        clearProvisioningLiveData();
        mIsProvisioningComplete = false;
        currentBleManager.disconnect().enqueue();
    }

    void clearProvisioningLiveData() {
//        stopScan();
        mHandler.removeCallbacks(mReconnectRunnable);
        mSetupProvisionedNode = false;
        mIsReconnectingFlag = false;
        mUnprovisionedMeshNode = null;
    }

    private void removeCallbacks() {
        mHandler.removeCallbacksAndMessages(null);
    }

    public void identifyNode(final ExtendedBluetoothDevice device) {
        final UnprovisionedBeacon beacon = (UnprovisionedBeacon) device.getBeacon();
        final UnprovisionedMeshNode node = getUnprovisionedMeshNode();
        if (node == null) {
            if (beacon != null) {
                mMeshManagerApi.identifyNode(beacon.getUuid(), ATTENTION_TIMER);
            }
            else {
                final byte[] serviceData = Utils.getServiceData(device.getScanResult(), BleMeshManager.MESH_PROVISIONING_UUID);
                if (serviceData != null) {
                    final UUID uuid = mMeshManagerApi.getDeviceUuid(serviceData);
                    mMeshManagerApi.identifyNode(uuid, ATTENTION_TIMER);
                }
            }
        }
        else if (node.getProvisioningCapabilities() != null) {
            node.setNodeName(Objects.requireNonNull(getSelectedBluetoothDevice().getValue()).getName());

            WritableMap map = meshModule.getUnprovisionedNodeData(node);

            meshModule.sendEvent(NODE_IDENTIFIED, map);
            meshModule.sendEvent(STATE_CHANGES, "Connected (unprovisioned)");
        }

    }

    private void clearExtendedMeshNode() {
        mExtendedMeshNode.postValue(null);
    }

    public UnprovisionedMeshNode getUnprovisionedMeshNode() {
        return mUnprovisionedMeshNode;
    }

    public void setUnprovisionedMeshNode(UnprovisionedMeshNode node) {
        mUnprovisionedMeshNode = node;
    }

    LiveData<Integer> getConnectedProxyAddress() {
        return mConnectedProxyAddress;
    }

    /**
     * Returns the selected mesh node
     */
    public LiveData<ProvisionedMeshNode> getSelectedMeshNode() {
        return mExtendedMeshNode;
    }

    /**
     * Sets the mesh node to be configured
     *
     * @param node provisioned mesh node
     */
    public void setSelectedMeshNode(final ProvisionedMeshNode node) {
        mProvisionedMeshNode = node;
        mExtendedMeshNode.postValue(node);
    }

    /**
     * Returns the selected element
     */
    public LiveData<Element> getSelectedElement() {
        return mSelectedElement;
    }

    /**
     * Set the selected {@link Element} to be configured
     *
     * @param element element
     */
    public void setSelectedElement(final Element element) {
        mSelectedElement.postValue(element);
    }

    /**
     * Set the selected model to be configured
     *
     * @param appKey mesh model
     */
    void setSelectedAppKey(@NonNull final ApplicationKey appKey) {
        mSelectedAppKey.postValue(appKey);
    }

    /**
     * Returns the selected mesh model
     */
    LiveData<ApplicationKey> getSelectedAppKey() {
        return mSelectedAppKey;
    }

    /**
     * Selects provisioner for editing or adding
     *
     * @param provisioner {@link Provisioner}
     */
    void setSelectedProvisioner(@NonNull final Provisioner provisioner) {
        mSelectedProvisioner.postValue(provisioner);
    }

    /**
     * Returns the selected {@link Provisioner}
     */
    LiveData<Provisioner> getSelectedProvisioner() {
        return mSelectedProvisioner;
    }

    public void setSelectedBluetoothDevice(@NonNull final ExtendedBluetoothDevice device) {
        mSelectedBluetoothDevice.postValue(device);
    }

    /**
     * Returns the selected {@link Provisioner}
     */
    public LiveData<ExtendedBluetoothDevice> getSelectedBluetoothDevice() {
        return mSelectedBluetoothDevice;
    }

    /**
     * Returns the selected mesh model
     */
    public LiveData<MeshModel> getSelectedModel() {
        return mSelectedModel;
    }

    /**
     * Set the selected model to be configured
     *
     * @param model mesh model
     */
    public void setSelectedModel(final MeshModel model) {
        mSelectedModel.postValue(model);
    }

    @Override
    public void onDataReceived(final BluetoothDevice bluetoothDevice, final int mtu, final byte[] pdu) {
        Log.i("mesh", "onDataReceived");
        mMeshManagerApi.handleNotifications(mtu, pdu);
    }

    @Override
    public void onDataSent(final BluetoothDevice device, final int mtu, final byte[] pdu) {
        Log.i("mesh", "onDataSent");
        mMeshManagerApi.handleWriteCallbacks(mtu, pdu);
    }

    @Override
    public void onDeviceConnecting(@NonNull final BluetoothDevice device) {
        meshModule.sendEvent(STATE_CHANGES, "Connecting...");

        mConnectionState.postValue("Connecting....");
    }

    @Override
    public void onDeviceConnected(@NonNull final BluetoothDevice device) {
        meshModule.sendEvent(STATE_CHANGES, "Discovering services...");
        BleMeshManager bleMeshManager = mBleMeshManagerProvider.getOrCreateManager(device, mContext);
        bleMeshManager.setGattCallbacks(this);
        currentBleManager = bleMeshManager;
        Log.i("isConnected()!!", String.valueOf(bleMeshManager.isConnected()));
        if (mProvisionedMeshNode != null) {
            meshModule.addConnectedDevice(new ExtendedConnectedDevice(device, mProvisionedMeshNode.getUnicastAddress()));
        }

        mIsConnected.postValue(true);
        mConnectionState.postValue("Discovering services....");
        mConnectedProxy.postValue(device.getName());
    }

    @Override
    public void onDeviceDisconnecting(@NonNull final BluetoothDevice device) {
        if (mIsReconnectingFlag) {
            mConnectionState.postValue("Reconnecting...");
            Log.v(TAG, "Reconnecting...");

        }
        else {
            mConnectionState.postValue("Disconnecting...");
            Log.v(TAG, "Disconnecting...");

        }
    }

    @Override
    public void onDeviceDisconnected(@NonNull final BluetoothDevice device) {
        Log.v(TAG, "Disconnected");
        mConnectionState.postValue("");
        meshModule.sendEvent(STATE_CHANGES, "Disconnected");
        meshModule.sendEvent(NODE_CONNECTED, "disconnected");

        meshModule.removeConnectedDevice(device.getAddress());

        if (mIsReconnectingFlag) {
            mIsReconnectingFlag = false;
            mIsReconnecting.postValue(false);
            mIsConnected.postValue(false);
            mConnectedProxy.postValue(null);
        }
        else {
            mIsConnected.postValue(false);
            mConnectedProxy.postValue(null);
            if (mConnectedProxyAddress.getValue() != null) {
                final MeshNetwork network = mMeshManagerApi.getMeshNetwork();
                if (network != null) {
                    network.setProxyFilter(null);
                }
            }
            //clearExtendedMeshNode();
        }
        mSetupProvisionedNode = false;
        mConnectedProxyAddress.postValue(null);

        // Complete the future when the device is disconnected
        if (disconnectFuture != null) {
            disconnectFuture.complete(null);
            disconnectFuture = null;
        }

    }

    @Override
    public void onLinkLossOccurred(@NonNull final BluetoothDevice device) {
        Log.v(TAG, "Link loss occurred");
        mIsConnected.postValue(false);
    }

    @Override
    public void onServicesDiscovered(@NonNull final BluetoothDevice device, final boolean optionalServicesFound) {
        meshModule.sendEvent(STATE_CHANGES, "Connected");

        mConnectionState.postValue("Initializing...");

        final UnprovisionedMeshNode node = getUnprovisionedMeshNode();

        if (node == null) {
            if (!meshModule.isDeviceConnected(device.getAddress()) && getSelectedMeshNode().getValue() != null) {
                meshModule.addConnectedDevice(new ExtendedConnectedDevice(device, getSelectedMeshNode().getValue().getUnicastAddress()));
            }
            meshModule.sendEvent(NODE_CONNECTED, device.getName());

//            identifyNode(Objects.requireNonNull(mSelectedBluetoothDevice.getValue()));
            return;
        }

        if (node.getNodeName() != null) {
            if (!meshModule.isDeviceConnected(node.getUnicastAddress())) {
                if (mConnectedProxyAddress.getValue() != null) {
                    meshModule.addConnectedDevice(new ExtendedConnectedDevice(device, mConnectedProxyAddress.getValue()));
                }
            }
            meshModule.sendEvent(NODE_CONNECTED, device.getName());

            Log.i("mesh", "onServicesDiscovered: " + node.getNodeName());

            node.setNodeName(Objects.requireNonNull(getSelectedBluetoothDevice().getValue()).getName());

            WritableMap map = meshModule.getUnprovisionedNodeData(node);

            meshModule.sendEvent(NODE_IDENTIFIED, map);
            meshModule.sendEvent(STATE_CHANGES, "Connected (unprovisioned)");

        }
    }

    @Override
    public void onDeviceReady(@NonNull final BluetoothDevice device) {
        mOnDeviceReady.postValue(null);
        final ProvisionedMeshNode node = mProvisionedMeshNodeLiveData.getValue();
        if (node != null) {
            ExtendedConnectedDevice d = new ExtendedConnectedDevice(device, node.getUnicastAddress());
            Log.i("onDeviceReady", "new unicast address:" + node.getUnicastAddress());
            if (!meshModule.isDeviceConnected(node.getUnicastAddress())) {
                meshModule.addConnectedDevice(d);
                meshModule.sendEvent(NODE_CONNECTED, device.getName());

            }
        }
        BleMeshManager bleMeshManager = mBleMeshManagerProvider.getOrCreateManager(device, mContext);
        bleMeshManager.setGattCallbacks(this);
        currentBleManager = bleMeshManager;
        if (bleMeshManager.isProvisioningComplete()) {

            if (mSetupProvisionedNode) {
                if (mMeshNetwork.getSelectedProvisioner().getProvisionerAddress() != null) {
                    mHandler.postDelayed(() -> {
                        //Adding a slight delay here so we don't send anything before we receive the mesh beacon message
                        if (node != null) {
                            final ConfigCompositionDataGet compositionDataGet = new ConfigCompositionDataGet();
                            mMeshManagerApi.createMeshPdu(node.getUnicastAddress(), compositionDataGet);
                        }
                    }, 2000);
                }
                else {
                    mSetupProvisionedNode = false;
                    mProvisioningStateLiveData.onMeshNodeStateUpdated(ProvisionerStates.PROVISIONER_UNASSIGNED);
                    clearExtendedMeshNode();
                }
            }
            mConnectedProxy.postValue(device.getName());
        }
    }

    @Override
    public void onBondingRequired(@NonNull final BluetoothDevice device) {
        // Empty.
    }

    @Override
    public void onBonded(@NonNull final BluetoothDevice device) {
        // Empty.
    }

    @Override
    public void onBondingFailed(@NonNull final BluetoothDevice device) {
        // Empty.
    }

    @Override
    public void onError(final BluetoothDevice device, @NonNull final String message, final int errorCode) {
        Log.e(TAG, message + " (code: " + errorCode + "), device: " + device.getAddress());

        mConnectionState.postValue(message);
        meshModule.sendEvent(STATE_CHANGES, message);

    }

    @Override
    public void onDeviceNotSupported(@NonNull final BluetoothDevice device) {

    }

    @Override
    public void onNetworkLoaded(final MeshNetwork meshNetwork) {
        loadNetwork(meshNetwork);
    }

    @Override
    public void onNetworkUpdated(final MeshNetwork meshNetwork) {
        Log.i("mesh", "onNetworkUpdated");
        loadNetwork(meshNetwork);
        updateSelectedGroup();
    }

    @Override
    public void onNetworkLoadFailed(final String error) {
        mNetworkImportState.postValue(error);
    }

    @Override
    public void onNetworkImported(final MeshNetwork meshNetwork) {
        loadNetwork(meshNetwork);
        mNetworkImportState.postValue(meshNetwork.getMeshName() + " has been successfully imported.\n" +
                "In order to start sending messages to this network, please change the provisioner address. " +
                "Using the same provisioner address will cause messages to be discarded due to the usage of incorrect sequence numbers " +
                "for this address. However if the network does not contain any nodes you do not need to change the address");
    }

    @Override
    public void onNetworkImportFailed(final String error) {
        mNetworkImportState.postValue(error);
    }

    @Override
    public void sendProvisioningPdu(final UnprovisionedMeshNode meshNode, final byte[] pdu) {
        currentBleManager.sendPdu(pdu);
    }

    @Override
    public void onMeshPduCreated(final byte[] pdu) {
        currentBleManager.sendPdu(pdu);
    }

    @Override
    public int getMtu() {
        return currentBleManager.getMaximumPacketSize();
    }


    public static String bytesToHexString(byte[] bytes) {
        StringBuilder hexString = new StringBuilder();

        for (byte b : bytes) {
            // Convert each byte to hex format (two characters)
            String hex = String.format("%02x", b);
            hexString.append(hex);
        }

        return hexString.toString();
    }

    @Override
    public void onProvisioningStateChanged(final UnprovisionedMeshNode meshNode, final ProvisioningState.States state, final byte[] data) {
        mUnprovisionedMeshNode = meshNode;
        switch (state) {
            case PROVISIONING_INVITE:
                mProvisioningStateLiveData = new ProvisioningStatusLiveData(meshModule);
                break;
            case PROVISIONING_FAILED:
                mIsProvisioningComplete = false;
                break;
            case PROVISIONING_CAPABILITIES:
                meshNode.setNodeName(Objects.requireNonNull(getSelectedBluetoothDevice().getValue()).getName());
                final Provisioner provisioner = mMeshNetwork.getSelectedProvisioner();
                final int unicast = mMeshNetwork.nextAvailableUnicastAddress(meshNode.getNumberOfElements(), provisioner);
                mMeshNetwork.assignUnicastAddress(unicast);
                meshNode.setUnicastAddress(unicast);

                WritableMap map = meshModule.getUnprovisionedNodeData(meshNode);
                meshModule.sendEvent(NODE_IDENTIFIED, map);
                meshModule.sendEvent(STATE_CHANGES, "Connected (unprovisioned)");

                break;
            case PROVISIONING_START:
                meshModule.sendEvent(STATE_CHANGES, "Provisioning started ...");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.1");
                break;
            case PROVISIONING_PUBLIC_KEY_SENT:
                meshModule.sendEvent(STATE_CHANGES, "Public key sent");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.2");

                break;
            case PROVISIONING_PUBLIC_KEY_RECEIVED:
                meshModule.sendEvent(STATE_CHANGES, "Public key received");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.3");

                break;
            case PROVISIONING_CONFIRMATION_SENT:
                meshModule.sendEvent(STATE_CHANGES, "Provisioning Confirmation sent");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.4");

                break;
            case PROVISIONING_CONFIRMATION_RECEIVED:
                meshModule.sendEvent(STATE_CHANGES, "Provisioning Confirmation received");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.5");

                break;
            case PROVISIONING_RANDOM_RECEIVED:
                meshModule.sendEvent(STATE_CHANGES, "Provisioning random received");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.6");

                break;
            case PROVISIONING_DATA_SENT:
                meshModule.sendEvent(STATE_CHANGES, "Provisioning data sent");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.7");

                break;
        }
        mProvisioningStateLiveData.onMeshNodeStateUpdated(ProvisionerStates.fromStatusCode(state.getState()));
    }

    @Override
    public void onProvisioningFailed(final UnprovisionedMeshNode meshNode, final ProvisioningState.States state, final byte[] data) {
        mUnprovisionedMeshNode = meshNode;

        if (state == ProvisioningState.States.PROVISIONING_FAILED) {
            mIsProvisioningComplete = false;
        }
        Log.i("mesh", "************* onProvisioningFailed");
        mProvisioningStateLiveData.onMeshNodeStateUpdated(ProvisionerStates.fromStatusCode(state.getState()));
    }

    @Override
    public void onProvisioningCompleted(final ProvisionedMeshNode meshNode, final ProvisioningState.States state, final byte[] data) {
        mProvisionedMeshNode = meshNode;
        mUnprovisionedMeshNode = null;

        mProvisionedMeshNodeLiveData.postValue(meshNode);
        if (state == ProvisioningState.States.PROVISIONING_COMPLETE) {
            onProvisioningCompleted(meshNode);
        }
        mProvisioningStateLiveData.onMeshNodeStateUpdated(ProvisionerStates.fromStatusCode(state.getState()));

    }

    private void onProvisioningCompleted(final ProvisionedMeshNode node) {
        mIsProvisioningComplete = true;
        mProvisionedMeshNode = node;
        mIsReconnecting.postValue(true);

        currentBleManager.disconnect().enqueue();
        loadNodes();
        mHandler.post(() -> mConnectionState.postValue("Scanning for provisioned node"));

        meshModule.sendEvent(STATE_CHANGES, "Provisioned");

        mHandler.postDelayed(mReconnectRunnable, 1000); //Added a slight delay to disconnect and refresh the cache
    }

    /**
     * Here we load all nodes except the current provisioner. This may contain other provisioner nodes if available
     */
    private void loadNodes() {
        final List<ProvisionedMeshNode> nodes = new ArrayList<>();
        for (final ProvisionedMeshNode node : mMeshNetwork.getNodes()) {
            if (!node.getUuid().equalsIgnoreCase(mMeshNetwork.getSelectedProvisioner().getProvisionerUuid())) {

                Log.i("loadNodes", String.valueOf(node.getCompanyIdentifier()));
                nodes.add(node);

            }
        }
        Log.i("NODES", String.valueOf(nodes.size()));
        mProvisionedNodes.postValue(nodes);
    }

    @Override
    public void onTransactionFailed(final int dst, final boolean hasIncompleteTimerExpired) {
        mProvisionedMeshNode = mMeshNetwork.getNode(dst);
        mTransactionStatus.postValue(new TransactionStatus(dst, hasIncompleteTimerExpired));
    }

    @Override
    public void onUnknownPduReceived(final int src, final byte[] accessPayload) {
        final ProvisionedMeshNode node = mMeshNetwork.getNode(src);
        if (node != null) {
            updateNode(node);
        }
    }

    @Override
    public void onBlockAcknowledgementProcessed(final int dst, @NonNull final ControlMessage message) {
        final ProvisionedMeshNode node = mMeshNetwork.getNode(dst);
        if (node != null) {
            mProvisionedMeshNode = node;
            if (mSetupProvisionedNode) {
                mProvisionedMeshNodeLiveData.postValue(mProvisionedMeshNode);
                mProvisioningStateLiveData.onMeshNodeStateUpdated(ProvisionerStates.SENDING_BLOCK_ACKNOWLEDGEMENT);
            }
        }
    }

    @Override
    public void onBlockAcknowledgementReceived(final int src, @NonNull final ControlMessage message) {
        final ProvisionedMeshNode node = mMeshNetwork.getNode(src);
        if (node != null) {
            mProvisionedMeshNode = node;
            if (mSetupProvisionedNode) {
                mProvisionedMeshNodeLiveData.postValue(node);
                mProvisioningStateLiveData.onMeshNodeStateUpdated(ProvisionerStates.BLOCK_ACKNOWLEDGEMENT_RECEIVED);
            }
        }
    }

    @Override
    public void onMeshMessageProcessed(final int dst, @NonNull final MeshMessage meshMessage) {
        Log.d("mesh", "onMeshMessageProcessed");

        final ProvisionedMeshNode node = mMeshNetwork.getNode(dst);
        if (node != null) {
            mProvisionedMeshNode = node;
            if (meshMessage instanceof ConfigCompositionDataGet) {
                if (mSetupProvisionedNode) {
                    mProvisionedMeshNode = node;
                    mProvisionedMeshNodeLiveData.postValue(node);
                    mProvisioningStateLiveData.onMeshNodeStateUpdated(ProvisionerStates.COMPOSITION_DATA_GET_SENT);
                }
            }
            else if (meshMessage instanceof ConfigDefaultTtlGet) {
                if (mSetupProvisionedNode) {
                    mProvisionedMeshNodeLiveData.postValue(node);
                    mProvisionedMeshNode = node;
                    mProvisioningStateLiveData.onMeshNodeStateUpdated(ProvisionerStates.SENDING_DEFAULT_TTL_GET);
                }
            }
            else if (meshMessage instanceof ConfigAppKeyAdd) {
                if (mSetupProvisionedNode) {
                    mProvisionedMeshNodeLiveData.postValue(node);
                    mProvisionedMeshNode = node;
                    mProvisioningStateLiveData.onMeshNodeStateUpdated(ProvisionerStates.SENDING_APP_KEY_ADD);
                }
            }
            else if (meshMessage instanceof ConfigNetworkTransmitSet) {
                if (mSetupProvisionedNode) {
                    mProvisionedMeshNodeLiveData.postValue(node);
                    mProvisionedMeshNode = node;
                    mProvisioningStateLiveData.onMeshNodeStateUpdated(ProvisionerStates.SENDING_NETWORK_TRANSMIT_SET);
                }
            }
        }
    }

    @Override
    public void onMeshMessageReceived(final int src, @NonNull final MeshMessage meshMessage) {
        Log.d("mesh", "onMeshMessageReceived: " + Integer.toHexString(meshMessage.getOpCode()));
        final ProvisionedMeshNode node = mMeshNetwork.getNode(src);
        if (node != null)
            if (meshMessage.getOpCode() == ProxyConfigMessageOpCodes.FILTER_STATUS) {
                mProvisionedMeshNode = node;
                setSelectedMeshNode(node);
                final ProxyConfigFilterStatus status = (ProxyConfigFilterStatus) meshMessage;
                final int unicastAddress = status.getSrc();

                WritableMap map = new WritableNativeMap();

                map.putInt("type", status.getFilterType().getType());
                map.putInt("listSize", status.getListSize());
                this.meshModule.sendEvent(PROXY_FILTER_UPDATED, map);

                Log.v(TAG, "Proxy configuration source: " + MeshAddress.formatAddress(status.getSrc(), false));
                mConnectedProxyAddress.postValue(unicastAddress);
                mMeshMessageLiveData.postValue(status);
            }
            else if (meshMessage.getOpCode() == CONFIG_COMPOSITION_DATA_STATUS) {
                Log.i("mSetupProvisionedNode", String.valueOf(mSetupProvisionedNode));
                if (mSetupProvisionedNode) {
                    mIsCompositionDataReceived = true;
                    mProvisionedMeshNodeLiveData.postValue(node);
                    mProvisionedMeshNode = node;
                    mConnectedProxyAddress.postValue(node.getUnicastAddress());
                    mProvisioningStateLiveData.onMeshNodeStateUpdated(ProvisionerStates.COMPOSITION_DATA_STATUS_RECEIVED);
                    mHandler.postDelayed(() -> {
                        final ConfigDefaultTtlGet configDefaultTtlGet = new ConfigDefaultTtlGet();
                        mMeshManagerApi.createMeshPdu(node.getUnicastAddress(), configDefaultTtlGet);
                    }, 500);
                }
                else {
                    updateNode(node);
                }
                final VendorModelMessageStatus status = (VendorModelMessageStatus) meshMessage;

                WritableMap map = new WritableNativeMap();
                map.putString("parameters", bytesToHexString(status.getParameters()));
                map.putString("response", MeshParserUtils.bytesToHex(status.getAccessPayload(), false));
                meshModule.sendEvent(COMPOSITION_DATA_STATUS_GET, map);
            }
            else if (meshMessage.getOpCode() == CONFIG_DEFAULT_TTL_STATUS) {
                final ConfigDefaultTtlStatus status = (ConfigDefaultTtlStatus) meshMessage;
                if (mSetupProvisionedNode) {
                    mIsDefaultTtlReceived = true;
                    mProvisionedMeshNodeLiveData.postValue(node);
                    mProvisionedMeshNode = node;
                    mProvisioningStateLiveData.onMeshNodeStateUpdated(ProvisionerStates.DEFAULT_TTL_STATUS_RECEIVED);
                    mHandler.postDelayed(() -> {
                        final ConfigNetworkTransmitSet networkTransmitSet = new ConfigNetworkTransmitSet(2, 1);
                        mMeshManagerApi.createMeshPdu(node.getUnicastAddress(), networkTransmitSet);
                    }, 1500);
                }
                else {
                    updateNode(node);
                    mMeshMessageLiveData.postValue(status);
                }
            }
            else if (meshMessage.getOpCode() == CONFIG_NETWORK_TRANSMIT_STATUS) {
                if (mSetupProvisionedNode) {
                    mIsNetworkRetransmitSetCompleted = true;
                    mProvisioningStateLiveData.onMeshNodeStateUpdated(ProvisionerStates.NETWORK_TRANSMIT_STATUS_RECEIVED);
                    final ApplicationKey appKey = mMeshNetworkLiveData.getSelectedAppKey();
                    if (appKey != null) {
                        mHandler.postDelayed(() -> {
                            // We should use the app key's boundNetKeyIndex as the network key index when adding the default app key
                            final NetworkKey networkKey = mMeshNetwork.getNetKeys().get(appKey.getBoundNetKeyIndex());
                            final ConfigAppKeyAdd configAppKeyAdd = new ConfigAppKeyAdd(networkKey, appKey);
                            mMeshManagerApi.createMeshPdu(node.getUnicastAddress(), configAppKeyAdd);
                        }, 1500);
                    }
                    else {
                        mSetupProvisionedNode = false;
                        meshModule.sendEvent(PROVISION_COMPLETED, "success");
                        meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "1");

                        mProvisioningStateLiveData.onMeshNodeStateUpdated(ProvisionerStates.APP_KEY_STATUS_RECEIVED);

                    }
                }
                else {
                    updateNode(node);
                    final ConfigNetworkTransmitStatus status = (ConfigNetworkTransmitStatus) meshMessage;
                    mMeshMessageLiveData.postValue(status);
                }
            }
            else if (meshMessage.getOpCode() == CONFIG_APPKEY_STATUS) {
                final ConfigAppKeyStatus status = (ConfigAppKeyStatus) meshMessage;
                if (mSetupProvisionedNode) {
                    mSetupProvisionedNode = false;
                    if (status.isSuccessful()) {
                        mIsAppKeyAddCompleted = true;
                        mProvisionedMeshNodeLiveData.postValue(node);
                        mProvisionedMeshNode = node;
                    }
                    meshModule.sendEvent(PROVISION_COMPLETED, "success");
                    meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "1");

                    mProvisioningStateLiveData.onMeshNodeStateUpdated(ProvisionerStates.APP_KEY_STATUS_RECEIVED);
                }
                else {
                    updateNode(node);
                    mMeshMessageLiveData.postValue(status);
                }

                if (status.isSuccessful()) {
                    meshModule.sendEvent(APP_KEYS_UPDATED, "success");
                }
                else {
                    meshModule.sendEvent(APP_KEYS_UPDATED, status.getStatusCodeName());

                }

            }
            else if (meshMessage.getOpCode() == CONFIG_MODEL_APP_STATUS) {
                final ConfigModelAppStatus status = (ConfigModelAppStatus) meshMessage;
                Log.i("onMeshMessageReceived", status.getStatusCodeName());
                meshModule.sendEvent(MODEL_APP_KEY_UPDATED, status.getStatusCodeName());

                if (updateNode(node)) {
                    final Element element = node.getElements().get(status.getElementAddress());
                    if (node.getElements().containsKey(status.getElementAddress())) {
                        mSelectedElement.postValue(element);
                        final MeshModel model = element.getMeshModels().get(status.getModelIdentifier());
                        mSelectedModel.postValue(model);
                    }
                }
            }
            else if (meshMessage.getOpCode() == CONFIG_MODEL_PUBLICATION_STATUS) {
                if (updateNode(node)) {
                    final ConfigModelPublicationStatus status = (ConfigModelPublicationStatus) meshMessage;
                    Log.i("PUBLICATION_STATUS", String.valueOf(status.isSuccessful()));
                    Log.i("PUBLICATION_STATUS", status.getStatusCodeName());
                    if (status.isSuccessful()) {
                        if (node.getElements().containsKey(status.getElementAddress())) {
                            final Element element = node.getElements().get(status.getElementAddress());
                            mSelectedElement.postValue(element);
                            final MeshModel model = element.getMeshModels().get(status.getModelIdentifier());
                            mSelectedModel.postValue(model);
                            WritableMap map = new WritableNativeMap();
                            map.putBoolean("initial", false);
                            map.putInt("publicationSteps", status.getPublicationSteps());
                            map.putInt("appKeyIndex", status.getAppKeyIndex());
                            map.putInt("publishAddress", status.getPublishAddress());
                            map.putInt("ttl", status.getPublishTtl());
                            map.putInt("publishRetransmitCount", status.getPublishRetransmitCount());
                            map.putInt("publishRetransmitInterval", status.getPublishRetransmitIntervalSteps());

                            meshModule.sendEvent(PUBLICATION_UPDATED, map);
                        }
                    }
                    else {
                        meshModule.sendEvent(PUBLICATION_UPDATED, status.getStatusCodeName());
                    }

                }
            }
            else if (meshMessage.getOpCode() == CONFIG_MODEL_SUBSCRIPTION_STATUS) {
                if (updateNode(node)) {
                    final ConfigModelSubscriptionStatus status = (ConfigModelSubscriptionStatus) meshMessage;
                    if (node.getElements().containsKey(status.getElementAddress())) {
                        final Element element = node.getElements().get(status.getElementAddress());
                        mSelectedElement.postValue(element);
                        final MeshModel model = element.getMeshModels().get(status.getModelIdentifier());
                        mSelectedModel.postValue(model);
                        if (status.isSuccessful()) {
                            meshModule.sendEvent(SUBSCRIPTION_ADDED, status.getSubscriptionAddress());
                        }
                        else {
                            meshModule.sendEvent(SUBSCRIPTION_FAILED, status.getStatusCodeName());
                        }
                    }
                }

            }
            else if (meshMessage.getOpCode() == CONFIG_NODE_RESET_STATUS) {
                currentBleManager.setClearCacheRequired();
                final ConfigNodeResetStatus status = (ConfigNodeResetStatus) meshMessage;
                mExtendedMeshNode.postValue(null);
                loadNodes();
                mMeshMessageLiveData.postValue(status);

            }
            else if (meshMessage.getOpCode() == CONFIG_RELAY_STATUS) {
                if (updateNode(node)) {
                    final ConfigRelayStatus status = (ConfigRelayStatus) meshMessage;
                    mMeshMessageLiveData.postValue(status);
                }
            }
            else if (meshMessage.getOpCode() == CONFIG_HEARTBEAT_PUBLICATION_STATUS) {
                if (updateNode(node)) {
                    final Element element = node.getElements().get(meshMessage.getSrc());
                    final MeshModel model = element.getMeshModels().get((int) SigModelParser.CONFIGURATION_SERVER);
                    mSelectedModel.postValue(model);
                    mMeshMessageLiveData.postValue(meshMessage);
                }
            }
            else if (meshMessage.getOpCode() == CONFIG_HEARTBEAT_SUBSCRIPTION_STATUS) {
                if (updateNode(node)) {
                    final Element element = node.getElements().get(meshMessage.getSrc());
                    final MeshModel model = element.getMeshModels().get((int) SigModelParser.CONFIGURATION_SERVER);
                    mSelectedModel.postValue(model);
                    mMeshMessageLiveData.postValue(meshMessage);
                }
            }
            else if (meshMessage.getOpCode() == CONFIG_GATT_PROXY_STATUS) {
                if (updateNode(node)) {
                    final ConfigGattProxyStatus status = (ConfigGattProxyStatus) meshMessage;
                    mMeshMessageLiveData.postValue(status);
                }
            }
            else if (meshMessage.getOpCode() == GENERIC_ON_OFF_STATUS) {
                if (updateNode(node)) {
                    final GenericOnOffStatus status = (GenericOnOffStatus) meshMessage;
                    if (node.getElements().containsKey(status.getSrcAddress())) {
                        final Element element = node.getElements().get(status.getSrcAddress());
                        mSelectedElement.postValue(element);
                        final MeshModel model = element.getMeshModels().get((int) SigModelParser.GENERIC_ON_OFF_SERVER);
                        mSelectedModel.postValue(model);
                    }
                }
            }
            else if (meshMessage.getOpCode() == GENERIC_LEVEL_STATUS) {
                if (updateNode(node)) {
                    final GenericLevelStatus status = (GenericLevelStatus) meshMessage;
                    if (node.getElements().containsKey(status.getSrcAddress())) {
                        final Element element = node.getElements().get(status.getSrcAddress());
                        mSelectedElement.postValue(element);
                        final MeshModel model = element.getMeshModels().get((int) SigModelParser.GENERIC_LEVEL_SERVER);
                        mSelectedModel.postValue(model);
                    }
                }
            }
            else if (meshMessage.getOpCode() == SCENE_STATUS) {
                if (updateNode(node)) {
                    final SceneStatus status = (SceneStatus) meshMessage;
                    if (node.getElements().containsKey(status.getSrcAddress())) {
                        final Element element = node.getElements().get(status.getSrcAddress());
                        mSelectedElement.postValue(element);
                    }
                }
            }
            else if (meshMessage.getOpCode() == SCENE_REGISTER_STATUS) {
                if (updateNode(node)) {
                    final SceneRegisterStatus status = (SceneRegisterStatus) meshMessage;
                    if (node.getElements().containsKey(status.getSrcAddress())) {
                        final Element element = node.getElements().get(status.getSrcAddress());
                        mSelectedElement.postValue(element);
                    }
                }
            }
            else if (meshMessage.getOpCode() == CONFIG_NETKEY_STATUS) {
                final ConfigNetKeyStatus status = (ConfigNetKeyStatus) meshMessage;
                if (status.isSuccessful()) {
                    meshModule.sendEvent(NETWORK_KEYS_UPDATED, "success");
                }
                else {
                    meshModule.sendEvent(NETWORK_KEYS_UPDATED, status.getStatusCodeName());

                }
            }
            else if (meshMessage.getOpCode() == CONFIG_SIG_MODEL_SUBSCRIPTION_LIST) {
                final ConfigSigModelSubscriptionList status = (ConfigSigModelSubscriptionList) meshMessage;
                if (status.isSuccessful()) {
                    List<Integer> addresses = status.getSubscriptionAddresses();
                    WritableArray list = new WritableNativeArray();
                    for (Integer address : addresses) {
                        list.pushInt(address);
                    }
                    meshModule.sendEvent(SUBSCRIPTION_RECEIVED, list);
                }

            }
            else if (meshMessage.getOpCode() == CONFIG_VENDOR_MODEL_SUBSCRIPTION_LIST) {
                final ConfigVendorModelSubscriptionList status = (ConfigVendorModelSubscriptionList) meshMessage;
                if (status.isSuccessful()) {
                    List<Integer> addresses = status.getSubscriptionAddresses();
                    WritableArray list = new WritableNativeArray();
                    for (Integer address : addresses) {
                        list.pushInt(address);
                    }
                    meshModule.sendEvent(SUBSCRIPTION_RECEIVED, list);
                }

            }
            else if (meshMessage.getOpCode() == ApplicationMessageOpCodes.SENSOR_STATUS) {
                final SensorStatus status = (SensorStatus) meshMessage;
                for (MarshalledSensorData sensorData : status.getMarshalledSensorData()) {
                    try {
                        DeviceProperty deviceProperty = sensorData.getMarshalledPropertyId().getPropertyId();
                        DevicePropertyCharacteristic<?> characteristic = DeviceProperty.
                                getCharacteristic(deviceProperty, sensorData.getRawValues(), 0, sensorData.getRawValues().length);

                        WritableMap map = new WritableNativeMap();
                        map.putString("propertyName", DeviceProperty.getPropertyName(deviceProperty));
                        map.putString("propertyValue", characteristic.toString());
                        meshModule.sendEvent(SENSOR_GET, map);
                    } catch (Exception ex) {
                        Log.e(TAG, "Error while parsing sensor data: " + ex.toString());
                    }


                }
            }
            else if (meshMessage instanceof VendorModelMessageStatus) {
                if (updateNode(node)) {
                    final VendorModelMessageStatus status = (VendorModelMessageStatus) meshMessage;
                    if (node.getElements().containsKey(status.getSrcAddress())) {
                        final Element element = node.getElements().get(status.getSrcAddress());
                        mSelectedElement.postValue(element);
                        final MeshModel model = element.getMeshModels().get(status.getModelIdentifier());
                        mSelectedModel.postValue(model);
                    }
                }
            }

        if (mMeshMessageLiveData.hasActiveObservers()) {
            mMeshMessageLiveData.postValue(meshMessage);
        }

        //Refresh mesh network live data
        if (mMeshManagerApi.getMeshNetwork() != null) {
            mMeshNetworkLiveData.refresh(mMeshManagerApi.getMeshNetwork());
        }
    }

    @Override
    public void onMessageDecryptionFailed(final String meshLayer, final String errorMessage) {
        Log.e(TAG, "Decryption failed in " + meshLayer + " : " + errorMessage);
    }

    /**
     * Loads the network that was loaded from the db or imported from the mesh cdb
     *
     * @param meshNetwork mesh network that was loaded
     */
    private void loadNetwork(final MeshNetwork meshNetwork) {
        mMeshNetwork = meshNetwork;
        if (mMeshNetwork != null) {

            if (!mMeshNetwork.isProvisionerSelected()) {
                final Provisioner provisioner = meshNetwork.getProvisioners().get(0);
                provisioner.setLastSelected(true);
                mMeshNetwork.selectProvisioner(provisioner);
            }
            //Load live data with mesh network
            mMeshNetworkLiveData.loadNetworkInformation(meshNetwork);
            //Load live data with provisioned nodes
            loadNodes();

            final ProvisionedMeshNode node = getSelectedMeshNode().getValue();
            if (node != null) {
                mExtendedMeshNode.postValue(mMeshNetwork.getNode(node.getUuid()));
            }
        }
        this.isNetworkLoaded = true;

        if (getMeshNetworkLiveData().getNetworkName().toLowerCase().contains("nrf")) {
            getMeshNetworkLiveData().setNetworkName("TI Mesh Network");
        }

        // Update default provisioners name:
        for (Provisioner provisioner : getMeshNetworkLiveData().getProvisioners()) {
            if (provisioner.getProvisionerName().toLowerCase().contains("nrf")) {
                this.editProvisionerName(provisioner.getProvisionerAddress(), "TI Mesh Provisioner");
            }
        }

        meshModule.sendEvent(NETWORK_LOADED, "success");

    }

    /**
     * We should only update the selected node, since sending messages to group address will notify with nodes that is not on the UI
     */
    private boolean updateNode(@NonNull final ProvisionedMeshNode node) {
        if (mProvisionedMeshNode != null && mProvisionedMeshNode.getUnicastAddress() == node.getUnicastAddress()) {
            mProvisionedMeshNode = node;
            mExtendedMeshNode.postValue(node);
            return true;
        }
        return false;
    }

    /**
     * Starts reconnecting to the device
     */
    public void startScanForUnprovisionedNode() {
        if (mIsScanning)
            return;

        mIsScanning = true;
        // Scanning settings
        final ScanSettings settings = new ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                // Refresh the devices list every second
                .setReportDelay(0)
                // Hardware filtering has some issues on selected devices
                .setUseHardwareFilteringIfSupported(false)
                // Samsung S6 and S6 Edge report equal value of RSSI for all devices. In this app we ignore the RSSI.
                /*.setUseHardwareBatchingIfSupported(false)*/
                .build();

        // Let's use the filter to scan only for Mesh devices
        final List<ScanFilter> filters = new ArrayList<>();
        filters.add(new ScanFilter.Builder().setServiceUuid(new ParcelUuid(MESH_PROVISIONING_UUID)).build());

        final BluetoothLeScannerCompat scanner = BluetoothLeScannerCompat.getScanner();
        scanner.startScan(filters, settings, scanCallback);
        Log.v("mesh", "Scan started");
        mHandler.postDelayed(mScannerTimeout, 20000);
    }

    private MeshModel getMeshModel(final ProvisionedMeshNode node, final int src, final int modelId) {
        final Element element = node.getElements().get(src);
        if (element != null) {
            return element.getMeshModels().get(modelId);
        }
        return null;
    }

    public void startScanForProxyNode() {
        if (mIsScanning)
            return;

        mIsScanning = true;
        // Scanning settings
        final ScanSettings settings = new ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                // Refresh the devices list every second
                .setReportDelay(0)
                // Hardware filtering has some issues on selected devices
                .setUseHardwareFilteringIfSupported(false)
                // Samsung S6 and S6 Edge report equal value of RSSI for all devices. In this app we ignore the RSSI.
                /*.setUseHardwareBatchingIfSupported(false)*/
                .build();

        // Let's use the filter to scan only for Mesh devices
        final List<ScanFilter> filters = new ArrayList<>();
        filters.add(new ScanFilter.Builder().setServiceUuid(new ParcelUuid(MESH_PROXY_UUID)).build());

        final BluetoothLeScannerCompat scanner = BluetoothLeScannerCompat.getScanner();
        scanner.startScan(filters, settings, scanProxyCallbacks);
        Log.v("mesh", "startScanForProxyNode");
        mHandler.postDelayed(mScannerTimeout, 20000);
    }

    public void startScanForProxyNodeToProvision() {
        if (mIsScanning)
            return;

        mIsScanning = true;
        // Scanning settings
        final ScanSettings settings = new ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                // Refresh the devices list every second
                .setReportDelay(0)
                // Hardware filtering has some issues on selected devices
                .setUseHardwareFilteringIfSupported(false)
                // Samsung S6 and S6 Edge report equal value of RSSI for all devices. In this app we ignore the RSSI.
                /*.setUseHardwareBatchingIfSupported(false)*/
                .build();

        // Let's use the filter to scan only for Mesh devices
        final List<ScanFilter> filters = new ArrayList<>();
        filters.add(new ScanFilter.Builder().setServiceUuid(new ParcelUuid(MESH_PROXY_UUID)).build());

        final BluetoothLeScannerCompat scanner = BluetoothLeScannerCompat.getScanner();
        scanner.startScan(filters, settings, scanCallback);
        Log.v("mesh", "startScanForProxyNodeToProvision");
        mHandler.postDelayed(mScannerTimeout, 20000);
    }

    /**
     * stop scanning for bluetooth devices.
     */
    public void stopScan() {
        mHandler.removeCallbacks(mScannerTimeout);
        Log.i("mesh", "Stopping scan!!!!!!!!!");

        final BluetoothLeScannerCompat scanner = BluetoothLeScannerCompat.getScanner();
        scanner.stopScan(scanCallback);
        scanner.stopScan(scanProxyCallbacks);
        mIsScanning = false;
    }

    private void onProvisionedDeviceFound(final ProvisionedMeshNode node, final ExtendedBluetoothDevice device) {

        mSetupProvisionedNode = true;
        mProvisionedMeshNode = node;
        mIsReconnectingFlag = true;
        //Added an extra delay to ensure reconnection
        mHandler.postDelayed(() -> connectToProxy(device), 2000);
    }

    /**
     * Generates the groups based on the addresses each models have subscribed to
     */
    private void loadGroups1() {
        mGroups.postValue(mMeshNetwork.getGroups());
    }

    private void updateSelectedGroup() {
        final Group selectedGroup = mSelectedGroupLiveData.getValue();
        if (selectedGroup != null) {
            mSelectedGroupLiveData.postValue(mMeshNetwork.getGroup(selectedGroup.getAddress()));
        }
    }

    /**
     * Sets the group that was selected from the GroupAdapter.
     */
    void setSelectedGroup(final int address) {
        final Group group = mMeshNetwork.getGroup(address);
        if (group != null) {
            mSelectedGroupLiveData.postValue(group);
        }
    }

    private final ScanCallback scanCallback = new ScanCallback() {
        @Override
        public void onScanResult(final int callbackType, final ScanResult result) {
            final ScanRecord scanRecord = result.getScanRecord();
            if (scanRecord != null) {
                final byte[] serviceDataProvisioner = Utils.getServiceData(result, MESH_PROVISIONING_UUID);
                final byte[] serviceDataProxy = Utils.getServiceData(result, MESH_PROXY_UUID);
                if (serviceDataProvisioner != null) {
                    Log.i("mesh", "scan result" + scanRecord.getDeviceName());
                    WritableMap map = Arguments.createMap();
                    map.putString("name", result.getScanRecord().getDeviceName());
                    map.putString("id", result.getDevice().getAddress());
                    map.putString("rssi", String.valueOf(result.getRssi()));
                    meshModule.sendEvent(SCAN_RESULT, map);
                    ExtendedBluetoothDevice d = new ExtendedBluetoothDevice(result);
                    meshModule.scanResults.add(d);
                }
                if (serviceDataProxy != null) {
                    if (mMeshManagerApi.isAdvertisedWithNodeIdentity(serviceDataProxy)) {
                        final ProvisionedMeshNode node = mProvisionedMeshNode;
                        if (mMeshManagerApi.nodeIdentityMatches(node, serviceDataProxy)) {
                            stopScan();
                            mConnectionState.postValue("Provisioned node found");
                            onProvisionedDeviceFound(node, new ExtendedBluetoothDevice(result));
                        }
                    }
                    else if (mMeshManagerApi.isAdvertisingWithNetworkIdentity(serviceDataProxy)) {
                        final ProvisionedMeshNode node = mProvisionedMeshNode;
                        if (mMeshManagerApi.networkIdMatches(serviceDataProxy)) {
                            // Add node to scan results
                            WritableMap map = Arguments.createMap();
                            map.putString("name", result.getScanRecord().getDeviceName());
                            map.putString("id", result.getDevice().getAddress());
                            map.putString("rssi", String.valueOf(result.getRssi()));
                            meshModule.sendEvent(PROV_SCAN_RESULT, map);
                            meshModule.scanResults.add(new ExtendedBluetoothDevice(result));

                        }
                    }
                }
            }
        }

        @Override
        public void onBatchScanResults(List<ScanResult> results) {
            for (ScanResult result : results) {
                meshModule.sendEvent(SCAN_RESULT, result.getDevice().getAddress());
            }
        }

        @Override
        public void onScanFailed(int errorCode) {
            meshModule.sendEvent(SCAN_FAILED, "Scan failed with error: " + errorCode);
        }
    };
    private final ScanCallback scanProxyCallbacks = new ScanCallback() {
        @Override
        public void onScanResult(final int callbackType, final ScanResult result) {
            final ScanRecord scanRecord = result.getScanRecord();
            if (scanRecord != null) {
                final byte[] serviceDataProxy = Utils.getServiceData(result, MESH_PROXY_UUID);
                if (serviceDataProxy != null) {
                    if (mMeshManagerApi.isAdvertisingWithNetworkIdentity(serviceDataProxy)) {
                        if (mMeshManagerApi.networkIdMatches(serviceDataProxy)) {
                            // Add node to scan results
                            WritableMap map = Arguments.createMap();
                            map.putString("name", result.getScanRecord().getDeviceName());
                            map.putString("id", result.getDevice().getAddress());
                            map.putString("rssi", String.valueOf(result.getRssi()));
                            meshModule.sendEvent(PROV_SCAN_RESULT, map);
                            meshModule.scanResults.add(new ExtendedBluetoothDevice(result));

                        }
                    }
                    else if (mMeshManagerApi.isAdvertisedWithNodeIdentity(serviceDataProxy)) {
                        final ProvisionedMeshNode node = mProvisionedMeshNode;
                        if (mMeshManagerApi.nodeIdentityMatches(node, serviceDataProxy)) {
                            // Add node to scan results
                            WritableMap map = Arguments.createMap();
                            map.putString("name", result.getScanRecord().getDeviceName());
                            map.putString("id", result.getDevice().getAddress());
                            map.putString("rssi", String.valueOf(result.getRssi()));
                            meshModule.sendEvent(PROV_SCAN_RESULT, map);
                            meshModule.scanResults.add(new ExtendedBluetoothDevice(result));
                        }
                    }
                }
            }
        }

        @Override
        public void onBatchScanResults(List<ScanResult> results) {
            for (ScanResult result : results) {
                meshModule.sendEvent(SCAN_RESULT, result.getDevice().getAddress());
            }
        }

        @Override
        public void onScanFailed(int errorCode) {
            meshModule.sendEvent(SCAN_FAILED, "Scan failed with error: " + errorCode);
        }
    };

    public void applyPublication(int unicastAddr) {
        ProvisionedMeshNode node = getMeshNetworkLiveData().getMeshNetwork().getNode(unicastAddr);

        if (node != null) {
            Log.i("applyPublication", "node is not null");
            final MeshMessage configModelPublicationSet = currentPublicationSettings.createMessage();
            Log.i("applyPublication", configModelPublicationSet.toString());

            if (configModelPublicationSet != null) {
                try {
                    getMeshManagerApi()
                            .createMeshPdu(node.getUnicastAddress(),
                                    configModelPublicationSet);
                } catch (IllegalArgumentException ex) {
                    return;
                }
            }
        }
        else {
            Log.i("applyPublication", "node is null");

        }
    }

    public void bindAppKeyToModels(int unicastAddress, int appKeyIndex, ReadableArray models) {
        QuickSetupNode quickSetupNode = new QuickSetupNode(mMeshManagerApi);

        mMeshManagerApi.setMeshStatusCallbacks(quickSetupNode);
        // Convert ReadableArray to Map<Integer, MeshModel>
        Map<Integer, List<MeshModel>> modelMap = convertArrayToModelsMap(models, unicastAddress);

        WritableArray result = quickSetupNode.bindAppKeyToListModels(unicastAddress, appKeyIndex, modelMap);
        Log.i("QuickSetupNode", "Result: " + result.toString());
        this.meshModule.sendEvent(MODEL_BIND_DONE, result);
        mMeshManagerApi.setMeshStatusCallbacks(this);
    }

    public void subscribeToModels(int unicastAddress, String groupAddress, ReadableArray models) {
        QuickSetupNode quickSetupNode = new QuickSetupNode(mMeshManagerApi);

        mMeshManagerApi.setMeshStatusCallbacks(quickSetupNode);
        // Convert ReadableArray to Map<Integer, MeshModel>
        Map<Integer, List<MeshModel>> modelMap = convertArrayToModelsMap(models, unicastAddress);

        WritableArray result = quickSetupNode.subscribeToListModels(unicastAddress, Integer.parseInt(groupAddress, 16), modelMap);
        Log.i("QuickSetupNode", "Result: " + result.toString());
        this.meshModule.sendEvent(MODELS_SUBSCRIBE_DONE, result);
        mMeshManagerApi.setMeshStatusCallbacks(this);
    }

    public void setPublicationSettingsToModelList(int unicastAddress, String groupAddress, ReadableArray models,
                                                  int appKeyIndex, int publishTtl, int publishPeriodInterval, String publishPeriodResolution,
                                                  int retransmitCount, int retransmitInterval) {
        QuickSetupNode quickSetupNode = new QuickSetupNode(mMeshManagerApi);

        mMeshManagerApi.setMeshStatusCallbacks(quickSetupNode);
        // Convert ReadableArray to Map<Integer, MeshModel>
        Map<Integer, List<MeshModel>> modelMap = convertArrayToModelsMap(models, unicastAddress);

        WritableArray result = quickSetupNode.setPublicationToListModels(unicastAddress, Integer.parseInt(groupAddress, 16), modelMap, appKeyIndex, publishTtl, publishPeriodInterval, publishPeriodResolution, retransmitCount, retransmitInterval);
        this.meshModule.sendEvent(MODELS_SET_PUBLICATION_DONE, result);
        mMeshManagerApi.setMeshStatusCallbacks(this);
    }

    public Map<Integer, List<MeshModel>> convertArrayToModelsMap(ReadableArray models, int nodeUnicastAddress) {
        Map<Integer, List<MeshModel>> modelMap = new HashMap<>();

        for (int i = 0; i < models.size(); i++) {
            ReadableMap modelData = models.getMap(i);
            if (modelData == null) continue;

            int elementId = modelData.getInt("elementId");
            int modelId = modelData.getInt("modelId");
            String modelType = modelData.getString("modelType");

            Element e = this.getMeshNetworkLiveData().getMeshNetwork().getNode(nodeUnicastAddress).getElements().get(elementId);
            MeshModel model = e.getMeshModels().get(modelId);

            // Add model to list under its element address
            int elementAddress = e.getElementAddress();
            modelMap.putIfAbsent(elementAddress, new ArrayList<>());
            modelMap.get(elementAddress).add(model);

        }

        return modelMap;
    }

    public List<AllocatedUnicastRange> convertUnicastRangesArrayToList(ReadableArray ranges) {
        List<AllocatedUnicastRange> rangesList = new ArrayList<>();

        for (int i = 0; i < ranges.size(); i++) {
            ReadableMap rangeMap = ranges.getMap(i); // Get the object at index i
            if (rangeMap != null && rangeMap.hasKey("lowAddress") && rangeMap.hasKey("highAddress")) {
                int lowAddress = rangeMap.getInt("lowAddress");
                int highAddress = rangeMap.getInt("highAddress");
                rangesList.add(new AllocatedUnicastRange(lowAddress, highAddress));
            }
        }

        return rangesList;
    }

    public List<AllocatedGroupRange> convertGroupRangesArrayToList(ReadableArray ranges) {
        List<AllocatedGroupRange> rangesList = new ArrayList<>();

        for (int i = 0; i < ranges.size(); i++) {
            ReadableMap rangeMap = ranges.getMap(i); // Get the object at index i
            if (rangeMap != null && rangeMap.hasKey("lowAddress") && rangeMap.hasKey("highAddress")) {
                int lowAddress = rangeMap.getInt("lowAddress");
                int highAddress = rangeMap.getInt("highAddress");
                rangesList.add(new AllocatedGroupRange(lowAddress, highAddress));
            }
        }

        return rangesList;
    }

    public List<AllocatedSceneRange> convertSenceRangesArrayToList(ReadableArray ranges) {
        List<AllocatedSceneRange> rangesList = new ArrayList<>();

        for (int i = 0; i < ranges.size(); i++) {
            ReadableMap rangeMap = ranges.getMap(i); // Get the object at index i
            if (rangeMap != null && rangeMap.hasKey("firstScene") && rangeMap.hasKey("lastScene")) {
                int firstScene = rangeMap.getInt("firstScene");
                int lastScene = rangeMap.getInt("lastScene");
                rangesList.add(new AllocatedSceneRange(firstScene, lastScene));
            }
        }

        return rangesList;
    }

    public WritableArray getProvisioners() {
        List<Provisioner> provisioners = this.mMeshManagerApi.getMeshNetwork().getProvisioners();
        Provisioner selectedProvisioner = this.getMeshNetworkLiveData().getMeshNetwork().getSelectedProvisioner();
        WritableArray provisionersArray = new WritableNativeArray();
        WritableMap provisionersMap = new WritableNativeMap();

        for (Provisioner provisioner : provisioners) {
            provisionersMap.putString("name", provisioner.getProvisionerName());
            provisionersMap.putString("unicastAddress", Integer.toHexString(provisioner.getProvisionerAddress()).toUpperCase());
            provisionersMap.putInt("ttl", provisioner.getGlobalTtl());
            provisionersMap.putString("deviceKey", "");

            boolean isCurrent = Objects.equals(selectedProvisioner.getProvisionerAddress(), provisioner.getProvisionerAddress());
            provisionersMap.putBoolean("isCurrent", isCurrent);

            List<AllocatedUnicastRange> allocatedUnicastRanges = provisioner.getAllocatedUnicastRanges();
            List<AllocatedGroupRange> allocatedGroupRanges = provisioner.getAllocatedGroupRanges();
            List<AllocatedSceneRange> allocatedSceneRanges = provisioner.getAllocatedSceneRanges();
            WritableArray allocatedUnicastRangesArray = new WritableNativeArray();
            WritableArray allocatedGroupRangesArray = new WritableNativeArray();
            WritableArray allocatedSceneRangesArray = new WritableNativeArray();

            for (AllocatedUnicastRange allocatedUnicastRange : allocatedUnicastRanges) {
                WritableMap allocatedUnicastRangeDict = new WritableNativeMap();
                allocatedUnicastRangeDict.putInt("lowAddress", allocatedUnicastRange.getLowAddress());
                allocatedUnicastRangeDict.putInt("highAddress", allocatedUnicastRange.getHighAddress());
                allocatedUnicastRangesArray.pushMap(allocatedUnicastRangeDict);
            }
            for (AllocatedGroupRange allocatedGroupRange : allocatedGroupRanges) {
                WritableMap allocatedGroupRangeDict = new WritableNativeMap();
                allocatedGroupRangeDict.putInt("lowAddress", allocatedGroupRange.getLowAddress());
                allocatedGroupRangeDict.putInt("highAddress", allocatedGroupRange.getHighAddress());
                allocatedGroupRangesArray.pushMap(allocatedGroupRangeDict);
            }
            for (AllocatedSceneRange allocatedScenesRange : allocatedSceneRanges) {
                WritableMap allocatedSceneRangeDict = new WritableNativeMap();
                allocatedSceneRangeDict.putInt("firstScene", allocatedScenesRange.getFirstScene());
                allocatedSceneRangeDict.putInt("lastScene", allocatedScenesRange.getLastScene());
                allocatedSceneRangesArray.pushMap(allocatedSceneRangeDict);
            }

            provisionersMap.putArray("allocatedUnicastAddress", allocatedUnicastRangesArray);
            provisionersMap.putArray("allocatedGroupsAddress", allocatedGroupRangesArray);
            provisionersMap.putArray("allocatedSceneAddress", allocatedSceneRangesArray);

            provisionersArray.pushMap(provisionersMap);
        }

        return provisionersArray;
    }

    private Provisioner findProvisioner(int provisionerUnicastAddress) {
        List<Provisioner> provisioners = this.mMeshManagerApi.getMeshNetwork().getProvisioners();
        for (Provisioner prov : provisioners) {
            if (prov.getProvisionerAddress() == provisionerUnicastAddress) {
                return prov;
            }
        }
        Log.i(TAG, "Provisioner with address " + provisionerUnicastAddress + " not found");
        return null;
    }

    private String updateProvisioner(Provisioner provisioner) {
        if (provisioner == null) {
            return "Provisioner not found";
        }
        try {
            return this.mMeshManagerApi.getMeshNetwork().updateProvisioner(provisioner) ? "success" : "Failed to update provisioner";
        } catch (Exception e) {
            Log.e(TAG, "Error updating provisioner: " + e.getMessage());
            return e.getMessage();
        }
    }

    public String editProvisionerName(int provisionerUnicastAddress, String newName) {
        Provisioner provisioner = findProvisioner(provisionerUnicastAddress);
        if (provisioner == null) return "Provisioner not found";

        provisioner.setProvisionerName(newName);
        return updateProvisioner(provisioner);
    }

    public String editProvisionerUnicastAddress(int provisionerUnicastAddress, int newAddress) {
        Provisioner provisioner = findProvisioner(provisionerUnicastAddress);
        if (provisioner == null) return "Provisioner not found";

        provisioner.setProvisionerAddress(newAddress);
        return updateProvisioner(provisioner);
    }

    public String editProvisionerTtl(int provisionerUnicastAddress, int ttl) {
        Provisioner provisioner = findProvisioner(provisionerUnicastAddress);
        if (provisioner == null) return "Provisioner not found";

        provisioner.setGlobalTtl(ttl);
        return updateProvisioner(provisioner);
    }

    public String editProvisionerUnicastRanges(int provisionerUnicastAddress, List<AllocatedUnicastRange> allocatedUnicastRangeList) {
        Provisioner provisioner = findProvisioner(provisionerUnicastAddress);
        if (provisioner == null) return "Provisioner not found";

        provisioner.setAllocatedUnicastRanges(allocatedUnicastRangeList);
        return updateProvisioner(provisioner);
    }

    public String editProvisionerGroupRanges(int provisionerUnicastAddress, List<AllocatedGroupRange> allocatedGroupRanges) {
        Provisioner provisioner = findProvisioner(provisionerUnicastAddress);
        if (provisioner == null) return "Provisioner not found";

        provisioner.setAllocatedGroupRanges(allocatedGroupRanges);
        return updateProvisioner(provisioner);
    }

    public String editProvisionerSceneRanges(int provisionerUnicastAddress, List<AllocatedSceneRange> allocatedSceneRanges) {
        Provisioner provisioner = findProvisioner(provisionerUnicastAddress);
        if (provisioner == null) return "Provisioner not found";

        provisioner.setAllocatedSceneRanges(allocatedSceneRanges);
        return updateProvisioner(provisioner);
    }
}



