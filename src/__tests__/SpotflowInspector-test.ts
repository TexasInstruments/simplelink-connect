import React from 'react';
import { Alert, Switch } from 'react-native';
import { Input } from '@rneui/themed';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import BleManager, { type BleManagerDidUpdateValueForCharacteristicEvent } from 'react-native-ble-manager';
import { GattProfile } from '@spotflow/react-native-ble-gateway';
import CharacteristicService from '../components/Characteristic/CharacteristicService';
import ServiceResponse from '../components/Characteristic/CharacteristicService/ServiceResponse';
import { useSpotflow } from '../context/SpotflowContext';
import { RelayController } from '../spotflow/RelayController';

jest.mock('react-native', () => ({
  View: 'View', Switch: () => null,
  Alert: { alert: jest.fn() },
  StyleSheet: { create: (styles: unknown) => styles },
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
  InteractionManager: { runAfterInteractions: (callback: () => void) => { callback(); return { cancel() {} }; } },
}));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.requireActual('react').useEffect }));
jest.mock('@rneui/themed', () => ({ Input: () => null }));
jest.mock('react-native-paper', () => ({ DefaultTheme: { colors: {} } }));
jest.mock('../components/Themed', () => ({ Text: 'Text', TouchableOpacity: 'TouchableOpacity' }));
jest.mock('../components/Characteristic/CharacteristicService/ServiceResponse', () => () => null);
jest.mock('../context/CharacteristicContext', () => ({ useCharacteristicContext: () => ({ characteristicData: [] }) }));
jest.mock('../context/SpotflowContext', () => ({ useSpotflow: jest.fn() }));
jest.mock('@spotflow/react-native-ble-gateway', () => ({
  GattProfile: {
    SERVICE: '26530001-81e5-4861-82ae-2c92e6887922',
    TX_STREAM: '26530005-81e5-4861-82ae-2c92e6887922',
    RX_STREAM: '26530006-81e5-4861-82ae-2c92e6887922',
  },
}));
jest.mock('react-native-ble-manager', () => ({
  onDidUpdateValueForCharacteristic: jest.fn(),
  startNotification: jest.fn(async () => {}),
  stopNotification: jest.fn(async () => {}),
  write: jest.fn(async () => {}),
  writeWithoutResponse: jest.fn(async () => {}),
}));

const peripheralId = 'AA:BB:CC:DD:EE:FF';
const { SERVICE, TX_STREAM, RX_STREAM } = GattProfile;
const event = { peripheral: peripheralId, service: SERVICE, characteristic: TX_STREAM, value: [0x0a, 0xbc] };
let listener: ((event: BleManagerDidUpdateValueForCharacteristicEvent) => void) | undefined;
let view: ReactTestRenderer | undefined;

beforeAll(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); });

beforeEach(() => {
  jest.mocked(BleManager.onDidUpdateValueForCharacteristic).mockImplementation(callback => {
    listener = callback;
    return { remove: () => { listener = undefined; } } as ReturnType<typeof BleManager.onDidUpdateValueForCharacteristic>;
  });
});

afterEach(async () => {
  await act(async () => { view?.unmount(); });
  view = undefined;
  jest.clearAllMocks();
});

async function mountCharacteristic(
  enabled: boolean,
  owner: string | undefined,
  characteristic: string,
  properties: Record<string, string>,
  serviceUuid = SERVICE,
) {
  const controller = new RelayController({
    createGateway: jest.fn(), isBonded: jest.fn(), requestMtu: jest.fn(), createLink: jest.fn(),
  });
  const ownsStream = jest.spyOn(controller, 'ownsStream').mockImplementation(id => id === owner);
  jest.mocked(useSpotflow).mockReturnValue({ supported: true, enabled, controller, loading: false, storageError: undefined, setEnabled: jest.fn() });
  await act(async () => {
    view = create(React.createElement(CharacteristicService, {
      peripheralId,
      serviceUuid,
      serviceName: 'Spotflow Observability',
      char: { service: serviceUuid, characteristic, properties },
      selectedFormat: 'Hex',
      setSelectedFormat: jest.fn(),
    }));
  });
  return ownsStream;
}

