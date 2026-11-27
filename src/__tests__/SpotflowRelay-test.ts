import type { AttachmentEnd, AttachmentState, BleLink, DeviceError, SpotflowGateway } from '@spotflow/react-native-ble-gateway';
import { RelayController } from '../spotflow/RelayController';

const ID = 'AA:BB:CC:DD:EE:FF';
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

function fakeAttachment() {
  let state: AttachmentState = { type: 'starting' };
  let listener: ((next: AttachmentState) => void) | undefined;
  let finish!: (result: AttachmentEnd) => void;
  const ended = new Promise<AttachmentEnd>(resolve => { finish = resolve; });
  const update = (next: AttachmentState) => {
    state = next;
    listener?.(next);
    if (next.type === 'ended') finish(next.result);
  };
  return {
    address: ID,
    get state() { return state; },
    update, ended,
    detach: jest.fn(() => update({ type: 'ended', result: { reason: 'DETACHED' } })),
    onStateChange: (callback: typeof listener) => {
      listener = callback;
      return () => { listener = undefined; };
    },
  };
}

function setup() {
  let cloudConnected = false;
  let cloudError: DeviceError | null = null;
  const attach = jest.fn(async (_link: BleLink) => fakeAttachment());
  const shutdown = jest.fn();
  const gateway = {
    attach, shutdown,
    diagnosticsSnapshot: jest.fn(async () => ({
      devices: [{ address: ID, cloudConnected, cloudError }],
    })) as jest.Mock,
  };
  const deps = {
    createGateway: jest.fn(async () => ({
      ...gateway,
      // Keep the actual SDK session; only the bridge's attachment is faked.
      attach: attach as unknown as SpotflowGateway['attach'],
    })),
    isBonded: jest.fn(async () => true),
    requestMtu: jest.fn(async (_id: string, _mtu: number) => 247),
    createLink: jest.fn((address: string, mtu: number) => ({
      address, maxWritePayloadBytes: mtu - 3, setMtu: jest.fn(),
      read: jest.fn(), writeWithoutResponse: jest.fn(), onDisconnect: jest.fn(),
      enableNotifications: jest.fn(), disableNotifications: jest.fn(),
    })),
  };
  const relay = new RelayController(deps);
  return {
    relay, gateway, deps,
    setCloud(connected: boolean, error: DeviceError | null = null) {
      cloudConnected = connected;
      cloudError = error;
    },
  };
}

test('requires a discovered Spotflow service and runs only when enabled', async () => {
  const { relay, deps, gateway } = setup();
  relay.setRunning(true);
  relay.beginDiscovery(ID)(false);
  await flush();
  expect(deps.createGateway).not.toHaveBeenCalled();

  relay.setRunning(false);
  relay.beginDiscovery(ID)(true);
  await flush();
  expect(gateway.attach).not.toHaveBeenCalled();
  expect(deps.requestMtu).not.toHaveBeenCalled();

  relay.setRunning(true);
  relay.beginDiscovery(ID)(true);
  await flush();
  expect(gateway.attach).toHaveBeenCalledTimes(1);
  expect(deps.requestMtu).toHaveBeenCalledWith(ID, 247);
  expect(deps.createLink).toHaveBeenCalledWith(ID, 247);
});

test('waits for the negotiated MTU and uses it instead of the requested value', async () => {
  const { relay, deps, gateway } = setup();
  let negotiate!: (mtu: number) => void;
  deps.requestMtu.mockReturnValueOnce(new Promise(resolve => { negotiate = resolve; }));
  relay.setRunning(true);
  relay.beginDiscovery(ID)(true);
  await flush();
  expect(gateway.attach).not.toHaveBeenCalled();

  negotiate(185);
  await flush();
  expect(deps.createLink).toHaveBeenCalledWith(ID, 185);
  expect(gateway.attach).toHaveBeenCalledTimes(1);
});

