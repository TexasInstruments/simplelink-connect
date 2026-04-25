package com.ti.simplelinkconnect.cs;

public enum RangingTechnology {
    BLE_CS(1),
    BLE_RSSI(3),
    UWB(0),
    WIFI_NAN_RTT(2),
    WIFI_STA_RTT(4);

    private final int value;

    RangingTechnology(int value) {
        this.value = value;
    }

    public int getValue() {
        return value;
    }

    public static RangingTechnology from(int value) {
        for (RangingTechnology tech : values()) {
            if (tech.value == value) return tech;
        }
        return null;
    }
}

