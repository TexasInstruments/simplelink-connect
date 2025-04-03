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

import static no.nordicsemi.android.mesh.transport.PublicationSettings.parseRetransmitIntervalSteps;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import java.util.List;
import java.util.UUID;

import javax.inject.Inject;

import no.nordicsemi.android.mesh.transport.ConfigModelPublicationSet;
import no.nordicsemi.android.mesh.transport.ConfigModelPublicationVirtualAddressSet;
import no.nordicsemi.android.mesh.transport.Element;
import no.nordicsemi.android.mesh.transport.MeshMessage;
import no.nordicsemi.android.mesh.transport.MeshModel;
import no.nordicsemi.android.mesh.utils.AddressType;
import no.nordicsemi.android.mesh.utils.MeshAddress;
import no.nordicsemi.android.mesh.utils.MeshParserUtils;


public class PublicationSettingsHelper {
    private static final int DEFAULT_PUB_RETRANSMIT_COUNT = 1;
    private static final int DEFAULT_PUB_RETRANSMIT_INTERVAL_STEPS = 1;
    private static final int DEFAULT_PUBLICATION_STEPS = 0;

    private UUID labelUUID;
    private int publishAddress;
    private int appKeyIndex;
    private int publishTtl = MeshParserUtils.USE_DEFAULT_TTL;
    private int publicationSteps = DEFAULT_PUBLICATION_STEPS;
    private int publicationResolution;
    private int retransmitCount = DEFAULT_PUB_RETRANSMIT_COUNT;
    private int retransmitIntervalSteps = DEFAULT_PUB_RETRANSMIT_INTERVAL_STEPS;
    private boolean friendshipCredentialsFlag;

    private int lastValue = 0;

    Element element;
    MeshModel model;

    public static final int RESOLUTION_100_MS = 0b00;
    public static final int RESOLUTION_1_S = 0b01;
    public static final int RESOLUTION_10_S = 0b10;
    public static final int RESOLUTION_10_M = 0b11;

    @Inject
    public PublicationSettingsHelper(Element selectedElement, MeshModel selectedModel) {
        element = selectedElement;
        model = selectedModel;

    }

    /**
     * Returns the label UUID
     */
    @Nullable
    public UUID getLabelUUID() {
        return labelUUID;
    }

    /**
     * Sets the Label UUID
     *
     * @param labelUUID Label UUID of the virtual address
     */
    public void setLabelUUID(@Nullable final UUID labelUUID) {
        this.labelUUID = labelUUID;
    }

    /**
     * Returns the publish address
     */
    public int getPublishAddress() {
        return publishAddress;
    }

    /**
     * Sets the publish address
     *
     * @param publishAddress The address to which the node shall publish
     */
    public void setPublishAddress(final int publishAddress) {
        this.publishAddress = publishAddress;
    }

    /**
     * Returns the app key Index
     */
    public int getAppKeyIndex() {
        return appKeyIndex;
    }

    /**
     * Sets the app key index
     */
    public void setAppKeyIndex(final int appKeyIndex) {
        this.appKeyIndex = appKeyIndex;
    }

    /**
     * Returns the friendship credential flag
     */
    public boolean getFriendshipCredentialsFlag() {
        return friendshipCredentialsFlag;
    }

    /**
     * Sets the friendship credential flag
     */
    public void setFriendshipCredentialsFlag(final boolean friendshipCredentialsFlag) {
        this.friendshipCredentialsFlag = friendshipCredentialsFlag;
    }

    /**
     * Returns the publication TTL
     */
    public int getPublishTtl() {
        return publishTtl;
    }

    /**
     * Sets the publication ttl.
     *
     * @param publishTtl Publication TTL
     */
    public void setPublishTtl(final int publishTtl) {
        this.publishTtl = publishTtl;
    }

    /**
     * Returns the publication steps.
     */
    public int getPublicationSteps() {
        return publicationSteps;
    }

    /**
     * Returns the publication resolution.
     */
    public int getPublicationResolution() {
        return publicationResolution;
    }

    /**
     * Returns the retransmit count.
     */
    public int getRetransmitCount() {
        return retransmitCount;
    }

