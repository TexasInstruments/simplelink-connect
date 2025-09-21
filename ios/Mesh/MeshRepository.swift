import CoreBluetooth
import Foundation
import React
import NordicMesh

typealias DiscoveredPeripheral = (
  device: UnprovisionedDevice,
  bearer: [ProvisioningBearer],
  rssi: [NSNumber],
  uuid: UUID,
  identifier: UUID
)

@objc(MeshRepository)
class MeshRepository: NSObject, LoggerDelegate {
  func log(
    message: String, ofCategory category: LogCategory, withLevel level: LogLevel
  ) {
    print(category, ":", message)
  }
  
  private var meshModule: MeshModule
  public var bleManager: BleManager!
  
  public var pendingTtlCallback: ((UInt8?, Error?) -> Void)?
  private var pendingPublicationGetCallback: (([String: Any]?, Error?) -> Void)?
  private var pendingSubscriptionGetCallback: ((Address?, Error?) -> Void)?
  private var pendingSubscriptionListCallback: (([Int]?, Error?) -> Void)?
  private var pendingBindAppKeyCallback: ((Bool, Error?) -> Void)?
  private var pendingProxyStateCallback: ((NodeFeatureState, Error?) -> Void)?
  private var pendingAppKeyCallback: ((Bool, Error?) -> Void)?
  private var pendingNetKeyCallback: ((Bool, Error?) -> Void)?
  private var pendingNodeResetCallback: ((Bool, Error?) -> Void)?
  private var pendingGetAppKeyCallback: (([KeyIndex]?, Error?) -> Void)?
  private let quickSetupNode = QuickSetupNode()
  
  private var selectedModel: Model?
  private var selectedElement: Element?
  
  public var newUnicastAddr: Address?
  
  init(meshModule: MeshModule) {
    self.meshModule = meshModule
    super.init()
    
  }
  
  // MARK: - Getters
  func getSelectedModel() -> Model? {
    return self.selectedModel
  }
  
  func getSelectedElement() -> Element? {
    return self.selectedElement
  }
  
  func getMeshManager() -> MeshNetworkManager {
    return AppDelegate.shared.meshNetworkManager
  }
  
  func getMeshNetwork() -> MeshNetwork? {
    return getMeshManager().meshNetwork
  }
  
  func getNode(unicastAddress: Int) -> Node? {
    guard let network = getMeshNetwork() else {
      print("no network")
      return nil
    }
    return network.node(withAddress: UInt16(unicastAddress))
    
  }
  
  func getScanResults() -> [DiscoveredPeripheral] {
    return self.bleManager.unprovisionedPeripherals
  }
  
  func getAvailableProxies() -> [DiscoveredGattProxy] {
    return self.bleManager.discoveredProxies
  }
  // MARK: - Helper Methods
  
  private func meshError(code: Int, description: String) -> NSError {
    return NSError(
      domain: "MeshModuleError", code: code,
      userInfo: [NSLocalizedDescriptionKey: description])
  }
  
  private func requireMeshNetwork<T>(completion: (T?, Error?) -> Void)
  -> MeshNetwork?
  {
    guard let meshNetwork = getMeshNetwork() else {
      completion(nil, meshError(code: 0, description: "No mesh network"))
      return nil
    }
    return meshNetwork
  }
  
  private func requireNode(
    for unicastAddress: Int, completion: (Node?, Error?) -> Void
  ) -> Node? {
    if let node = getNode(unicastAddress: unicastAddress) {
      return node
    }
    completion(nil, meshError(code: 3, description: "Node not found"))
    return nil
  }
  
  private func requireSelectedModel<T>(completion: (T?, Error?) -> Void)
  -> Model?
  {
    guard let model = self.selectedModel else {
      completion(
        nil, meshError(code: 4, description: "Selected model is not set"))
      return nil
    }
    return model
  }
  
  private func requireMeshManager<T>(completion: (T?, Error?) -> Void) -> MeshNetworkManager? {
    return getMeshManager()
  }
  
  func onNetworkUpdated() {
    self.meshModule.sendEvent(withName: "onNetworkLoaded", body: ["networkName": getMeshNetwork()?.meshName])
    let meshManager =  getMeshManager()
    meshManager.save()
  }
  
  @objc
  func initializeMeshManager() {
    // Initialize mesh manager
    let meshManager =  getMeshManager()
    do {
      // Attempt to load the mesh network
      let isNetworkLoaded = try meshManager.load()
      
      if isNetworkLoaded, let network = meshManager.meshNetwork {
        if isNetworkLoaded, let network = meshManager.meshNetwork {
          NSLog("Mesh network loaded successfully.")
          self.bleManager = BleManager(meshModule: meshModule)
          self.meshModule.sendEvent(
            withName: "onNetworkLoaded", body: ["networkName": network.meshName]
          )
        } else {
          // If no network is loaded, create a new one
          NSLog("No existing mesh network found, creating a new one.")
          let newNetwork = try createNewMeshNetwork()
          self.onNetworkUpdated()
          self.bleManager = BleManager(meshModule: meshModule)
          
        }
      } else {
        // If load() returns nil, create a new mesh network
        NSLog("Load returned nil, creating a new mesh network.")
        let newNetwork = try createNewMeshNetwork()
        self.onNetworkUpdated()
        self.bleManager = BleManager(meshModule: meshModule)
        
      }
    } catch {
      // Handle and log any errors that occur during initialization
      NSLog(
        "Error initializing the mesh manager: \(error.localizedDescription)")
    }
  }
  
  func createNewMeshNetwork() throws -> MeshNetwork {
    
    NSLog("createNewMeshNetwork")
    let meshNetwork = AppDelegate.shared.createNewMeshNetwork()
    print(
      "New Mesh Network created: \(meshNetwork.meshName),primary network key: \(meshNetwork.networkKeys.first?.key.hex)"
    )
    return meshNetwork
    
  }
  
  func scanForUnprovisionNodes() {
    self.bleManager.scanForUnprovisionNodes()
  }
  
  func scanForProxyNodes() {
    self.bleManager.scanForProxyNodes()
  }
  
  func stopScan() {
    self.bleManager.stopScan()
  }
  
  func selectUnprovisionedNode(unprovisionedDevice: DiscoveredPeripheral, bearerIndex: Int){
    self.bleManager.connectToPeripheral(unprovisionedDevice: unprovisionedDevice, bearerIndex: bearerIndex)
  }
  
  func selectProvisionedNode(proxy: DiscoveredGattProxy) {
    proxy.bearer.open()
  }
  
  func identifyNode() {
    do {
      print("identifyNode")
      let device = self.bleManager.selectedUnprovisionedNode.device
      let bearer = self.bleManager.provisioningBearer
      let meshManager =  getMeshManager()
      self.bleManager.provisioningManager = try meshManager.provision(unprovisionedDevice: device, over: bearer as! ProvisioningBearer)
      self.bleManager.provisioningManager.logger = self
      self.bleManager.provisioningManager.delegate = self
      
      do {
        try self.bleManager.provisioningManager.identify(andAttractFor: 5)
      } catch {
        //Abort
        //Show error log
        print("!!!!!", error.localizedDescription)
      }
      
    } catch {
      print("Failed to provision device: \(error)")
      // Handle the error appropriately here
    }
  }
  
  func startProvisioning() {
    self.bleManager.startProvisioning()
  }
  
  func getProvisionedNodeNetworkKeys(unicastAddress: Int) -> [NetworkKey]? {
    // Iterate over nodes in the mesh network
    for node in getMeshNetwork()!.nodes {
      // Check if the node's unicast address matches
      if node.unicastAddress == UInt16(unicastAddress) {
        // Return the network keys
        return node.networkKeys
      }
    }
    // Return nil if no matching node is found
    return nil
  }
  
