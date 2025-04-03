package com.ti.simplelinkconnect.mesh;

import android.bluetooth.BluetoothDevice;

public class ExtendedConnectedDevice {
    private final BluetoothDevice device;
    private int unicastAddress;

    public ExtendedConnectedDevice(final BluetoothDevice device, final int unicastAddress) {
        this.unicastAddress = unicastAddress;
        this.device = device;
    }

    public BluetoothDevice getDevice() {
        return device;
    }

    public String getAddress() {
        return device.getAddress();
    }
    public int getUnicastAddress() {
        return unicastAddress;
    }

}
