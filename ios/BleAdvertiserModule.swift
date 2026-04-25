//
//  BleAdvertiserModule.swift
//  SimplelinkConnect
//
//  Created by IL Tools on 18/02/2026.
//


/*
 * Copyright (c) 2023, Texas Instruments Incorporated
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * *  Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *
 * *  Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * *  Neither the name of Texas Instruments Incorporated nor the names of
 *    its contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import Foundation
import CoreBluetooth
import React

@objc(BleAdvertiserModule)
class BleAdvertiserModule: RCTEventEmitter, CBPeripheralManagerDelegate {
  
  private var peripheralManager: CBPeripheralManager?
  private var activeAdvertisements: [String: [String: Any]] = [:]
  private var isAdvertising: Bool = false
  private var activeServices: [CBMutableService] = []
  
  override init() {
    super.init()
    peripheralManager = CBPeripheralManager(delegate: self, queue: nil)
  }
  
  override func supportedEvents() -> [String]! {
    return ["BleAdvertiserStateChanged", "BleAdvertiserError", "BleAdvertiserCentralConnected", "BleAdvertiserCentralDisconnected"]
  }
  
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  // MARK: - React Native Bridge Methods
  
  @objc func startAdvertising(_ advertisementId: String, config: NSDictionary, callback: @escaping RCTResponseSenderBlock) {
    guard let peripheralManager = peripheralManager else {
      callback([["error": "Peripheral manager not initialized"]])
      return
    }
    
    // Check Bluetooth state - show error to user
    if peripheralManager.state != .poweredOn {
      let errorMessage: String
      switch peripheralManager.state {
      case .poweredOff:
        errorMessage = "Bluetooth is turned off. Please enable Bluetooth in Settings."
      case .unauthorized:
        errorMessage = "Bluetooth permission denied. Please enable Bluetooth permissions in Settings."
      case .unsupported:
        errorMessage = "Bluetooth is not supported on this device."
      case .resetting:
        errorMessage = "Bluetooth is resetting. Please try again in a moment."
      default:
        errorMessage = "Bluetooth is not ready. Please check your Bluetooth settings."
      }
      
      callback([["error": errorMessage]])
      sendEvent(withName: "BleAdvertiserError", body: [
        "advertisementId": advertisementId,
        "error": errorMessage
      ])
      return
    }
    
    // Stop any existing advertisement
    if isAdvertising {
      peripheralManager.stopAdvertising()
    }
    
    // Remove all existing services
    if !activeServices.isEmpty {
      for service in activeServices {
        peripheralManager.remove(service)
      }
      activeServices.removeAll()
    }
    
    // Build advertisement data
    var advertisementData: [String: Any] = [:]
    
    // Local name
    if let localName = config["localName"] as? String, !localName.isEmpty {
      advertisementData[CBAdvertisementDataLocalNameKey] = localName
    }
    
    // Service UUIDs - Add them as actual GATT services
    var serviceUUIDsForAdvertising: [CBUUID] = []
    if let serviceUUIDs = config["serviceUUIDs"] as? [String], !serviceUUIDs.isEmpty {
      for uuidString in serviceUUIDs {
        let cbuuid = CBUUID(string: uuidString)
        serviceUUIDsForAdvertising.append(cbuuid)
        
        // Create and add the service for advertising
        // Note: Service has no characteristics - used for advertising only
        let service = CBMutableService(type: cbuuid, primary: true)
        peripheralManager.add(service)
        activeServices.append(service)
      }
      
      // Add service UUIDs to advertisement data
      advertisementData[CBAdvertisementDataServiceUUIDsKey] = serviceUUIDsForAdvertising
    }
    
    
    // Start advertising
    peripheralManager.startAdvertising(advertisementData)
    
    // Store active advertisement config
    activeAdvertisements[advertisementId] = config as? [String: Any]
    isAdvertising = true
    
    // Send success callback
    callback([NSNull(), ["success": true]])
    
    // Send state changed event
    sendEvent(withName: "BleAdvertiserStateChanged", body: ["advertisementId": advertisementId, "isActive": true])
  }
  
  @objc func stopAdvertising(_ advertisementId: String, callback: @escaping RCTResponseSenderBlock) {
    guard let peripheralManager = peripheralManager else {
      callback([["error": "Peripheral manager not initialized"]])
      return
    }
    
    // Stop advertising
    peripheralManager.stopAdvertising()
    
    // Remove all services
    if !activeServices.isEmpty {
      for service in activeServices {
        peripheralManager.remove(service)
      }
      activeServices.removeAll()
    }
    
    // Remove from active advertisements
    activeAdvertisements.removeValue(forKey: advertisementId)
    isAdvertising = false
    
    // Send success callback
    callback([NSNull(), ["success": true]])
    
    // Send state changed event
    sendEvent(withName: "BleAdvertiserStateChanged", body: ["advertisementId": advertisementId, "isActive": false])
  }
  
  // MARK: - CBPeripheralManagerDelegate
  
  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    var state = "unknown"
    switch peripheral.state {
    case .poweredOn:
      state = "poweredOn"
    case .poweredOff:
      state = "poweredOff"
    case .resetting:
      state = "resetting"
    case .unauthorized:
      state = "unauthorized"
    case .unsupported:
      state = "unsupported"
    default:
      state = "unknown"
    }
    
    // If Bluetooth turns off while advertising, notify about errors
    if peripheral.state != .poweredOn && isAdvertising {
      // Clean up services
      if !activeServices.isEmpty {
        for service in activeServices {
          peripheral.remove(service)
        }
        activeServices.removeAll()
      }
      
      for (advertisementId, _) in activeAdvertisements {
        sendEvent(withName: "BleAdvertiserError", body: ["advertisementId": advertisementId, "error": "Bluetooth state changed to \(state)"])
        sendEvent(withName: "BleAdvertiserStateChanged", body: ["advertisementId": advertisementId, "isActive": false])
      }
      activeAdvertisements.removeAll()
      isAdvertising = false
    }
  }
  
  func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
    if let error = error {
      // Notify about error
      for (advertisementId, _) in activeAdvertisements {
        sendEvent(withName: "BleAdvertiserError", body: ["advertisementId": advertisementId, "error": error.localizedDescription])
        sendEvent(withName: "BleAdvertiserStateChanged", body: ["advertisementId": advertisementId, "isActive": false])
      }
      activeAdvertisements.removeAll()
      isAdvertising = false
    }
  }
}
