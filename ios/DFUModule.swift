import CoreBluetooth
import Foundation
import React
import iOSMcuManagerLibrary

@objc(DFUModule)
class DFUModule: RCTEventEmitter {
  
  public var connectedDevices: [ProvisionedDevice] = []
  private var dfuManager: FirmwareUpgradeManager?
  private var defaultManager: DefaultManager?
  private var imagesManager: ImageManager?
  private var centralManager: CBCentralManager!
  
  private var pendingDeviceId: String?
  private var pendingCallback: RCTResponseSenderBlock?
  
  var transport: McuMgrTransport!
  
  var connectedPeripheral: CBPeripheral!
  
  override init() {
    super.init()
  }
  
  @objc
  override static func requiresMainQueueSetup() -> Bool {
    // Return true if the module must be initialized on the main thread,
    // for example, if it needs to interact with UI components.
    // Otherwise, return false to allow initialization on a background thread.
    return false
  }
  
  override func supportedEvents() -> [String]! {
    return ["DFUProgress", "DFUStateChanged", "DFUDeviceParams", "DFUDeviceImagesInfo", "DFUImagesUpdated"]
  }
  
  @objc
  func dfuInit(_ deviceId: String, callback: @escaping RCTResponseSenderBlock) {
    print("dfuInit called with id \(deviceId)")
    
    // Initialize central manager
    self.centralManager = CBCentralManager(delegate: self, queue: nil)
    self.pendingDeviceId = deviceId  // store it for later
    self.pendingCallback = callback  // keep callback to use after connection
  }
  
  @objc
  func startDfu(
    _ filePath: String, eraseStorage: Bool, swapTimeSeconds: Int,
    memoryAlignment: Int, numMcuMgrBuffers: Int, upgradeMode: String,
    callback: @escaping RCTResponseSenderBlock
  ) {
    
    var cleanPath = filePath
    if cleanPath.hasPrefix("file://") {
      cleanPath = String(cleanPath.dropFirst(7))
    }
    
    let url = URL(fileURLWithPath: cleanPath)
    
    do {
      
      let package = try McuMgrPackage(from: url)
      var config = FirmwareUpgradeConfiguration()
      
      switch upgradeMode {
      case "Test and Confirm":
        config.upgradeMode = .testAndConfirm
        break
      case "Test Only":
        config.upgradeMode = .testOnly
        break
      case "Upload Only":
        config.upgradeMode = .uploadOnly
        break
      case "Confirm Only":
        config.upgradeMode = .confirmOnly
        break
      default:
        config.upgradeMode = .testAndConfirm
      }
      
      switch memoryAlignment {
      case 0:
        config.byteAlignment = .disabled
        break
      case 2:
        config.byteAlignment = .twoByte
        break
      case 4:
        config.byteAlignment = .fourByte
        break
      case 8:
        config.byteAlignment = .eightByte
        break
      case 16:
        config.byteAlignment = .sixteenByte
        break
      default:
        config.byteAlignment = .disabled
      }
      
      config.eraseAppSettings = eraseStorage
      config.estimatedSwapTime = TimeInterval(swapTimeSeconds)
      
      Task {
          if let params = try? await self.defaultManager?.paramsAsync(),
             let bufCount = params.bufferCount {
            config.pipelineDepth = min(numMcuMgrBuffers, Int(bufCount))
            config.reassemblyBufferSize = UInt64(params.bufferSize ?? UInt64(Int(UInt16.max)))
          }
          DispatchQueue.main.async {
              self.dfuManager?.start(package: package, using: config)
          }
      }

      callback([NSNull(), NSNull()])
    } catch {
      print("error: \(error)")
      callback([NSNull(), NSNull()])
    }
  }
  
  @objc
  func cancelDfu(
    _ callback: @escaping RCTResponseSenderBlock
  ) {
    self.dfuManager?.logDelegate = self
    self.dfuManager?.cancel()
    
    callback([NSNull(), NSNull()])
    
  }
  
