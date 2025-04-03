//
//  BleManager.swift
//  SimplelinkConnect
//
//  Created by IL Tools on 14/11/2024.
//

import Foundation
import CoreBluetooth
import nRFMeshProvision
import React

typealias DiscoveredGattProxy = (bearer: GattBearer, peripheral: CBPeripheral, rssi: NSNumber)
typealias ProvisionedDevice = (uuid: UUID, nodeUnicastAddress: Int)

class BleManager : NSObject, LoggerDelegate, GattBearerDelegate, CBPeripheralDelegate {
  public var centralManager: CBCentralManager!
  private var meshModule: MeshModule!
  public var unprovisionedPeripherals: [DiscoveredPeripheral] = []
  public var selectedUnprovisionedNode: DiscoveredPeripheral!
  public var provisioningBearer : PBGattBearer!;
  public var provisioningManager: ProvisioningManager!
  private var publicKey: PublicKey?
  private var authenticationMethod: AuthenticationMethod?
  private var selectedNode: Node!;
  public var discoveredProxies: [DiscoveredGattProxy] = []
  public var selectedProvisionedDevice: ProvisionedDevice?
  
  init(meshModule: MeshModule) {
    super.init();
    
    self.centralManager = CBCentralManager();
    self.meshModule = meshModule;
    
  }
  
  // MARK: Scan / Connect
  