  func addNodeNetworkKeys(
    unicastAddress: Int, keyIndex: Int,
    completion: @escaping (Bool, Error?) -> Void
  ) {
    guard
      let node = requireNode(
        for: unicastAddress, completion: { (_: Node?, _: Error?) in })
    else { return }
    guard
      let meshManager = requireMeshManager(completion: {
        (_: MeshNetworkManager?, _: Error?) in
      })
    else { return }
    guard
      let meshNetwork: MeshNetwork = requireMeshNetwork(completion: {
        (_: MeshNetwork?, _: Error?) in
      })
    else { return }
    do {
      let netKey = meshNetwork.networkKeys[keyIndex]
      print("Adding Network Key...")
      let message = ConfigNetKeyAdd(networkKey: netKey)
      // Listen for the response
      meshManager.delegate = self
      
      try meshManager.send(message, to: node)
      
      // Save a reference to the completion handler to call later
      self.pendingNetKeyCallback = completion
    } catch {
      print("Failed to send Netkey Add message: \(error.localizedDescription)")
      completion(false, error)
    }
    
  }
  
  func resetNode(
    unicastAddress: Int, completion: @escaping (Bool, Error?) -> Void
  ) {
    guard
      let node = requireNode(
        for: unicastAddress, completion: { (_: Node?, _: Error?) in })
    else { return }
    guard
      let meshManager = requireMeshManager(completion: {
        (_: MeshNetworkManager?, _: Error?) in
      })
    else { return }
    guard
      let meshNetwork: MeshNetwork = requireMeshNetwork(completion: {
        (_: MeshNetwork?, _: Error?) in
      })
    else { return }
    do {
      print("Reset Node...")
      let message = ConfigNodeReset()
      // Listen for the response
      meshManager.delegate = self
      
      try meshManager.send(message, to: node)
      
      // Save a reference to the completion handler to call later
      self.pendingNodeResetCallback = completion
      
    } catch {
      print("Failed to send ConfigNodeReset: \(error.localizedDescription)")
      completion(false, error)
      
    }
    
  }
  
  func setTtl(
    unicastAddress: Int, ttl: Int,
    completion: @escaping (UInt8?, Error?) -> Void
  ) {
    guard
      let node = requireNode(
        for: unicastAddress, completion: { (_: Node?, _: Error?) in })
    else { return }
    guard
      let meshManager = requireMeshManager(completion: {
        (_: MeshNetworkManager?, _: Error?) in
      })
    else { return }
    
    do {
      print("Setting TTL...")
      let message = ConfigDefaultTtlSet(ttl: UInt8(ttl))
      
      // Listen for the response
      meshManager.delegate = self
      
      try meshManager.send(message, to: node)
      
      // Save a reference to the completion handler to call later
      self.pendingTtlCallback = completion
    } catch {
      print("Failed to send TTL message: \(error.localizedDescription)")
      completion(nil, error)
    }
    
  }
  
