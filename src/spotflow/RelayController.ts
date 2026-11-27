import { RelaySession, type AttachmentState, type BleLink, type RelayAttachmentView, type SpotflowGateway } from '@spotflow/react-native-ble-gateway';

export type RelayStatus = 'starting' | 'pairing' | 'relaying' | 'buffering' | 'ingest-key' | 'auth' | 'auth-failed' | 'failed';

export function isRetryableStatus(status: RelayStatus | undefined): boolean {
  return status === 'failed' || status === 'ingest-key' || status === 'auth-failed';
}

const DEFAULT_ATT_MTU = 23;
const SPOTFLOW_ATT_MTU = 247;
const MAX_ATT_MTU = 517;
const MTU_REQUEST_TIMEOUT_MS = 5000;

type MtuLink = BleLink & { setMtu(mtu: number): void };
type Gateway = Pick<SpotflowGateway, 'attach' | 'shutdown' | 'diagnosticsSnapshot'>;

interface Dependencies {
  createGateway(): Promise<Gateway>;
  isBonded(id: string): Promise<boolean>;
  requestMtu(id: string, mtu: number): Promise<number>;
  createLink(id: string, mtu: number): MtuLink;
}

interface Connection {
  id: string;
  discovered: boolean;
  discoveryRevision: number;
  bondRevision: number;
  mtu?: number;
  mtuTask?: Promise<void>;
  link?: MtuLink;
  attempt?: object;
  status?: RelayStatus;
  credentialError?: 'ingest-key' | 'auth-failed';
  attachment?: RelayAttachmentView;
  session?: RelaySession;
  unsubscribePhase?: () => void;
}

/** Owns only Spotflow relay sessions; the app remains responsible for every BLE connection. */
export class RelayController {
  private readonly connections = new Map<string, Connection>();
  private readonly inspectorSubscriptions = new Map<string, Set<() => void>>();
  private readonly listeners = new Set<() => void>();
  private running = false;
  private gateway?: Gateway;
  private gatewayTask?: Promise<Gateway | undefined>;
  private configuration: Promise<unknown> = Promise.resolve();

  constructor(private readonly deps: Dependencies) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  status(id: string): RelayStatus | undefined {
    return this.connections.get(id.toUpperCase())?.status;
  }

  ownsStream(id: string): boolean {
    const session = this.connections.get(id.toUpperCase())?.session;
    return session !== undefined && session.phase !== 'idle';
  }

  /** Register a manual subscription so we can release it before the gateway attaches. */
  inspectStream(id: string, start: () => void, stop: () => void): (() => void) | undefined {
    if (this.ownsStream(id)) return;
    const key = id.toUpperCase();
    const subscriptions = this.inspectorSubscriptions.get(key) ?? new Set();
    this.inspectorSubscriptions.set(key, subscriptions);
    subscriptions.add(stop);
    start();
    return () => {
      if (this.inspectorSubscriptions.get(key) !== subscriptions || !subscriptions.delete(stop)) return;
      if (!subscriptions.size) this.inspectorSubscriptions.delete(key);
      stop();
    };
  }

  setRunning(running: boolean) {
    if (running === this.running) return;
    this.running = running;
    if (running) {
      this.connections.forEach(connection => this.start(connection));
    } else {
      const gateway = this.gateway;
      this.gateway = undefined;
      this.gatewayTask = undefined;
      this.connections.forEach(connection => this.endAttempt(connection, undefined));
      gateway?.shutdown();
    }
  }

  /** Tracks a connection the user opened; it relays once discovery finds the Spotflow service. */
  beginDiscovery(id: string): (hasService: boolean) => void {
    const key = id.toUpperCase();
    let connection = this.connections.get(key);
    if (!connection) {
      connection = { id, discovered: false, discoveryRevision: 0, bondRevision: 0 };
      this.connections.set(key, connection);
    }
    const discovery = ++connection.discoveryRevision;
    return hasService => {
      if (this.connections.get(key) !== connection || connection.discoveryRevision !== discovery) return;
      connection.discovered = hasService;
      if (hasService) this.start(connection);
      else this.endAttempt(connection, undefined);
    };
  }

  disconnect(id: string) {
    const key = id.toUpperCase();
    this.inspectorSubscriptions.delete(key);
    const connection = this.connections.get(key);
    if (!connection) return;
    this.connections.delete(key);
    connection.unsubscribePhase?.();
    void connection.session?.stop();
    this.emit();
  }

  bonded(id: string) {
    const connection = this.connections.get(id.toUpperCase());
    if (!connection) return;
    ++connection.bondRevision;
    this.start(connection);
  }

  unbonded(id: string) {
    const connection = this.connections.get(id.toUpperCase());
    if (!connection) return;
    ++connection.bondRevision;
    this.endAttempt(connection, this.running && connection.discovered ? 'pairing' : undefined);
  }

  retry(id: string) {
    const connection = this.connections.get(id.toUpperCase());
    if (!connection || !isRetryableStatus(connection.status)) return;
    connection.credentialError = undefined;
    this.start(connection);
  }

  mtuReporter(id: string): (mtu: number) => void {
    const key = id.toUpperCase();
    const connection = this.connections.get(key);
    return mtu => {
      if (!connection || this.connections.get(key) !== connection) return;
      if (!Number.isInteger(mtu) || mtu < DEFAULT_ATT_MTU || mtu > MAX_ATT_MTU) return;
      connection.mtu = mtu;
      connection.link?.setMtu(mtu);
    };
  }

