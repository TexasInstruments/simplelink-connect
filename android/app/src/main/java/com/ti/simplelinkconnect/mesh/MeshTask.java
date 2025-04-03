package com.ti.simplelinkconnect.mesh;

import no.nordicsemi.android.mesh.ApplicationKey;
import no.nordicsemi.android.mesh.NetworkKey;
import no.nordicsemi.android.mesh.transport.ConfigAppKeyAdd;
import no.nordicsemi.android.mesh.transport.ConfigModelAppBind;
import no.nordicsemi.android.mesh.transport.ConfigBeaconGet;
import no.nordicsemi.android.mesh.transport.ConfigBeaconSet;
import no.nordicsemi.android.mesh.transport.ConfigDefaultTtlGet;
import no.nordicsemi.android.mesh.transport.ConfigDefaultTtlSet;
import no.nordicsemi.android.mesh.transport.ConfigFriendGet;
import no.nordicsemi.android.mesh.transport.ConfigFriendSet;
import no.nordicsemi.android.mesh.transport.ConfigGattProxyGet;
import no.nordicsemi.android.mesh.transport.ConfigModelPublicationSet;
import no.nordicsemi.android.mesh.transport.ConfigModelSubscriptionAdd;
import no.nordicsemi.android.mesh.transport.ConfigNetKeyAdd;
import no.nordicsemi.android.mesh.transport.ConfigRelayGet;
import no.nordicsemi.android.mesh.transport.ConfigNodeIdentityGet;
import no.nordicsemi.android.mesh.transport.ConfigHeartbeatPublicationGet;
import no.nordicsemi.android.mesh.transport.ConfigHeartbeatSubscriptionGet;
import no.nordicsemi.android.mesh.transport.ConfigHeartbeatSubscriptionSet;
import no.nordicsemi.android.mesh.transport.ConfigNetworkTransmitGet;
import no.nordicsemi.android.mesh.transport.ConfigHeartbeatPublicationSet;
import no.nordicsemi.android.mesh.transport.ConfigCompositionDataGet;
import no.nordicsemi.android.mesh.transport.MeshMessage;


public class MeshTask {
    private final TaskType type;
    private final Object[] params;
    private final String title;
    private final MeshMessage message;

    public MeshTask(TaskType type, Object... params) {
        this.type = type;
        this.params = params;
        this.title = generateTitle(type, params);
        this.message = generateMessage(type, params);
    }

    public TaskType getType() {
        return type;
    }

    public Object[] getParams() {
        return params;
    }

    public String getTitle() {
        return title;
    }

    public MeshMessage getMessage() {
        return message;
    }

    private String generateTitle(TaskType type, Object[] params) {
        switch (type) {
            case GET_COMPOSITION_DATA:
                return "Get Composition Page " + params[0];
            case GET_DEFAULT_TTL:
                return "Read default TTL";
            case SET_DEFAULT_TTL:
                return "Set Default TTL to " + params[0];
            case READ_RELAY_STATUS:
                return "Read Relay Status";
            case DISABLE_RELAY_FEATURE:
                return "Disabling Relay Retransmission";
            case READ_NETWORK_TRANSIT_STATUS:
                return "Read Network Transit Status";
            case READ_BEACON_STATUS:
                return "Read Beacon Status";
            case SET_BEACON:
                return ((boolean) params[0]) ? "Enable Secure Network Beacons" : "Disable Secure Network Beacons";
            case READ_GATT_PROXY_STATUS:
                return "Read GATT Proxy Status";
            case SET_GATT_PROXY:
                return ((boolean) params[0]) ? "Enable GATT Proxy Feature" : "Disable GATT Proxy Feature";
            case READ_FRIEND_STATUS:
                return "Read Friend Status";
            case SET_FRIEND:
                return ((boolean) params[0]) ? "Enable Friend Feature" : "Disable Friend Feature";
            case READ_NODE_IDENTITY_STATUS:
                return "Read Node Identity Status for " + ((NetworkKey) params[0]).getName();
            case READ_HEARTBEAT_PUBLICATION:
                return "Read Heartbeat Publication";
            case SET_HEARTBEAT_PUBLICATION:
                return "Set Heartbeat Publication";
            case READ_HEARTBEAT_SUBSCRIPTION:
                return "Read Heartbeat Subscription";
            case SET_HEARTBEAT_SUBSCRIPTION:
                return "Set Heartbeat Subscription";
            case SEND_NETWORK_KEY:
                return "Add Network Key: " + ((NetworkKey) params[0]).getName();
            case SEND_APPLICATION_KEY:
                return "Add Application Key (" + ((ApplicationKey) params[1]).getName() + ")";
            case BIND:
                return "Bind AppKey Index " + params[2] + " to Model 0x" + String.format("%04X", (int) params[1]) + " (" + params[3] + ")";
            case SUBSCRIBE:
                return "Subscribe Model ID 0x" + String.format("%04X", (int) params[2]) + " (" + params[3] + ")" + " to Group Address 0x" + String.format("%04X", (int) params[1]);
            case SET_PUBLICATION:
                return "Set Publication for Model " + params[1];
            default:
                return "Unknown Task";
        }
    }