  func getTtl(unicastAddress: Int, completion: @escaping (UInt8?, Error?) -> Void) {
    guard let node = requireNode(for: unicastAddress, completion: { (_: Node?, _: Error?) in }) else { return }
    guard let meshManager = requireMeshManager(completion: {(_: MeshNetworkManager?, _: Error?) in }) else { return }
    
    let connectedDevice = self.meshModule.connectedDevices.first(where: {
      $0.nodeUnicastAddress == unicastAddress
    })
    
    if !isDeviceConnected(peripheralUUID: connectedDevice?.uuid, peripheralIdentifier: connectedDevice?.identifier) {
      print("Device is disconnected")
      completion(
        nil,
        NSError(
          domain: "MeshModuleError", code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Device is disconnected"]))
      return
    }
    do {
      print("Getting TTL...")
      let message = ConfigDefaultTtlGet()
      
      // Listen for the response
      meshManager.delegate = self
      
      try meshManager.send(message, to: node)
      
      // Save a reference to the completion handler to call later
      self.pendingTtlCallback = completion
    } catch {
      print("Failed to send TTL message: \(error.localizedDescription)")
      completion(nil, error)
    }
  }
  
  func addNodeAppKey(
    unicastAddress: Int, keyIndex: Int,
    completion: @escaping (Bool, Error?) -> Void
  ) {
    guard
      let meshNetwork: MeshNetwork = requireMeshNetwork(completion: {
        (_: MeshNetwork?, _: Error?) in
      })
    else { return }
    guard
      let node = requireNode(
        for: unicastAddress, completion: { (_: Node?, _: Error?) in })
    else { return }
    guard
      let meshManager = requireMeshManager(completion: {
        (_: MeshNetworkManager?, _: Error?) in
      })
    else { return }
    do {
      let appKey = meshNetwork.applicationKeys[keyIndex]
      print("Adding App Key...")
      let message = ConfigAppKeyAdd(applicationKey: appKey)
      
      // Listen for the response
      meshManager.delegate = self
      
      try meshManager.send(message, to: node)
      
      // Save a reference to the completion handler to call later
      self.pendingAppKeyCallback = completion
    } catch {
      print("Failed to send AppKey Add message: \(error.localizedDescription)")
      completion(false, error)
    }
    
  }
  
  func removeNodeNetworkKeys(
    unicastAddress: Int, keyIndex: Int,
    completion: @escaping (Bool, Error?) -> Void
  ) {
    guard
      let meshNetwork: MeshNetwork = requireMeshNetwork(completion: {
        (_: MeshNetwork?, _: Error?) in
      })
    else { return }
    guard
      let node = requireNode(
        for: unicastAddress, completion: { (_: Node?, _: Error?) in })
    else { return }
    guard
      let meshManager = requireMeshManager(completion: {
        (_: MeshNetworkManager?, _: Error?) in
      })
    else { return }
    
    do {
      let netKey = meshNetwork.networkKeys[keyIndex]
      print("Removing Net Key...")
      let message = ConfigNetKeyDelete(networkKey: netKey)
      
      // Listen for the response
      meshManager.delegate = self
      
      try meshManager.send(message, to: node)
      
      // Save a reference to the completion handler to call later
      self.pendingNetKeyCallback = completion
    } catch {
      print(
        "Failed to send NetKey Delete message: \(error.localizedDescription)")
      completion(false, error)
    }
  }
  
  func removeNodeAppKeys(
    unicastAddress: Int, keyIndex: Int,
    completion: @escaping (Bool, Error?) -> Void
  ) {
    guard
      let meshNetwork: MeshNetwork = requireMeshNetwork(completion: {
        (_: MeshNetwork?, _: Error?) in
      })
    else { return }
    guard
      let node = requireNode(
        for: unicastAddress, completion: { (_: Node?, _: Error?) in })
    else { return }
    guard
      let meshManager = requireMeshManager(completion: {
        (_: MeshNetworkManager?, _: Error?) in
      })
    else { return }
    
    do {
      let appKey = meshNetwork.applicationKeys[keyIndex]
      print("Removing App Key...")
      let message = ConfigAppKeyDelete(applicationKey: appKey)
      
      // Listen for the response
      meshManager.delegate = self
      
      try meshManager.send(message, to: node)
      
      // Save a reference to the completion handler to call later
      self.pendingAppKeyCallback = completion
    } catch {
      print("Failed to send AppKey Add message: \(error.localizedDescription)")
      completion(false, error)
    }
  }
  
  func isDeviceConnected(peripheralUUID: UUID?, peripheralIdentifier: UUID?) -> Bool {
    // Find the connected device
    let connectedDevice = self.meshModule.connectedDevices.first(where: {
      $0.uuid == peripheralUUID || $0.identifier == peripheralIdentifier
    })
    
    if peripheralUUID == nil, peripheralIdentifier == nil{
      return AppDelegate.shared.connection.isOpen
    }
    
    // Retrieve peripherals and check if any match
    let peripherals = self.bleManager.centralManager.retrievePeripherals(withIdentifiers: [peripheralUUID!])
    
    // if there are no peripheral with such uuid, then check if proxy is connected
    if (peripherals.isEmpty){
      return AppDelegate.shared.connection.isOpen
    }
    return !peripherals.isEmpty && AppDelegate.shared.connection.isOpen
  }
  

  func disconnectFromProvisionedNode() {
      guard let connection = AppDelegate.shared.connection else {
          return
      }

      // Disconnect from provisioned proxy node
      if let selectedDevice = self.bleManager.selectedProvisionedDevice {
          do {
              let proxies = try connection.proxies.value()
  
              // Print all proxy identifiers
              proxies.forEach { print($0.identifier) }
              
              // Find the proxy that matches the selected provisioned device
            var found = false
            proxies.forEach {
              if ($0.identifier == selectedDevice.identifier){
                found = true
                connection.delegate = self
                $0.close()
              }
            }
            // if not found match proxy, close the connection
            if (!found) {
              print("not found node proxy, closing connection !!!!!!")
              connection.delegate = self
              connection.close()
            }
          } catch {
              print("Failed to get proxies: \(error)")
          }
      }
      
      // Disconnect from unprovisioned devices
      else if let unprovisionedNode = self.bleManager.selectedUnprovisionedNode,
              let bearer = unprovisionedNode.bearer.first {
          bearer.delegate = self
          do {
              try bearer.close()
          } catch {
              print("Failed to close bearer: \(error)")
          }
      }
    
    else {
      print("NO DEVICE TO DISCONNECT")
    }
  }
  
  
  func setSelectedElement(element: Element) {
    self.selectedElement = element
  }
  
  func setSelectedModel(model: Model) {
    self.selectedModel = model
  }
  
  func getPublicationSettings(
    unicastAddress: Int, completion: @escaping ([String: Any]?, Error?) -> Void
  ) {
    guard
      let node = requireNode(
        for: unicastAddress, completion: { (_: Node?, _: Error?) in })
    else { return }
    guard
      let selectedModel = requireSelectedModel(completion: {
        (_: Model?, _: Error?) in
      })
    else { return }
    guard
      let meshManager = requireMeshManager(completion: {
        (_: MeshNetworkManager?, _: Error?) in
      })
    else { return }
    
    do {
      print("Reading Publication Settings...")
      
      let message = ConfigModelPublicationGet(for: selectedModel)!
      
      // Set the delegate to listen for responses
      meshManager.delegate = self
      
      // Send the message to the node
      try meshManager.send(message, to: node)
      
      // Save the completion handler for later use
      self.pendingPublicationGetCallback = completion
    } catch {
      // Handle errors in sending the message
      print(
        "Failed to send ConfigModelPublicationGet message: \(error.localizedDescription)"
      )
      completion(nil, error)
    }
  }
  
  func setPublicationSettings(
    unicastAddress: Int,
    addressType: Int,
    appKeyIndex: Int,
    publishTtl: Int,
    publishAddress: String,
    publishPeriodInterval: Int,
    publishPeriodResolution: String,
    retransmitCount: Int,
    retransmitInterval: Int,
    completion: @escaping ([String: Any]?, Error?) -> Void
  ) {
    
    guard
      let meshNetwork: MeshNetwork = requireMeshNetwork(completion: {
        (_: MeshNetwork?, _: Error?) in
      })
    else { return }
    guard
      let node = requireNode(
        for: unicastAddress, completion: { (_: Node?, _: Error?) in })
    else { return }
    guard
      let selectedModel = requireSelectedModel(completion: {
        (_: Model?, _: Error?) in
      })
    else { return }
    guard
      let meshManager = requireMeshManager(completion: {
        (_: MeshNetworkManager?, _: Error?) in
      })
    else { return }
    
    do {
      print("Configure Publication Settings...")
      
      let appKey = meshNetwork.applicationKeys.first(where: {
        $0.index == appKeyIndex
      })
      
      var publish: Publish;
      var retransmit: Publish.Retransmit;
      var period: Publish.Period;
      
      if (publishPeriodResolution == "disabled"){
        period = .disabled
      }
      else {
        var resolution: StepResolution = .hundredsOfMilliseconds
        
        switch publishPeriodResolution {
        case "10 minutes":
          resolution = .tensOfMinutes
          break
        case "10 seconds":
          resolution = .tensOfSeconds
          break
        case "1 second":
          resolution = .seconds
          break
        case "100 milliseconds":
          resolution = .hundredsOfMilliseconds
          break
          
        default:
          resolution = .hundredsOfMilliseconds
        }
        
        period = Publish.Period(
          steps: UInt8(publishPeriodInterval),
          resolution: resolution)
      }
      
      if (retransmitCount == -1) {
        retransmit = .disabled
      }
      else {
        retransmit = Publish.Retransmit(
          publishRetransmitCount: UInt8(retransmitCount),
          intervalSteps: UInt8(retransmitInterval))
      }
      
      publish = Publish(
        to: MeshAddress(Address(Int(publishAddress, radix: 16)!)),
        using: appKey!,
        usingFriendshipMaterial: false, ttl: UInt8(publishTtl),
        period:period,
        retransmit: retransmit
        )
      
        
        let message = ConfigModelPublicationSet(publish, to: selectedModel)!
      
      // Set the delegate to listen for responses
      meshManager.delegate = self
      
      // Send the message to the node
      try meshManager.send(message, to: node)
      
      // Save the completion handler for later use
      self.pendingPublicationGetCallback = completion
    } catch {
      // Handle errors in sending the message
      print(
        "Failed to send ConfigModelPublicationGet message: \(error.localizedDescription)"
      )
      completion(nil, error)
    }
  }
  
  func removePublicationSettings(
    unicastAddress: Int, completion: @escaping ([String: Any]?, Error?) -> Void
  ) {
    guard
      let meshNetwork: MeshNetwork = requireMeshNetwork(completion: {
        (_: MeshNetwork?, _: Error?) in
      })
    else { return }
    guard
      let node = requireNode(
        for: unicastAddress, completion: { (_: Node?, _: Error?) in })
    else { return }
    guard
      let selectedModel = requireSelectedModel(completion: {
        (_: Model?, _: Error?) in
      })
    else { return }
    guard
      let meshManager = requireMeshManager(completion: {
        (_: MeshNetworkManager?, _: Error?) in
      })
    else { return }
    
    do {
      print("Configure Publication Settings...")
      
      let message = ConfigModelPublicationSet(
        disablePublicationFor: selectedModel)!
      
      // Set the delegate to listen for responses
      meshManager.delegate = self
      
      // Send the message to the node
      try meshManager.send(message, to: node)
      
      // Save the completion handler for later use
      self.pendingPublicationGetCallback = completion
    } catch {
      // Handle errors in sending the message
      print(
        "Failed to send ConfigModelPublicationGet message: \(error.localizedDescription)"
      )
      completion(nil, error)
    }
  }
  
  func bindModelAppKey(
    unicastAddress: Int, keyIndex: Int,
    completion: @escaping (Bool, Error?) -> Void
  ) {
    guard
      let meshNetwork: MeshNetwork = requireMeshNetwork(completion: {
        (_: MeshNetwork?, _: Error?) in
      })
    else { return }
    guard
      let node = requireNode(
        for: unicastAddress, completion: { (_: Node?, _: Error?) in })
    else { return }
    guard
      let selectedModel = requireSelectedModel(completion: {
        (_: Model?, _: Error?) in
      })
    else { return }
    guard
      let meshManager = requireMeshManager(completion: {
        (_: MeshNetworkManager?, _: Error?) in
      })
    else { return }
    
    do {
      print("Binding App Key ...")
      
      let selectedAppKey = meshNetwork.applicationKeys[keyIndex]
      
      let message = ConfigModelAppBind(
        applicationKey: selectedAppKey, to: selectedModel)!
      
      // Set the delegate to listen for responses
      meshManager.delegate = self
      
      // Send the message to the node
      try meshManager.send(message, to: node)
      
      // Save the completion handler for later use
      self.pendingBindAppKeyCallback = completion
      
    } catch {
      // Handle errors in sending the message
      print(
        "Failed to send ConfigModelAppBind message: \(error.localizedDescription)"
      )
      completion(false, error)
    }
  }
  
  func bindAppKeyToModels(
    unicastAddress: Int, keyIndex: Int, models: [SelectedModelInfo],
    completion: @escaping (Bool, Error?) -> Void
  ) {
    guard
      let meshNetwork: MeshNetwork = requireMeshNetwork(completion: {
        (_: MeshNetwork?, _: Error?) in
      })
    else { return }
    guard
      let node = requireNode(
        for: unicastAddress, completion: { (_: Node?, _: Error?) in })
    else { return }
    
    print("Binding App Key to multiple models ...")
    
    let selectedAppKey = meshNetwork.applicationKeys[keyIndex]
    var modelList: [Model] = []
    
    for modelData in models {
      guard
        let selectedModel = node.elements
          .first(where: { $0.unicastAddress == modelData.elementId })?
          .models.first(where: {
            $0.modelIdentifier == modelData.modelId
            && ($0.isBluetoothSIGAssigned
                == (modelData.modelType == "Bluetooth SIG"))
          })
      else {
        print(
          "Model with ID \(modelData.modelId) not found for element \(modelData.elementId)"
        )
        continue
      }
      
      modelList.append(selectedModel)
    }
    
    AppDelegate.shared.meshNetworkManager.delegate = self.quickSetupNode
    self.quickSetupNode.bindAppKeyToListModels(node: node, applicationKey: selectedAppKey, models: modelList) { results in
      AppDelegate.shared.meshNetworkManager.delegate = self.meshModule.meshRepository
      self.meshModule.sendEvent(withName: "onBindAppKeysDone", body: results)
    }
  }
  
  func unbindAppKey(
    unicastAddress: Int, keyIndex: Int,
    completion: @escaping (Bool, Error?) -> Void
  ) {
    guard
      let meshNetwork: MeshNetwork = requireMeshNetwork(completion: {
        (_: MeshNetwork?, _: Error?) in
      })
    else { return }
    guard
      let node = requireNode(
        for: unicastAddress, completion: { (_: Node?, _: Error?) in })
    else { return }
    guard
      let selectedModel = requireSelectedModel(completion: {
        (_: Model?, _: Error?) in
      })
    else { return }
    guard
      let meshManager = requireMeshManager(completion: {
        (_: MeshNetworkManager?, _: Error?) in
      })
    else { return }
    
    do {
      print("Unbinding App Key ...")
      
      let selectedAppKey = meshNetwork.applicationKeys[keyIndex]
      
      let message = ConfigModelAppUnbind(
        applicationKey: selectedAppKey, to: selectedModel)!
      
      // Set the delegate to listen for responses
      meshManager.delegate = self
      
      // Send the message to the node
      try meshManager.send(message, to: node)
      
      // Save the completion handler for later use
      self.pendingBindAppKeyCallback = completion
      
    } catch {
      // Handle errors in sending the message
      print(
        "Failed to send ConfigModelAppUnbind message: \(error.localizedDescription)"
      )
      completion(false, error)
    }
  }
  
  func unsubscribe(
    unicastAddress: Int, subscriptionInx: Int,
    completion: @escaping (Address?, Error?) -> Void
  ) {
    guard let meshNetwork = requireMeshNetwork(completion: completion) else {
      return
    }
    guard let meshManager = requireMeshManager(completion: completion) else {
      return
    }
    guard
      let node = requireNode(
        for: unicastAddress, completion: { (_: Node?, _: Error?) in })
    else { return }
    guard let selectedModel = requireSelectedModel(completion: completion)
    else { return }
    
    do {
      print("Unsubscribe ...")
      
      let group = selectedModel.subscriptions[subscriptionInx]
      
      let message: AcknowledgedConfigMessage =
      ConfigModelSubscriptionDelete(group: group, from: selectedModel)
      ?? ConfigModelSubscriptionVirtualAddressDelete(
        group: group, from: selectedModel)!
      //the mesh manager is initialized
      
      // Set the delegate to listen for responses
      meshManager.delegate = self
      
      // Send the message to the node
      try meshManager.send(message, to: node)
      
      // Save the completion handler for later use
      self.pendingSubscriptionGetCallback = completion
      
    } catch {
      // Handle errors in sending the message
      print(
        "Failed to send ConfigModelAppUnbind message: \(error.localizedDescription)"
      )
      completion(nil, error)
    }
  }
  
  func subscribeToExistingGroup(
    nodeUnicastAddress: Int, groupAddress: Int,
    completion: @escaping (Address?, Error?) -> Void
  ) {
    guard
      let meshNetwork: MeshNetwork = requireMeshNetwork(completion: {
        (_: MeshNetwork?, _: Error?) in
      })
    else { return }
    guard
      let node = requireNode(
        for: nodeUnicastAddress, completion: { (_: Node?, _: Error?) in })
    else { return }
    guard
      let meshManager = requireMeshManager(completion: {
        (_: MeshNetworkManager?, _: Error?) in
      })
    else { return }
    guard let selectedModel = requireSelectedModel(completion: completion)
    else { return }
    
    guard let group = meshNetwork.group(withAddress: UInt16(groupAddress))
    else {
      print("group not found")
      let error = NSError(
        domain: "MeshModuleError", code: 3,
        userInfo: [NSLocalizedDescriptionKey: "group not found"])
      completion(nil, error)
      return
    }
    
    do {
      print("Subscribe to Group \(groupAddress) ...")
      
      let message = ConfigModelSubscriptionAdd(group: group, to: selectedModel)!
      
      // Set the delegate to listen for responses
      meshManager.delegate = self
      
      // Send the message to the node
      try meshManager.send(message, to: node)
      
      // Save the completion handler for later use
      self.pendingSubscriptionGetCallback = completion
      
    } catch {
      // Handle errors in sending the message
      print(
        "Failed to send ConfigModelAppBind message: \(error.localizedDescription)"
      )
      completion(nil, error)
    }
  }
  
  func subscribeToNewGroup(
    nodeUnicastAddress: Int, newGroupName: String, groupAddress: Int,
    completion: @escaping (Address?, Error?) -> Void
  ) {
    guard
      let meshNetwork: MeshNetwork = requireMeshNetwork(completion: {
        (_: MeshNetwork?, _: Error?) in
      })
    else { return }
    guard
      let node = requireNode(
        for: nodeUnicastAddress, completion: { (_: Node?, _: Error?) in })
    else { return }
    guard
      let meshManager = requireMeshManager(completion: {
        (_: MeshNetworkManager?, _: Error?) in
      })
    else { return }
    guard let selectedModel = requireSelectedModel(completion: completion)
    else { return }
    
    do {
      
      let newGroupAddress = MeshAddress(Address(groupAddress))
      
      let newGroup = try Group(name: newGroupName, address: newGroupAddress)
      try meshNetwork.add(group: newGroup)
      self.onNetworkUpdated()
      
      print("Subscribe to Group \(groupAddress) ...")
      
      let message = ConfigModelSubscriptionAdd(
        group: newGroup, to: selectedModel)!
      
      // Set the delegate to listen for responses
      meshManager.delegate = self
      
      // Send the message to the node
      try meshManager.send(message, to: node)
      
      // Save the completion handler for later use
      self.pendingSubscriptionGetCallback = completion
      
    } catch {
      // Handle errors in sending the message
      print(
        "Failed to send ConfigModelAppBind message: \(error.localizedDescription)"
      )
      completion(nil, error)
    }
  }
  
  func subscribe(
    nodeUnicastAddress: Int, addressToSuscribe: Int,
    completion: @escaping ([Int]?, Error?) -> Void
  ) {
    guard
      let node = requireNode(
        for: nodeUnicastAddress, completion: { (_: Node?, _: Error?) in })
    else { return }
    guard
      let meshManager = requireMeshManager(completion: {
        (_: MeshNetworkManager?, _: Error?) in
      })
    else { return }
    guard let selectedModel = requireSelectedModel(completion: completion)
    else { return }
    
    // Find the node with the provided unicast address
    guard let node = getNode(unicastAddress: nodeUnicastAddress) else {
      print("node not found")
      let error = NSError(
        domain: "MeshModuleError", code: 3,
        userInfo: [NSLocalizedDescriptionKey: "node not found"])
      completion(nil, error)
      return
    }
    
    do {
      print("Subscribe to Address \(addressToSuscribe) ...")
      
      // Ensure a model is selected
      guard let selectedModel = self.selectedModel else {
        print("Selected model is not set")
        let error = NSError(
          domain: "MeshModuleError", code: 4,
          userInfo: [NSLocalizedDescriptionKey: "Selected model is not set"])
        completion(nil, error)
        return
      }
      
      let tempGroup = try Group(
        name: "Temp Group", address: MeshAddress(Address(addressToSuscribe)))
      guard
        let message = ConfigModelSubscriptionAdd(
          group: tempGroup, to: selectedModel)
      else {
        print("Failed to create ConfigModelSubscriptionAdd message")
        let error = NSError(
          domain: "MeshModuleError", code: 5,
          userInfo: [
            NSLocalizedDescriptionKey:
              "Failed to create ConfigModelSubscriptionAdd message"
          ])
        completion(nil, error)
        return
      }
      
      // Ensure the mesh manager is initialized
      let meshManager = getMeshManager()
      
      // Set the delegate to listen for responses
      meshManager.delegate = self
      
      // Send the message to the node
      try meshManager.send(message, to: node)
      
      // Save the completion handler for later use
      self.pendingSubscriptionListCallback = completion
      
    } catch {
      // Handle errors in sending the message
      print(
        "Failed to send ConfigModelAppBind message: \(error.localizedDescription)"
      )
      completion(nil, error)
    }
  }
  
  func sendVendorModelMessage(
    nodeUnicastAddress: Int, opcode: Int, parameters: String,
    completion: @escaping ([Int]?, Error?) -> Void
  ) {
    // Find the node with the provided unicast address
    guard let node = getNode(unicastAddress: nodeUnicastAddress) else {
      print("node not found")
      let error = NSError(
        domain: "MeshModuleError", code: 3,
        userInfo: [NSLocalizedDescriptionKey: "node not found"])
      completion(nil, error)
      return
    }
    
    do {
      print("sendVendorModelMessage \(nodeUnicastAddress) ...")
      
      // Ensure a model is selected
      guard let selectedModel: Model = node.elements.first?.models.first(where: { $0.modelIdentifier == self.selectedModel?.modelIdentifier && $0.isBluetoothSIGAssigned == self.selectedModel?.isBluetoothSIGAssigned}) else {
        print("Vendor model not found")
        return
      }
      self.selectedModel = selectedModel
      
      let parameterData = Data(hex: parameters)
      let message = RuntimeUnacknowledgedVendorMessage(
        opCode: UInt8(opcode), for: selectedModel,
        parameters: Data(hex: parameters))
      
      // Ensure the mesh manager is initialized
      let meshManager = getMeshManager()
      // Set the delegate to listen for responses
      meshManager.delegate = self
      
      // Send the message to the node
      try meshManager.send(message, to: selectedModel)
      // Save the completion handler for later use
      self.pendingSubscriptionListCallback = completion
      
    } catch {
      // Handle errors in sending the message
      print(
        "Failed to send ConfigModelAppBind message: \(error.localizedDescription)"
      )
      completion(nil, error)
    }
  }
  
  func sendSensorGet(nodeUnicastAddress: Int) {
    let meshManager = getMeshManager()
    
    // Find the node by its unicast address
    guard let node = getNode(unicastAddress: nodeUnicastAddress) else {
      print("Node not found for unicast address: \(nodeUnicastAddress)")
      return
    }
    
    // Find the Sensor Server model in the node
    guard
      let sensorModel = node.elements
        .flatMap({ $0.models })
        .first(where: { $0.modelIdentifier == 0x1100 })
    else {
      print("Sensor Server model not found in node: \(nodeUnicastAddress)")
      return
    }
    
    do {
      print("Sending SensorGet message to node: \(nodeUnicastAddress)")
      
      // Construct the SensorGet message
      let message = SensorGet()
      
      // Set the delegate to handle responses
      meshManager.delegate = self
      
      // Send the message
      try meshManager.send(message, to: sensorModel)
      
      print(
        "SensorGet message sent successfully to node: \(nodeUnicastAddress)")
      
    } catch {
      print("Error sending SensorGet message: \(error.localizedDescription)")
    }
  }
  
  func connectToProvisionedNode(identifier: String, nodeUnicastAddress: Int) {
    // Loop through scan results and find the matching peripheral
    for result in getAvailableProxies() {
      if result.peripheral.identifier.uuidString == identifier {
        print("found selected device")
        
        result.bearer.delegate = self
        result.bearer.logger = self
        print(result.bearer.identifier)
        result.bearer.open()
        
        return
      }
    }
    
  }
  
  func removeProxyFilterAddress(address: String) {
    let manager = MeshNetworkManager.instance
    
    manager.delegate = self
    manager.logger = self
    MeshNetworkManager.instance.proxyFilter.delegate = self
    
    let a = UInt16(address, radix: 16)!
    let convertedAddress = Address(a)
    
    manager.proxyFilter.remove(address: convertedAddress)
  }
  
  func addProxyFilterAddresses(addresses: NSArray) {
    let manager = MeshNetworkManager.instance
    
    manager.delegate = self
    manager.logger = self
    MeshNetworkManager.instance.proxyFilter.delegate = self
    
    var addressesList: [Address] = []
    
    for address in addresses {
      print(type(of: address))
      let a = UInt16(address as! String, radix: 16)!
      let convertedAddress = Address(a)
      addressesList.append(convertedAddress)
      
    }
    
    manager.proxyFilter.add(addresses: addressesList)
  }
  
  func setProxyFilterType(selectedFilterType: Int) {
    let manager = MeshNetworkManager.instance
    let filterType: ProxyFilerType
    if selectedFilterType == 0 {
      filterType = .acceptList
    }
    else {
      filterType = .rejectList
    }
    
    manager.delegate = self
    manager.logger = self
    MeshNetworkManager.instance.proxyFilter.delegate = self
    
    manager.proxyFilter.setType(filterType)
    
  }
  
  func subscribeModels(
    unicastAddress: Int, groupAddress: String, models: [SelectedModelInfo],
    completion: @escaping (Bool, Error?) -> Void
  ) {
    guard
      let meshNetwork: MeshNetwork = requireMeshNetwork(completion: {
        (_: MeshNetwork?, _: Error?) in
      })
    else { return }
    guard
      let node = requireNode(
        for: unicastAddress, completion: { (_: Node?, _: Error?) in })
    else { return }
    
    print("Subscribing to multiple models ...")
    
    var modelList: [Model] = []
    
    for modelData in models {
      guard
        let selectedModel = node.elements
          .first(where: { $0.unicastAddress == modelData.elementId })?
          .models.first(where: {
            $0.modelIdentifier == modelData.modelId
            && ($0.isBluetoothSIGAssigned
                == (modelData.modelType == "Bluetooth SIG"))
          })
      else {
        print(
          "Model with ID \(modelData.modelId) not found for element \(modelData.elementId)"
        )
        continue
      }
      
      modelList.append(selectedModel)
    }
    
    guard
      let group = meshNetwork.group(
        withAddress: UInt16(groupAddress, radix: 16)!)
    else {
      print("group not found")
      let error = NSError(
        domain: "MeshModuleError", code: 3,
        userInfo: [NSLocalizedDescriptionKey: "group not found"])
      return
    }
    
    AppDelegate.shared.meshNetworkManager.delegate = self.quickSetupNode
    self.quickSetupNode.subscribeToListModels(node: node, group: group, models: modelList ){ results in
      AppDelegate.shared.meshNetworkManager.delegate = self.meshModule.meshRepository
      self.meshModule.sendEvent(withName: "onSubscriptionDone", body: results)
    }
    
  }
  
  func setPublicationSettingsToModelList(
    unicastAddress: Int,
    groupAddress: String,
    appKeyIndex: Int,
    models: [SelectedModelInfo],
    publishTtl: Int,
    publishPeriodInterval: Int,
    publishPeriodResolution: String,
    retransmitCount: Int,
    retransmitInterval: Int,
    completion: @escaping ([String: Any]?, Error?) -> Void
  ) {
    
    guard
      let meshNetwork: MeshNetwork = requireMeshNetwork(completion: {
        (_: MeshNetwork?, _: Error?) in
      })
    else { return }
    guard
      let node = requireNode(
        for: unicastAddress, completion: { (_: Node?, _: Error?) in })
    else { return }
    
    guard
      let appKey = meshNetwork.applicationKeys.first(where: {
        $0.index == appKeyIndex
      })
    else {
      print("App key not found")
      return
    }
    
    var modelList: [Model] = []
    
    for modelData in models {
      guard
        let selectedModel = node.elements
          .first(where: { $0.unicastAddress == modelData.elementId })?
          .models.first(where: {
            $0.modelIdentifier == modelData.modelId
            && ($0.isBluetoothSIGAssigned
                == (modelData.modelType == "Bluetooth SIG"))
          })
      else {
        print(
          "Model with ID \(modelData.modelId) not found for element \(modelData.elementId)"
        )
        continue
      }
      
      modelList.append(selectedModel)
    }
    
    var publish: Publish;
    var retransmit: Publish.Retransmit;
    var period: Publish.Period;
    
    if (publishPeriodResolution == "disabled"){
      period = .disabled
    }
    else {
      var resolution: StepResolution = .hundredsOfMilliseconds
      
      switch publishPeriodResolution {
      case "10 minutes":
        resolution = .tensOfMinutes
        break
      case "10 seconds":
        resolution = .tensOfSeconds
        break
      case "1 second":
        resolution = .seconds
        break
      case "100 milliseconds":
        resolution = .hundredsOfMilliseconds
        break
        
      default:
        resolution = .hundredsOfMilliseconds
      }
      
      period = Publish.Period(
        steps: UInt8(publishPeriodInterval),
        resolution: resolution)
    }
    
    if (retransmitCount == -1) {
      retransmit = .disabled
    }
    else {
      retransmit = Publish.Retransmit(
        publishRetransmitCount: UInt8(retransmitCount),
        intervalSteps: UInt8(retransmitInterval))
    }
    
    publish = Publish(
      to: MeshAddress(Address(Int(groupAddress, radix: 16)!)),
      using: appKey,
      usingFriendshipMaterial: false, ttl: UInt8(publishTtl),
      period:period,
      retransmit: retransmit
      )
    
    AppDelegate.shared.meshNetworkManager.delegate = self.quickSetupNode
    
    self.quickSetupNode.setPublicationToListModels(node: node, models: modelList, pubish: publish, applicationKey: appKey ){ results in
      AppDelegate.shared.meshNetworkManager.delegate = self.meshModule.meshRepository
      self.meshModule.sendEvent(withName: "onPublicationDone", body: results)
    }
    
  }
  
  func readProxyState(unicastAddress: Int, completion: @escaping (NodeFeatureState, Error?) -> Void) {
    guard let node = requireNode(for: unicastAddress, completion: { (_: Node?, _: Error?) in }) else { return }
    guard let meshManager = requireMeshManager(completion: {(_: MeshNetworkManager?, _: Error?) in }) else { return }
    
    do {
      print("Reading Proxy State ...")
      
      let message = ConfigGATTProxyGet()
      
      // Set the delegate to listen for responses
      meshManager.delegate = self
      
      // Send the message to the node
      try meshManager.send(message, to: node)
      
      // Save the completion handler for later use
      self.pendingProxyStateCallback = completion
      
    } catch {
      // Handle errors in sending the message
      print("Failed to send ConfigGATTProxyGet message: \(error.localizedDescription)")
      completion(.notSupported, error)
    }
  }
  
  
  func toggleProxyState(unicastAddress: Int,state: Int) {
    guard let node = requireNode(for: unicastAddress, completion: { (_: Node?, _: Error?) in }) else { return }
    guard let meshManager = requireMeshManager(completion: {(_: MeshNetworkManager?, _: Error?) in }) else { return }
    
    do {
      print("Change Proxy State ...")
      
      let message = ConfigGATTProxySet(enable: state == 1)
      
      // Set the delegate to listen for responses
      meshManager.delegate = self
      
      // Send the message to the node
      try meshManager.send(message, to: node)
      
    } catch {
      // Handle errors in sending the message
      print("Failed to send ConfigGATTProxySet message: \(error.localizedDescription)")
      
    }
  }
}

extension MeshRepository: ProvisioningDelegate {
  func provisioningState(
    of unprovisionedDevice: UnprovisionedDevice,
    didChangeTo state: ProvisioningState
  ) {
    
    print("Provisioning state changed: \(state)")
    
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      
      switch state {
      case .requestingCapabilities:
        print("requestingCapabilities")
      case .capabilitiesReceived(let capabilities):
        print("numberOfElements \(capabilities.numberOfElements)")
        print("algorithms \(capabilities.algorithms)")
        print("publicKeyType \(capabilities.publicKeyType)")
        print("staticOobType \(capabilities.oobType)")
        print("outputOobSize \(capabilities.outputOobSize)")
        print("inputOobSize \(capabilities.inputOobSize)")
        print("outputOobActions \(capabilities.outputOobActions)")
        print("inputOobActions \(capabilities.inputOobActions)")
        
        let meshManager =  self.getMeshManager()
        guard let meshNetwork = meshManager.meshNetwork else{
          print("No mesh network")
          return
        }
        self.newUnicastAddr = self.bleManager.provisioningManager.unicastAddress
        let body: [String: Any] = [
          "name": unprovisionedDevice.name ?? "Unknown",
          "numberOfElement": capabilities.numberOfElements,
          "unicastAddress": self.newUnicastAddr,
        ]
        
        self.meshModule.sendEvent(withName: "onNodeIdentified", body: body)
        
      case let .failed(error):
        print("Provisioning failed with error: \(error.localizedDescription)")
        self.meshModule.sendEvent(withName: "onProgressUpdate", body: nil)
        
      case .complete:
        print("Provisioning completed Successfully!")
        self.meshModule.sendEvent(withName: "onProgressUpdate", body: "0.70")
        //AppDelegate.shared.meshNetworkDidChange()
        self.bleManager.closeBearer()
        let deviceUuid = self.bleManager.selectedUnprovisionedNode.uuid
        self.bleManager.setSelectedProvisionedDevice(
          peripheralUuid: self.bleManager.selectedUnprovisionedNode.uuid,
          nodeUnicastAddress: Int(self.newUnicastAddr!),
          identifier:self.bleManager.selectedUnprovisionedNode.identifier
        )
        self.meshModule.connectedDevices.append(
          (
            uuid: self.bleManager.selectedUnprovisionedNode.uuid,
            nodeUnicastAddress: Int(self.newUnicastAddr!),
            identifier: self.bleManager.selectedUnprovisionedNode.identifier
          ))
        
      case .provisioning:
        self.meshModule.sendEvent(withName: "onProgressUpdate", body: "0.50")
        
      default:
        break
      }
    }
  }
  
  func authenticationActionRequired(_ action: AuthAction) {
    print("Authentication action required: \(action) !")
  }
  
  func inputComplete() {
    print("Provisioning Input Complete !")
  }
  
}


extension MeshRepository: MeshNetworkDelegate{
  
