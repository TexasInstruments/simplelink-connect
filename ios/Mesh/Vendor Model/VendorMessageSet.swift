//
//  VendorMessageSet.swift
//  SimplelinkConnect
//
//  Created by IL Tools on 08/01/2025.
//

import nRFMeshProvision

protocol RuntimeVendorMessage: VendorMessage {
  var isSegmented: Bool { get set }
  var security: MeshMessageSecurity { get set }
}

/// The base class for unacknowledged messages.
public protocol UnacknowledgedMeshMessage: MeshMessage {
  // No additional fields.
}

/// A base protocol for unacknowledged vendor message.
public protocol UnacknowledgedVendorMessage: VendorMessage, UnacknowledgedMeshMessage {
  // No additional fields.
}

struct RuntimeUnacknowledgedVendorMessage: RuntimeVendorMessage, UnacknowledgedVendorMessage{
  let opCode: UInt32
  let parameters: Data?
  
  var isSegmented: Bool = false
  var security: MeshMessageSecurity = .low
  init(opCode: UInt8, for model: Model, parameters: Data) {
    self.opCode = (UInt32(0xC0 | opCode) << 16) | UInt32(model.companyIdentifier!.bigEndian)
    self.parameters = parameters
  }
  
  init?(parameters: Data) {
    // This init will never be used, as it's used for incoming messages.
    return nil
  }
}
