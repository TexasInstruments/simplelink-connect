/*
 * Copyright (c) 2018, Nordic Semiconductor
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the
 * documentation and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this
 * software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE
 * USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

package com.ti.simplelinkconnect.mesh;

import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.STATE_CHANGES;
import static com.ti.simplelinkconnect.mesh.MeshModuleEvents.UPDATE_PROVISIONING_PROGRESS;

import android.util.Log;

import androidx.lifecycle.LiveData;

import com.ti.connectivity.simplelinkconnect.MeshModule;

import java.util.ArrayList;

public class ProvisioningStatusLiveData extends LiveData<ProvisioningStatusLiveData> {

    private final ArrayList<ProvisionerProgress> mProvisioningProgress = new ArrayList<>();
    private MeshModule meshModule;

    public ProvisioningStatusLiveData(MeshModule meshModule) {
        this.meshModule = meshModule;
    }

    public void clear() {
        mProvisioningProgress.clear();
        postValue(this);
    }

    public ArrayList<ProvisionerProgress> getStateList() {
        return mProvisioningProgress;
    }


    public ProvisionerProgress getProvisionerProgress() {
        if (mProvisioningProgress.size() == 0)
            return null;
        return mProvisioningProgress.get(mProvisioningProgress.size() - 1);
    }

    void onMeshNodeStateUpdated(final ProvisionerStates state) {
        ProvisionerProgress provisioningProgress = null;
        switch (state) {
            case PROVISIONING_INVITE:
                provisioningProgress = new ProvisionerProgress(state, "Sending provisioning invite...");
                mProvisioningProgress.add(provisioningProgress);
//                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.05");

                break;
            case PROVISIONING_CAPABILITIES:
                provisioningProgress = new ProvisionerProgress(state, "Provisioning capabilities received...");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.1");
                mProvisioningProgress.add(provisioningProgress);
                break;
            case PROVISIONING_START:
                provisioningProgress = new ProvisionerProgress(state, "Sending provisioning start...");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.15");
                meshModule.sendEvent(STATE_CHANGES, provisioningProgress.getMessage());
                mProvisioningProgress.add(provisioningProgress);
                break;
            case PROVISIONING_PUBLIC_KEY_SENT:
                provisioningProgress = new ProvisionerProgress(state, "Sending provisioning public key...");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.20");
                meshModule.sendEvent(STATE_CHANGES, provisioningProgress.getMessage());
                mProvisioningProgress.add(provisioningProgress);
                break;
            case PROVISIONING_PUBLIC_KEY_RECEIVED:
                provisioningProgress = new ProvisionerProgress(state, "Provisioning public key received...");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.25");
                meshModule.sendEvent(STATE_CHANGES, provisioningProgress.getMessage());
                mProvisioningProgress.add(provisioningProgress);
                break;
            case PROVISIONING_AUTHENTICATION_STATIC_OOB_WAITING:
            case PROVISIONING_AUTHENTICATION_OUTPUT_OOB_WAITING:
            case PROVISIONING_AUTHENTICATION_INPUT_OOB_WAITING:
                provisioningProgress = new ProvisionerProgress(state, "Waiting for user authentication input...");

                mProvisioningProgress.add(provisioningProgress);
                break;
            case PROVISIONING_AUTHENTICATION_INPUT_ENTERED:
                provisioningProgress = new ProvisionerProgress(state, "OOB authentication entered...");

                mProvisioningProgress.add(provisioningProgress);
                break;
            case PROVISIONING_INPUT_COMPLETE:
                provisioningProgress = new ProvisionerProgress(state, "Provisioning input complete received...");
//                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.40");

                mProvisioningProgress.add(provisioningProgress);
                break;
            case PROVISIONING_CONFIRMATION_SENT:
                provisioningProgress = new ProvisionerProgress(state, "Sending provisioning confirmation...");
//                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.30");

                mProvisioningProgress.add(provisioningProgress);
                break;
            case PROVISIONING_CONFIRMATION_RECEIVED:
                provisioningProgress = new ProvisionerProgress(state, "Provisioning confirmation received...");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.35");
                meshModule.sendEvent(STATE_CHANGES, provisioningProgress.getMessage());
                mProvisioningProgress.add(provisioningProgress);
                break;
            case PROVISIONING_RANDOM_SENT:
                provisioningProgress = new ProvisionerProgress(state, "Sending provisioning random...");
                meshModule.sendEvent(STATE_CHANGES, provisioningProgress.getMessage());
                mProvisioningProgress.add(provisioningProgress);
                break;
            case PROVISIONING_RANDOM_RECEIVED:
                provisioningProgress = new ProvisionerProgress(state, "Provisioning random received...");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.55");
                meshModule.sendEvent(STATE_CHANGES, provisioningProgress.getMessage());
                mProvisioningProgress.add(provisioningProgress);
                break;
            case PROVISIONING_DATA_SENT:
                provisioningProgress = new ProvisionerProgress(state, "Sending provisioning data...");

                mProvisioningProgress.add(provisioningProgress);
                break;
            case PROVISIONING_COMPLETE:
                provisioningProgress = new ProvisionerProgress(state, "Provisioning complete received...");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.60");
                meshModule.sendEvent(STATE_CHANGES, provisioningProgress.getMessage());

                mProvisioningProgress.add(provisioningProgress);
                break;
            case PROVISIONING_FAILED:
                provisioningProgress = new ProvisionerProgress(state, "Provisioning failed received...");
//                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.0");

                mProvisioningProgress.add(provisioningProgress);
            default:
                break;
            case COMPOSITION_DATA_GET_SENT:
                provisioningProgress = new ProvisionerProgress(state, "Sending composition data get...");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.65");
                meshModule.sendEvent(STATE_CHANGES, provisioningProgress.getMessage());
                mProvisioningProgress.add(provisioningProgress);
                break;
            case COMPOSITION_DATA_STATUS_RECEIVED:
                provisioningProgress = new ProvisionerProgress(state, "Composition data status received...");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.75");
                meshModule.sendEvent(STATE_CHANGES, provisioningProgress.getMessage());

                mProvisioningProgress.add(provisioningProgress);
                break;
            case SENDING_DEFAULT_TTL_GET:
                provisioningProgress = new ProvisionerProgress(state, "Sending default TLL get...");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.80");
                meshModule.sendEvent(STATE_CHANGES, provisioningProgress.getMessage());

                mProvisioningProgress.add(provisioningProgress);
                break;
            case DEFAULT_TTL_STATUS_RECEIVED:
                provisioningProgress = new ProvisionerProgress(state, "Default TTL status received...");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.85");
                meshModule.sendEvent(STATE_CHANGES, provisioningProgress.getMessage());

                mProvisioningProgress.add(provisioningProgress);
                break;
            case SENDING_APP_KEY_ADD:
                provisioningProgress = new ProvisionerProgress(state, "Sending app key add...");

                mProvisioningProgress.add(provisioningProgress);
                break;
            case APP_KEY_STATUS_RECEIVED:
                provisioningProgress = new ProvisionerProgress(state, "App key status received...");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.98");
                meshModule.sendEvent(STATE_CHANGES, provisioningProgress.getMessage());

                mProvisioningProgress.add(provisioningProgress);
                break;
            case SENDING_NETWORK_TRANSMIT_SET:
                provisioningProgress = new ProvisionerProgress(state, "Sending network transmit set...");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.90");
                meshModule.sendEvent(STATE_CHANGES, provisioningProgress.getMessage());

                mProvisioningProgress.add(provisioningProgress);
                break;
            case NETWORK_TRANSMIT_STATUS_RECEIVED:
                provisioningProgress = new ProvisionerProgress(state, "Network transmit status received...");
                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.95");
                meshModule.sendEvent(STATE_CHANGES, provisioningProgress.getMessage());

                mProvisioningProgress.add(provisioningProgress);
                break;
            case SENDING_BLOCK_ACKNOWLEDGEMENT:
                provisioningProgress = new ProvisionerProgress(state, "Sending block acknowledgements");
//                meshModule.sendEvent(UPDATE_PROVISIONING_PROGRESS, "0.70");

                mProvisioningProgress.add(provisioningProgress);
                break;
            case BLOCK_ACKNOWLEDGEMENT_RECEIVED:
                provisioningProgress = new ProvisionerProgress(state, "Receiving block acknowledgements");
                mProvisioningProgress.add(provisioningProgress);
                break;
            case PROVISIONER_UNASSIGNED:
                provisioningProgress = new ProvisionerProgress(state, "Provisioner unassigned...");
                mProvisioningProgress.add(provisioningProgress);
                break;

        }
        Log.i("mesh", "^^^^^^^^^^^^^^" + provisioningProgress.getMessage());
        postValue(this);
    }
}
