import Foundation
import CoreBluetooth
import nRFMeshProvision
import RxSwift

/// The `NetworkConnection` object maintains connections to Bluetooth
/// mesh proxies. It scans in the background and connects to nodes that
/// advertise with Network ID or Node Identity beacon.
///
/// The maximum number of simultaneous connections is defined by
/// ``NetworkConnection/maxConnections``. By connecting to more than one device, this
/// object allows quick switching to another proxy in case link
/// to one of the devices is lost. Only the first device will
/// receive outgoing messages. However, the ``NetworkConnection/dataDelegate`` will be
/// notified about messages received from any of the connected proxies.
class NetworkConnection: NSObject, Bearer {
  private let connectionModeKey = "connectionMode"
  
  /// Maximum number of connections that ``NetworkConnection`` can handle.
  ///
  /// - note: In nRF Mesh app this value is set to 1 due to UI limitations.
  ///         When applying in 3rd party app, higher values should work.
  static let maxConnections = 100
  /// The Bluetooth Central Manager instance that will scan and
  /// connect to proxies.
  let centralManager: CBCentralManager
  /// The Mesh Network for this connection.
  let meshNetwork: MeshNetwork
  /// The list of connected GATT Proxies.
  
  public var proxies:  BehaviorSubject< [GattBearer]> = BehaviorSubject< [GattBearer]>(value: [])
  /// A flag set to `true` when any of the underlying bearers is open.
  var isOpen: Bool = false
  
  weak var delegate: BearerDelegate?
  weak var dataDelegate: BearerDataDelegate?
  weak var logger: LoggerDelegate? {
    didSet {
      do {
        try proxies.value().forEach {
          $0.logger = logger
        }
      }
      catch{
        
      }
    }
  }
  
  public var supportedPduTypes: PduTypes {
    return [.networkPdu, .meshBeacon, .proxyConfiguration]
  }
  
  /// A flag indicating whether the network connection is open.
  /// When open, it will scan for mesh nodes in range and connect to
  /// them if found.
  private var isStarted: Bool = false
  
  /// Returns `true` if at least one Proxy is connected, `false` otherwise.
  var isConnected: Bool {
    return try! proxies.value().contains { $0.isOpen }
  }
  /// Returns the name of the first connected Proxy.
  var name: String? {
    return try! proxies.value().first { $0.isOpen }?.name
  }
  /// Whether the connection to mesh network should be managed automatically,
  /// or manually.
  var isConnectionModeAutomatic: Bool {
    get {
      return false
    }
    set {
      UserDefaults.standard.set(newValue, forKey: connectionModeKey)
      if newValue && isStarted && centralManager.state == .poweredOn {
        centralManager.scanForPeripherals(withServices: [MeshProxyService.uuid], options: nil)
      }
    }
  }
  
  init(to meshNetwork: MeshNetwork) {
    centralManager = CBCentralManager()
    self.meshNetwork = meshNetwork
    super.init()
    centralManager.delegate = self
    
    // By default, the connection mode is automatic.
    UserDefaults.standard.register(defaults: [connectionModeKey : true])
  }
  
  func open() {
    if !isStarted {
      centralManager.delegate = self
      centralManager.scanForPeripherals(withServices: [MeshProxyService.uuid], options: nil)
    }
    isStarted = true
  }
  
  func close() {
    centralManager.stopScan()
    try! proxies.value().forEach { $0.close() }
    proxies.onNext([])
    isStarted = false
  }
  
  func disconnect() {
    try! proxies.value().forEach { $0.close() }
    print(proxies)
  }
  
  func send(_ data: Data, ofType type: PduType) throws {
    // Send the message to all open GATT Proxy nodes.
    var success = false
    var e: Error = BearerError.bearerClosed
    try! proxies.value().filter { $0.isOpen }.forEach {
      do {
        try $0.send(data, ofType: type)
        success = true
      } catch {
        e = error
      }
    }
    if !success {
      
      throw e
    }
  }
  
  /// Switches connection to the given GATT Bearer.
  ///
  /// If the limit of ``NetworkConnection/maxConnections`` connections is reached,
  /// the older one will be closed.
  ///
  /// - parameter bearer: The GATT Bearer proxy to use.
  func use(proxy bearer: GattBearer) {
    // Make sure we're not adding a duplicate.
    guard try! !proxies.value().contains(where: { $0.identifier == bearer.identifier }) else {
      return
    }
    // If we reached the limit, disconnect the one added as a first.
//    if proxies.count >= NetworkConnection.maxConnections {
//      proxies.last?.close()
//    }
    // Add new proxy.
    bearer.delegate = self
    bearer.dataDelegate = self
    bearer.logger = logger
    var currentList = (try? proxies.value()) ?? []
    currentList.append(bearer)
    proxies.onNext(currentList)
    
    // Open the bearer or notify a delegate that the connection is open.
    if bearer.isOpen {
      bearerDidOpen(self)
    } else {
      bearer.open()
    }
    // Is the limit reached?
//    if proxies.count >= NetworkConnection.maxConnections {
//      centralManager.stopScan()
//    }
  }
  
}

extension NetworkConnection: CBCentralManagerDelegate {
  
  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    switch central.state {
    case .poweredOn:
      if isStarted && isConnectionModeAutomatic {
        central.scanForPeripherals(withServices: [MeshProxyService.uuid], options: nil)
      }
    case .poweredOff, .resetting:
      try! proxies.value().forEach { $0.close() }
      proxies.onNext([])
    default:
      break
    }
  }
  
  func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
                      advertisementData: [String : Any], rssi RSSI: NSNumber) {
    // Is it a Network ID or Private Network Identity beacon?
    if let networkIdentity = advertisementData.networkId {
      guard meshNetwork.matches(networkId: networkIdentity) else {
        // A Node from another mesh network.
        return
      }
    } else {
      // Is it a Node Identity or Private Node Identity beacon?
      guard let nodeIdentity = advertisementData.networkId,
            meshNetwork.matches(networkId: nodeIdentity) else {
        // A Node from another mesh network.
        return
      }
    }
    // Add a new bearer.
    use(proxy: GattBearer(target: peripheral))
  }
}

extension NetworkConnection: GattBearerDelegate, BearerDataDelegate {
  
  func bearerDidOpen(_ bearer: Bearer) {
    guard !isOpen else { return }
    isOpen = true
    delegate?.bearerDidOpen(self)
  }
  
  func bearer(_ bearer: Bearer, didClose error: Error?) {
    if let index = try! proxies.value().firstIndex(of: bearer as! GattBearer) {
      var currentList = (try? proxies.value()) ?? []
      currentList.remove(at: index)
      proxies.onNext(currentList)
    }
    if isStarted && isConnectionModeAutomatic {
      centralManager.scanForPeripherals(withServices: [MeshProxyService.uuid], options: nil)
    }
    if try! proxies.value().isEmpty {
      isOpen = false
      delegate?.bearer(self, didClose: nil)
    }
  }
  
  func bearerDidConnect(_ bearer: Bearer) {
    if !isOpen, let delegate = delegate as? GattBearerDelegate {
      delegate.bearerDidConnect(bearer)
    }
  }
  
  func bearerDidDiscoverServices(_ bearer: Bearer) {
    if !isOpen, let delegate = delegate as? GattBearerDelegate {
      delegate.bearerDidDiscoverServices(bearer)
    }
  }
  
  func bearer(_ bearer: Bearer, didDeliverData data: Data, ofType type: PduType) {
    dataDelegate?.bearer(self, didDeliverData: data, ofType: type)
  }
  
}
