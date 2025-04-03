package com.ti.simplelinkconnect.mesh;

import android.text.TextUtils;
import android.util.Log;

import java.util.List;

import androidx.annotation.NonNull;
import androidx.lifecycle.LiveData;
import no.nordicsemi.android.mesh.ApplicationKey;
import no.nordicsemi.android.mesh.MeshNetwork;
import no.nordicsemi.android.mesh.NetworkKey;
import no.nordicsemi.android.mesh.Provisioner;
import no.nordicsemi.android.mesh.Scene;

/**
 * LiveData class for storing {@link MeshNetwork}
 */
public class MeshNetworkLiveData extends LiveData<MeshNetworkLiveData> {

    private MeshNetwork meshNetwork;
    private ApplicationKey selectedAppKey;
    private String nodeName;

    /**
     * Loads the mesh network information in to live data
     *
     * @param meshNetwork provisioning settings
     */
    void loadNetworkInformation(@NonNull final MeshNetwork meshNetwork) {
        this.meshNetwork = meshNetwork;
        postValue(this);
    }

    public MeshNetwork getMeshNetwork() {
        return meshNetwork;
    }

    /**
     * Refreshes the mesh network information
     *
     * @param meshNetwork provisioning settings
     */
    void refresh(@NonNull final MeshNetwork meshNetwork) {
        this.meshNetwork = meshNetwork;
        postValue(this);
    }

    public List<NetworkKey> getNetworkKeys() {
        return meshNetwork.getNetKeys();
    }

    /**
     * Returns the app keys list
     */
    public List<ApplicationKey> getAppKeys() {
        return meshNetwork.getAppKeys();
    }

    /**
     * Returns the list of {@link Provisioner}
     */
    public List<Provisioner> getProvisioners() {
        return meshNetwork.getProvisioners();
    }

    public Provisioner getProvisioner() {
        return meshNetwork.getSelectedProvisioner();
    }

    /**
     * Return the selected app key to be added during the provisioning process.
     *
     * @return app key
     */
    public ApplicationKey getSelectedAppKey() {
        if (selectedAppKey == null && !meshNetwork.getAppKeys().isEmpty())
            selectedAppKey = meshNetwork.getAppKeys().get(0);
        return selectedAppKey;
    }

    /**
     * Set the selected app key to be added during the provisioning process.
     */
    public void setSelectedAppKey(final ApplicationKey appKey) {
        this.selectedAppKey = appKey;
        postValue(this);
    }

    public void resetSelectedAppKey() {
        this.selectedAppKey = null;
    }

    /**
     * Returns the network name
     */
    public String getNetworkName() {
        return meshNetwork.getMeshName();
    }

    /**
     * Set the network name of the mesh network
     *
     * @param name network name
     */
    public void setNetworkName(final String name) {
        meshNetwork.setMeshName(name);
        postValue(this);
    }

    /**
     * Sets the node name
     *
     * @param nodeName node name
     */
    public void setNodeName(@NonNull final String nodeName) {
        if (!TextUtils.isEmpty(nodeName)) {
            this.nodeName = nodeName;
            postValue(this);
        }
    }

    /**
     * Returns the node name
     */
    public String getNodeName() {
        return nodeName;
    }

    public List<Scene> getScenes(){
        return meshNetwork.getScenes();
    }
}