test('falls back to MTU 23 if the request fails', async () => {
  const { relay, deps, gateway } = setup();
  deps.requestMtu.mockRejectedValueOnce(new Error('MTU exchange unavailable'));
  relay.setRunning(true);
  relay.beginDiscovery(ID)(true);
  await flush();
  expect(deps.createLink).toHaveBeenCalledWith(ID, 23);
  expect(gateway.attach).toHaveBeenCalledTimes(1);
});

test('falls back if there is no callback, then updates the live link if negotiation finishes late', async () => {
  jest.useFakeTimers();
  try {
    const { relay, deps, gateway } = setup();
    let negotiate!: (mtu: number) => void;
    deps.requestMtu.mockReturnValueOnce(new Promise(resolve => { negotiate = resolve; }));
    relay.setRunning(true);
    relay.beginDiscovery(ID)(true);
    await jest.advanceTimersByTimeAsync(5000);
    expect(deps.createLink).toHaveBeenCalledWith(ID, 23);
    expect(gateway.attach).toHaveBeenCalledTimes(1);

    negotiate(247);
    await jest.advanceTimersByTimeAsync(0);
    expect(deps.createLink.mock.results[0]!.value.setMtu).toHaveBeenCalledWith(247);
  } finally {
    jest.useRealTimers();
  }
});

test('reconnects with a fresh link, ignoring late discovery and MTU updates from the old connection', async () => {
  const { relay, deps, gateway } = setup();
  relay.setRunning(true);
  relay.beginDiscovery(ID)(true);
  await flush();
  const oldDiscovery = relay.beginDiscovery(ID);
  const oldMtu = relay.mtuReporter(ID);
  relay.disconnect(ID.toLowerCase());
  relay.beginDiscovery(ID)(true);
  oldDiscovery(true);
  await flush();
  expect(gateway.attach).toHaveBeenCalledTimes(2);
  expect(deps.requestMtu).toHaveBeenCalledTimes(2);
  const links = deps.createLink.mock.results.map(({ value }) => value);
  expect(links).toHaveLength(2);
  expect(links[0]).not.toBe(links[1]);
  oldMtu(30);
  relay.mtuReporter(ID)(200);
  expect(links[1].setMtu).toHaveBeenCalledTimes(1);
  expect(links[1].setMtu).toHaveBeenCalledWith(200);
});

test('waits for pairing and distinguishes BLE readiness from cloud connectivity', async () => {
  const { relay, deps, gateway, setCloud } = setup();
  deps.isBonded.mockResolvedValueOnce(false);
  relay.setRunning(true);
  relay.beginDiscovery(ID)(true);
  await flush();
  expect(relay.status(ID)).toBe('pairing');
  expect(deps.createGateway).not.toHaveBeenCalled();
  expect(deps.requestMtu).not.toHaveBeenCalled();

  relay.bonded(ID);
  await flush();
  const attachment = await gateway.attach.mock.results[0].value;
  attachment.update({ type: 'ready', deviceId: 'device' });
  await flush();
  expect(relay.status(ID)).toBe('buffering');
  setCloud(true);
  await relay.refreshCloudStatus();
  expect(relay.status(ID)).toBe('relaying');
});

test('shows cloud auth rejection and recovers without reattaching', async () => {
  const { relay, gateway, setCloud } = setup();
  relay.setRunning(true);
  relay.beginDiscovery(ID)(true);
  await flush();
  const attachment = await gateway.attach.mock.results[0].value;

  setCloud(false, { kind: 'AUTH_REJECTED', message: 'Rejected', gattStatus: null });
  attachment.update({ type: 'ready', deviceId: 'device' });
  await flush();
  expect(relay.status(ID)).toBe('auth');
  relay.retry(ID);
  expect(attachment.detach).not.toHaveBeenCalled();

  setCloud(true);
  await relay.refreshCloudStatus();
  expect(relay.status(ID)).toBe('relaying');
  expect(gateway.attach).toHaveBeenCalledTimes(1);
});