async function mountTx(enabled: boolean, owner?: string) {
  await mountCharacteristic(enabled, owner, TX_STREAM, { Notify: 'Notify' });
  return { toggle: () => view!.root.findByType(Switch).props.onChange() };
}

test('observes the gateway stream without changing its BLE subscription', async () => {
  const { toggle } = await mountTx(true, peripheralId);
  expect(listener).toBeUndefined();

  await act(async () => { toggle(); });
  await act(async () => {
    listener?.({ ...event, peripheral: '11:22:33:44:55:66', value: [0xff] });
    listener?.(event);
  });
  expect(view!.root.findByType(ServiceResponse).props.responseArray).toEqual([
    { data: '0abc', time: expect.any(String) },
  ]);

  await act(async () => { toggle(); });
  expect(listener).toBeUndefined();
  await act(async () => { toggle(); });
  await act(async () => { view!.unmount(); });
  view = undefined;

  expect(listener).toBeUndefined();
  expect(BleManager.startNotification).not.toHaveBeenCalled();
  expect(BleManager.stopNotification).not.toHaveBeenCalled();
});

test.each([
  [false, undefined],
  [true, undefined],
  [true, '11:22:33:44:55:66'],
] as const)('uses manual notification controls with enabled=%s and stream owner=%s', async (enabled, owner) => {
  const { toggle } = await mountTx(enabled, owner);
  await act(async () => { toggle(); });
  expect(BleManager.startNotification).toHaveBeenCalledWith(peripheralId, SERVICE, TX_STREAM);
  await act(async () => { toggle(); });
  expect(BleManager.stopNotification).toHaveBeenCalledWith(peripheralId, SERVICE, TX_STREAM);
});

const rxProperties = { WriteWithoutResponse: 'WriteWithoutResponse' };

test('manually writes to an unmanaged RX stream without response', async () => {
  await mountCharacteristic(false, undefined, RX_STREAM, rxProperties);
  await act(async () => {
    view!.root.findByType(Input).props.onSubmitEditing({ nativeEvent: { text: 'ab' } });
  });
  expect(BleManager.writeWithoutResponse).toHaveBeenCalledWith(peripheralId, SERVICE, RX_STREAM, [0xab], 1);
});

test.each([
  ['Write not permitted', 'Write not permitted'],
  [{ domain: 'CBATTErrorDomain', code: 3, message: 'Write not permitted' }, 'Write not permitted'],
  [{ code: 3 }, 'Could not write to the characteristic.'],
])('shows a string alert for write failures: %j', async (error, message) => {
  jest.mocked(BleManager.write).mockRejectedValueOnce(error);
  await mountCharacteristic(false, undefined, '2a06', { Write: 'Write' }, '1802');

  await act(async () => {
    view!.root.findByType(Input).props.onSubmitEditing({ nativeEvent: { text: '01' } });
  });

  expect(Alert.alert).toHaveBeenCalledWith('Write Failed', message);
});

test('hides manual writes to a managed RX stream', async () => {
  await mountCharacteristic(true, peripheralId, RX_STREAM, rxProperties);
  expect(view!.root.findAllByType(Input)).toHaveLength(0);
});

test('blocks a stale RX input submission after the relay takes ownership', async () => {
  const ownsStream = await mountCharacteristic(true, undefined, RX_STREAM, rxProperties);
  const submit = view!.root.findByType(Input).props.onSubmitEditing;
  ownsStream.mockReturnValue(true);

  await act(async () => { submit({ nativeEvent: { text: 'ab' } }); });
  expect(BleManager.writeWithoutResponse).not.toHaveBeenCalled();
});