  func scanForUnprovisionNodes(){
    self.centralManager.delegate = self;
    
    self.centralManager.scanForPeripherals(withServices: [MeshProvisioningService.uuid], options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
    
    //    let bearer = MeshNetworkManager.bearer!
    //    guard bearer.isOpen else {
    //      print("Bearer is close")
    //      return
    //    }
    
    guard let bearer = MeshNetworkManager.bearer else {
      print("Bearer is nil")
      return
    }
    
    guard bearer.isOpen else {
      print("Bearer is closed")
      return
    }
    
  }
  
  func scanForProxyNodes(){
    self.centralManager.delegate = self;
    self.centralManager.scanForPeripherals(withServices: [MeshProxyService.uuid], options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
  }
  
  func stopScan() {
    self.centralManager.stopScan();
  }
  
  func connectToPeripheral(unprovisionedDevice: DiscoveredPeripheral) {
    print("connectToPeripheral", unprovisionedDevice.device.name)
    
    self.selectedUnprovisionedNode = unprovisionedDevice;
   
    // reset selected node before connecting to new node.
    self.selectedProvisionedDevice = nil;

    self.selectedUnprovisionedNode.bearer.first?.delegate = self;
    self.selectedUnprovisionedNode.bearer.first?.open();
    
    print("Connecting to \(selectedUnprovisionedNode.device.name ?? "Unknown Device")...")
    meshModule.sendEvent(withName: "onStateChange", body:"Connecting...")
    
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
    self.provisioningBearer = bearer as! PBGattBearer;
    if let provisioner = AppDelegate.shared.meshNetworkManager.meshNetwork?.localProvisioner {
      MeshNetworkManager.instance.proxyFilter.setup(for: provisioner)
    }
    
    meshModule.sendEvent(withName: "onStateChange", body:"Connected (unprovisioned)")
    meshModule.sendEvent(withName: "onNodeConnected", body: "success")
    
  }
  
  func bearer(_ bearer: Bearer, didClose error: Error?) {
    print("BEARER CLOSE", "BleManager")
    
    guard let meshNetworkManager =  AppDelegate.shared.meshNetworkManager else {
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
        if reconnect, let pbGattBearer = self.provisioningBearer as? PBGattBearer {
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
    } 
    
    else {
      print("Composition data already available.")
    }
  }
  
  func getCompositionData() {
    AppDelegate.shared.meshNetworkManager.delegate = self
    guard let meshNetworkManager =  AppDelegate.shared.meshNetworkManager else {
      NSLog("Error initializing the mesh manager")
      return
    }
    
    guard let node = selectedNode else {
      print("No node selected to request composition data.")
      return
    }
    
    let message = ConfigCompositionDataGet()
    do {
      print("Sending ConfigCompositionDataGet to node \(node.name ?? "Unknown").")
      // Send the message
      
      try meshNetworkManager.send(message, to: node)
    } catch {
      print("Error sending ConfigCompositionDataGet: \(error.localizedDescription)")
    }
  }
  
  func getTtl() {
    guard let meshNetworkManager =  AppDelegate.shared.meshNetworkManager else {
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
  
  private func handleMeshProvisioningService(peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
    guard let uuid1 = advertisementData.unprovisionedDeviceUUID else { return }
    
    if let index = unprovisionedPeripherals.firstIndex(where: { $0.device.uuid.uuidString == peripheral.identifier.uuidString }) {
      updateUnprovisionedDevice(at: index, peripheral: peripheral, advertisementData: advertisementData, rssi: RSSI)
    } else {
      addUnprovisionedDevice(peripheral: peripheral, advertisementData: advertisementData, rssi: RSSI)
    }
  }
  
  private func updateUnprovisionedDevice(at index: Int, peripheral: CBPeripheral, advertisementData: [String: Any], rssi: NSNumber) {
    unprovisionedPeripherals[index].device.name = advertisementData.localName
    if let bearerIndex = unprovisionedPeripherals[index].bearer.firstIndex(where: { $0 is PBGattBearer }) {
      unprovisionedPeripherals[index].rssi[bearerIndex] = rssi
    } else {
      let bearer = PBGattBearer(target: peripheral)
      bearer.logger = AppDelegate.shared.meshNetworkManager.logger
      unprovisionedPeripherals[index].bearer.append(bearer)
      unprovisionedPeripherals[index].rssi.append(rssi)
      sendScanResultEvent(peripheral: peripheral, uuid: unprovisionedPeripherals[index].device.uuid.uuidString, rssi: rssi)
    }
  }
  
  private func addUnprovisionedDevice(peripheral: CBPeripheral, advertisementData: [String: Any], rssi: NSNumber) {
    guard let unprovisionedDevice = UnprovisionedDevice(advertisementData: advertisementData) else { return }
    unprovisionedDevice.name = peripheral.name
    let bearer = PBGattBearer(target: peripheral)
    bearer.logger = AppDelegate.shared.meshNetworkManager.logger
    sendScanResultEvent(peripheral: peripheral, uuid: unprovisionedDevice.uuid.uuidString, rssi: rssi)
    
    unprovisionedPeripherals.append((unprovisionedDevice, [bearer], [rssi], peripheral.identifier))
  }
  
  private func handleMeshProxyService(peripheral: CBPeripheral, rssi: NSNumber) {
    if let index = discoveredProxies.firstIndex(where: { $0.peripheral.identifier == peripheral.identifier }) {
      // If the peripheral has already been discovered - update rssi if necessery.
      if (discoveredProxies[index].rssi != rssi) {
        sendProvisionedScanResultEvent(peripheral: peripheral, rssi: rssi)
      }
    } else {
      // New peripheral
      let bearer = GattBearer(target: peripheral)
      discoveredProxies.append((bearer: bearer, peripheral: peripheral, rssi: rssi))
      sendProvisionedScanResultEvent(peripheral: peripheral, rssi: rssi)
    }
  }
  
  private func sendScanResultEvent(peripheral: CBPeripheral, uuid: String, rssi: NSNumber) {
    let deviceInfo: [String: Any] = [
      "name": peripheral.name ?? "Unknown",
      "id": uuid,
      "rssi": rssi
    ]
    meshModule.sendEvent(withName: "onScanResult", body: deviceInfo)
  }
  
  private func sendProvisionedScanResultEvent(peripheral: CBPeripheral, rssi: NSNumber) {
    let deviceInfo: [String: Any] = [
      "name": peripheral.name ?? "Unknown",
      "id": peripheral.identifier.uuidString,
      "rssi": rssi
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
    //        guard publicKeyNotAvailable || publicKey != nil else {
    //            presentOobPublicKeyDialog(for: unprovisionedDevice) { [weak self] publicKey in
    //                guard let self = self else { return }
    //                self.publicKey = publicKey
    //                self.startProvisioning()
    //            }
    //            return
    //        }
    publicKey = publicKey ?? .noOobPublicKey
    
    // If any of OOB methods is supported, it should be chosen.
    let staticOobSupported = capabilities.staticOobType.contains(.staticOobInformationAvailable)
    let outputOobSupported = !capabilities.outputOobActions.isEmpty
    let inputOobSupported  = !capabilities.inputOobActions.isEmpty
    let anyOobSupported = staticOobSupported || outputOobSupported || inputOobSupported
    print("anyOobSupported", anyOobSupported)
    //    guard !anyOobSupported || authenticationMethod != nil else {
    //      presentOobOptionsDialog(for: provisioningManager, from: provisionButton) { [weak self] method in
    //        guard let self = self else { return }
    //        self.authenticationMethod = method
    //        self.startProvisioning()
    //      }
    //      return
    //    }
    // If none of OOB methods are supported, select the only option left.
    authenticationMethod = .noOob
    print("netKey", provisioningManager.networkKey)
    if provisioningManager.networkKey == nil {
      
      let network = AppDelegate.shared.meshNetworkManager.meshNetwork!;
      let networkKey = try! network.add(networkKey: Data.random128BitKey(), name: "Primary Network Key")
      provisioningManager.networkKey = networkKey
    }
    
    // Start provisioning.
    print("Provisioning...")
    do {
      try self.provisioningManager.provision(usingAlgorithm:       .fipsP256EllipticCurve,
                                             publicKey:            self.publicKey!,
                                             authenticationMethod: self.authenticationMethod!)
    } catch {
      print("Error Provisioning",  error.localizedDescription)
    }
  }
  
  public func setSelectedProvisionedDevice(peripheralUuid: UUID, nodeUnicastAddress: Int){
    self.selectedProvisionedDevice = (uuid: peripheralUuid, nodeUnicastAddress: nodeUnicastAddress);
  }
  
  public func closeBearer(){
    self.provisioningBearer.close()
  }
}


extension BleManager: MeshNetworkDelegate {
  func meshNetworkManager(_ manager: MeshNetworkManager, didReceiveMessage message: any MeshMessage, sentFrom source: Address, to destination: Address) {
    print("MeshNetworkDelegate didReceiveMessage", message.opCode, "from:", source)
    switch message.opCode{
      
    case ConfigCompositionDataStatus.opCode:
      print("ConfigCompositionDataStatus", message)
      self.getTtl()
      self.meshModule.sendEvent(withName: "onProgressUpdate", body: "0.80")
      break
      
    case ConfigDefaultTtlStatus.opCode:
      self.meshModule.sendEvent(withName: "onProgressUpdate", body: "1")
      meshModule.sendEvent(withName: "onProvisionCompleted", body: "success")
      break
      
    default:
      print("Unknown opcode", message.opCode)
      
    }
    
  }
  
  func meshNetworkManager(_ manager: MeshNetworkManager, didSendMessage message: any MeshMessage, from localElement: Element, to destination: Address) {
    print("MeshNetworkDelegate didSendMessage", message)
    
  }
  
  func meshNetworkManager(_ manager: MeshNetworkManager, failedToSendMessage message: any MeshMessage, from localElement: Element, to destination: Address, error: any Error) {
    print("MeshNetworkDelegate failedToSendMessage", message)
    self.meshModule.sendEvent(withName: "onProvisionCompleted", body: error.localizedDescription)
    
  }
}

extension BleManager: CBCentralManagerDelegate {
  //MARK: - CBCentralManager delegate
  
  func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
    guard let serviceUUIDs = advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID] else {
      print("No service UUIDs in advertisement data.")
      return
    }
    
    if serviceUUIDs.contains(MeshProvisioningService.uuid) {
      handleMeshProvisioningService(peripheral: peripheral, advertisementData: advertisementData, rssi: RSSI)
    }
    else if serviceUUIDs.contains(MeshProxyService.uuid) {
      handleMeshProxyService(peripheral: peripheral, rssi: RSSI)
    }
    else {
      print("Discovered a device without Mesh services.")
    }
  }
  
  func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: (any Error)?) {
    print("didDisconnectPeripheral", peripheral.identifier.uuid)
    self.meshModule.connectedDevices.removeAll(where: {$0.uuid == peripheral.identifier })
    
  }
  
  func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, timestamp: CFAbsoluteTime, isReconnecting: Bool, error: (any Error)?){
    print("didDisconnectPeripheral", peripheral.identifier.uuid)
    self.meshModule.connectedDevices.removeAll(where: {$0.uuid == peripheral.identifier })
    
  }
  
  func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?){
    print("didFailToConnect", peripheral.identifier.uuid)
    
  }
  
  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    print("Central Manager state changed to \(central.state)")
    
    //    if central.state == .poweredOn{
    // Bluetooth is on, start scanning
    // scanForUnprovisionNodes()
    //    }
  }
}