  func meshNetworkManager(_ manager: NordicMesh.MeshNetworkManager, didReceiveMessage message: any NordicMesh.MeshMessage, sentFrom source: NordicMesh.Address, to destination: NordicMesh.MeshAddress) {
    print("Received message from \(source): \(message), opCode: 0x\(String(format: "%02X", message.opCode))")
    
    switch message.opCode {
    case ConfigDefaultTtlStatus.opCode:
      handleDefaultTtlStatus(message, source: source)
      break
      
    case ConfigAppKeyStatus.opCode:
      handleAppKeyStatus(message, source: source)
      break
      
    case ConfigAppKeyGet.opCode:
      handleAppKeyGet(message, source: source)
      break
      
    case ConfigAppKeyList.opCode:
      handleAppKeyList(message)
      break
      
    case ConfigNetKeyStatus.opCode:
      handleNetKeyStatus(message, source: source)
      break
      
    case ConfigModelPublicationStatus.opCode:
      handlePublicationSettings(message, source: source)
      break
      
    case ConfigModelSubscriptionStatus.opCode:
      handleSubscriptionStatus(message, source: source)
      break
      
    case ConfigSIGModelSubscriptionList.opCode:
      handleSubscriptionList(message, source: source)
      break
      
    case ConfigModelAppStatus.opCode:
      handleModelStatus(message)
      break
      
    case SensorStatus.opCode:
      handleSensorStatus(message)
      break
      
    case ConfigNodeResetStatus.opCode:
      self.pendingNodeResetCallback?(true, nil)
      self.pendingNodeResetCallback = nil
      break
      
    case ConfigGATTProxyStatus.opCode:
      handleProxyStateStatus(message, source: source)
      break
      
    case ConfigGATTProxyStatus.opCode:
      handleProxyStateStatus(message, source: source)
      break;
      
    case RemoteProvisioningScanReport.opCode:
      handleRemoteProxyScanReport(message, source:source)
      break;
      
    case ConfigCompositionDataStatus.opCode:
      print("ConfigCompositionDataStatus", message)
      self.bleManager.getTtl()
      self.meshModule.sendEvent(withName: "onProgressUpdate", body: "0.80")
      break
      
    case RemoteProvisioningPDUReport.opCode:
      let m = message as! RemoteProvisioningPDUReport
      let r = m.response
      switch r {
      case .confirmation:
        self.meshModule.sendEvent(withName: "onProgressUpdate", body: "0.70")
        break;
      case .complete:
        self.meshModule.sendEvent(withName: "onProgressUpdate", body: "0.78")
        break;
      case .capabilities:
        break;
        
      case .inputComplete:
        break;
        
      case .publicKey:
        self.meshModule.sendEvent(withName: "onProgressUpdate", body: "0.65")
        break;
      case .random:
        self.meshModule.sendEvent(withName: "onProgressUpdate", body: "0.75")
        break;
      case .failed:
        self.meshModule.sendEvent(withName: "onProgressUpdate", body: nil)
        break;
      }
      break
      
      
      // Vendor model response
    case let opCode
      where (opCode & 0xC0FFFF)
      == (0xC00000
          | UInt32(self.selectedModel?.companyIdentifier?.bigEndian ?? 0)):
      let responseOpCode = (opCode >> 16) & 0x3F
      print(
        "Vendor-specific message received with responseOpCode: \(responseOpCode)"
      )
      // Handle the vendor-specific message here
      meshModule.sendEvent(
        withName: "onStatusReceived",
        body: [
          "parameters": message.parameters?.hex ?? "N/A",
          "response": String(format: "%02X", message.opCode),
        ])
      break
      
    default:
      print("Unknown opcode: 0x\(String(format: "%02X", message.opCode))")
    }
  }
  
