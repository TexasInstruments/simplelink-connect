import { useCallback, useSyncExternalStore } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import BleManager from 'react-native-ble-manager';
import { GattProfile } from '@spotflow/react-native-ble-gateway';
import { useSpotflow } from '../context/SpotflowContext';

const noSubscription = () => () => {};

export function useSpotflowInspector(id: string, service: string, characteristic: string, notificationsOn: boolean) {
  const { controller, supported } = useSpotflow();
  const serviceUuid = service.toLowerCase();
  const characteristicUuid = characteristic.toLowerCase();
  const isTx = serviceUuid === GattProfile.SERVICE && characteristicUuid === GattProfile.TX_STREAM;
  const isRx = serviceUuid === GattProfile.SERVICE && characteristicUuid === GattProfile.RX_STREAM;
  const isStream = supported && (isTx || isRx);
  const isManaged = useSyncExternalStore(isStream ? controller.subscribe : noSubscription,
    () => isStream && controller.ownsStream(id), () => false);

  const viewNotifications = !isStream || (notificationsOn && (!isManaged || isTx));
  const manualNotifications = isStream && viewNotifications && !isManaged;
  useFocusEffect(useCallback(() => {
    if (!manualNotifications) return;
    return controller.inspectStream(id,
      () => { void BleManager.startNotification(id, service, characteristic).catch(() => {}); },
      () => { void BleManager.stopNotification(id, service, characteristic).catch(() => {}); });
  }, [manualNotifications, controller, id, service, characteristic]));

  const matchesNotification = useCallback((peripheral: string, eventService: string, eventCharacteristic: string) => {
    if (supported && (serviceUuid === GattProfile.SERVICE || eventService.toLowerCase() === GattProfile.SERVICE)) {
      // BLE Manager broadcasts notifications to all listeners. Spotflow payloads belong to this row only.
      return peripheral.toUpperCase() === id.toUpperCase()
        && eventService.toLowerCase() === serviceUuid && eventCharacteristic.toLowerCase() === characteristicUuid;
    }
    // Preserve short versus full UUID matching for SimplePeripheral and Persistent App.
    return eventCharacteristic.toLowerCase().includes(characteristicUuid);
  }, [supported, id, serviceUuid, characteristicUuid]);

  const isWriteBlocked = useCallback(() => isRx && supported && controller.ownsStream(id), [isRx, supported, controller, id]);

  return {
    isStream, isRx, isManaged, viewNotifications, isWriteBlocked,
    showNotificationControls: !isManaged || isTx,
    matchesNotification,
  };
}