  func bootloaderModeToString(mode: Int?) -> String {
    switch mode {
    case 0:
      return "Single Application"
    case 1:
      return "Swap using Scratch"
    case 2:
      return "Overwrite Only"
    case 3:
      return "Swap without Scratch"
    case 4:
      return "DirectXIP"
    case 5:
      return "DirectXIP with Revert"
    case 6:
      return "RAM Loader"
    default:
      return "Unknown"
    }
  }
  
  @objc
  func readMcuMgrInfo(
    _ callback: @escaping RCTResponseSenderBlock
  ) {
    guard let defaultManager = self.defaultManager else {
      print("defaultManager not found")
      callback([NSNull(), NSNull()])
      return
    }
    
    Task {
      do {
        // Get params
        let params = try await defaultManager.paramsAsync()
        if let count = params.bufferCount, let size = params.bufferSize {
          sendEvent(withName: "DFUDeviceParams", body: ["bufCount": count, "bufSize": size])
        }
        
        // Application info
        let appInfo = try await defaultManager.applicationInfoAsync(format: [
          .kernelName, .kernelVersion,
        ])
        sendEvent(withName: "DFUDeviceParams", body: ["output": appInfo.response ?? ""])
        
        // Bootloader name
        let bootloaderName = try await defaultManager.bootloaderInfoAsync(query: .name)
        sendEvent(
          withName: "DFUDeviceParams",
          body: ["bootloader": bootloaderName.bootloader?.rawValue ?? "Unknown"])
        
        guard bootloaderName.bootloader == .mcuboot else { return }
        
        // Bootloader mode
        let bootMode = try await defaultManager.bootloaderInfoAsync(query: .mode)
        sendEvent(
          withName: "DFUDeviceParams",
          body: ["mode": self.bootloaderModeToString(mode: bootMode.mode?.rawValue)])
        
        // Active slot
        let activeSlot = try await defaultManager.bootloaderInfoAsync(query: .slot)
        sendEvent(withName: "DFUDeviceParams", body: ["slot": activeSlot.activeSlot ?? 0])
        
        // Final callback
        callback([NSNull(), NSNull()])
        
      } catch {
        print("Error reading McuMgr info: \(error)")
        callback([NSNull(), error.localizedDescription])
      }
    }
  }
  
  private func getImagesInfoDict(from response: McuMgrImageStateResponse) -> [String: Any] {
    var result: [String: Any] = [:]
    result["splitStatus"] = response.splitStatus ?? 0
    
    let imagesArray: [[String: Any]] = (response.images ?? []).map { image in
      var imageDict: [String: Any] = [:]
      imageDict["slot"] = image.slot
      imageDict["version"] = image.version ?? "Unknown"
      imageDict["hash"] = Data(image.hash).hexEncodedString(options: .upperCase)
      
      var flags: [String] = []
      if image.bootable { flags.append("Bootable") }
      if image.pending { flags.append("Pending") }
      if image.confirmed { flags.append("Confirmed") }
      if image.active { flags.append("Active") }
      if image.permanent { flags.append("Permanent") }
      if flags.isEmpty { flags.append("None") }
      
      imageDict["flags"] = flags
      
      return imageDict
    }
    
    result["images"] = imagesArray
    
    return result
  }
  
  @objc
  func getDeviceImagesList(_ callback: @escaping RCTResponseSenderBlock) {
    guard let imageManager = self.imagesManager else {
      print("image manager not found")
      callback([NSNull(), NSNull()])
      return
    }
    
    do {
      imageManager.list { [weak self] response, error in
        print(response)
        if let response = response {
          let dict = self!.getImagesInfoDict(from: response)
          self!.sendEvent(withName: "DFUDeviceImagesInfo", body: dict)
        }
      }
    }
  }
  
  func hexToBytes(_ hex: String) throws -> [UInt8] {
    let len = hex.count
    if len % 2 != 0 {
      throw NSError(domain: "HexError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Hex string must have even length"])
    }
    
    var bytes = [UInt8]()
    var index = hex.startIndex
    
    for _ in 0..<(len / 2) {
      let nextIndex = hex.index(index, offsetBy: 2)
      let byteString = hex[index..<nextIndex]
      
      if let byte = UInt8(byteString, radix: 16) {
        bytes.append(byte)
      } else {
        throw NSError(domain: "HexError", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid hex character"])
      }
      
      index = nextIndex
    }
    
    return bytes
  }
  