  private func handleDefaultTtlStatus(
    _ message: any MeshMessage, source: Address
  ) {
    guard let parameters = message.parameters else { return }
    let status = ConfigDefaultTtlStatus(parameters: parameters)
    print("ConfigDefaultTtlStatus:", status)
    
    // Call the pending callback and clear it
    pendingTtlCallback?(status?.ttl, nil)
    pendingTtlCallback = nil
  }
  
  private func handleAppKeyStatus(_ message: any MeshMessage, source: Address) {
    guard let parameters = message.parameters else { return }
    let status = ConfigAppKeyStatus(parameters: parameters)
    print("ConfigAppKeyStatus:", status)
    if status?.status == .success {
      //      AppDelegate.shared.meshNetworkDidChange()
      self.pendingAppKeyCallback?(true, nil)
      self.pendingAppKeyCallback = nil
    } else {
      self.pendingAppKeyCallback?(
        false,
        NSError(
          domain: "MeshModuleError", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "Failed to add app key"]))
      self.pendingAppKeyCallback = nil
    }
    
    if let appKeys = getMeshNetwork()?.node(withAddress: source)?
      .applicationKeys
    {
      print("Application Keys:", appKeys)
    } else {
      print("No application keys found for node \(source)")
    }
  }
  
  private func handleNetKeyStatus(_ message: any MeshMessage, source: Address) {
    guard let parameters = message.parameters else { return }
    let status = ConfigNetKeyStatus(parameters: parameters)
    print("ConfigNetKeyStatus:", status)
    if status?.status == .success {
      //      AppDelegate.shared.meshNetworkDidChange()
      self.pendingNetKeyCallback?(true, nil)
      self.pendingNetKeyCallback = nil
    } else {
      self.pendingNetKeyCallback?(
        false,
        NSError(
          domain: "MeshModuleError", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "Failed to add net key"]))
      self.pendingAppKeyCallback = nil
    }
  }
  
  private func handlePublicationSettings(
    _ message: any MeshMessage, source: Address
  ) {
    guard let parameters = message.parameters else { return }
    let status = ConfigModelPublicationStatus(parameters: parameters)
    print("ConfigModelPublicationStatus:", status?.publish as Any)
    
    if status?.status == .success {
//      if (retransmitInterval >= 0 && retransmitInterval <= getMaxRetransmissionInterval()) {
//          return ((retransmitInterval / 50) - 1);
//      }
      // Create and sanitize the map dictionary
      var map: [String: Any] = [
        "initial": false,
        "publicationSteps": status?.publish.period.numberOfSteps ?? 0,
        "appKeyIndex": status?.publish.index ?? 0,
        "publishAddress": status?.publish.publicationAddress.address
        ?? "Unknown",
        "ttl": status?.publish.ttl ?? 0,
        "publishRetransmitCount": status?.publish.retransmit.count ?? 0,
        "publishRetransmitInterval": status?.publish.retransmit.interval ?? 0,
      ]

      
      // Pass the sanitized map to the callback
      self.pendingPublicationGetCallback?(map, nil)
      self.pendingPublicationGetCallback = nil
    } else {
      guard let errorMessage = status?.message else {
        self.pendingPublicationGetCallback?(
          nil,
          NSError(
            domain: "MeshModuleError", code: 0,
            userInfo: [NSLocalizedDescriptionKey: "Get publication failed"]))
        self.pendingPublicationGetCallback = nil
        return
      }
      self.pendingPublicationGetCallback?(
        nil,
        NSError(
          domain: "MeshModuleError", code: 0,
          userInfo: [
            NSLocalizedDescriptionKey: "Get publication failed: \(errorMessage)"
          ]))
      self.pendingPublicationGetCallback = nil
    }
  }
  
  private func handleSubscriptionStatus(
    _ message: any MeshMessage, source: Address
  ) {
    guard let parameters = message.parameters else { return }
    let status = ConfigModelSubscriptionStatus(parameters: parameters)
    print("ConfigModelPublicationStatus:", status)
    if status?.status == .success {
      //      AppDelegate.shared.meshNetworkDidChange()
      self.pendingSubscriptionGetCallback?(status?.address, nil)
      self.pendingSubscriptionGetCallback = nil
    } else {
      guard let errorMessage = status?.message else {
        self.pendingSubscriptionGetCallback?(
          nil,
          NSError(
            domain: "MeshModuleError", code: 0,
            userInfo: [
              NSLocalizedDescriptionKey: "Failed to subscribe to group"
            ]))
        self.pendingSubscriptionGetCallback = nil
        return
      }
      self.pendingSubscriptionGetCallback?(
        nil,
        NSError(
          domain: "MeshModuleError", code: 0,
          userInfo: [
            NSLocalizedDescriptionKey:
              "Failed to subscribe to group: \(errorMessage)"
          ]))
      self.pendingSubscriptionGetCallback = nil
      
    }
  }
  
  private func handleSubscriptionList(
    _ message: any MeshMessage, source: Address
  ) {
    guard let parameters = message.parameters else { return }
    let status = ConfigSIGModelSubscriptionList(parameters: parameters)
    print("ConfigSIGModelSubscriptionList:", status)
    if status?.status == .success {
      
      let addressList: [Int] = status?.addresses.map { Int($0) } ?? []
      //      AppDelegate.shared.meshNetworkDidChange()
      meshModule.sendEvent(
        withName: "onSubscriptionReceived", body: addressList)
      
      self.pendingSubscriptionListCallback?(addressList, nil)
      self.pendingSubscriptionListCallback = nil
    } else {
      guard let errorMessage = status?.message else {
        self.pendingSubscriptionListCallback?(
          nil,
          NSError(
            domain: "MeshModuleError", code: 0,
            userInfo: [
              NSLocalizedDescriptionKey: "Failed to subscribe to group"
            ]))
        self.pendingSubscriptionListCallback = nil
        return
      }
      self.pendingSubscriptionListCallback?(
        nil,
        NSError(
          domain: "MeshModuleError", code: 0,
          userInfo: [
            NSLocalizedDescriptionKey:
              "Failed to subscribe to group: \(errorMessage)"
          ]))
      self.pendingSubscriptionListCallback = nil
      
    }
  }
  
  private func handleAppKeyGet(_ message: any MeshMessage, source: Address) {
    guard let parameters = message.parameters else { return }
    let status = ConfigAppKeyGet(parameters: parameters)
    print("ConfigAppKeyGet:", status)
    getMeshManager().save()
    
  }
  
  private func handleAppKeyList(_ message: any MeshMessage) {
    guard let parameters = message.parameters else { return }
    let status = ConfigAppKeyList(parameters: parameters)
    print("ConfigAppKeyList:", status)
    getMeshManager().save()
    
    // Call the pending callback and clear it
    pendingGetAppKeyCallback?(status?.applicationKeyIndexes, nil)
    pendingGetAppKeyCallback = nil
  }
  
  private func handleModelStatus(_ message: any MeshMessage) {
    guard let parameters = message.parameters else { return }
    let status = ConfigModelAppStatus(parameters: parameters)
    print("ConfigModelAppStatus:", status)
    
    if status?.status == .success {
      //      AppDelegate.shared.meshNetworkDidChange()
      self.pendingBindAppKeyCallback?(true, nil)
      self.pendingBindAppKeyCallback = nil
    } else {
      guard let errorMessage = status?.message else {
        self.pendingBindAppKeyCallback?(
          false,
          NSError(
            domain: "MeshModuleError", code: 0,
            userInfo: [NSLocalizedDescriptionKey: "Failed to bind app key"]))
        self.pendingBindAppKeyCallback = nil
        return
      }
      self.pendingBindAppKeyCallback?(
        false,
        NSError(
          domain: "MeshModuleError", code: 0,
          userInfo: [
            NSLocalizedDescriptionKey: "Failed to bind app key \(errorMessage)"
          ]))
      self.pendingBindAppKeyCallback = nil
    }
  }
  
  private func handleSensorStatus(_ message: any MeshMessage) {
    guard let parameters = message.parameters else { return }
    let status = SensorStatus(parameters: parameters)
    print("SensorStatus:", status!.values.last!.value)
    meshModule.sendEvent(
      withName: "onSensorGet",
      body: ["propertyName": "Unknown", "propertyValue": parameters.hex])
  }
  
  private func handleRemoteProxyScanReport(_ message: any MeshMessage, source: Address) {
    guard let parameters = message.parameters else { return }
    let report = RemoteProvisioningScanReport(parameters: parameters)
    print("handleRemoteProxyScanReport:", report)
    
    if (report != nil){
      self.bleManager.handleRemoteMeshProvisioningService(scanReportMessage: report!, source: source)
      
    }
    
  }
  
  private func handleProxyStateStatus(_ message: any MeshMessage, source: Address) {
    guard let parameters = message.parameters else { return }
    let status = ConfigGATTProxyStatus(parameters: parameters)
    print("ConfigGATTProxyStatus:", status as Any)
    self.meshModule.sendEvent(withName: "onReadProxyStatus", body: status?.state.rawValue)
    self.pendingProxyStateCallback?(status!.state, nil)
    self.pendingProxyStateCallback = nil
  }
  
  private func meshNetworkManager(_ manager: MeshNetworkManager,
                                  didSendMessage message: MeshMessage,
                                  from localElement: Element, to destination: Address){
    print("SendMessage to", destination, ":", message, message.opCode)
    
  }
  
  func meshNetworkManager(_ manager: MeshNetworkManager,
                          failedToSendMessage message: MeshMessage,
                          from localElement: Element, to destination: MeshAddress,
                          error: Error){
    print("failedToSendMessage to", destination, ":", message, message.opCode)
    
    if message.opCode == ConfigModelPublicationGet.opCode || message.opCode == ConfigModelPublicationSet.opCode {
      self.pendingPublicationGetCallback?(
        nil,
        NSError(
          domain: "MeshModuleError", code: 0,
          userInfo: [NSLocalizedDescriptionKey: "Set publication failed"]))
      self.pendingPublicationGetCallback = nil
    }
  }
}

