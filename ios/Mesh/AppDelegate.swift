//
//  AppDelegate.swift
//  SimplelinkConnect
//
//  Created by IL Tools on 21/11/2024.
//
import os.log
import nRFMeshProvision

class AppDelegate : NSObject {
  static let shared = AppDelegate()
    
  var meshNetworkManager: MeshNetworkManager!
  var connection: NetworkConnection!

  private override init() {
    super.init();
    print("create App delegate")
    
    // Create the main MeshNetworkManager instance and customize
    meshNetworkManager = MeshNetworkManager()
    
    // Verbose configuration.
    self.meshNetworkManager.acknowledgmentTimerInterval = 0.6
    self.meshNetworkManager.transmissionTimerInterval = 0.6
    self.meshNetworkManager.retransmissionLimit = 2
    self.meshNetworkManager.acknowledgmentMessageInterval = 5.0
    self.meshNetworkManager.acknowledgmentMessageTimeout = 40.0
    
    meshNetworkManager.logger = self
    
    // Try loading the saved configuration.
    do {
      if try meshNetworkManager.load() {
        meshNetworkDidChange()
      }
    } catch {
      print(error)
    }
    
  }
  
  /// This method creates a new mesh network with a default name and a
  /// single Provisioner.
  ///
  /// When done, calls ``AppDelegate/meshNetworkDidChange()``.
  ///
  /// - returns: The newly created mesh network.
  public func createNewMeshNetwork() -> MeshNetwork {
    let provisioner = Provisioner(name: UIDevice.current.name,
                                  allocatedUnicastRange: [AddressRange(0x0001...0x199A)],
                                  allocatedGroupRange:   [AddressRange(0xC000...0xCC9A)],
                                  allocatedSceneRange:   [SceneRange(0x0001...0x3333)])
    let network = meshNetworkManager.createNewMeshNetwork(withName: "TI Mesh Network", by: provisioner)
    _ = meshNetworkManager.save()
    
    meshNetworkDidChange()
    return network
  }
  
  /// Sets up the local Elements and reinitializes the ``NetworkConnection``
  /// so that it starts scanning for devices advertising the new Network ID.
  func meshNetworkDidChange() {
    connection?.close()
    let meshNetwork = meshNetworkManager.meshNetwork!
    
    self.updateLocalElements()
    
    connection = NetworkConnection(to: meshNetwork)
    connection.proxies.subscribe(onNext: {
      value in print("proxies updated:", value)
    })
    connection!.dataDelegate = meshNetworkManager
    connection!.logger = self
    meshNetworkManager.transmitter = connection
    
    print("MESH NETWORK DID OPEN")
    connection!.open()
  }
  
  func updateLocalElements(){
    let meshNetwork = meshNetworkManager.meshNetwork!
    
    // Generic Default Transition Time Server model:
    let defaultTransitionTimeServerDelegate = BMGenericDefaultTransitionTimeServerDelegate(meshNetwork)
    // Scene Server and Scene Setup Server models:
    let sceneServer = BMSceneServerDelegate(meshNetwork,
                                            defaultTransitionTimeServer: defaultTransitionTimeServerDelegate)
    let sceneSetupServer = BMSceneSetupServerDelegate(server: sceneServer)
    
    // Set up local Elements on the phone.
    let element0 = Element(name: "Primary Element", location: .first, models: [
      // Scene Server and Scene Setup Server models (client is added automatically):
      Model(sigModelId: 0x1203, delegate: sceneServer),
      Model(sigModelId: 0x1204, delegate: sceneSetupServer),
      
      // Sensor Client model:
      Model(sigModelId: 0x1102, delegate: BMSensorClientDelegate()),
      // Generic Power OnOff Client model:
      Model(sigModelId: 0x1008, delegate: BMGenericPowerOnOffClientDelegate()),
      // Generic Default Transition Time Server model:
      Model(sigModelId: 0x1004,
            delegate: defaultTransitionTimeServerDelegate),
      Model(sigModelId: 0x1005,
            delegate: BMGenericDefaultTransitionTimeClientDelegate()),
      // 4 generic models defined by Bluetooth SIG:
      Model(sigModelId: 0x1000,
            delegate: BMGenericOnOffServerDelegate(meshNetwork,
                                                   defaultTransitionTimeServer: defaultTransitionTimeServerDelegate,
                                                   elementIndex: 0)),
      Model(sigModelId: 0x1002,
            delegate: BMGenericLevelServerDelegate(meshNetwork,
                                                   defaultTransitionTimeServer: defaultTransitionTimeServerDelegate,
                                                   elementIndex: 0)),
      Model(sigModelId: 0x1001, delegate: BMGenericOnOffClientDelegate()),
      Model(sigModelId: 0x1003, delegate: BMGenericLevelClientDelegate()),
      Model(sigModelId: 0x1311, delegate: BMLightLCClientDelegate()),
      
    ])
    let element1 = Element(name: "Secondary Element", location: .second, models: [
      Model(sigModelId: 0x1000, delegate: BMGenericOnOffServerDelegate(meshNetwork,
                                                                       defaultTransitionTimeServer: defaultTransitionTimeServerDelegate,
                                                                       elementIndex: 1)),
      Model(sigModelId: 0x1002,
            delegate: BMGenericLevelServerDelegate(meshNetwork,
                                                   defaultTransitionTimeServer: defaultTransitionTimeServerDelegate,
                                                   elementIndex: 1)),
      Model(sigModelId: 0x1001, delegate: BMGenericOnOffClientDelegate()),
      Model(sigModelId: 0x1003, delegate: BMGenericLevelClientDelegate())
    ])
    meshNetworkManager.localElements = [element0, element1]
  }
}

extension MeshNetworkManager {
  
  static var instance: MeshNetworkManager {
    if Thread.isMainThread {
      return AppDelegate.shared.meshNetworkManager
    } else {
      return DispatchQueue.main.sync {
        return AppDelegate.shared.meshNetworkManager
      }
    }
  }
  
  static var bearer: NetworkConnection! {
    if Thread.isMainThread {
      return AppDelegate.shared.connection
    } else {
      return DispatchQueue.main.sync {
        return AppDelegate.shared.connection
      }
    }
  }
  
}

// MARK: - Logger

extension AppDelegate: LoggerDelegate {
  
  func log(message: String, ofCategory category: LogCategory, withLevel level: LogLevel) {
    if #available(iOS 10.0, *) {
      os_log("%{public}@", log: category.log, type: level.type, message)
    } else {
      NSLog("%@", message)
    }
  }
  
}

extension LogLevel {
  
  /// Mapping from mesh log levels to system log types.
  var type: OSLogType {
    switch self {
    case .debug:       return .debug
    case .verbose:     return .debug
    case .info:        return .info
    case .application: return .default
    case .warning:     return .error
    case .error:       return .fault
    }
  }
  
}

extension LogCategory {
  
  var log: OSLog {
    return OSLog(subsystem: Bundle.main.bundleIdentifier!, category: rawValue)
  }
  
}