  @objc
  func eraseImage(_ imagePosition: Int, callback: @escaping RCTResponseSenderBlock){
    guard let imageManager = self.imagesManager else {
      print("image manager not found")
      callback([NSNull(), NSNull()])
      return
    }
    
    do {
      imageManager.erase { [weak self] response, error in
        print(response)
        if let response = response {
          
          self!.sendEvent(withName: "DFUImagesUpdated", body: ["status": "success", "message": "Image \(imagePosition) erased successfully"])
        }
        else if let error = error {
          self!.sendEvent(withName: "DFUImagesUpdated", body: ["status": "failed", "message": "Error erasing image \(imagePosition): \(error.localizedDescription)"])
        }
      }
    }
  }
  
  @objc
  func confirmImage(_ imageHash:String, imagePosition: Int, callback: @escaping RCTResponseSenderBlock){
    guard let imageManager = self.imagesManager else {
      print("image manager not found")
      callback([NSNull(), NSNull()])
      return
    }
    
    do{
      let bytes = try hexToBytes(imageHash)
      imageManager.confirm(hash: bytes) { [weak self] response, error in
        print(response)
        if let response = response {
          
          self!.sendEvent(withName: "DFUImagesUpdated", body: ["status": "success", "message": "Image \(imagePosition) confirmed successfully"])
        }
        else if let error = error {
          self!.sendEvent(withName: "DFUImagesUpdated", body: ["status": "failed", "message": "Error confirm image \(imagePosition): \(error.localizedDescription)"])
        }
      }
      
    }    catch{
      print("Failed convert hash to bytes: \(error.localizedDescription)")
      callback([NSNull(),error.localizedDescription])
    }
  }
  
  @objc
  func testImage(_ imageHash:String, imagePosition: Int, callback: @escaping RCTResponseSenderBlock){
    guard let imageManager = self.imagesManager else {
      print("image manager not found")
      callback([NSNull(), NSNull()])
      return
    }
    
    do{
      let bytes = try hexToBytes(imageHash)
      imageManager.test(hash: bytes) { [weak self] response, error in
        print(response)
        if let response = response {
          
          self!.sendEvent(withName: "DFUImagesUpdated", body: ["status": "success", "message": "Image \(imagePosition) tested successfully"])
        }
        else if let error = error {
          self!.sendEvent(withName: "DFUImagesUpdated", body: ["status": "failed", "message": "Error testing image \(imagePosition): \(error.localizedDescription)"])
        }
      }
      
    }    catch{
      print("Failed convert hash to bytes: \(error.localizedDescription)")
      callback([NSNull(),error.localizedDescription])
    }
  }
  
}

// MARK: - FirmwareUpgradeManagerDelegate
extension DFUModule: FirmwareUpgradeDelegate {
  func uploadProgressDidChange(bytesSent: Int, imageSize: Int, timestamp: Date) {
    print("Progress Changed: ", bytesSent, imageSize)
    let percent = Int((Double(bytesSent) / Double(imageSize)) * 100.0)
    
    self.sendEvent(
      withName: "DFUProgress",
      body: [
        "percent": percent,
        "bytesSent": bytesSent,
        "imageSize": imageSize,
      ])
    
  }
  
  func upgradeDidStart(
    controller: any iOSMcuManagerLibrary.FirmwareUpgradeController
  ) {
    print("Upgrade Did Start")
    
  }
  
  func upgradeStateDidChange(
    from previousState: iOSMcuManagerLibrary.FirmwareUpgradeState,
    to newState: iOSMcuManagerLibrary.FirmwareUpgradeState
  ) {
    print("State Changed from: ", previousState, " to:", newState)
  }
  
  func upgradeDidComplete() {
    print("Upgrade Did Complete")
    sendEvent(
      withName: "DFUStateChanged",
      body: ["state": "completed"])
  }
  