    private MeshMessage generateMessage(TaskType type, Object[] params) {
        switch (type) {
            case GET_COMPOSITION_DATA:
                return new ConfigCompositionDataGet();
            case GET_DEFAULT_TTL:
                return new ConfigDefaultTtlGet();
            case SET_DEFAULT_TTL:
                return new ConfigDefaultTtlSet((byte) params[0]);
            case READ_RELAY_STATUS:
                return new ConfigRelayGet();
            case READ_NETWORK_TRANSIT_STATUS:
                return new ConfigNetworkTransmitGet();
            case READ_BEACON_STATUS:
                return new ConfigBeaconGet();
            case SET_BEACON:
                return new ConfigBeaconSet((boolean) params[0]);
            case READ_GATT_PROXY_STATUS:
                return new ConfigGattProxyGet();
            case READ_FRIEND_STATUS:
                return new ConfigFriendGet();
            case SET_FRIEND:
                return new ConfigFriendSet((boolean) params[0]);
            case READ_NODE_IDENTITY_STATUS:
                return new ConfigNodeIdentityGet((NetworkKey) params[0]);
            case READ_HEARTBEAT_PUBLICATION:
                return new ConfigHeartbeatPublicationGet();
            case SET_HEARTBEAT_PUBLICATION:
                return new ConfigHeartbeatPublicationSet();
            case READ_HEARTBEAT_SUBSCRIPTION:
                return new ConfigHeartbeatSubscriptionGet();
            case SET_HEARTBEAT_SUBSCRIPTION:
                return new ConfigHeartbeatSubscriptionSet();
            case SEND_NETWORK_KEY:
                return new ConfigNetKeyAdd((NetworkKey) params[0]);
            case SEND_APPLICATION_KEY:
                return new ConfigAppKeyAdd((NetworkKey) params[0], (ApplicationKey) params[1]);
            case BIND:
                // param 1 - element address, param 2 - modelId, param 3- appKeyIndex
                return new ConfigModelAppBind((int) params[0], (int) params[1], (int) params[2]);
            case SUBSCRIBE:
                // param 1 - element address, param 2 - group address, param 3- modelId
                return new ConfigModelSubscriptionAdd((int) params[0], (int) params[1], (int) params[2]);
            case SET_PUBLICATION:
                return ((PublicationSettingsHelper) params[0]).createMessage();
            default:
                throw new IllegalArgumentException("Invalid MeshTask");
        }
    }

    public enum TaskType {
        GET_COMPOSITION_DATA,
        GET_DEFAULT_TTL,
        SET_DEFAULT_TTL,
        READ_RELAY_STATUS,
        DISABLE_RELAY_FEATURE,
        READ_NETWORK_TRANSIT_STATUS,
        READ_BEACON_STATUS,
        SET_BEACON,
        READ_GATT_PROXY_STATUS,
        SET_GATT_PROXY,
        READ_FRIEND_STATUS,
        SET_FRIEND,
        READ_NODE_IDENTITY_STATUS,
        READ_HEARTBEAT_PUBLICATION,
        SET_HEARTBEAT_PUBLICATION,
        READ_HEARTBEAT_SUBSCRIPTION,
        SET_HEARTBEAT_SUBSCRIPTION,
        SEND_NETWORK_KEY,
        SEND_APPLICATION_KEY,
        BIND,
        SUBSCRIBE,
        SET_PUBLICATION

    }

}

