import CoreBluetooth
import Foundation
import React
import NordicMesh

struct SelectedModelInfo {
  let elementId: Int
  let modelId: Int
  let modelType: String
}

@objc(MeshModule)
class MeshModule: RCTEventEmitter {
  
  var meshRepository: MeshRepository!
  public var connectedDevices: [ProvisionedDevice] = []
  
  override init() {
    // Call the superclass's init method first
    super.init()
    
    // Now that super.init() is called, you can use self
    meshRepository = MeshRepository(meshModule: self)
  }
  
  @objc
  override static func requiresMainQueueSetup() -> Bool {
    // Return true if the module must be initialized on the main thread,
    // for example, if it needs to interact with UI components.
    // Otherwise, return false to allow initialization on a background thread.
    return false
  }
  
  override func supportedEvents() -> [String]! {
    return [
      "onNetworkLoaded", "onScanResult", "onAppKeyUpdated", "onNodeConnected", "onNodeIdentified",
      "onStateChange", "onProgressUpdate", "onProvisionCompleted", "onProvisionedScanResult",
      "onNetworkKeyUpdated", "onModelKeyUpdated", "onPublicationUpdated", "onSubscriptionReceived",
      "onSubscriptionAdded", "onSubscriptionFailed", "onSensorGet", "onStatusReceived",
      "onModelKeyUpdated", "onProxyFilterUpdated", "onBindAppKeysDone", "onSubscriptionDone",
      "onPublicationDone","onReadProxyStatus"
    ]
  }
  
  @objc
  func meshInit(_ callback: RCTResponseSenderBlock) {
    NSLog("meshInit")
    self.meshRepository.initializeMeshManager()
  }
  