  func upgradeDidFail(
    inState state: iOSMcuManagerLibrary.FirmwareUpgradeState,
    with error: any Error
  ) {
    sendEvent(
      withName: "DFUStateChanged",
      body: ["state": "error", "error": error.localizedDescription])
    print("upgradeDidFail")
    
  }
  
  func upgradeDidCancel(state: iOSMcuManagerLibrary.FirmwareUpgradeState) {
    sendEvent(withName: "DFUStateChanged", body: ["state": "aborted"])
    print("Upgrade Did Cancel")
    
  }
  
}

// MARK: - McuMgrLogDelegate
extension DFUModule: McuMgrLogDelegate {
  func log(
    _ msg: String, ofCategory category: iOSMcuManagerLibrary.McuMgrLogCategory,
    atLevel level: iOSMcuManagerLibrary.McuMgrLogLevel
  ) {
    print(msg)
  }
  
}

// MARK: - CBCentralManagerDelegate
extension DFUModule: CBCentralManagerDelegate {
  
  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    guard central.state == .poweredOn else {
      print("Bluetooth not powered on yet")
      return
    }
    // After central manager fully initilized, connect to the peripheral
    if let deviceId = pendingDeviceId, let uuid = UUID(uuidString: deviceId) {
      let peripherals = central.retrievePeripherals(withIdentifiers: [uuid])
      if let peripheral = peripherals.first {
        print("Connecting to peripheral \(peripheral.identifier)")
        self.connectedPeripheral = peripheral
        self.centralManager?.connect(peripheral, options: nil)
      } else {
        print("Peripheral not found by UUID")
        pendingCallback?([NSNull(), "Peripheral not found"])
        pendingCallback = nil
      }
    }
  }
  
  func centralManager(
    _ central: CBCentralManager, didConnect peripheral: CBPeripheral
  ) {
    
    // Assign transport after peripheral connected
    let bleTransport = McuMgrBleTransport(peripheral)
    //    bleTransport.logDelegate = self
    
    // 1. Use actual max write length (MTU negotiation)
    let writeLength = peripheral.maximumWriteValueLength(for: .withoutResponse)
    print("Negotiated max write length: \(writeLength)")
    bleTransport.mtu = writeLength
    
    self.transport = bleTransport
    
    // Initialize DFU manager
    self.dfuManager = FirmwareUpgradeManager(transport: bleTransport, delegate: self)
    self.dfuManager?.logDelegate = self
    
    // Initialize defaultManager and imagesManager
    self.defaultManager = DefaultManager(transport: bleTransport)
    self.defaultManager?.logDelegate = self
    self.imagesManager = ImageManager(transport: bleTransport)
    self.imagesManager?.logDelegate = self

    pendingCallback?([NSNull(), NSNull()])
    pendingCallback = nil
  }
  
}

// MARK: - Async Wrappers for DefaultManager
extension DefaultManager {
  
  func paramsAsync() async throws -> McuMgrParametersResponse {
    try await withCheckedThrowingContinuation { continuation in
      self.params { response, error in
        if let response = response {
          continuation.resume(returning: response)
        } else if let error = error {
          continuation.resume(throwing: error)
        } else {
          continuation.resume(throwing: NSError(domain: "McuMgrError", code: 0))
        }
      }
    }
  }
  
  func applicationInfoAsync(format: Set<ApplicationInfoFormat>) async throws -> AppInfoResponse {
    try await withCheckedThrowingContinuation { continuation in
      self.applicationInfo(format: format) { response, error in
        if let response = response {
          continuation.resume(returning: response)
        } else if let error = error {
          continuation.resume(throwing: error)
        } else {
          continuation.resume(throwing: NSError(domain: "McuMgrError", code: 1))
        }
      }
    }
  }
  
  func bootloaderInfoAsync(query: BootloaderInfoQuery) async throws -> BootloaderInfoResponse {
    try await withCheckedThrowingContinuation { continuation in
      self.bootloaderInfo(query: query) { response, error in
        if let response = response {
          continuation.resume(returning: response)
        } else if let error = error {
          continuation.resume(throwing: error)
        } else {
          continuation.resume(throwing: NSError(domain: "McuMgrError", code: 2))
        }
      }
    }
  }
}
