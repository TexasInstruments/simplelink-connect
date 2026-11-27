import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SpotflowProvider, useSpotflow } from '../context/SpotflowContext';

jest.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  Platform: { OS: 'android' },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('@spotflow/react-native-ble-gateway', () => ({ createGateway: jest.fn() }));
jest.mock('@spotflow/react-native-ble-gateway-ble-manager', () => ({}));
jest.mock('react-native-ble-manager', () => ({
  onDisconnectPeripheral: () => ({ remove() {} }),
  onPeripheralDidBond: () => ({ remove() {} }),
}));

const getItem = jest.mocked(AsyncStorage.getItem);
const setItem = jest.mocked(AsyncStorage.setItem);
const KEY = '@spotflow/enabled';
let view: ReactTestRenderer;
let settings: ReturnType<typeof useSpotflow>;

function ReadSettings() {
  settings = useSpotflow();
  return null;
}

async function mount(saved = false) {
  getItem.mockResolvedValueOnce(String(saved));
  await act(async () => {
    view = create(React.createElement(SpotflowProvider, null, React.createElement(ReadSettings)));
  });
  expect(settings.loading).toBe(false);
  return jest.spyOn(settings.controller, 'setRunning');
}

function deferredWrite() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((ok, fail) => { resolve = ok; reject = fail; });
  setItem.mockReturnValueOnce(promise);
  return { resolve, reject };
}

beforeAll(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); });
afterEach(async () => {
  await act(async () => { view?.unmount(); });
  jest.restoreAllMocks();
  jest.resetAllMocks();
});

test('shows opt-in immediately and starts relaying only when the write succeeds', async () => {
  const setRunning = await mount();
  const write = deferredWrite();
  await act(async () => { void settings.setEnabled(true); });
  expect(settings.enabled).toBe(true);
  expect(settings.loading).toBe(false);
  expect(setItem).toHaveBeenCalledWith(KEY, 'true');
  expect(setRunning).not.toHaveBeenCalled();

  await act(async () => { write.resolve(); });
  expect(settings.enabled).toBe(true);
  expect(setRunning).toHaveBeenLastCalledWith(true);
});

test('reverts the switch and shows an error on a failed write', async () => {
  const setRunning = await mount();
  const write = deferredWrite();
  await act(async () => { void settings.setEnabled(true); });
  expect(settings.enabled).toBe(true);

  await act(async () => { write.reject(new Error('Write failed')); });
  expect(settings.enabled).toBe(false);
  expect(settings.storageError).toBe('enable');
  expect(setRunning).not.toHaveBeenCalledWith(true);
});

test('keeps the relay off after a failed opt-out and can retry saving it', async () => {
  const setRunning = await mount(true);
  const write = deferredWrite();
  await act(async () => { void settings.setEnabled(false); });
  expect(setRunning).toHaveBeenLastCalledWith(false);

  await act(async () => { write.reject(new Error('Write failed')); });
  expect(settings.enabled).toBe(false);
  expect(settings.storageError).toBe('disable');
  expect(setRunning).not.toHaveBeenCalledWith(true);

  setItem.mockResolvedValueOnce(undefined);
  await act(async () => { await settings.setEnabled(false); });
  expect(setItem.mock.calls).toEqual([[KEY, 'false'], [KEY, 'false']]);
  expect(settings.storageError).toBeUndefined();
  expect(setRunning).not.toHaveBeenCalledWith(true);
});

test('a rapid opt-out updates immediately and a stale opt-in cannot start the relay', async () => {
  const setRunning = await mount();
  const firstWrite = deferredWrite();
  const secondWrite = deferredWrite();
  await act(async () => { void settings.setEnabled(true); });
  await act(async () => { void settings.setEnabled(false); });
  expect(settings.enabled).toBe(false);
  expect(setRunning).toHaveBeenLastCalledWith(false);
  expect(setItem).toHaveBeenCalledTimes(1);

  await act(async () => { firstWrite.resolve(); });
  expect(settings.enabled).toBe(false);
  expect(setItem).toHaveBeenNthCalledWith(2, KEY, 'false');
  expect(setRunning).not.toHaveBeenCalledWith(true);
  await act(async () => { secondWrite.resolve(); });
});
