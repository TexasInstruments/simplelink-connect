import { useCallback } from 'react';
import type { PeripheralInfo } from 'react-native-ble-manager';
import { hasSpotflowService } from '@spotflow/react-native-ble-gateway-ble-manager';
import { useSpotflow } from '../context/SpotflowContext';

/** Capture the current connection before discovery. */
export function useSpotflowDiscovery(peripheralId: string) {
  const { controller, supported } = useSpotflow();
  return useCallback((id: string) => {
    const report = supported && id === peripheralId ? controller.beginDiscovery(id) : undefined;
    return (info: PeripheralInfo) => {
      if (report) report(hasSpotflowService(info));
    };
  }, [controller, supported, peripheralId]);
}
