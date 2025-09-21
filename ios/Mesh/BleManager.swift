//
//  BleManager.swift
//  SimplelinkConnect
//
//  Created by IL Tools on 14/11/2024.
//

import CoreBluetooth
import Foundation
import NordicMesh
import React

typealias DiscoveredGattProxy = (
  bearer: GattBearer, peripheral: CBPeripheral, rssi: NSNumber
)
typealias ProvisionedDevice = (uuid: UUID, nodeUnicastAddress: Int, identifier: UUID)

class BleManager: NSObject, LoggerDelegate, GattBearerDelegate, CBPeripheralDelegate {
  public var centralManager: CBCentralManager!
  private var meshModule: MeshModule!
  public var unprovisionedPeripherals: [DiscoveredPeripheral] = []
  public var selectedUnprovisionedNode: DiscoveredPeripheral!
  public var provisioningBearer: ProvisioningBearer!
  public var provisioningManager: ProvisioningManager!
  private var publicKey: PublicKey?
  private var authenticationMethod: AuthenticationMethod?
  private var selectedNode: Node!
  public var discoveredProxies: [DiscoveredGattProxy] = []
  public var selectedProvisionedDevice: ProvisionedDevice?
  
  init(meshModule: MeshModule) {
    super.init()
    
    self.centralManager = CBCentralManager()
    self.centralManager.delegate = self
    self.meshModule = meshModule
    
  }
  
  // MARK: Scan / Connect
  
