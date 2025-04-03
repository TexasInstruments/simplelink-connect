package com.ti.simplelinkconnect.mesh;

import android.bluetooth.BluetoothDevice;
import android.content.Context;

import java.util.HashMap;
import java.util.Map;

public class BleMeshManagerProvider {
    private final Map<BluetoothDevice, BleMeshManager> bleMeshManagers = new HashMap<>();

    public BleMeshManager getOrCreateManager(BluetoothDevice device, Context context) {
        BleMeshManager manager = bleMeshManagers.get(device);
        if (manager == null) {
            manager = new BleMeshManager(context);
            bleMeshManagers.put(device, manager);
        }
        return manager;
    }

    public void disconnectDevice(BluetoothDevice device) {
        BleMeshManager manager = bleMeshManagers.get(device);
        if (manager != null) {
            manager.disconnect().done((d) -> {
                bleMeshManagers.remove(device);
                System.out.println("Disconnected from: " + device.getAddress());
            });
        }
    }

    public void disconnectAllDevices() {
        for (Map.Entry<BluetoothDevice, BleMeshManager> entry : bleMeshManagers.entrySet()) {
            entry.getValue().disconnect().enqueue();
        }
        bleMeshManagers.clear();
    }
}
