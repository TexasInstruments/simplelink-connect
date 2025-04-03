//
//  LightLCClientDelegate.swift
//  SimplelinkConnect
//
//  Created by IL Tools on 21/11/2024.
//
import Foundation
import nRFMeshProvision

class BMLightLCClientDelegate: ModelDelegate {
    
    let messageTypes: [UInt32 : MeshMessage.Type]
    let isSubscriptionSupported: Bool = true
    
    var publicationMessageComposer: MessageComposer? {
        return nil
    }
    
    init() {
        let types: [StaticMeshMessage.Type] = [
            LightLCModeStatus.self,
            LightLCOccupancyModeStatus.self,
            LightLCLightOnOffStatus.self,
            LightLCPropertyStatus.self
        ]
        messageTypes = types.toMap()
    }
    
    // MARK: - Message handlers
    
    func model(_ model: Model, didReceiveAcknowledgedMessage request: AcknowledgedMeshMessage,
               from source: Address, sentTo destination: MeshAddress) -> MeshMessage {
        fatalError("Not possible")
    }
    
    func model(_ model: Model, didReceiveUnacknowledgedMessage message: MeshMessage,
               from source: Address, sentTo destination: MeshAddress) {
        // The status message may be received here if the Light LC Server model
        // has been configured to publish. Ignore this message.
    }
    
    func model(_ model: Model, didReceiveResponse response: MeshMessage,
               toAcknowledgedMessage request: AcknowledgedMeshMessage,
               from source: Address) {
        // Ignore.
    }
    
}

