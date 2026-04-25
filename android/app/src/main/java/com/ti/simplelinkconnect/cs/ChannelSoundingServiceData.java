package com.ti.simplelinkconnect.cs;
import com.ti.simplelinkconnect.UpdateRate;

import java.util.Collections;
import java.util.List;

public class ChannelSoundingServiceData {
    private final Profile profile = Profile.CHANNEL_SOUNDING;
    private final RangingSessionAction rangingSessionAction;
    private final UpdateRate updateRate;
    private final int interval;

    public ChannelSoundingServiceData() {
        this(null, UpdateRate.NORMAL, 1000);
    }

    public ChannelSoundingServiceData(RangingSessionAction rangingSessionAction, UpdateRate updateRate, int interval) {
        this.rangingSessionAction = rangingSessionAction;
        this.updateRate = updateRate;
        this.interval = interval;
    }

    public Profile getProfile() {
        return profile;
    }

    public RangingSessionAction getRangingSessionAction() {
        return rangingSessionAction;
    }

    public UpdateRate getUpdateRate() {
        return updateRate;
    }

    public int getInterval() {
        return interval;
    }
}