  func scanForUnprovisionNodes() {
    self.centralManager.delegate = self
    print("scanning for unprovisioned nodes")
    
    // reset previos scan results
    self.unprovisionedPeripherals = []
    
    // Scan for devices with Mesh Provisioning Service to provision them over PB GATT Bearer.
    self.centralManager.scanForPeripherals(
      withServices: [MeshProvisioningService.uuid],
      options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
    
    // Scan for other devices using Remote Provisioning.
    let bearer = MeshNetworkManager.bearer!
    guard bearer.isOpen else {
      return
    }
    
    let manager = MeshNetworkManager.instance
    let meshNetwork = manager.meshNetwork!
    
    let scanRequest = RemoteProvisioningScanStart(timeout: 100)!
    
    // Look for all Nodes with Remote Provisioning Server and send Scan Start request to all.
    meshNetwork.nodes
      .filter { $0.contains(modelWithSigModelId: .remoteProvisioningServerModelId) }
      .forEach { node in
        _ = try? manager.send(scanRequest, to: node)
      }
    guard let bearer = MeshNetworkManager.bearer else {
      print("Bearer is nil")
      return
    }
    
    guard bearer.isOpen else {
      print("Bearer is closed")
      return
    }
    
  }
  
  func scanForProxyNodes() {
    self.centralManager.delegate = self
    self.centralManager.scanForPeripherals(
      withServices: [MeshProxyService.uuid],
      options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
    
  }
  
  func stopScan() {
    self.centralManager.stopScan()
    
    // Stop all Remote Provisioning Servers.
    let bearer = MeshNetworkManager.bearer!
    guard bearer.isOpen else {
      return
    }
    
    //    let manager = MeshNetworkManager.instance
    //    let meshNetwork = manager.meshNetwork!
    //
    //    // Look for all Nodes with Remote Provisioning Server.
    //    let remoteProvisioners = meshNetwork.nodes
    //      .filter { $0.contains(modelWithSigModelId: .remoteProvisioningServerModelId) }
    //    // Sent Stop Scan message.
    //    remoteProvisioners.forEach { node in
    //      let stopScanRequest = RemoteProvisioningScanStop()
    //      _ = try? manager.send(stopScanRequest, to: node)
    //    }
  }
  
  func connectToPeripheral(unprovisionedDevice: DiscoveredPeripheral, bearerIndex: Int) {
    print("connectToPeripheral", unprovisionedDevice.device.name)
    
    self.selectedUnprovisionedNode = unprovisionedDevice
    
    // reset selected node before connecting to new node.
    self.selectedProvisionedDevice = nil
    
    // find selected bearer
    let selectedBearer = self.selectedUnprovisionedNode.bearer[bearerIndex]
    
    selectedBearer.delegate = self
    do {
      try selectedBearer.open()
    } catch {
      print("Failed to open bearer: \(error)")
      return
    }
    
    print("Connecting to \(selectedUnprovisionedNode.device.name ?? "Unknown Device")...")
    meshModule.sendEvent(withName: "onStateChange", body: "Connecting...")
    
  }
  
  //MARK: - GattBearerDelegate
  
  func bearerDidConnect(_ bearer: Bearer) {
    print("bearerDidConnect")
  }
  
  func bearerDidDiscoverServices(_ bearer: Bearer) {
    print("bearerDidDiscoverServices")
    
  }
  
  func bearerDidOpen(_ bearer: Bearer) {
    print("bearerDidOpen")
    self.provisioningBearer = bearer as! ProvisioningBearer
    if let provisioner = AppDelegate.shared.meshNetworkManager.meshNetwork?.localProvisioner {
      MeshNetworkManager.instance.proxyFilter.setup(for: provisioner)
    }
    
    AppDelegate.shared.meshNetworkManager.delegate = self.meshModule.meshRepository
    meshModule.sendEvent(withName: "onStateChange", body: "Connected (unprovisioned)")
    meshModule.sendEvent(withName: "onNodeConnected", body: "success")
  }
  
  func bearer(_ bearer: Bearer, didClose error: Error?) {
    print("BEARER CLOSE", "BleManager")
    
    guard let meshNetworkManager = AppDelegate.shared.meshNetworkManager else {
      NSLog("Error initializing the mesh manager")
      return
    }
    if meshNetworkManager.save() {
      guard let connection = AppDelegate.shared.connection else {
        print("Bearer is nil")
        return
      }
      
      //      let connection = AppDelegate.shared.connection!
      func done(reconnect: Bool) {
        if reconnect,
           let pbGattBearer = self.provisioningBearer as? PBGattBearer
        {
          //    connection.disconnect()
          // The bearer has closed. Attempt to send a message
          // will fail, but the Proxy Filter will receive .bearerClosed
          // error, upon which it will clear the filter list and notify
          // the delegate.
          meshNetworkManager.proxyFilter.proxyDidDisconnect()
          meshNetworkManager.proxyFilter.clear()
          
          let gattBearer = GattBearer(targetWithIdentifier: pbGattBearer.identifier)
          connection.use(proxy: gattBearer)
          
          guard let network = meshNetworkManager.meshNetwork else {
            return
          }
          if let node = network.node(for: self.selectedUnprovisionedNode.device)
          {
            self.selectedNode = node
            requestCompositionData()
          }
        } else if let pbRemoteBearer = self.provisioningBearer as? PBRemoteBearer {
          guard let network = meshNetworkManager.meshNetwork else {
            return
          }
          
          if let node = network.node(for: self.selectedUnprovisionedNode.device) {
            self.selectedNode = node
            requestCompositionData()
          }
        }
      }
      done(reconnect: true)
    } else {
      print("Mesh configuration could not be saved.")
    }
    
  }
  
  public func log(message: String, ofCategory category: LogCategory, withLevel level: LogLevel) {
    NSLog("BMNetwork: " + message, "")
  }
  
  func requestCompositionData() {
    guard let node = selectedNode else {
      print("No node selected.")
      return
    }
    
    if !node.isCompositionDataReceived {
      print("Composition data not received. Requesting...")
      getCompositionData()
    } else {
      print("Composition data already available.")
    }
  }
  
  func getCompositionData() {
    AppDelegate.shared.meshNetworkManager.delegate = self
    
    guard let meshNetworkManager = AppDelegate.shared.meshNetworkManager else {
      NSLog("Error initializing the mesh manager")
      return
    }
    
    guard let node = selectedNode else {
      print("No node selected to request composition data.")
      return
    }
    
    let message = ConfigCompositionDataGet()
    do {
      print(
        "Sending ConfigCompositionDataGet to node \(node.name ?? "Unknown").")
      // Send the message
      
      try meshNetworkManager.send(message, to: node)
    } catch {
      print(
        "Error sending ConfigCompositionDataGet: \(error.localizedDescription)")
    }
  }
  
  func getTtl() {
    guard let meshNetworkManager = AppDelegate.shared.meshNetworkManager else {
      NSLog("Error initializing the mesh manager")
      return
    }
    guard let node = selectedNode else {
      print("No node selected to request TTL.")
      return
    }
    
    let message = ConfigDefaultTtlGet()
    do {
      print("Sending ConfigDefaultTtlGet to node \(node.name ?? "Unknown").")
      meshNetworkManager.delegate = self
      try meshNetworkManager.send(message, to: node)
    } catch {
      print("Error sending ConfigDefaultTtlGet: \(error.localizedDescription)")
    }
  }
  
  private func handleMeshProvisioningService(
    peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber
  ) {
    guard let advertiseUUID = advertisementData.unprovisionedDeviceUUID else { return }
    if let index = unprovisionedPeripherals.firstIndex(where: {
      $0.uuid.uuidString == advertiseUUID.uuidString
    }) {
      updateUnprovisionedDevice(
        at: index, peripheral: peripheral, advertisementData: advertisementData, rssi: RSSI)
    } else {
      addUnprovisionedDevice(
        peripheral: peripheral, advertisementData: advertisementData, rssi: RSSI)
    }
  }
  
  public func handleRemoteMeshProvisioningService(
    scanReportMessage: RemoteProvisioningScanReport, source: Address
  ) {
    let deviceUuid = scanReportMessage.uuid
    // Check if a device with the same UUID was already scanned before.
    if let index = unprovisionedPeripherals.firstIndex(where: { $0.uuid.uuidString == deviceUuid.uuidString }) {
      // Note: RemoteProvisioningScanReport message does not contain the device name.
      //       Unless the device can be provisioned using PB GATT Bearer and it
      //       advertises its Local Name it will be shown as Unknown Device.
      
      // Check if the same bearer already exists.
      // For PB Remote Bearer it's not likely, as scan results are not repeated for the same
      // devices from the same Remote Provisioning Server. Anyway...
      if let bearerIndex = unprovisionedPeripherals[index].bearer.firstIndex(where: {
        ($0 as? PBRemoteBearer)?.address == source
      }) {
        // If so, just update the RSSI value.
        unprovisionedPeripherals[index].rssi[bearerIndex] = scanReportMessage.rssi
      } else {
        
        guard let meshNetwork = MeshNetworkManager.instance.meshNetwork,
              let server = meshNetwork.node(withAddress: source),
              let model = server.models(withSigModelId: .remoteProvisioningServerModelId).first,
              let bearer = try? PBRemoteBearer(
                target: scanReportMessage.uuid, using: model, over: MeshNetworkManager.instance)
        else {
          return
        }
        bearer.logger = MeshNetworkManager.instance.logger
        bearer.delegate = self
        unprovisionedPeripherals[index].bearer.append(bearer)
        unprovisionedPeripherals[index].rssi.append(scanReportMessage.rssi)
      }
      
      sendScanResultEvent(
        name: unprovisionedPeripherals[index].device.name, uuid: unprovisionedPeripherals[index].device.uuid,
        rssi: scanReportMessage.rssi, bearers: unprovisionedPeripherals[index].bearer, identifier: scanReportMessage.uuid)
      
    } else {
      // Add new discovered peripheral
      guard let meshNetwork = MeshNetworkManager.instance.meshNetwork,
            let server = meshNetwork.node(withAddress: source),
            let model = server.models(withSigModelId: .remoteProvisioningServerModelId).first,
            let bearer = try? PBRemoteBearer(
              target: scanReportMessage.uuid, using: model, over: MeshNetworkManager.instance)
      else {
        return
      }
      bearer.logger = MeshNetworkManager.instance.logger
      
      let unprovisionedDevice = UnprovisionedDevice(scanReport: scanReportMessage)
      self.unprovisionedPeripherals.append(
        (
          unprovisionedDevice, [bearer], [scanReportMessage.rssi], unprovisionedDevice.uuid, scanReportMessage.uuid
        ))
      sendScanResultEvent(
        name: unprovisionedDevice.name, uuid: unprovisionedDevice.uuid,
        rssi: scanReportMessage.rssi, bearers: [bearer], identifier: scanReportMessage.uuid)
    }
  }
  
  private func updateUnprovisionedDevice(
    at index: Int, peripheral: CBPeripheral, advertisementData: [String: Any], rssi: NSNumber
  ) {
    unprovisionedPeripherals[index].device.name = advertisementData.localName
    if let bearerIndex = unprovisionedPeripherals[index].bearer.firstIndex(where: {
      $0 is PBGattBearer
    }) {
      unprovisionedPeripherals[index].rssi[bearerIndex] = rssi
    } else {
      let bearer = PBGattBearer(target: peripheral)
      bearer.logger = AppDelegate.shared.meshNetworkManager.logger
      unprovisionedPeripherals[index].bearer.append(bearer)
      unprovisionedPeripherals[index].rssi.append(rssi)
    }
    sendScanResultEvent(
      name: peripheral.name, uuid: unprovisionedPeripherals[index].device.uuid,
      rssi: rssi, bearers: unprovisionedPeripherals[index].bearer, identifier: peripheral.identifier)
  }
  
  private func addUnprovisionedDevice(
    peripheral: CBPeripheral, advertisementData: [String: Any], rssi: NSNumber
  ) {
    guard let unprovisionedDevice = UnprovisionedDevice(advertisementData: advertisementData) else {
      return
    }
    unprovisionedDevice.name = peripheral.name
    let bearer = PBGattBearer(target: peripheral)
    bearer.logger = AppDelegate.shared.meshNetworkManager.logger
    sendScanResultEvent(
      name: peripheral.name, uuid: unprovisionedDevice.uuid, rssi: rssi, bearers: [bearer], identifier: peripheral.identifier)
    unprovisionedPeripherals.append(( device: unprovisionedDevice,
                                     bearer: [bearer],
                                     rssi: [rssi],
                                     uuid: unprovisionedDevice.uuid,
                                    identifier: peripheral.identifier))
  }
  
  private func handleMeshProxyService(peripheral: CBPeripheral, advertisementData: [String: Any], rssi: NSNumber) {
    // provisioned nodes doesnt expose thier Device UUID
    let uuid = advDataToUUID(advertisementData);
    if (uuid == nil){
      print("Could not extract UUID from advertisement data")
    }
    if let index = discoveredProxies.firstIndex(where: {
      $0.peripheral.identifier == peripheral.identifier
    }) {
      // If the peripheral has already been discovered - update rssi if necessery.
      if discoveredProxies[index].rssi != rssi {
        sendProvisionedScanResultEvent(name: peripheral.name, uuid: uuid ?? peripheral.identifier , rssi: rssi, identifier: peripheral.identifier)
      }
    } else {
      // New peripheral
      let bearer = GattBearer(target: peripheral)
      discoveredProxies.append(
        (bearer: bearer, peripheral: peripheral, rssi: rssi))
      sendProvisionedScanResultEvent(name: peripheral.name, uuid: uuid ?? peripheral.identifier, rssi: rssi, identifier: peripheral.identifier)
    }
  }
    
  
  /// Converts first 16 bytes of Data into a UUID.
  private func advDataToUUID(_ advertisementData: [String: Any]) -> UUID? {
    
    guard let meshNetwork = AppDelegate.shared.meshNetworkManager.meshNetwork else {
      return nil
    }
    
    guard let serviceData = advertisementData[CBAdvertisementDataServiceDataKey] as? [CBUUID: Data],
             let proxyData = serviceData[MeshProxyService.uuid] else {
           return nil
       }
    
    // Is it a Network ID or Private Network Identity beacon?
    if let networkIdentity = advertisementData.networkIdentity {
      guard meshNetwork.matches(networkIdentity: networkIdentity) else {
        // A Node from another mesh network.
        return nil
      }
    } else {
      // Is it a Node Identity or Private Node Identity beacon?
      guard let nodeIdentity = advertisementData.nodeIdentity,
            meshNetwork.matches(nodeIdentity: nodeIdentity)
      else {
        // A Node from another mesh network.
        return nil
      }
      return meshNetwork.node(matchingNodeIdentity: nodeIdentity)?.uuid

    }
    return nil

  }

  
  private func sendScanResultEvent(name: String?, uuid: UUID, rssi: NSNumber, bearers: [Bearer], identifier: UUID) {
    let bearerOptions = bearers.map { bearer in
      if let pbRemote = bearer as? PBRemoteBearer {
        guard let node = self.meshModule.meshRepository.getMeshNetwork()?.node(withAddress: pbRemote.address) else {
          return "PB Remote (using 0x\(pbRemote.address))"
        }
        return "PB Remote via \(node.name ?? "Unknown Node") (0x\(pbRemote.address))"
      } else {
        return "PB GATT"
      }
    }
    
    let deviceInfo: [String: Any] = [
      "name": name ?? "Unknown",
      "id": uuid.uuidString,
      "rssi": rssi,
      "bearers": bearerOptions,
      "identifier": identifier.uuidString
    ]
    meshModule.sendEvent(withName: "onScanResult", body: deviceInfo)
  }
  
  
  private func sendProvisionedScanResultEvent(name: String?, uuid: UUID, rssi: NSNumber, identifier: UUID) {
    let deviceInfo: [String: Any] = [
      "name": name ?? "Unknown",
      "id": uuid.uuidString,
      "rssi": rssi,
      "bearers": ["PB GATT"],
      "identifier":identifier.uuidString
    ]
    meshModule.sendEvent(withName: "onProvisionedScanResult", body: deviceInfo)
  }
  
  func startProvisioning() {
    print("startProvisioning")
    guard let capabilities = provisioningManager.provisioningCapabilities else {
      return
    }
    
    // If the device's Public Key is available OOB, it should be read.
    let publicKeyNotAvailable = capabilities.publicKeyType.isEmpty
    print("publicKeyNotAvailable", publicKeyNotAvailable)
    publicKey = publicKey ?? .noOobPublicKey
    
    authenticationMethod = .noOob
    print("netKey", provisioningManager.networkKey)
    if provisioningManager.networkKey == nil {
      
      let network = AppDelegate.shared.meshNetworkManager.meshNetwork!
      let networkKey = try! network.add(
        networkKey: Data.random128BitKey(), name: "Primary Network Key")
      provisioningManager.networkKey = networkKey
    }
    
    // Start provisioning.
    print("Provisioning...")
    do {
      try self.provisioningManager.provision(
        usingAlgorithm: .fipsP256EllipticCurve,
        publicKey: self.publicKey!,
        authenticationMethod: self.authenticationMethod!)
    } catch {
      print("Error Provisioning", error.localizedDescription)
      self.meshModule.sendEvent(withName: "onProgressUpdate", body: nil)
    }
  }
  
  public func setSelectedProvisionedDevice(peripheralUuid: UUID, nodeUnicastAddress: Int, identifier: UUID) {
    self.selectedProvisionedDevice = (uuid: peripheralUuid, nodeUnicastAddress: nodeUnicastAddress, identifier: identifier)
  }
  
  public func closeBearer() {
    do {
      try self.provisioningBearer.close()
      
    } catch {
      print("Failed to close bearer")
    }
  }
}

extension BleManager: MeshNetworkDelegate {
  
  func meshNetworkManager(
    _ manager: NordicMesh.MeshNetworkManager, didReceiveMessage message: any NordicMesh.MeshMessage,
    sentFrom source: NordicMesh.Address, to destination: NordicMesh.MeshAddress
  ) {
    print("MeshNetworkDelegate didReceiveMessage", message.opCode, "from:", source)
    switch message.opCode {
      
    case ConfigCompositionDataStatus.opCode:
      print("ConfigCompositionDataStatus", message)
      self.getTtl()
      self.meshModule.sendEvent(withName: "onProgressUpdate", body: "0.80")
      break
      
    case ConfigDefaultTtlStatus.opCode:
      self.meshModule.sendEvent(withName: "onProgressUpdate", body: "1")
      meshModule.sendEvent(withName: "onProvisionCompleted", body: "success")
      // Call the pending callback and clear it
      guard let parameters = message.parameters else { return }
      let status = ConfigDefaultTtlStatus(parameters: parameters)
      
      self.meshModule.meshRepository.pendingTtlCallback?(status?.ttl, nil)
      self.meshModule.meshRepository.pendingTtlCallback = nil
      break
      
    default:
      print("Unknown opcode", message.opCode)
      
    }
    
  }
  
  func meshNetworkManager(
    _ manager: MeshNetworkManager, didSendMessage message: any MeshMessage,
    from localElement: Element, to destination: Address
  ) {
    print("MeshNetworkDelegate didSendMessage", message)
    
  }
  
  func meshNetworkManager(
    _ manager: MeshNetworkManager, failedToSendMessage message: any MeshMessage,
    from localElement: Element, to destination: Address, error: any Error
  ) {
    print("MeshNetworkDelegate failedToSendMessage", message)
    self.meshModule.sendEvent(withName: "onProvisionCompleted", body: error.localizedDescription)
    
  }
}

extension BleManager: CBCentralManagerDelegate {
  //MARK: - CBCentralManager delegate
  
  func centralManager(
    _ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
    advertisementData: [String: Any], rssi RSSI: NSNumber
  ) {
    guard let serviceUUIDs = advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID]
    else {
      print("No service UUIDs in advertisement data.")
      return
    }

    if serviceUUIDs.contains(MeshProvisioningService.uuid) {
      handleMeshProvisioningService(
        peripheral: peripheral, advertisementData: advertisementData, rssi: RSSI)
    } else if serviceUUIDs.contains(MeshProxyService.uuid) {
      handleMeshProxyService(peripheral: peripheral, advertisementData: advertisementData, rssi: RSSI)
    } else {
      print("Discovered a device without Mesh services.")
    }
  }
  
  func centralManager(
    _ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral,
    error: (any Error)?
  ) {
    print("didDisconnectPeripheral", peripheral.identifier.uuid)
    self.meshModule.connectedDevices.removeAll(where: { $0.uuid == peripheral.identifier })
    
  }
  
  func centralManager(
    _ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral,
    timestamp: CFAbsoluteTime, isReconnecting: Bool, error: (any Error)?
  ) {
    print("didDisconnectPeripheral", peripheral.identifier.uuid)
    self.meshModule.connectedDevices.removeAll(where: { $0.uuid == peripheral.identifier })
    
  }
  
  func centralManager(
    _ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?
  ) {
    print("didFailToConnect", peripheral.identifier.uuid)
    
  }
  
  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    print("Central Manager state changed to \(central.state)")
    
    if central.state == .poweredOn {
      //     Bluetooth is on, start scanning
      //scanForUnprovisionNodes()
    }
  }
}