extension MeshRepository: BearerDelegate {
  func bearerDidOpen(_ bearer: any Bearer) {
    print("BEARER DID OPEN", bearer.isOpen)
    self.meshModule.sendEvent(withName: "onNodeConnected", body: "success")
    
    guard let provisionedDevice = self.bleManager.selectedProvisionedDevice
    else {
      print("no selected node")
      return
    }
    
    self.bleManager.setSelectedProvisionedDevice(peripheralUuid: provisionedDevice.uuid, nodeUnicastAddress: provisionedDevice.nodeUnicastAddress, identifier: provisionedDevice.identifier)
    self.meshModule.connectedDevices.append((uuid: provisionedDevice.uuid, nodeUnicastAddress:provisionedDevice.nodeUnicastAddress, identifier: provisionedDevice.identifier))
    
    // Safely cast bearer to GattBearer
    if let gattBearer = bearer as? GattBearer {
      AppDelegate.shared.connection.use(proxy: gattBearer)
      
    } else if let connectionBearer = bearer as? NetworkConnection {
      if let proxy = try! connectionBearer.proxies.value().first(where: {
        $0.identifier == provisionedDevice.uuid
      }) {
        AppDelegate.shared.connection.use(proxy: proxy)
      }
    } else {
      print("unknown bearer type")
    }
    AppDelegate.shared.meshNetworkManager.delegate = self
    AppDelegate.shared.meshNetworkManager.proxyFilter.proxyDidDisconnect()
    if let provisioner = AppDelegate.shared.meshNetworkManager.meshNetwork?
      .localProvisioner
    {
      AppDelegate.shared.meshNetworkManager.proxyFilter.setup(for: provisioner)
    }
    
  }
  