test('stops on opt-out and reuses the live BLE link after notification cleanup', async () => {
  const { relay, deps, gateway } = setup();
  relay.setRunning(true);
  relay.beginDiscovery(ID)(true);
  await flush();
  relay.setRunning(false);
  expect(gateway.shutdown).toHaveBeenCalledTimes(1);
  expect(relay.status(ID)).toBeUndefined();
  relay.setRunning(true);
  await flush();
  expect(deps.createLink).toHaveBeenCalledTimes(1);
  expect(deps.requestMtu).toHaveBeenCalledTimes(1);
  expect(gateway.attach).toHaveBeenCalledTimes(2);
});

test('takes over only the selected device and queues manual cleanup before attach', async () => {
  const { relay, gateway } = setup();
  const start = jest.fn();
  const stop = jest.fn();
  const leaveInspector = relay.inspectStream(ID.toLowerCase(), start, stop);
  const otherId = '11:22:33:44:55:66';
  const otherStop = jest.fn();
  const leaveOtherInspector = relay.inspectStream(otherId, jest.fn(), otherStop);
  gateway.attach.mockImplementationOnce(async () => {
    expect(relay.ownsStream(ID)).toBe(true);
    expect(stop).toHaveBeenCalledTimes(1);
    return fakeAttachment();
  });

  relay.setRunning(true);
  expect(relay.ownsStream(ID)).toBe(false);
  relay.beginDiscovery(ID)(true);
  await flush();
  expect(relay.status(ID)).toBe('starting');
  expect(start).toHaveBeenCalledTimes(1);
  expect(gateway.attach).toHaveBeenCalledTimes(1);
  expect(relay.ownsStream(otherId)).toBe(false);
  expect(relay.inspectStream(ID, start, stop)).toBeUndefined();
  leaveInspector?.();
  expect(stop).toHaveBeenCalledTimes(1);
  expect(otherStop).not.toHaveBeenCalled();
  leaveOtherInspector?.();
  expect(otherStop).toHaveBeenCalledTimes(1);
});

test('keeps ownership until the attachment finishes cleaning up after opt-out', async () => {
  const { relay, gateway } = setup();
  relay.setRunning(true);
  relay.beginDiscovery(ID)(true);
  await flush();
  const attachment = await gateway.attach.mock.results[0].value;
  attachment.detach.mockImplementationOnce(() => {});

  relay.setRunning(false);
  expect(relay.ownsStream(ID)).toBe(true);
  const start = jest.fn();
  expect(relay.inspectStream(ID, start, jest.fn())).toBeUndefined();
  expect(start).not.toHaveBeenCalled();
  attachment.update({ type: 'ended', result: { reason: 'DETACHED' } });
  await flush();
  expect(relay.ownsStream(ID)).toBe(false);
  const cleanup = relay.inspectStream(ID, start, jest.fn());
  expect(start).toHaveBeenCalledTimes(1);
  cleanup?.();
});

test('rapid opt-out and opt-in waits for a late attachment to clean up', async () => {
  const { relay, gateway } = setup();
  let finishAttach!: (value: ReturnType<typeof fakeAttachment>) => void;
  gateway.attach.mockReturnValueOnce(new Promise(resolve => { finishAttach = resolve; }));
  relay.setRunning(true);
  relay.beginDiscovery(ID)(true);
  await flush();
  expect(gateway.attach).toHaveBeenCalledTimes(1);

  relay.setRunning(false);
  relay.setRunning(true);
  const late = fakeAttachment();
  late.detach.mockImplementationOnce(() => {});
  finishAttach(late);
  await flush();
  expect(late.detach).toHaveBeenCalledTimes(1);
  expect(relay.ownsStream(ID)).toBe(true);
  expect(gateway.attach).toHaveBeenCalledTimes(1);

  late.update({ type: 'ended', result: { reason: 'DETACHED' } });
  await flush();
  expect(gateway.attach).toHaveBeenCalledTimes(2);
});

