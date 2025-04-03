package com.ti.simplelinkconnect.mesh;

import android.bluetooth.BluetoothDevice;
import android.os.Parcel;
import android.os.Parcelable;

import no.nordicsemi.android.mesh.MeshBeacon;
import no.nordicsemi.android.support.v18.scanner.ScanRecord;
import no.nordicsemi.android.support.v18.scanner.ScanResult;

public class ExtendedBluetoothDevice implements Parcelable {
    private final BluetoothDevice device;
    private final ScanResult scanResult;
    private String name = "Unknown";
    private int rssi;
    private MeshBeacon beacon;

    public ExtendedBluetoothDevice(final ScanResult scanResult, final MeshBeacon beacon) {
        this.scanResult = scanResult;
        this.device = scanResult.getDevice();
        final ScanRecord scanRecord = scanResult.getScanRecord();
        if(scanRecord != null) {
            this.name = scanRecord.getDeviceName();
        }
        this.rssi = scanResult.getRssi();
        this.beacon = beacon;
    }

    public ExtendedBluetoothDevice(final ScanResult scanResult) {
        this.scanResult = scanResult;
        this.device = scanResult.getDevice();
        final ScanRecord scanRecord = scanResult.getScanRecord();
        if(scanRecord != null) {
            this.name = scanRecord.getDeviceName();
        }
        this.rssi = scanResult.getRssi();
    }

    protected ExtendedBluetoothDevice(Parcel in) {
        device = in.readParcelable(BluetoothDevice.class.getClassLoader());
        scanResult = in.readParcelable(ScanResult.class.getClassLoader());
        name = in.readString();
        rssi = in.readInt();
        beacon = in.readParcelable(MeshBeacon.class.getClassLoader());
    }

    @Override
    public void writeToParcel(Parcel dest, int flags) {
        dest.writeParcelable(device, flags);
        dest.writeParcelable(scanResult, flags);
        dest.writeString(name);
        dest.writeInt(rssi);
        dest.writeParcelable(beacon, flags);
    }

    @Override
    public int describeContents() {
        return 0;
    }

    public static final Creator<ExtendedBluetoothDevice> CREATOR = new Creator<ExtendedBluetoothDevice>() {
        @Override
        public ExtendedBluetoothDevice createFromParcel(Parcel in) {
            return new ExtendedBluetoothDevice(in);
        }

        @Override
        public ExtendedBluetoothDevice[] newArray(int size) {
            return new ExtendedBluetoothDevice[size];
        }
    };

    public BluetoothDevice getDevice() {
        return device;
    }

    public MeshBeacon getBeacon() {
        return beacon;
    }

    public String getAddress() {
        return device.getAddress();
    }

    public String getName() {
        return name;
    }

    public void setName(final String name) {
        this.name = name;
    }

    public int getRssi() {
        return rssi;
    }

    public void setRssi(final int rssi) {
        this.rssi = rssi;
    }

    public ScanResult getScanResult() {
        return scanResult;
    }

    // Parcelable implementation

    public boolean matches(final ScanResult scanResult) {
        return device.getAddress().equals(scanResult.getDevice().getAddress());
    }

    @Override
    public boolean equals(final Object o) {
        if (o instanceof ExtendedBluetoothDevice) {
            final ExtendedBluetoothDevice that = (ExtendedBluetoothDevice) o;
            return device.getAddress().equals(that.device.getAddress());
        }
        return super.equals(o);
    }
}