    /**
     * Sets the retransmit count.
     *
     * @param retransmitCount Retransmit count for publication
     */
    public void setRetransmitCount(final int retransmitCount) {
        this.retransmitCount = retransmitCount;
    }

    /**
     * Sets the retransmit interval steps based on the retransmit interval.
     *
     * @param retransmitInterval Retransmit Interval
     */
    public void setRetransmitIntervalSteps(final int retransmitInterval) {
        this.retransmitIntervalSteps = parseRetransmitIntervalSteps(retransmitInterval);
    }

    /**
     * Calculates the publication period.
     */
    public int getPublishPeriod() {
        return no.nordicsemi.android.mesh.transport.PublicationSettings.getPublishPeriod(publicationResolution, publicationSteps);
    }

    /**
     * Returns the retransmission Interval based on the interval steps
     */
    public int getRetransmissionInterval() {
        return no.nordicsemi.android.mesh.transport.PublicationSettings.getRetransmissionInterval(retransmitIntervalSteps);
    }

    /**
     * Initialises the publication settings properties int he view model based on the publication settings.
     *
     * @param publicationSettings Publication settings.
     * @param boundAppKeyIndexes  Bound application key indexes.
     */
    public void setPublicationValues(@Nullable no.nordicsemi.android.mesh.transport.PublicationSettings publicationSettings,
                                     @NonNull List<Integer> boundAppKeyIndexes) {
        if (publicationSettings != null) {
            publishAddress = publicationSettings.getPublishAddress();
            labelUUID = publicationSettings.getLabelUUID();

            friendshipCredentialsFlag = publicationSettings.getCredentialFlag();
            publishTtl = publicationSettings.getPublishTtl();

            publicationSteps = publicationSettings.getPublicationSteps();
            publicationResolution = publicationSettings.getPublicationResolution();

            retransmitCount = publicationSettings.getPublishRetransmitCount();
            retransmitIntervalSteps = publicationSettings.getPublishRetransmitIntervalSteps();

            //Default app key index to the 0th key in the list of bound app keys
            if (!boundAppKeyIndexes.isEmpty()) {
                appKeyIndex = publicationSettings.getAppKeyIndex();
            }
        }
    }

    /**
     * Returns the String resource to be used based on the publishPeriodInterval and publicPeriodResolution
     *
     * @param publishPeriodInterval  Publication interval value
     * @param publicPeriodResolution Publication resolution value
     */
    public void setPublicationPeriodResolutionResource(int publishPeriodInterval, String publicPeriodResolution) {
        switch (publicPeriodResolution) {
            case "10 minutes":
                publicationResolution = RESOLUTION_10_M;
                break;
            case "10 seconds":
                publicationResolution = RESOLUTION_10_S;
                break;
            case "1 second":
                publicationResolution = RESOLUTION_1_S;
                break;
            case "100 milliseconds":
                publicationResolution = RESOLUTION_100_MS;
            default:
                publicationResolution = RESOLUTION_100_MS;
        }
        publicationSteps = publishPeriodInterval;
    }

    /**
     * Creates the ConfigModelPublicationSet message depending on the address type
     */
    public MeshMessage createMessage() {
        if (element != null && model != null) {
            final AddressType type = MeshAddress.getAddressType(publishAddress);
            if (type != null && type != AddressType.VIRTUAL_ADDRESS) {
                return new ConfigModelPublicationSet(element.getElementAddress(),
                        publishAddress,
                        appKeyIndex,
                        friendshipCredentialsFlag,
                        publishTtl,
                        publicationSteps,
                        publicationResolution,
                        retransmitCount,
                        retransmitIntervalSteps,
                        model.getModelId());
            }
            else {
                return new ConfigModelPublicationVirtualAddressSet(element.getElementAddress(),
                        labelUUID,
                        appKeyIndex,
                        friendshipCredentialsFlag,
                        publishTtl,
                        publicationSteps,
                        publicationResolution,
                        retransmitCount,
                        retransmitIntervalSteps,
                        model.getModelId());
            }
        }
        return null;
    }
}