test('a delayed gateway initialization cannot attach after opt-out', async () => {
  const { relay, deps, gateway } = setup();
  const configuredGateway = await deps.createGateway.getMockImplementation()!();
  let finish!: (value: typeof configuredGateway) => void;
  deps.createGateway.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  relay.setRunning(true);
  relay.beginDiscovery(ID)(true);
  await flush();
  expect(deps.createGateway).toHaveBeenCalledTimes(1);
  relay.setRunning(false);
  finish(configuredGateway);
  await flush();
  expect(gateway.shutdown).toHaveBeenCalledTimes(1);
  expect(gateway.attach).not.toHaveBeenCalled();
});

test.each([
  ['DEVICE_INGEST_KEY', 'ingest-key'],
  ['AUTH_REJECTED', 'auth-failed'],
] as const)('retries terminal %s only when requested and reuses the BLE link', async (kind, status) => {
  const { relay, gateway, deps } = setup();
  relay.setRunning(true);
  relay.beginDiscovery(ID)(true);
  await flush();
  const attachment = await gateway.attach.mock.results[0].value;
  attachment.update({ type: 'ended', result: { reason: 'FAILED', error: { kind, message: '' } } });
  expect(relay.status(ID)).toBe(status);
  relay.beginDiscovery(ID)(true);
  relay.setRunning(false);
  relay.setRunning(true);
  await flush();
  expect(relay.status(ID)).toBe(status);
  expect(gateway.attach).toHaveBeenCalledTimes(1);

  relay.retry(ID);
  relay.retry(ID);
  expect(relay.status(ID)).toBe('starting');
  await flush();
  expect(gateway.attach).toHaveBeenCalledTimes(2);
  expect(deps.createLink).toHaveBeenCalledTimes(1);
});

test('a late discovery cannot restore a service missing from the newer discovery', async () => {
  const { relay, gateway } = setup();
  relay.setRunning(true);
  const oldDiscovery = relay.beginDiscovery(ID);
  relay.beginDiscovery(ID)(false);
  oldDiscovery(true);
  await flush();
  expect(gateway.attach).not.toHaveBeenCalled();
});

test('rechecks bond state when the event races an older negative result', async () => {
  const { relay, deps, gateway } = setup();
  let finishCheck!: (bonded: boolean) => void;
  deps.isBonded.mockReturnValueOnce(new Promise(resolve => { finishCheck = resolve; }));
  relay.setRunning(true);
  relay.beginDiscovery(ID)(true);
  await flush();
  relay.bonded(ID);
  finishCheck(false);
  await flush();
  expect(deps.isBonded).toHaveBeenCalledTimes(2);
  expect(gateway.attach).toHaveBeenCalledTimes(1);
});

test('removing the bond detaches the relay and re-pairing can restart it', async () => {
  const { relay, gateway } = setup();
  relay.setRunning(true);
  relay.beginDiscovery(ID)(true);
  await flush();
  const attachment = await gateway.attach.mock.results[0].value;
  relay.unbonded(ID);
  expect(attachment.detach).toHaveBeenCalledTimes(1);
  expect(relay.status(ID)).toBe('pairing');
  relay.bonded(ID);
  await flush();
  expect(gateway.attach).toHaveBeenCalledTimes(2);
});

test('retries a transient configuration failure without reconnecting BLE', async () => {
  const { relay, deps, gateway } = setup();
  deps.createGateway.mockRejectedValueOnce(new Error('Temporary failure'));
  relay.setRunning(true);
  relay.beginDiscovery(ID)(true);
  await flush();
  expect(relay.status(ID)).toBe('failed');
  relay.retry(ID);
  await flush();
  expect(deps.createGateway).toHaveBeenCalledTimes(2);
  expect(gateway.attach).toHaveBeenCalledTimes(1);
});

test('uses TI’s negotiated MTU if it was reported before the relay started', async () => {
  const { relay, deps, gateway } = setup();
  relay.beginDiscovery(ID)(true);
  relay.mtuReporter(ID)(247);

  relay.setRunning(true);
  await flush();
  expect(deps.createLink).toHaveBeenCalledWith(ID, 247);
  expect(deps.requestMtu).not.toHaveBeenCalled();
  expect(gateway.attach).toHaveBeenCalledTimes(1);
});
