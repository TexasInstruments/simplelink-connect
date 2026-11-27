import React from 'react';
import { AppState } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useIsFocused } from '@react-navigation/native';
import BleManager from 'react-native-ble-manager';
import { SpotflowRelayStatus } from '../spotflow/SpotflowRelayStatus';
import { useSpotflow, useSpotflowStatus } from '../context/SpotflowContext';

jest.mock('react-native', () => ({
  AppState: { currentState: 'active' },
  StyleSheet: { create: (styles: unknown) => styles },
  View: 'View',
  useWindowDimensions: () => ({ fontScale: 1 }),
}));
jest.mock('@react-navigation/native', () => ({ useIsFocused: jest.fn() }));
jest.mock('../components/Themed', () => ({ Text: 'Text', TouchableOpacity: 'TouchableOpacity' }));
jest.mock('../constants/Colors', () => ({ lightGray: '#eee', gray: '#888', blue: '#00f' }));
jest.mock('react-native-ble-manager', () => ({ createBond: jest.fn() }));
jest.mock('../context/SpotflowContext', () => ({ useSpotflow: jest.fn(), useSpotflowStatus: jest.fn() }));
jest.mock('../spotflow/RelayController', () => ({ isRetryableStatus: () => false }));

const peripheralId = 'AA:BB:CC:DD:EE:FF';
const bonded = jest.fn();
const createBond = jest.mocked(BleManager.createBond);
let view: ReactTestRenderer;

beforeAll(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); });
beforeEach(() => {
  AppState.currentState = 'active';
  jest.mocked(useIsFocused).mockReturnValue(true);
  jest.mocked(useSpotflow).mockReturnValue({ controller: { bonded } } as unknown as ReturnType<typeof useSpotflow>);
});
afterEach(async () => {
  await act(async () => { view?.unmount(); });
  jest.resetAllMocks();
});

async function mount() {
  await act(async () => { view = create(React.createElement(SpotflowRelayStatus, { peripheralId })); });
}

const button = () => view.root.findByProps({ accessibilityRole: 'button' });
const rerender = () => act(async () => { view.update(React.createElement(SpotflowRelayStatus, { peripheralId })); });

test('automatically starts one bond request when the relay needs pairing', async () => {
  let finish!: () => void;
  createBond.mockReturnValueOnce(new Promise(resolve => { finish = () => resolve(); }));
  jest.mocked(useSpotflowStatus).mockReturnValue('starting');
  await mount();
  expect(createBond).not.toHaveBeenCalled();

  jest.mocked(useSpotflowStatus).mockReturnValue('pairing');
  await rerender();
  expect(createBond).toHaveBeenCalledTimes(1);
  expect(createBond).toHaveBeenCalledWith(peripheralId);
  expect(button().props.disabled).toBe(true);

  await act(async () => { button().props.onPress(); });
  expect(createBond).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); });
  expect(bonded).toHaveBeenCalledWith(peripheralId);
  expect(button().props.disabled).toBe(false);
});

test('does not request pairing unless the device screen is focused and the app is active', async () => {
  jest.mocked(useSpotflowStatus).mockReturnValue('pairing');
  jest.mocked(useIsFocused).mockReturnValue(false);
  await mount();
  expect(createBond).not.toHaveBeenCalled();

  AppState.currentState = 'background';
  jest.mocked(useIsFocused).mockReturnValue(true);
  await rerender();
  expect(createBond).not.toHaveBeenCalled();
});

test('does not automatically retry after cancellation or reconnect, but lets the user retry', async () => {
  createBond.mockRejectedValueOnce(new Error('Pairing cancelled'));
  jest.mocked(useSpotflowStatus).mockReturnValue('pairing');
  await mount();
  expect(JSON.stringify(view.toJSON())).toContain('Pairing didn’t complete.');
  expect(bonded).not.toHaveBeenCalled();
  expect(button().props.disabled).toBe(false);

  jest.mocked(useSpotflowStatus).mockReturnValue(undefined);
  await rerender();
  jest.mocked(useSpotflowStatus).mockReturnValue('pairing');
  await rerender();
  expect(createBond).toHaveBeenCalledTimes(1);

  createBond.mockResolvedValueOnce(undefined);
  await act(async () => { button().props.onPress(); });
  expect(createBond).toHaveBeenCalledTimes(2);
  expect(bonded).toHaveBeenCalledWith(peripheralId);
});

test('prompts again on a new visit if pairing is still required', async () => {
  createBond.mockRejectedValue(new Error('Pairing cancelled'));
  jest.mocked(useSpotflowStatus).mockReturnValue('pairing');
  await mount();
  expect(createBond).toHaveBeenCalledTimes(1);

  // The bottom tab keeps the device screen mounted when the user goes back to the scanner.
  jest.mocked(useIsFocused).mockReturnValue(false);
  await rerender();
  expect(createBond).toHaveBeenCalledTimes(1);

  jest.mocked(useIsFocused).mockReturnValue(true);
  await rerender();
  expect(createBond).toHaveBeenCalledTimes(2);
});