  async refreshCloudStatus() {
    const gateway = this.gateway;
    if (!gateway) return;
    // A snapshot can complete after a disconnect/reconnect at the same address.
    const readyAttachments = new Map<string, RelayAttachmentView>();
    for (const [key, { attachment }] of this.connections) {
      if (attachment?.state.type === 'ready') readyAttachments.set(key, attachment);
    }
    if (!readyAttachments.size) return;
    try {
      const report = await gateway.diagnosticsSnapshot();
      if (this.gateway !== gateway) return;
      for (const device of report.devices) {
        const key = device.address.toUpperCase();
        const connection = this.connections.get(key);
        const attachment = readyAttachments.get(key);
        if (!connection || !attachment || connection.attachment !== attachment) continue;
        if (device.cloudConnected) this.publish(connection, 'relaying');
        // A diagnostics snapshot can report rejection before the attachment ends.
        else if (device.cloudError?.kind === 'AUTH_REJECTED') this.publish(connection, 'auth');
        else this.publish(connection, 'buffering');
      }
    } catch {
      // Best-effort status only; the relay owns reconnection to the cloud.
    }
  }

  private start(connection: Connection) {
    if (!this.running || !connection.discovered || connection.attempt) return;
    if (connection.credentialError) {
      this.publish(connection, connection.credentialError);
      return;
    }
    const attempt = connection.attempt = {};
    const current = () => connection.attempt === attempt && this.connections.get(connection.id.toUpperCase()) === connection;
    this.publish(connection, 'starting');
    void this.attach(connection, current).catch(() => {
      if (current()) this.endAttempt(connection, 'failed');
    });
  }

  private async attach(connection: Connection, current: () => boolean) {
    // The peripheral firmware must require an encrypted ATT read on the Ingest Key characteristic.
    while (current()) {
      const revision = connection.bondRevision;
      const bonded = await this.deps.isBonded(connection.id);
      if (!current()) return;
      if (bonded) break;
      // A bond event may arrive before this query resolves with its old snapshot.
      if (revision !== connection.bondRevision) continue;
      this.endAttempt(connection, 'pairing');
      return;
    }
    if (!current()) return;
    await this.negotiateMtu(connection);
    if (!current()) return;
    const gateway = await this.getGateway();
    if (!current() || !gateway) return;

    const attachment = await this.getSession(connection).start(gateway);
    if (!attachment || !current()) return;
    connection.attachment = attachment;
    this.observe(connection, attachment, current);
  }

  private negotiateMtu(connection: Connection): Promise<void> {
    if (connection.mtu !== undefined) return Promise.resolve();
    // Reuse the request across relay restarts on the same BLE connection.
    return connection.mtuTask ??= new Promise<void>(resolve => {
      const reportMtu = this.mtuReporter(connection.id);
      const timeout = setTimeout(resolve, MTU_REQUEST_TIMEOUT_MS);
      const request = async () => {
        try {
          const mtu = await this.deps.requestMtu(connection.id, SPOTFLOW_ATT_MTU);
          // A late reply can still update this link, but must not overwrite a manual exchange.
          if (connection.mtu === undefined) reportMtu(mtu);
        } catch {
          // A rejected MTU request is not a relay failure; use the known MTU or the default.
        } finally {
          clearTimeout(timeout);
          resolve();
        }
      };
      void request();
    });
  }

  private getSession(connection: Connection): RelaySession {
    if (connection.session) return connection.session;
    // Use the default until SimpleLink reports a successful MTU exchange.
    const link = connection.link = this.deps.createLink(connection.id, connection.mtu ?? DEFAULT_ATT_MTU);
    const session = connection.session = new RelaySession(link);
    const key = connection.id.toUpperCase();
    connection.unsubscribePhase = session.onPhaseChange(phase => {
      if (phase === 'starting') {
        // Queue manual unsubscribe before the relay queues its own GATT commands.
        const subscriptions = this.inspectorSubscriptions.get(key);
        this.inspectorSubscriptions.delete(key);
        subscriptions?.forEach(stop => stop());
      }
      this.emit();
    });
    return session;
  }

  private observe(connection: Connection, attachment: RelayAttachmentView, current: () => boolean) {
    const update = (state: AttachmentState) => {
      if (!current()) return;
      if (state.type === 'ready') {
        this.publish(connection, 'buffering');
        void this.refreshCloudStatus();
      } else if (state.type === 'ended') {
        const error = state.result.error?.kind;
        connection.attempt = undefined;
        connection.attachment = undefined;
        if (error === 'DEVICE_INGEST_KEY') connection.credentialError = 'ingest-key';
        if (error === 'AUTH_REJECTED') connection.credentialError = 'auth-failed';
        this.publish(connection, state.result.reason === 'FAILED' ? connection.credentialError ?? 'failed' : undefined);
      }
    };
    const unsubscribe = attachment.onStateChange(update);
    update(attachment.state);
    void attachment.ended.then(unsubscribe);
  }

  private endAttempt(connection: Connection, status: RelayStatus | undefined) {
    connection.attempt = undefined;
    connection.attachment = undefined;
    void connection.session?.stop();
    this.publish(connection, status);
  }

  private getGateway(): Promise<Gateway | undefined> {
    if (this.gatewayTask) return this.gatewayTask;
    // Configuration from a prior on/off cycle must shut down before a new one can start.
    const task: Promise<Gateway | undefined> = this.configuration.then(async () => {
      if (this.gatewayTask !== task) return;
      const gateway = await this.deps.createGateway();
      if (this.gatewayTask !== task) gateway.shutdown();
      else return this.gateway = gateway;
    });
    this.gatewayTask = task;
    this.configuration = task.catch(() => {
      if (this.gatewayTask === task) this.gatewayTask = undefined;
    });
    return task;
  }

  private publish(connection: Connection, status: RelayStatus | undefined) {
    if (connection.status === status) return;
    connection.status = status;
    this.emit();
  }

  private emit() {
    this.listeners.forEach(listener => listener());
  }
}