  @objc
  func getMeshNetworkName(_ callback: RCTResponseSenderBlock) {
    if let network = self.meshRepository.getMeshNetwork() {
      callback([NSNull(), network.meshName ?? "Unnamed Network"])
    } else {
      callback([
        NSError(
          domain: "MeshModule", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "No network loaded"]), NSNull(),
      ])
    }
  }
  
  @objc
  func getProvisionedMeshNodes(_ callback: @escaping RCTResponseSenderBlock) {
    guard let network = self.meshRepository.getMeshNetwork() else {
      let error = NSError(
        domain: "MeshModule", code: 0, userInfo: [NSLocalizedDescriptionKey: "Mesh network is null"]
      )
      callback([error, NSNull()])
      return
    }
    
    var nodesArray: [[String: Any]] = []
    
    for node in network.nodes {
      if node.isLocalProvisioner {
        continue
      }
      var nodeData: [String: Any] = [:]
      nodeData["name"] = node.name ?? "Unknown"
      nodeData["unicastAddress"] = node.unicastAddress
      nodeData["deviceKey"] = node.deviceKey?.hex
      nodeData["features"] = getNodeFeatures(node)
      
      // Company information
      if let companyId = node.companyIdentifier {
        nodeData["company"] = CompanyIdentifiers.name(for: companyId)
      }
      
      nodeData["numberOfElements"] = node.elements.count
      
      // Model count
      let numberOfModels = node.elements.reduce(0) { count, element in
        count + element.models.count
      }
      nodeData["numberOfModels"] = numberOfModels
      
      nodesArray.append(nodeData)
    }
    
    callback([NSNull(), nodesArray])
  }
  
  func getNodeFeatures(_ node: Node) -> [Any] {
    var featuresArray: [Any] = []
    var friendData: [String: Any] = [:]
    var relayData: [String: Any] = [:]
    var proxyData: [String: Any] = [:]
    var lpData: [String: Any] = [:]
    
    friendData["name"] = "F"
    friendData["state"] = node.features?.friend?.rawValue
    relayData["name"] = "R"
    relayData["state"] = node.features?.relay?.rawValue
    proxyData["name"] = "P"
    proxyData["state"] = node.features?.proxy?.rawValue
    lpData["name"] = "LP"
    lpData["state"] = node.features?.lowPower?.rawValue
    
    featuresArray.append(friendData)
    featuresArray.append(relayData)
    featuresArray.append(proxyData)
    featuresArray.append(lpData)
    
    return featuresArray
    
  }
  
  @objc
  func getMeshNetworkTimestamp(_ callback: RCTResponseSenderBlock) {
    if let network = self.meshRepository.getMeshNetwork() {
      let timestamp = network.timestamp.timeIntervalSince1970
      callback([NSNull(), timestamp])
    } else {
      callback([
        NSError(
          domain: "MeshModule", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "getMeshNetworkTimestamp"]), NSNull(),
      ])
    }
  }
  
  @objc
  func getMeshPrimaryNetworksKey(_ callback: RCTResponseSenderBlock) {
    if let network = self.meshRepository.getMeshNetwork() {
      for networkKey in network.networkKeys {
        if networkKey.isPrimary {
          var keyDict: [String: Any] = [:]
          keyDict["name"] = networkKey.name
          keyDict["index"] = networkKey.index
          keyDict["timestamp"] = networkKey.timestamp.timeIntervalSince1970
          keyDict["key"] = networkKey.key.hex
          callback([NSNull(), keyDict])
        }
      }
    } else {
      callback([
        NSError(
          domain: "MeshModule", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "getMeshNetworkTimestamp"]), NSNull(),
      ])
    }
  }
  
  @objc
  func getMeshSubNetworksKeys(_ callback: RCTResponseSenderBlock) {
    var subNetKeys: [[String: Any]] = []
    if let network = self.meshRepository.getMeshNetwork() {
      for networkKey in network.networkKeys {
        if !networkKey.isPrimary {
          var keyDict: [String: Any] = [:]
          keyDict["name"] = networkKey.name
          keyDict["index"] = networkKey.index
          keyDict["timestamp"] = networkKey.timestamp.timeIntervalSince1970
          keyDict["key"] = networkKey.key.hex
          subNetKeys.append(keyDict)
        }
      }
      callback([NSNull(), subNetKeys])
    } else {
      callback([
        NSError(
          domain: "MeshModule", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "getMeshNetworkTimestamp"]), NSNull(),
      ])
    }
  }
  
  @objc
  func getMeshApplicationsKeys(_ callback: RCTResponseSenderBlock) {
    var appKeys: [[String: Any]] = []
    if let network = self.meshRepository.getMeshNetwork() {
      for appKey in network.applicationKeys {
        var keyDict: [String: Any] = [:]
        keyDict["name"] = appKey.name
        keyDict["index"] = appKey.index
        keyDict["key"] = appKey.key.hex
        appKeys.append(keyDict)
        
      }
      callback([NSNull(), appKeys])
    } else {
      callback([
        NSError(
          domain: "MeshModule", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "getMeshNetworkTimestamp"]), NSNull(),
      ])
    }
  }
  
  @objc
  func removeNetworksKey(_ keyIndex: Int, callback: RCTResponseSenderBlock) {
    if let network = self.meshRepository.getMeshNetwork() {
      // Find the key to remove
      if let keyToRemove = network.networkKeys.first(where: {
        $0.index == keyIndex
      }) {
        do {
          // Attempt to remove the key, which can throw an error
          try network.remove(networkKey: keyToRemove)
          meshRepository.onNetworkUpdated()
          print("Network key removed")
          callback([NSNull(), "Network key removed successfully"])
        } catch {
          // Handle the error if removal fails
          print("Error removing network key: \(error)")
          callback([
            NSError(
              domain: "MeshModule", code: 0,
              userInfo: [NSLocalizedDescriptionKey: error.localizedDescription]), NSNull(),
          ])
        }
      } else {
        callback([
          NSError(
            domain: "MeshModule", code: 1, userInfo: [NSLocalizedDescriptionKey: "Key not found"]),
          NSNull(),
        ])
      }
    } else {
      callback([
        NSError(
          domain: "MeshModule", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "Mesh network not found"]), NSNull(),
      ])
    }
  }
  
  @objc
  func removeAppKey(_ keyIndex: Int, callback: RCTResponseSenderBlock) {
    if let network = self.meshRepository.getMeshNetwork() {
      // Find the key to remove
      if let keyToRemove = network.applicationKeys.first(where: {
        $0.index == keyIndex
      }) {
        do {
          // Attempt to remove the key, which can throw an error
          try network.remove(applicationKey: keyToRemove)
          meshRepository.onNetworkUpdated()
          print("Application key removed")
          callback([NSNull(), "App key removed successfully"])
        } catch {
          // Handle the error if removal fails
          print("Error removing app key: \(error)")
          callback([
            NSError(
              domain: "MeshModule", code: 0,
              userInfo: [NSLocalizedDescriptionKey: error.localizedDescription]), NSNull(),
          ])
        }
      } else {
        callback([
          NSError(
            domain: "MeshModule", code: 1, userInfo: [NSLocalizedDescriptionKey: "Key not found"]),
          NSNull(),
        ])
      }
    } else {
      callback([
        NSError(
          domain: "MeshModule", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "Mesh network not found"]), NSNull(),
      ])
    }
  }
  
  @objc
  func editNetworksKey(
    _ keyIndex: Int, newName: String, newHexKeyString: String?, callback: RCTResponseSenderBlock
  ) {
    if let network = self.meshRepository.getMeshNetwork() {
      // Find the existing network key by its index
      if let keyToEdit = network.networkKeys.first(where: { $0.index == keyIndex }) {
        
        // Convert new hex string to Data if provided
        var newNetworkKeyData: Data?
        if let newHexKeyString = newHexKeyString {
          newNetworkKeyData = Data(hexString: newHexKeyString)
          // Ensure the new key is valid
          guard newNetworkKeyData?.count == 16 else {
            callback([
              NSError(
                domain: "MeshModule", code: 0,
                userInfo: [NSLocalizedDescriptionKey: "Invalid hex string for network key"]),
              NSNull(),
            ])
            return
          }
        }
        
        // Update the key's properties
        do {
          // If there's a new key value, update the key
          if let newNetworkKeyData = newNetworkKeyData {
            try network.remove(networkKey: keyToEdit)  // Remove old key before adding the new one
            // Recreate the key with the new key value and name
            try network.add(
              networkKey: newNetworkKeyData, withIndex: UInt16(keyIndex), name: newName)
            self.meshRepository.onNetworkUpdated()
          } else {
            // If no new key is provided, just update the name
            keyToEdit.name = newName
          }
          
          callback([NSNull(), "Network key edited successfully"])
        } catch {
          callback([
            NSError(
              domain: "MeshModule", code: 0,
              userInfo: [NSLocalizedDescriptionKey: "Error editing network key"]), NSNull(),
          ])
        }
      } else {
        callback([
          NSError(
            domain: "MeshModule", code: 0,
            userInfo: [NSLocalizedDescriptionKey: "Network key not found"]), NSNull(),
        ])
      }
    } else {
      callback([
        NSError(
          domain: "MeshModule", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "Mesh network not found"]), NSNull(),
      ])
    }
  }
  
  @objc
  func editAppKey(
    _ keyIndex: Int, newName: String, newHexKeyString: String?,
    callback: RCTResponseSenderBlock
  ) {
    if let network = self.meshRepository.getMeshNetwork() {
      // Find the existing network key by its index
      if let keyToEdit = network.applicationKeys.first(where: {
        $0.index == keyIndex
      }) {
        
        // Convert new hex string to Data if provided
        var newNetworkKeyData: Data?
        if let newHexKeyString = newHexKeyString {
          newNetworkKeyData = Data(hexString: newHexKeyString)
          // Ensure the new key is valid
          guard newNetworkKeyData?.count == 16 else {
            callback([
              NSError(
                domain: "MeshModule", code: 0,
                userInfo: [NSLocalizedDescriptionKey: "Invalid hex string for app key"]), NSNull(),
            ])
            return
          }
        }
        
        // Update the key's properties
        do {
          // If there's a new key value, update the key
          if let newNetworkKeyData = newNetworkKeyData {
            try network.remove(applicationKey: keyToEdit)  // Remove old key before adding the new one
            // Recreate the key with the new key value and name
            try network.add(
              applicationKey: newNetworkKeyData, withIndex: UInt16(keyIndex), name: newName)
            self.meshRepository.onNetworkUpdated()
          } else {
            // If no new key is provided, just update the name
            keyToEdit.name = newName
          }
          
          callback([NSNull(), "Network key edited successfully"])
        } catch {
          callback([
            NSError(
              domain: "MeshModule", code: 0,
              userInfo: [NSLocalizedDescriptionKey: "Error editing app key"]), NSNull(),
          ])
        }
      } else {
        callback([
          NSError(
            domain: "MeshModule", code: 0,
            userInfo: [NSLocalizedDescriptionKey: "App key not found"]), NSNull(),
        ])
      }
    } else {
      callback([
        NSError(
          domain: "MeshModule", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "Mesh network not found"]), NSNull(),
      ])
    }
  }
  
  private func getAvailableNetKeyIndex() -> Int {
    // Retrieve network keys, if they exist
    guard let networkKeys = self.meshRepository.getMeshNetwork()?.networkKeys else {
      return 0  // Return 0 if network keys are nil
    }
    
    // If network keys are empty, return 0
    if networkKeys.isEmpty {
      return 0
    }
    
    // Sort network keys by index in ascending order and retrieve the last index
    let lastIndex = networkKeys.max(by: { $0.index < $1.index })?.index ?? 0
    
    // Return the next available index by incrementing the last index by 1
    return Int(lastIndex + 1)
  }
  
  private func getAvailableAppKeyIndex() -> Int {
    // Retrieve network keys, if they exist
    guard let appKeys = self.meshRepository.getMeshNetwork()?.applicationKeys else {
      return 0  // Return 0 if network keys are nil
    }
    
    // If network keys are empty, return 0
    if appKeys.isEmpty {
      return 0
    }
    
    // Sort network keys by index in ascending order and retrieve the last index
    let lastIndex = appKeys.max(by: { $0.index < $1.index })?.index ?? 0
    
    // Return the next available index by incrementing the last index by 1
    return Int(lastIndex + 1)
  }
  
  @objc
  func generateNetworksKey(_ callback: RCTResponseSenderBlock) {
    if let network = self.meshRepository.getMeshNetwork() {
      let key = Data.random128BitKey()
      let index = getAvailableNetKeyIndex()
      
      var keyDict: [String: Any] = [:]
      keyDict["name"] = "Network Key \(index)"
      keyDict["key"] = key.hex
      
      callback([NSNull(), keyDict])
      
    }
  }
  
  @objc
  func generateAppKey(_ callback: RCTResponseSenderBlock) {
    if let network = self.meshRepository.getMeshNetwork() {
      let key = Data.random128BitKey()
      let index = getAvailableAppKeyIndex()
      
      var keyDict: [String: Any] = [:]
      keyDict["name"] = "Application Key \(index)"
      keyDict["key"] = key.hex
      
      callback([NSNull(), keyDict])
      
    }
  }
  
  @objc
  func addNetworksKey(
    _ name: String, hexKeyString: String, callback: RCTResponseSenderBlock
  ) {
    if let network = self.meshRepository.getMeshNetwork() {
      // Convert hex string to Data
      guard let networkKeyData = Data(hexString: hexKeyString as String) else {
        // Return error if hex string is invalid
        callback([
          NSError(
            domain: "MeshModule", code: 0,
            userInfo: [NSLocalizedDescriptionKey: "Invalid hex key string"]), NSNull(),
        ])
        return
      }
      
      // Add network key to mesh network
      do {
        let networkKey = try network.add(
          networkKey: networkKeyData, name: name as String)
        // Return success and the added network key details
        var keyDict: [String: Any] = [:]
        keyDict["name"] = networkKey.name
        keyDict["key"] = networkKey.key.hex
        keyDict["index"] = networkKey.index
        keyDict["timestamp"] = networkKey.timestamp.timeIntervalSince1970
        self.meshRepository.onNetworkUpdated()
        callback([NSNull(), keyDict])
      } catch {
        // Handle any errors that occur while adding the network key
        callback([
          NSError(
            domain: "MeshModule", code: 1,
            userInfo: [
              NSLocalizedDescriptionKey: "Failed to add network key: \(error.localizedDescription)"
            ]), NSNull(),
        ])
      }
    } else {
      // Return error if mesh network is not found
      callback([
        NSError(
          domain: "MeshModule", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "Mesh network is not available"]), NSNull(),
      ])
    }
  }
  
  @objc
  func addAppKey(
    _ name: String, hexKeyString: String, callback: RCTResponseSenderBlock
  ) {
    if let network = self.meshRepository.getMeshNetwork() {
      // Convert hex string to Data
      guard let appKeyData = Data(hexString: hexKeyString as String) else {
        // Return error if hex string is invalid
        callback([
          NSError(
            domain: "MeshModule", code: 0,
            userInfo: [NSLocalizedDescriptionKey: "Invalid hex key string"]), NSNull(),
        ])
        return
      }
      
      // Add network key to mesh network
      do {
        let appKey = try network.add(
          applicationKey: appKeyData, name: name as String)
        // Return success and the added network key details
        var keyDict: [String: Any] = [:]
        keyDict["name"] = appKey.name
        keyDict["key"] = appKey.key.hex
        keyDict["index"] = appKey.index
        self.meshRepository.onNetworkUpdated()
        callback([NSNull(), keyDict])
      } catch {
        // Handle any errors that occur while adding the network key
        callback([
          NSError(
            domain: "MeshModule", code: 1,
            userInfo: [
              NSLocalizedDescriptionKey: "Failed to add app key: \(error.localizedDescription)"
            ]), NSNull(),
        ])
      }
    } else {
      // Return error if mesh network is not found
      callback([
        NSError(
          domain: "MeshModule", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "Mesh network is not available"]), NSNull(),
      ])
    }
  }
  
  @objc
  func setMeshNetworkName(
    _ newNetName: String, callback: RCTResponseSenderBlock
  ) {
    if let network = self.meshRepository.getMeshNetwork() {
      
      // Add network key to mesh network
      do {
        network.meshName = newNetName
        self.meshRepository.onNetworkUpdated()
        callback([NSNull(), "success"])
        
      } catch {
        // Handle any errors that occur while changing mesh name
        callback([
          NSError(
            domain: "MeshModule", code: 1,
            userInfo: [
              NSLocalizedDescriptionKey:
                "Failed to change net name \(error.localizedDescription)"
            ]), NSNull(),
        ])
      }
    } else {
      // Return error if mesh network is not found
      callback([
        NSError(
          domain: "MeshModule", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "Mesh network is not available"]
        ), NSNull(),
      ])
    }
    
  }
  
  @objc
  func startScan(_ callback: RCTResponseSenderBlock) {
    self.meshRepository.scanForUnprovisionNodes()
  }
  
  @objc
  func stopScan(_ callback: RCTResponseSenderBlock) {
    self.meshRepository.stopScan()
  }
  
  @objc
  func selectUnprovisionedNode(_ nodeId: String, bearerIndex: Int, callback: @escaping RCTResponseSenderBlock) {
    // Loop through scan results and find the matching peripheral
    let scanResults = self.meshRepository.getScanResults()
    for result in self.meshRepository.getScanResults() {
      if result.uuid == UUID(uuidString: nodeId) {
        // Try to connect to the peripheral
        self.meshRepository.selectUnprovisionedNode(unprovisionedDevice: result, bearerIndex: bearerIndex)
        return
      }
    }
    print("not Found selected node")
    
    // If no peripheral with the given nodeId was found, send an error callback
    callback([
      NSError(
        domain: "MeshModule", code: 1,
        userInfo: [
          NSLocalizedDescriptionKey:
            "Peripheral with nodeId \(nodeId) not found."
        ]), NSNull(),
    ])
  }
  
  @objc
  func selectProvisionedNodeToConnect(
    _ nodeId: String, unicastAddress: Int, identifier: String,
    callback: @escaping RCTResponseSenderBlock
  ) {
    self.meshRepository.bleManager.setSelectedProvisionedDevice(
      peripheralUuid: UUID(uuidString: nodeId)!,
      nodeUnicastAddress: unicastAddress,
      identifier: UUID(uuidString: identifier)!
    )
    
    self.meshRepository.connectToProvisionedNode(
      identifier: identifier, nodeUnicastAddress: unicastAddress)
    callback([NSNull(), NSNull()])
  }
  
  @objc
  func identifyNode(_ callback: RCTResponseSenderBlock) {
    do {
      try self.meshRepository.identifyNode()
      
      callback([NSNull(), "Node identified successfully"])
    } catch {
      // If there's an error, call the callback with an error message
      callback([
        NSError(
          domain: "MeshModule", code: 0,
          userInfo: [
            NSLocalizedDescriptionKey:
              "Failed to identify node: \(error.localizedDescription)"
          ]), NSNull(),
      ])
    }
  }
  
  @objc
  func exportNetwork(_ callback: RCTResponseSenderBlock) {
    let exportedData = self.meshRepository.getMeshManager().export()
    
    do {
      // Decode the exported JSON data to a Dictionary to manipulate formatting
      let jsonObject = try JSONSerialization.jsonObject(
        with: exportedData, options: [])
      
      // Re-encode with pretty-print formatting
      let prettyPrintedData = try JSONSerialization.data(
        withJSONObject: jsonObject, options: .prettyPrinted)
      
      // Convert to string with indentation
      if let prettyPrintedString = String(
        data: prettyPrintedData, encoding: .utf8)
      {
        callback([NSNull(), prettyPrintedString])
      } else {
        callback(["Failed to convert to String"])
      }
    } catch {
      callback(["Error processing JSON: \(error.localizedDescription)"])
    }
  }
  
  @objc
  func startProvisioningNode(_ callback: RCTResponseSenderBlock) {
    self.meshRepository.startProvisioning()
  }
  
  @objc
  func resetNetwork(_ callback: RCTResponseSenderBlock) {
    do {
      try self.meshRepository.createNewMeshNetwork()
      try self.meshRepository.onNetworkUpdated()
      callback([NSNull(), "Network reset successfully"])
    } catch {
      // Handle the error and pass it to the callback
      callback([error.localizedDescription, NSNull()])
    }
  }
  
  @objc
  func getProvisionedNodeNetworkKeys(
    _ unicastAddress: Int, callback: RCTResponseSenderBlock
  ) {
    do {
      // Call the repository function to get network keys
      guard
        let networkKeys = self.meshRepository.getProvisionedNodeNetworkKeys(
          unicastAddress: unicastAddress)
      else {
        callback([
          "No network keys found for the given unicast address", NSNull(),
        ])
        return
      }
      
      // Prepare the key list
      var keyList: [[String: Any]] = []
      
      // Iterate over the network keys
      for netKey in networkKeys {
        var keyDict: [String: Any] = [:]
        keyDict["name"] = netKey.name
        keyDict["index"] = netKey.index
        keyDict["timestamp"] = netKey.timestamp.timeIntervalSince1970
        keyDict["key"] = netKey.key.hex
        keyList.append(keyDict)
      }
      
      // Pass the key list to the callback
      callback([NSNull(), keyList])
    } catch {
      // Handle any errors and pass the error message to the callback
      callback([error.localizedDescription, NSNull()])
    }
  }
  
  @objc
  func getProvisionedNodeAppKeys(
    _ unicastAddress: Int, callback: @escaping RCTResponseSenderBlock
  ) {
    
    guard
      let node = AppDelegate.shared.meshNetworkManager.meshNetwork?.node(
        withAddress: Address(unicastAddress))
    else {
      print("Node with unicast address \(unicastAddress) not found.")
      callback(["Node not found", NSNull()])
      return
    }
    
    // Check if the node has application keys
    guard !node.applicationKeys.isEmpty else {
      print("No application keys found for node \(unicastAddress).")
      callback([NSNull(), []])
      return
    }
    
    // Map the application keys to a format suitable for React Native
    let keyList = node.applicationKeys.map { appKey in
      [
        "name": appKey.name,
        "index": appKey.index,
        "key": appKey.key.hex,
      ]
    }
    // Return the key list as a response
    callback([NSNull(), keyList])
    
  }
  
  @objc
  func addNodeNetworkKeys(
    _ unicastAddress: Int, keyIndex: Int,
    callback: @escaping RCTResponseSenderBlock
  ) {
    meshRepository.addNodeNetworkKeys(
      unicastAddress: unicastAddress, keyIndex: keyIndex
    ) { success, error in
      if success {
        print(
          "addNodeNetworkKeys successfully to key \(keyIndex) for node \(unicastAddress)"
        )
        self.meshRepository.onNetworkUpdated()
        
        self.sendEvent(withName: "onNetworkKeyUpdated", body: "success")
        
        callback([NSNull(), ["success": true, "addNodeAppKey": keyIndex]])
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        self.sendEvent(
          withName: "onNetworkKeyUpdated", body: error?.localizedDescription)
        
        print(
          "Failed to addNodeAppKey for node \(unicastAddress): \(errorMessage)")
        callback([["error": errorMessage], NSNull()])
      }
    }
  }
  
  @objc
  func removeNodeNetworkKeys(
    _ unicastAddress: Int, keyIndex: Int,
    callback: @escaping RCTResponseSenderBlock
  ) {
    meshRepository.removeNodeNetworkKeys(
      unicastAddress: unicastAddress, keyIndex: keyIndex
    ) { success, error in
      if success {
        print(
          "removeNodeNetworkKeys successfully to key \(keyIndex) for node \(unicastAddress)"
        )
        self.meshRepository.onNetworkUpdated()
        
        self.sendEvent(withName: "onNetworkKeyUpdated", body: "success")
        
        callback([
          NSNull(), ["success": true, "removeNodeNetworkKeys": keyIndex],
        ])
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        print(
          "Failed to removeNodeNetworkKeys for node \(unicastAddress): \(errorMessage)"
        )
        callback([["error": errorMessage], NSNull()])
      }
    }
    
  }
  
  @objc
  func isDeviceConnected(_ unicastAddress: Int, callback: RCTResponseSenderBlock) {
    
    let connectedDevice = self.connectedDevices.first(where: {
      $0.nodeUnicastAddress == unicastAddress
    })
    
    let isConnected = meshRepository.isDeviceConnected(peripheralUUID: connectedDevice?.uuid, peripheralIdentifier: connectedDevice?.identifier)
    callback([NSNull(), isConnected])
  }
  
  @objc
  func getProvisionedNode(
    _ unicastAddress: Int, callback: @escaping RCTResponseSenderBlock
  ) {
    guard let meshNetwork = meshRepository.getMeshNetwork() else {
      callback(["Mesh network not initialized", NSNull()])
      return
    }
    
    guard let node = meshNetwork.node(withAddress: UInt16(unicastAddress))
    else {
      callback(["Node not found", NSNull()])
      return
    }
    
    if let connectedDevice = self.connectedDevices.first(where: {
      $0.nodeUnicastAddress == unicastAddress
    }) {
      if meshRepository.isDeviceConnected(peripheralUUID: connectedDevice.uuid,  peripheralIdentifier: connectedDevice.identifier)
      {
        self.meshRepository.bleManager.setSelectedProvisionedDevice(
          peripheralUuid: connectedDevice.uuid,
          nodeUnicastAddress: unicastAddress,
          identifier: connectedDevice.identifier
        )
      }
    }
    
    // Node data
    var nodeData: [String: Any] = [:]
    nodeData["name"] = node.name
    nodeData["unicastAddress"] = Int(node.unicastAddress)
    nodeData["deviceKey"] = node.deviceKey?.hex
    nodeData["features"] = self.getNodeFeatures(node)
    nodeData["uuid"] = node.uuid.uuidString
    
    // Company information
    if let companyId = node.companyIdentifier {
      nodeData["company"] = CompanyIdentifiers.name(for: companyId)
    }
    
    nodeData["ttl"] = node.defaultTTL
    nodeData["addedNetworkKeysNum"] = node.networkKeys.count
    nodeData["addedApplicationKeysNum"] = node.applicationKeys.count
    
    // Elements and models
    var elementsArray: [[String: Any]] = []
    var numberOfModels = 0
    
    for element in node.elements {
      var elementData: [String: Any] = [:]
      elementData["name"] = element.name ?? "Element " + String(element.index)
      elementData["address"] = Int(element.unicastAddress)
      
      var modelsArray: [[String: Any]] = []
      for model in element.models {
        var modelData: [String: Any] = [:]
        modelData["name"] = model.name
        modelData["id"] = Int(model.modelIdentifier)
        modelData["type"] =
        model.isBluetoothSIGAssigned
        ? "Bluetooth SIG"
        : (model.companyIdentifier != nil
           ? CompanyIdentifiers.name(for: UInt16(model.companyIdentifier!))
           ?? "Unknown" : "Unknown")
        modelData["isBindingSupported"] = model.supportModelBinding
        modelData["isSubscribeSupported"] = model.supportsModelSubscriptions
        modelData["isPublishSupported"] = model.supportsModelPublication
        modelsArray.append(modelData)
      }
      
      numberOfModels += modelsArray.count
      elementData["models"] = modelsArray
      elementsArray.append(elementData)
    }
    
    nodeData["elements"] = elementsArray
    nodeData["numberOfModels"] = numberOfModels
    
    // Resolve callback with node data
    callback([NSNull(), nodeData])
    
  }
  
  @objc
  func getNodeTtl(_ unicastAddress: Int, callback: @escaping RCTResponseSenderBlock){
    self.meshRepository.getTtl(unicastAddress: unicastAddress) { result, error in
      if (result != nil){
        callback([NSNull(), result])
      }
      else {
        callback([NSNull(), 255])
      }
    }
  }
  
  @objc
  func removeNodeFromNetwork(
    _ unicastAddress: Int, callback: RCTResponseSenderBlock
  ) {
    if let node = meshRepository.getMeshNetwork()?.node(
      withAddress: UInt16(unicastAddress))
    {
      meshRepository.getMeshNetwork()?.remove(node: node)
      meshRepository.onNetworkUpdated()
      callback([NSNull(), unicastAddress])
    } else {
      callback([NSNull(), NSNull()])
      
    }
    
  }
  
  @objc
  func editProvisionedNodeName(
    _ unicastAddress: Int, nodeName: String, callback: RCTResponseSenderBlock
  ) {
    if let node = meshRepository.getMeshNetwork()?.node(
      withAddress: UInt16(unicastAddress))
    {
      node.name = nodeName
      meshRepository.onNetworkUpdated()
      
      callback([NSNull(), node])
    } else {
      callback([NSNull(), NSNull()])
    }
    
  }
  
  @objc
  func editProvisionedNodeTtl(
    _ unicastAddress: Int, newTtl: Int,
    callback: @escaping RCTResponseSenderBlock
  ) {
    meshRepository.setTtl(unicastAddress: unicastAddress, ttl: newTtl) {
      success, error in
      if success != nil {
        print("TTL set successfully to \(newTtl) for node \(unicastAddress)")
        
        callback([NSNull(), ["success": true, "newTtl": newTtl]])
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        print("Failed to set TTL for node \(unicastAddress): \(errorMessage)")
        callback([["error": errorMessage], NSNull()])
      }
    }
  }
  
  @objc
  func addNodeAppKey(
    _ unicastAddress: Int, keyIndex: Int,
    callback: @escaping RCTResponseSenderBlock
  ) {
    meshRepository.addNodeAppKey(
      unicastAddress: unicastAddress, keyIndex: keyIndex
    ) { success, error in
      if success {
        print(
          "addNodeAppKey successfully to key \(keyIndex) for node \(unicastAddress)"
        )
        self.meshRepository.onNetworkUpdated()
        
        self.sendEvent(withName: "onAppKeyUpdated", body: "success")
        
        callback([NSNull(), ["success": true, "addNodeAppKey": keyIndex]])
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        self.sendEvent(
          withName: "onAppKeyUpdated", body: error?.localizedDescription)
        
        print(
          "Failed to addNodeAppKey for node \(unicastAddress): \(errorMessage)")
        callback([["error": errorMessage], NSNull()])
      }
    }
    
  }
  
  @objc
  func removeNodeAppKeys(
    _ unicastAddress: Int, keyIndex: Int,
    callback: @escaping RCTResponseSenderBlock
  ) {
    meshRepository.removeNodeAppKeys(
      unicastAddress: unicastAddress, keyIndex: keyIndex
    ) { success, error in
      if success {
        print(
          "addNodeAppKey successfully to key \(keyIndex) for node \(unicastAddress)"
        )
        self.meshRepository.onNetworkUpdated()
        
        self.sendEvent(withName: "onAppKeyUpdated", body: "success")
        
        callback([NSNull(), ["success": true, "addNodeAppKey": keyIndex]])
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        print(
          "Failed to addNodeAppKey for node \(unicastAddress): \(errorMessage)")
        callback([["error": errorMessage], NSNull()])
      }
    }
    
  }
  
  @objc
  func reconnectToProxy(_ unicastAddress: Int, callback: RCTResponseSenderBlock)
  {
    self.meshRepository.scanForProxyNodes()
    callback([NSNull(), "success"])
  }
  
  @objc
  func disconnect(_ callback: RCTResponseSenderBlock) {
    self.meshRepository.disconnectFromProvisionedNode()
    callback([NSNull(), "success"])
    
  }
  
  @objc
  func selectModel(
    _ unicastAddress: Int, elementAddr: Int, modelId: Int, isSigModel: Bool,
    callback: @escaping RCTResponseSenderBlock
  ) {
    do {
      
      guard let meshNetwork = AppDelegate.shared.meshNetworkManager.meshNetwork
      else {
        throw NSError(
          domain: "MeshError", code: 404,
          userInfo: [NSLocalizedDescriptionKey: "Mesh network not found"])
      }
      
      guard let node = meshNetwork.node(withAddress: Address(unicastAddress))
      else {
        throw NSError(
          domain: "MeshError", code: 404,
          userInfo: [NSLocalizedDescriptionKey: "Node not found"])
      }
      
      for element in node.elements {
        if element.unicastAddress == UInt16(elementAddr) {
          // Set the selected element
          meshRepository.setSelectedElement(element: element)
          
          for meshModel in element.models {
            // Check if the model matches the given modelId and whether it is SIG or Vendor
            if meshModel.modelIdentifier == UInt32(modelId)
                && meshModel.isBluetoothSIGAssigned == isSigModel
            {
              
              // Debugging information
              print("selectModel", meshModel.name)
              
              // Set the selected model
              meshRepository.setSelectedModel(model: meshModel)
              
              // Callback with success
              callback([NSNull(), "success"])
              return
            }
          }
          
        }
        
      }
      
      callback([NSNull(), "model not found"])
      
    } catch let error {
      callback([NSNull(), error.localizedDescription])
      
    }
    
  }
  
  @objc
  func getModelBoundKeys(_ callback: RCTResponseSenderBlock) {
    guard let selectedModel = meshRepository.getSelectedModel() else {
      callback([
        NSError(
          domain: "MeshModule", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "Model is null"]), NSNull(),
      ])
      return
    }
    
    let boundKeys = selectedModel.boundApplicationKeys
    var keyArray: [Int] = []
    
    for key in boundKeys {
      keyArray.append(Int(key.index))
    }
    
    callback([NSNull(), keyArray])
  }
  
  @objc
  func getPublicationSettings(
    _ unicastAddress: Int, callback: @escaping RCTResponseSenderBlock
  ) {
    meshRepository.getPublicationSettings(unicastAddress: unicastAddress) {
      result, error in
      if let result = result {
        print("getPublicationSettings successfully for node \(unicastAddress)")
        self.sendEvent(withName: "onPublicationUpdated", body: result)
        callback([NSNull(), result])  // Pass the result as the second element
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        self.sendEvent(
          withName: "onPublicationUpdated", body: error?.localizedDescription)
        print(
          "Failed to getPublicationSettings for node \(unicastAddress): \(errorMessage)"
        )
        callback([["error": errorMessage], NSNull()])
      }
    }
  }
  
  @objc
  func setPublication(
    _ unicastAddress: Int, addressType: Int, appKeyIndex: Int, publishTtl: Int,
    publishAddress: String, publishPeriodInterval: Int,
    publishPeriodResolution: String, retransmitCount: Int,
    retransmitInterval: Int, callback: @escaping RCTResponseSenderBlock
  ) {
    meshRepository.setPublicationSettings(
      unicastAddress: unicastAddress,
      addressType: addressType,
      appKeyIndex: appKeyIndex,
      publishTtl: publishTtl,
      publishAddress: publishAddress,
      publishPeriodInterval: publishPeriodInterval,
      publishPeriodResolution: publishPeriodResolution,
      retransmitCount: retransmitCount,
      retransmitInterval: retransmitInterval
    ) { result, error in
      if let result = result {
        print(result)
        print("setPublication successfully for node \(unicastAddress)")
        self.sendEvent(withName: "onPublicationUpdated", body: result)
        callback([NSNull(), result])  // Pass the result as the second element
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        self.sendEvent(
          withName: "onPublicationUpdated", body: error?.localizedDescription)
        print(
          "Failed to setPublication for node \(unicastAddress): \(errorMessage)"
        )
        callback([NSNull(), NSNull()])
      }
    }
  }
  
  @objc
  func removePublication(
    _ unicastAddress: Int, callback: @escaping RCTResponseSenderBlock
  ) {
    meshRepository.removePublicationSettings(unicastAddress: unicastAddress) {
      result, error in
      if let result = result {
        print(result)
        print("removePublication successfully for node \(unicastAddress)")
        self.sendEvent(withName: "onPublicationUpdated", body: result)
        callback([NSNull(), result])  // Pass the result as the second element
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        self.sendEvent(
          withName: "onPublicationUpdated", body: error?.localizedDescription)
        print(
          "Failed to setPublication for node \(unicastAddress): \(errorMessage)"
        )
        callback([NSNull(), NSNull()])
      }
    }
  }
  
  @objc
  func getSubscriptions(
    _ unicastAddress: Int, callback: @escaping RCTResponseSenderBlock
  ) {
    // Ensure the mesh network is available
    guard let meshNetwork = AppDelegate.shared.meshNetworkManager.meshNetwork
    else {
      print("No mesh network")
      let error = NSError(
        domain: "MeshModuleError", code: 0,
        userInfo: [NSLocalizedDescriptionKey: "No mesh network"])
      self.sendEvent(
        withName: "onSubscriptionReceived", body: error.localizedDescription)
      
      print(
        "Failed to getSubscriptions for node \(unicastAddress): \(error.localizedDescription)"
      )
      callback([["error": error.localizedDescription], NSNull()])
      return
    }
    
    // Find the node with the provided unicast address
    guard let node = meshNetwork.node(withAddress: UInt16(unicastAddress))
    else {
      print("Node not found")
      let error = NSError(
        domain: "MeshModuleError", code: 3,
        userInfo: [NSLocalizedDescriptionKey: "Node not found"])
      self.sendEvent(
        withName: "onSubscriptionReceived", body: error.localizedDescription)
      
      callback([["error": error.localizedDescription], NSNull()])
      return
    }
    
    do {
      print("Reading Subscriptions...")
      
      // Ensure a model is selected
      guard let selectedModel = self.meshRepository.getSelectedModel() else {
        print("Selected model is not set")
        let error = NSError(
          domain: "MeshModuleError", code: 4,
          userInfo: [NSLocalizedDescriptionKey: "Selected model is not set"])
        callback([["error": error.localizedDescription], NSNull()])
        return
      }
      let subscriptionAddresses: [UInt16] = selectedModel.subscriptions
        .map { $0.address.address }
        .filter { $0 != 0xFFFF }
      self.sendEvent(
        withName: "onSubscriptionReceived", body: subscriptionAddresses)
      
      callback([NSNull(), subscriptionAddresses])
    }
  }
  
  @objc
  func bindAppKey(
    _ unicastAddress: Int, appKeyIndex: Int,
    callback: @escaping RCTResponseSenderBlock
  ) {
    meshRepository.bindModelAppKey(
      unicastAddress: unicastAddress, keyIndex: appKeyIndex
    ) { success, error in
      if success {
        print("bindAppKey successfully for node \(unicastAddress)")
        self.meshRepository.onNetworkUpdated()
        
        // Notify and resolve the callback
        self.sendEvent(withName: "onModelKeyUpdated", body: "Success")
        callback([NSNull(), "Success"])
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        self.sendEvent(withName: "onModelKeyUpdated", body: errorMessage)
        print(
          "Failed to bindAppKey for node \(unicastAddress): \(errorMessage)")
        callback([errorMessage, NSNull()])
      }
    }
  }
  
  @objc
  func unbindAppKey(
    _ appKeyIndex: Int, unicastAddress: Int,
    callback: @escaping RCTResponseSenderBlock
  ) {
    meshRepository.unbindAppKey(
      unicastAddress: unicastAddress, keyIndex: appKeyIndex
    ) { success, error in
      if success {
        print("unbindAppKey successfully for node \(unicastAddress)")
        self.meshRepository.onNetworkUpdated()
        
        self.sendEvent(withName: "onModelKeyUpdated", body: "Success")
        
        callback([NSNull(), "Success"])
        
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        self.sendEvent(withName: "onModelKeyUpdated", body: errorMessage)
        
        print(
          "Failed to onModelKeyUpdated for node \(unicastAddress): \(errorMessage)"
        )
        callback([["error": errorMessage], NSNull()])
      }
    }
  }
  
  @objc
  func unsubscribe(
    _ subscriptionInx: Int, unicastAddress: Int,
    callback: @escaping RCTResponseSenderBlock
  ) {
    meshRepository.unsubscribe(
      unicastAddress: unicastAddress, subscriptionInx: subscriptionInx
    ) { result, error in
      if result != nil {
        print("unsubscribe successfully for node \(unicastAddress)")
        self.meshRepository.onNetworkUpdated()
        
        self.sendEvent(withName: "onSubscriptionAdded", body: result)
        
        callback([NSNull(), "Success"])
        
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        self.sendEvent(withName: "onSubscriptionAdded", body: errorMessage)
        
        print(
          "Failed to unsubscribe for node \(unicastAddress): \(errorMessage)")
        callback([["error": errorMessage], NSNull()])
      }
    }
  }
  
  @objc
  func generateGroupAddress(
    _ newGroupName: String, callback: @escaping RCTResponseSenderBlock
  ) {
    let address: MeshAddress
    if let network = AppDelegate.shared.meshNetworkManager.meshNetwork,
       let localProvisioner = network.localProvisioner
    {
      // Try assigning next available Group Address.
      if let automaticAddress = network.nextAvailableGroupAddress(
        for: localProvisioner)
      {
        address = MeshAddress(automaticAddress)
      } else {
        // All addresses from Provisioner's range are taken.
        // A Virtual Label has to be used instead.
        address = MeshAddress(UUID())
      }
      callback([NSNull(), address.address])
    }
  }
  
  @objc
  func getGroups(_ callback: @escaping RCTResponseSenderBlock) {
    guard let meshNetwork = AppDelegate.shared.meshNetworkManager.meshNetwork
    else {
      callback([
        NSError(
          domain: "MeshModule", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "No mesh network"]), NSNull(),
      ])
      return
    }
    
    let groups = meshNetwork.groups
    var groupsList: [[String: Any]] = []
    
    for group in groups {
      let groupMap: [String: Any] = [
        "name": group.name,
        "address": group.address.address,
      ]
      groupsList.append(groupMap)
    }
    
    callback([NSNull(), groupsList])
  }
  
  @objc
  func createNewGroup(
    _ groupName: String, groupAddress: Int,
    callback: @escaping RCTResponseSenderBlock
  ) {
    guard let meshNetwork = AppDelegate.shared.meshNetworkManager.meshNetwork
    else {
      callback([
        NSError(
          domain: "MeshModule", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "No mesh network"]), NSNull(),
      ])
      return
    }
    
    let newGroupAddress = MeshAddress(Address(groupAddress))
    
    do {
      print("Adding new group:", groupName, newGroupAddress)
      // Attempt to create a new group
      let newGroup = try Group(name: groupName, address: newGroupAddress)
      try meshNetwork.add(group: newGroup)
      meshRepository.onNetworkUpdated()
      
      // Successfully created group
      callback([
        NSNull(), ["success": true, "address": newGroup.address.address],
      ])
      
    } catch {
      // Handle any error thrown during group creation
      callback([
        NSNull(), ["success": false, "error": error.localizedDescription],
      ])
      
    }
  }
  
  @objc
  func editGroupName(
    _ groupAddress: Int, groupName: String,
    callback: @escaping RCTResponseSenderBlock
  ) {
    guard let meshNetwork = AppDelegate.shared.meshNetworkManager.meshNetwork
    else {
      callback([
        NSError(
          domain: "MeshModule", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "No mesh network"]), NSNull(),
      ])
      return
    }
    
    let group = meshNetwork.group(
      withAddress: MeshAddress(Address(groupAddress)))
    group?.name = groupName
    callback([NSNull(), "success"])
    
  }
  
  @objc
  func removeGroup(
    _ groupAddress: Int, callback: @escaping RCTResponseSenderBlock
  ) {
    guard let meshNetwork = AppDelegate.shared.meshNetworkManager.meshNetwork
    else {
      callback([
        NSError(
          domain: "MeshModule", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "No mesh network"]), NSNull(),
      ])
      return
    }
    do {
      if let group = meshNetwork.group(
        withAddress: MeshAddress(Address(groupAddress)))
      {
        try meshNetwork.remove(group: group)
      }
    } catch {
      
    }
    callback([NSNull(), "success"])
    
  }
  
  @objc
  func subscribeToExistingGroup(
    _ nodeUnicastAddress: Int, groupAddress: Int,
    callback: @escaping RCTResponseSenderBlock
  ) {
    meshRepository.subscribeToExistingGroup(
      nodeUnicastAddress: nodeUnicastAddress, groupAddress: groupAddress
    ) { result, error in
      if result != nil {
        print("subscribeToExistingGroup successfully to \(groupAddress)")
        
        self.meshRepository.onNetworkUpdated()
        
        self.sendEvent(withName: "onSubscriptionAdded", body: result)
        
        callback([NSNull(), "Success"])
        
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        self.sendEvent(
          withName: "onSubscriptionAdded", body: error?.localizedDescription)
        
        print(
          "Failed to onSubscriptionAdded to \(groupAddress): \(errorMessage)")
        callback([NSNull(), NSNull()])
      }
    }
  }
  
  @objc
  func subscribeToNewGroup(
    _ nodeUnicastAddress: Int, newGroupName: String, groupAddress: Int,
    callback: @escaping RCTResponseSenderBlock
  ) {
    meshRepository.subscribeToNewGroup(
      nodeUnicastAddress: nodeUnicastAddress, newGroupName: newGroupName,
      groupAddress: groupAddress
    ) { result, error in
      if result != nil {
        print("subscribeToNewGroup successfully to \(groupAddress)")
        self.meshRepository.onNetworkUpdated()
        
        self.sendEvent(withName: "onSubscriptionAdded", body: result)
        
        callback([NSNull(), "Success"])
        
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        self.sendEvent(
          withName: "onSubscriptionFailed", body: error?.localizedDescription)
        
        print(
          "Failed to onSubscriptionAdded to \(groupAddress): \(errorMessage)")
        callback([NSNull(), NSNull()])
      }
    }
  }
  
  @objc
  func sendSensorGet(
    _ nodeUnicastAddress: Int, callback: @escaping RCTResponseSenderBlock
  ) {
    meshRepository.sendSensorGet(nodeUnicastAddress: nodeUnicastAddress)
    callback([NSNull(), "Success"])
  }
  
  @objc
  func subscribe(
    _ nodeUnicastAddress: Int, addressToSuscribe: Int,
    callback: @escaping RCTResponseSenderBlock
  ) {
    meshRepository.subscribe(
      nodeUnicastAddress: nodeUnicastAddress,
      addressToSuscribe: addressToSuscribe
    ) { result, error in
      if result != nil {
        print("subscribeToExistingGroup successfully to \(addressToSuscribe)")
        self.meshRepository.onNetworkUpdated()
        
        self.sendEvent(withName: "onSubscriptionReceived", body: result)
        
        callback([NSNull(), "Success"])
        
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        self.sendEvent(
          withName: "onSubscriptionReceived", body: error?.localizedDescription)
        
        print(
          "Failed to onSubscriptionReceived to \(addressToSuscribe): \(errorMessage)"
        )
        callback([NSNull(), NSNull()])
      }
    }
  }
  
  @objc
  func sendVendorModelMessage(
    _ nodeUnicastAddress: Int, opcode: Int, parameters: String,
    callback: @escaping RCTResponseSenderBlock
  ) {
    meshRepository.sendVendorModelMessage(
      nodeUnicastAddress: nodeUnicastAddress, opcode: opcode,
      parameters: parameters
    ) { result, error in
      if result != nil {
        print("sendVendorModelMessage successfully to \(nodeUnicastAddress)")
        callback([NSNull(), "Success"])
        
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        print(
          "Failed to sendVendorModelMessage to \(nodeUnicastAddress): \(errorMessage)"
        )
        callback([NSNull(), NSNull()])
      }
    }
  }
  
  @objc
  func loadMeshNetwork(_ callback: @escaping RCTResponseSenderBlock) {
    do {
      // Attempt to load the mesh network
      let isNetworkLoaded =
      meshRepository.getMeshManager().isNetworkCreated
      if isNetworkLoaded,
         let network = meshRepository.getMeshManager().meshNetwork
      {
        NSLog("Mesh network loaded successfully.")
        // Emit the event to React Native
        self.sendEvent(
          withName: "onNetworkLoaded", body: ["networkName": network.meshName])
        AppDelegate.shared.updateLocalElements()
        // Return success via callback
        callback([
          NSNull(), ["success": true, "networkName": network.meshName],
        ])
      } else {
        // Return failure if the network could not be loaded
        NSLog("Failed to load the mesh network.")
        callback(["Failed to load the mesh network.", NSNull()])
      }
    } catch let error {
      // Handle any errors thrown during the load operation
      NSLog("Error loading mesh network: \(error.localizedDescription)")
      callback([
        "Error loading mesh network: \(error.localizedDescription)", NSNull(),
      ])
    }
  }
  
  @objc
  func editUnprovisionedNodeName(
    _ newNodeName: String, callback: @escaping RCTResponseSenderBlock
  ) {
    let unprovisionedDevice = self.meshRepository.bleManager
      .selectedUnprovisionedNode.device
    unprovisionedDevice.name = newNodeName
    guard
      let provisioningManager = self.meshRepository.bleManager
        .provisioningManager
    else {
      print("provisioning manager has not be initialized")
      callback([NSNull(), NSNull()])
      return
    }
    let node: [String: Any] = [
      "name": unprovisionedDevice.name ?? "default value",
      "numberOfElement": provisioningManager.provisioningCapabilities?
        .numberOfElements,
      "unicastAddress": provisioningManager.unicastAddress,
    ]
    
    callback([NSNull(), node])
    
  }
  
  @objc
  func editUnprovisionedNodeAddr(
    _ newNodeAddr: Int, callback: @escaping RCTResponseSenderBlock
  ) {
    let unprovisionedDevice = self.meshRepository.bleManager
      .selectedUnprovisionedNode.device
    guard
      let provisioningManager = self.meshRepository.bleManager
        .provisioningManager
    else {
      print("provisioning manager has not be initialized")
      callback([NSNull(), NSNull()])
      return
    }
    
    provisioningManager.unicastAddress = Address(newNodeAddr)
    self.meshRepository.newUnicastAddr = Address(newNodeAddr)
    let node: [String: Any] = [
      "name": unprovisionedDevice.name ?? "default value",
      "numberOfElement": provisioningManager.provisioningCapabilities?
        .numberOfElements,
      "unicastAddress": provisioningManager.unicastAddress,
    ]
    
    callback([NSNull(), node])
    
  }
  
  @objc
  func addProxyFilterAddresses(
    _ addresses: NSArray, callback: @escaping RCTResponseSenderBlock
  ) {
    meshRepository.addProxyFilterAddresses(addresses: addresses)
    callback([NSNull(), "success"])
  }
  
  @objc
  func removeProxyFilterAddress(
    _ address: String, callback: @escaping RCTResponseSenderBlock
  ) {
    meshRepository.removeProxyFilterAddress(address: address)
    callback([NSNull(), "success"])
  }
  
  @objc
  func setProxyFilterType(_ filterType: Int, callback: @escaping RCTResponseSenderBlock) {
    meshRepository.setProxyFilterType(selectedFilterType: filterType)
    callback([NSNull(), "success"])
  }
  
  @objc
  func getProxyStatus(_ callback: @escaping RCTResponseSenderBlock) {
    let isConnected = AppDelegate.shared.connection.isConnected
    var proxyName = ""
    if isConnected {
      let proxyNode = AppDelegate.shared.meshNetworkManager.proxyFilter.proxy
      if proxyNode != nil {
        proxyName = proxyNode?.name ?? "Unknown Node"
      }
    }
    
    callback([NSNull(), ["isConnected": isConnected, "proxyName": proxyName]])
  }
  
  func convertArrayToModelsList(models: NSArray) -> [SelectedModelInfo] {
    let swiftModels: [SelectedModelInfo] = models.compactMap { item in
      guard let dict = item as? [String: Any],
            let elementId = dict["elementId"] as? Int,
            let modelId = dict["modelId"] as? Int,
            let modelType = dict["modelType"] as? String
      else {
        return nil
      }
      return SelectedModelInfo(
        elementId: elementId, modelId: modelId, modelType: modelType)
    }
    
    return swiftModels
  }
  
  @objc
  func bindAppKeyToModels(
    _ unicastAddress: Int, appKeyIndex: Int, models: NSArray,
    callback: @escaping RCTResponseSenderBlock
  ) {
    // Convert NSArray (from React Native) to Swift array
    let swiftModels = convertArrayToModelsList(models: models)
    
    meshRepository.bindAppKeyToModels(
      unicastAddress: unicastAddress, keyIndex: appKeyIndex, models: swiftModels
    ) { success, error in
      if success {
        callback([NSNull(), "Success"])
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        callback([errorMessage, NSNull()])
      }
    }
  }
  
  @objc
  func subscribeModels(
    _ unicastAddress: Int, groupAddress: String, models: NSArray,
    callback: @escaping RCTResponseSenderBlock
  ) {
    // Convert NSArray (from React Native) to Swift array
    let swiftModels = convertArrayToModelsList(models: models)
    
    meshRepository.subscribeModels(
      unicastAddress: unicastAddress, groupAddress: groupAddress,
      models: swiftModels
    ) { success, error in
      if success {
        callback([NSNull(), "Success"])
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        callback([errorMessage, NSNull()])
      }
    }
  }
  
  @objc
  func setPublicationToModelList(
    _ unicastAddress: Int, groupAddress: String, models: NSArray,
    appKeyIndex: Int, publishTtl: Int, publishPeriodInterval: Int,
    publishPeriodResolution: String, retransmitCount: Int,
    retransmitInterval: Int, callback: @escaping RCTResponseSenderBlock
  ) {
    
    // Convert NSArray (from React Native) to Swift array
    let swiftModels = convertArrayToModelsList(models: models)
    
    meshRepository.setPublicationSettingsToModelList(
      unicastAddress: unicastAddress,
      groupAddress: groupAddress,
      appKeyIndex: appKeyIndex,
      models: swiftModels,
      publishTtl: publishTtl,
      publishPeriodInterval: publishPeriodInterval,
      publishPeriodResolution: publishPeriodResolution,
      retransmitCount: retransmitCount,
      retransmitInterval: retransmitInterval
    ) { result, error in
      if let result = result {
        callback([NSNull(), result])  // Pass the result as the second element
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        callback([NSNull(), errorMessage])
      }
    }
  }
  
  @objc
  func getProvisioners(_ callback: @escaping RCTResponseSenderBlock) {
    var provisionerArray: [[String: Any]] = []
    guard let network = self.meshRepository.getMeshNetwork() else {
      print("no mesh network")
      callback([NSNull(), NSNull()])
      return
    }
    
    let provisioners = network.provisioners
    for provisioner in provisioners {
      
      var provDict: [String: Any] = [:]
      var allocatedUnicastRangeArray: [[String: Any]] = []
      var allocatedGroupsRangeArray: [[String: Any]] = []
      var allocatedSceneRangeArray: [[String: Any]] = []
      
      // get provisioner node
      let node = network.node(for: provisioner)
      if let node = node {
        provDict["unicastAddress"] = String(format: "%04X", node.unicastAddress)
        provDict["ttl"] = node.defaultTTL ?? "N/A"
        provDict["deviceKey"] = node.deviceKey?.hex
      } else {
        provDict["unicastAddress"] = "N/A"
        provDict["ttl"] = "N/A"
        provDict["deviceKey"] = "N/A"
      }
      
      provDict["name"] = provisioner.name
      provDict["isCurrent"] = provisioner.isLocal
      
      for allocatedUnicastRange in provisioner.allocatedUnicastRange {
        var allocatedUnicastRangeDict: [String: Any] = [:]
        allocatedUnicastRangeDict["lowAddress"] =
        allocatedUnicastRange.lowAddress
        allocatedUnicastRangeDict["highAddress"] =
        allocatedUnicastRange.highAddress
        allocatedUnicastRangeArray.append(allocatedUnicastRangeDict)
      }
      for allocatedGroupRange in provisioner.allocatedGroupRange {
        var allocatedGroupRangeDict: [String: Any] = [:]
        allocatedGroupRangeDict["lowAddress"] = allocatedGroupRange.lowAddress
        allocatedGroupRangeDict["highAddress"] = allocatedGroupRange.highAddress
        allocatedGroupsRangeArray.append(allocatedGroupRangeDict)
      }
      for allocatedSceneRange in provisioner.allocatedSceneRange {
        var allocatedSceneRangeDict: [String: Any] = [:]
        allocatedSceneRangeDict["firstScene"] = allocatedSceneRange.firstScene
        allocatedSceneRangeDict["lastScene"] = allocatedSceneRange.lastScene
        allocatedSceneRangeArray.append(allocatedSceneRangeDict)
      }
      
      provDict["allocatedUnicastAddress"] = allocatedUnicastRangeArray
      provDict["allocatedGroupsAddress"] = allocatedGroupsRangeArray
      provDict["allocatedSceneAddress"] = allocatedSceneRangeArray
      
      provisionerArray.append(provDict)
      
    }
    callback([NSNull(), provisionerArray])
  }
  
  @objc
  func editProvisionerName(
    _ provisionerUnicastAddress: Int, newName: String,
    callback: @escaping RCTResponseSenderBlock
  ) {
    guard let network = self.meshRepository.getMeshNetwork() else {
      print("no mesh network")
      callback([NSNull(), NSNull()])
      return
    }
    
    let provisioners = network.provisioners
    let provisionerToEdit = provisioners.first(where: {
      $0.unicastAddress! == provisionerUnicastAddress
    })
    if provisionerToEdit != nil {
      provisionerToEdit!.name = newName
    }
    AppDelegate.shared.meshNetworkManager.save()
    callback([NSNull(), "success"])
    
  }
  
  @objc
  func editProvisionerUnicastAddress(
    _ provisionerUnicastAddress: Int,
    newAddress: Int,
    callback: @escaping RCTResponseSenderBlock
  ) {
      
      guard let network = self.meshRepository.getMeshNetwork() else {
          print("no mesh network")
          callback([NSNull(), "No mesh network"])
          return
      }
      
      guard let provisionerToEdit = network.provisioners.first(where: {
        $0.unicastAddress! == provisionerUnicastAddress
      }) else {
          callback([NSNull(), "Provisioner not found"])
          return
      }
      
      let newAddr = UInt16(newAddress)
      let elementCount = provisionerToEdit.node?.elementsCount ?? 1
      let lastAddr = newAddr &+ UInt16(elementCount) &- 1
      
      // Ensure lowerBound <= upperBound
      guard newAddr <= lastAddr else {
          callback([NSNull(), "Invalid unicast address range (lowerBound > upperBound)"])
          return
      }
      
      // Validate range against allocated ranges
      let ranges = provisionerToEdit.allocatedUnicastRange
      if (!ranges.contains(AddressRange(from: newAddr, to: lastAddr))) {
          callback([NSNull(), "New unicast address is outside allocated range"])
          return
      }
      
      do {
          try network.assign(unicastAddress: newAddr, for: provisionerToEdit)
          AppDelegate.shared.meshNetworkManager.proxyFilter.add(address: newAddr)
          AppDelegate.shared.meshNetworkManager.save()
          callback([NSNull(), "success"])
      } catch {
          let errorMessage: String
          if let meshError = error as? MeshNetworkError {
              errorMessage = getErrorMessageFromProvisioner(error: meshError)
          } else {
              errorMessage = error.localizedDescription
          }
          callback([NSNull(), errorMessage])
      }
  }

  
  @objc
  func editProvisionerTtl(
    _ provisionerUnicastAddress: Int, ttl: Int,
    callback: @escaping RCTResponseSenderBlock
  ) {
    
    guard let network = self.meshRepository.getMeshNetwork() else {
      print("no mesh network")
      callback([NSNull(), NSNull()])
      return
    }
    
    let provisioners = network.provisioners
    let provisionerToEdit = provisioners.first(where: {
      $0.unicastAddress! == provisionerUnicastAddress
    })
    if provisionerToEdit != nil {
      provisionerToEdit?.node?.defaultTTL = UInt8(ttl)
    }
    AppDelegate.shared.meshNetworkManager.save()
    callback([NSNull(), "success"])
    
  }
  
  @objc
  func editProvisionerUnicastRanges(
    _ provisionerUnicastAddress: Int, ranges: NSArray,
    callback: @escaping RCTResponseSenderBlock
  ) {
    
    guard let network = self.meshRepository.getMeshNetwork() else {
      print("no mesh network")
      callback([NSNull(), NSNull()])
      return
    }
    do {
      let provisioners = network.provisioners
      if let provisionerToEdit = provisioners.first(where: {
        $0.unicastAddress! == provisionerUnicastAddress
      }) {
        provisionerToEdit.deallocateUnicastAddressRange(
          AddressRange.allUnicastAddresses)
        
        var addressesRange: [AddressRange] = []
        for case let range as NSDictionary in ranges {
          if let low = range["lowAddress"] as? NSNumber,
             let high = range["highAddress"] as? NSNumber
          {

            let lowValue = UInt16(low.uint16Value)
            let highValue = UInt16(high.uint16Value)

            guard lowValue <= highValue else {
                print("Invalid range: lowAddress must be <= highAddress")
                callback([NSNull(), "Invalid range: lowAddress must be <= highAddress"])
                return
            }
            
            let newUnicastAddressRange = AddressRange(from: lowValue, to: highValue)
            addressesRange.append(newUnicastAddressRange)
            
          } else {
            print("Invalid range format: \(range)")
            callback([NSNull(), "Invalid range format"])
            return
          }
        }
        // add provisioner unicast address to the ranges
        if ((provisionerToEdit.unicastAddress) != nil){
          addressesRange.append(AddressRange(from: provisionerToEdit.unicastAddress!, to: provisionerToEdit.unicastAddress!))

        }
        
        guard
          network.areRanges(
            addressesRange, availableForAllocationTo: provisionerToEdit)
        else {
          throw MeshNetworkError.overlappingProvisionerRanges
        }
        
        
        try provisionerToEdit.allocateUnicastAddressRanges(addressesRange)
      }
      
      AppDelegate.shared.meshNetworkManager.save()
      callback([NSNull(), "success"])
      
    } catch {
      var errorMessage = getErrorMessageFromProvisioner(
        error: error as! MeshNetworkError)
      let error = NSError(
        domain: "MeshModule", code: 0,
        userInfo: [NSLocalizedDescriptionKey: errorMessage])
      callback([NSNull(), error.localizedDescription])
    }
  }
  
  @objc
  func editProvisionerGroupRanges(
    _ provisionerUnicastAddress: Int, ranges: NSArray,
    callback: @escaping RCTResponseSenderBlock
  ) {
    
    guard let network = self.meshRepository.getMeshNetwork() else {
      print("no mesh network")
      callback([NSNull(), NSNull()])
      return
    }
    do {
      let provisioners = network.provisioners
      if let provisionerToEdit = provisioners.first(where: {
        $0.unicastAddress! == provisionerUnicastAddress
      }) {
        provisionerToEdit.deallocateGroupAddressRange(
          AddressRange.allUnicastAddresses)
        
        var addressesRange: [AddressRange] = []
        for case let range as NSDictionary in ranges {
          if let low = range["lowAddress"] as? NSNumber,
             let high = range["highAddress"] as? NSNumber
          {
            let newAddressRange = AddressRange(
              from: UInt16(low.uint16Value), to: UInt16(high.uint16Value))
            addressesRange.append(newAddressRange)
            
          } else {
            print("Invalid range format: \(range)")
            callback([NSNull(), "Invalid range format"])
            return
          }
        }
        
        guard
          network.areRanges(
            addressesRange, availableForAllocationTo: provisionerToEdit)
        else {
          throw MeshNetworkError.overlappingProvisionerRanges
        }
        
        try provisionerToEdit.allocateGroupAddressRanges(addressesRange)
      }
      
      AppDelegate.shared.meshNetworkManager.save()
      callback([NSNull(), "success"])
      
    } catch {
      var errorMessage = getErrorMessageFromProvisioner(
        error: error as! MeshNetworkError)
      let error = NSError(
        domain: "MeshModule", code: 0,
        userInfo: [NSLocalizedDescriptionKey: errorMessage])
      callback([NSNull(), error.localizedDescription])
    }
  }
  
  func getErrorMessageFromProvisioner(error: MeshNetworkError) -> String {
    var errorMessage: String
    switch error {
    case .nodeAlreadyExist:
      // A node with the same UUID as the Provisioner has been found.
      // This is very unlikely to happen, as UUIDs are randomly generated.
      // The solution is to go cancel and add another Provisioner, which
      // will have another randomly generated UUID.
      errorMessage = "A node for this Provisioner already exists."
    case .overlappingProvisionerRanges:
      errorMessage = "Provisioner's ranges overlap with another Provisioner."
    case .invalidRange:
      errorMessage = "At least one of specified ranges is invalid."
    case .addressNotInAllocatedRange:
      errorMessage =
      "The Provisioner's address range is outside of its allocated range"
    case .addressNotAvailable:
      errorMessage = "The address is already in use or is not valid."
    default:
      errorMessage = "An error occurred."
    }
    return errorMessage
  }
  
  @objc
  func editProvisionerScenesRanges(
    _ provisionerUnicastAddress: Int, ranges: NSArray,
    callback: @escaping RCTResponseSenderBlock
  ) {
    
    guard let network = self.meshRepository.getMeshNetwork() else {
      print("no mesh network")
      callback([NSNull(), NSNull()])
      return
    }
    do {
      let provisioners = network.provisioners
      if let provisionerToEdit = provisioners.first(where: {
        $0.unicastAddress! == provisionerUnicastAddress
      }) {
        provisionerToEdit.deallocateGroupAddressRange(
          AddressRange.allUnicastAddresses)
        
        var sceneRange: [SceneRange] = []
        for case let range as NSDictionary in ranges {
          if let low = range["firstScene"] as? NSNumber,
             let high = range["lastScene"] as? NSNumber
          {
            let newSceneRange = SceneRange(
              from: UInt16(low.uint16Value), to: UInt16(high.uint16Value))
            sceneRange.append(newSceneRange)
            
          } else {
            print("Invalid range format: \(range)")
            callback([NSNull(), "Invalid range format"])
            return
          }
        }
        
        guard
          network.areRanges(
            sceneRange, availableForAllocationTo: provisionerToEdit)
        else {
          throw MeshNetworkError.overlappingProvisionerRanges
        }
        
        try provisionerToEdit.allocateSceneRanges(sceneRange)
      }
      
      AppDelegate.shared.meshNetworkManager.save()
      callback([NSNull(), "success"])
      
    } catch {
      var errorMessage = getErrorMessageFromProvisioner(
        error: error as! MeshNetworkError)
      let error = NSError(
        domain: "MeshModule", code: 0,
        userInfo: [NSLocalizedDescriptionKey: errorMessage])
      callback([NSNull(), error.localizedDescription])
    }
  }
  
  @objc
  func resetNode(
    _ unicastAddress: Int, callback: @escaping RCTResponseSenderBlock
  ) {
    self.meshRepository.resetNode(unicastAddress: unicastAddress) {
      success, error in
      if success {
        print("resetNode successfully for node \(unicastAddress)")
        
        callback([NSNull(), ["success": true]])
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        print("Failed to resetNode for node \(unicastAddress): \(errorMessage)")
        callback([["error": errorMessage], NSNull()])
      }
    }
  }
  
  @objc
  func readProxyState(_ unicastAddress: Int, callback: @escaping RCTResponseSenderBlock) {
    self.meshRepository.readProxyState(unicastAddress: unicastAddress) {
      state, error in
      if (state != nil) {
        print("readProxyState successfully for node \(unicastAddress) state is \(state)")
        callback([state.rawValue, "Success"])
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        print("Failed to readProxyState for node \(unicastAddress): \(errorMessage)")
        callback([["error": errorMessage], NSNull()])
      }
    }
  }
  
  
  @objc
  func toggleProxyState(_ unicastAddress: Int, state:Int, callback: @escaping RCTResponseSenderBlock) {
    self.meshRepository.toggleProxyState(unicastAddress: unicastAddress, state: state)
    callback([NSNull(), "Success"])
    
  }
  
  @objc
  func updateAutomaticConnection(_ autoConnect: Bool, callback: @escaping RCTResponseSenderBlock){
    AppDelegate.shared.connection.delegate = self.meshRepository
    AppDelegate.shared.connection.isConnectionModeAutomatic = autoConnect
  }
  
  
}

extension Data {
  /// Initializes a Data object from a hex string.
  /// - Parameter hexString: The hexadecimal string to convert.
  /// - Returns: A Data object or nil if the conversion fails.
  init?(hexString: String) {
    var data = Data()
    var currentIndex = hexString.startIndex
    
    while currentIndex < hexString.endIndex {
      let nextIndex = hexString.index(currentIndex, offsetBy: 2)
      let byteString = String(hexString[currentIndex..<nextIndex])
      if let num = UInt8(byteString, radix: 16) {
        data.append(num)
      } else {
        return nil  // Return nil if a non-hex character is encountered
      }
      currentIndex = nextIndex
    }
    self = data
  }
}