  func bearer(_ bearer: any Bearer, didClose error: (any Error)?) {
    print("BEARER DID CLOSE", "meshRepository")
    self.meshModule.sendEvent(withName: "onNodeConnected", body: "success")
    
    // when disconnecting check which uuid to remove, depends on the context (provisioned or unprovisioned device)
    var deviceToDisconnect = UUID()
    if self.bleManager.selectedProvisionedDevice != nil {
      deviceToDisconnect = self.bleManager.selectedProvisionedDevice!.uuid
    } else if self.bleManager.selectedUnprovisionedNode != nil {
      deviceToDisconnect = self.bleManager.selectedUnprovisionedNode!.uuid
      
    }
    self.meshModule.connectedDevices.removeAll(where: {
      $0.uuid == deviceToDisconnect || $0.identifier == deviceToDisconnect
    })
    print(
      "connected devices count:", String(self.meshModule.connectedDevices.count)
    )
  }
}


extension MeshRepository : ProxyFilterDelegate {
  func proxyFilterUpdated(type: ProxyFilerType, addresses: Set<Address>) {
    print("proxyFilterUpdated", type, addresses)
  }
  
  func proxyFilterUpdateAcknowledged(type: ProxyFilerType, listSize: UInt16) {
    print("proxyFilterUpdateAcknowledged", type, listSize)
    self.meshModule.sendEvent(withName: "onProxyFilterUpdated", body: ["type": type, "listSize": listSize])
    
  }
}
