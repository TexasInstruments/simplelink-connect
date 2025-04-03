package com.ti.simplelinkconnect.mesh;

import java.util.Objects;

public enum MeshModuleEvents {
    NODE_IDENTIFIED("onNodeIdentified"),
    SCAN_RESULT("onScanResult"),
    SCAN_FAILED("onScanFailed"),
    PROVISION_COMPLETED("onProvisionCompleted"),
    STATE_CHANGES("onStateChange"),
    NODE_CONNECTED("onNodeConnected"),
    NETWORK_LOADED("onNetworkLoaded"),
    UPDATE_PROVISIONING_PROGRESS("onProgressUpdate"),
    NETWORK_UPDATED("onNetworkUpdated"),
    NETWORK_KEYS_UPDATED("onNetworkKeyUpdated"),
    PROV_SCAN_RESULT("onProvisionedScanResult"),
    APP_KEYS_UPDATED("onAppKeyUpdated"),
    PUBLICATION_UPDATED("onPublicationUpdated"),
    SUBSCRIPTION_RECEIVED("onSubscriptionReceived"),
    SUBSCRIPTION_ADDED("onSubscriptionAdded"),
    SUBSCRIPTION_FAILED("onSubscriptionFailed"),
    SENSOR_GET("onSensorGet"),
    COMPOSITION_DATA_STATUS_GET("onStatusReceived"),
    PROXY_FILTER_UPDATED("onProxyFilterUpdated"),
    MODEL_APP_KEY_UPDATED("onModelKeyUpdated"),
    MODELS_SUBSCRIBE_DONE("onSubscriptionDone"),
    MODELS_SET_PUBLICATION_DONE("onPublicationDone"),
    MODEL_BIND_DONE("onBindAppKeysDone");

    private final String event;

    MeshModuleEvents(final String event) {
        this.event = event;
    }

    public String getState() {
        return event;
    }

    public static MeshModuleEvents fromStatusCode(final String statusCode) {
        for (MeshModuleEvents state : MeshModuleEvents.values()) {
            if (Objects.equals(state.getState(), statusCode)) {
                return state;
            }
        }
        throw new IllegalStateException("Invalid state");
    }
}
