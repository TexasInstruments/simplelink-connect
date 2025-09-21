import Foundation
import NordicMesh

/// A base protocol for vendor messages.
///
/// Vendor messages have 24-bit long Op Code,
/// of which 16 least significant bits contains the Company ID
/// and 6 least significant bits of the most significant byte
/// are the vendor Op Code.
public protocol VendorMessage: MeshMessage {
    // No additional fields.
}

/// A base protocol for unacknowledged vendor message.
public protocol UnacknowledgedVendorMessage: VendorMessage, UnacknowledgedMeshMessage {
    // No additional fields.
}

/// The base class for vendor response messages.
public protocol VendorResponse: MeshResponse, UnacknowledgedVendorMessage {
    // No additional fields.
}

/// A base protocol for acknowledged vendor message.
public protocol AcknowledgedVendorMessage: VendorMessage, AcknowledgedMeshMessage {
    // No additional fields.
}

/// A base protocol for static vendor message.
public protocol StaticVendorMessage: VendorMessage, StaticMeshMessage {
    // No additional fields.
}

/// A base protocol for static unacknowledged vendor message.
public protocol StaticUnacknowledgedVendorMessage: StaticVendorMessage, UnacknowledgedMeshMessage {
    // No additional fields.
}

/// The base class for vendor response messages.
public protocol StaticVendorResponse: StaticMeshResponse, StaticUnacknowledgedVendorMessage {
    // No additional fields.
}

/// A base protocol for static acknowledged vendor message.
public protocol StaticAcknowledgedVendorMessage: StaticVendorMessage, StaticAcknowledgedMeshMessage {
    // No additional fields.
}

/// A base protocol for vendor status message.
public protocol VendorStatusMessage: UnacknowledgedVendorMessage, StatusMessage {
    // No additional fields.
}

public extension VendorMessage {
    
    /// The Op Code as defined by the company.
    ///
    /// There are 64 3-octet Op Codes available per company identifier.
    /// Op Code is encoded in the 6 least significant
    /// bits of the most significant octet of the message Op Code.
    var vendorOpCode: UInt8 {
        return UInt8(opCode >> 16) & 0x3F
    }
    
    /// The Company Identifiers are 16-bit values defined by the
    /// Bluetooth SIG and are coded into the second and third octets
    /// of the 3-octet Op Code.
    var companyIdentifier: UInt16 {
        return UInt16(opCode & 0xFFFF).bigEndian
    }
    
}

public extension Array where Element == StaticVendorMessage.Type {
    
    /// A helper method that can create a map of message types required
    /// by the ``ModelDelegate`` from a list of ``StaticVendorMessage``s.
    ///
    /// - returns: A map of message types.
    func toMap() -> [UInt32 : MeshMessage.Type] {
        return (self as [StaticMeshMessage.Type]).toMap()
    }
    
}

protocol RuntimeVendorMessage: VendorMessage {
    var isSegmented: Bool { get set }
    var security: MeshMessageSecurity { get set }
}

struct RuntimeUnacknowledgedVendorMessage: RuntimeVendorMessage, UnacknowledgedVendorMessage {
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

struct RuntimeAcknowledgedVendorMessage: RuntimeVendorMessage, AcknowledgedVendorMessage {
    let opCode: UInt32
    var responseOpCode: UInt32
    let parameters: Data?
    
    var isSegmented: Bool = false
    var security: MeshMessageSecurity = .low
    
    init(opCode: UInt8, responseOpCode: UInt8, for model: Model, parameters: Data) {
        self.opCode = (UInt32(0xC0 | opCode) << 16) | UInt32(model.companyIdentifier!.bigEndian)
        self.responseOpCode = (UInt32(0xC0 | responseOpCode) << 16) | UInt32(model.companyIdentifier!.bigEndian)
        self.parameters = parameters
    }
    
    init?(parameters: Data) {
        // This init will never be used, as it's used for incoming messages.
        return nil
    }
}

extension RuntimeUnacknowledgedVendorMessage: CustomDebugStringConvertible {

    var debugDescription: String {
        let hexOpCode = String(format: "%2X", opCode)
        return "RuntimeVendorMessage(opCode: \(hexOpCode), parameters: \(parameters!.hex), isSegmented: \(isSegmented), security: \(security))"
    }
    
}

extension RuntimeAcknowledgedVendorMessage: CustomDebugStringConvertible {

    var debugDescription: String {
        let hexOpCode = String(format: "%2X", opCode)
        let hexResponseOpCode = String(format: "%2X", responseOpCode)
        return "RuntimeVendorMessage(opCode: \(hexOpCode), responseOpCode: \(hexResponseOpCode) parameters: \(parameters!.hex), isSegmented: \(isSegmented), security: \(security))"
    }
    
 
}
