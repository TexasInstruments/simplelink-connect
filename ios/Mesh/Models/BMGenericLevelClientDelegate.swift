//
//  GenericLevelClientDelegate.swift
//  SimplelinkConnect
//
//  Created by IL Tools on 21/11/2024.
//

import Foundation
import nRFMeshProvision

class BMGenericLevelClientDelegate: ModelDelegate {
    let messageTypes: [UInt32 : MeshMessage.Type]
    let isSubscriptionSupported: Bool = true
    
    var publicationMessageComposer: MessageComposer? {
        func compose() -> MeshMessage {
            return GenericLevelSetUnacknowledged(level: self.state)
        }
        let request = compose()
        return {
            return request
        }
    }
    
    /// The current state of the Generic Level Client model.
    var state: Int16 = Int16.min {
        didSet {
            publish(using: MeshNetworkManager.instance)
        }
    }
    
    init() {
        let types: [StaticMeshMessage.Type] = [
            GenericLevelStatus.self
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
        // The status message may be received here if the Generic Level Server model
        // has been configured to publish. Ignore this message.
    }
    
    func model(_ model: Model, didReceiveResponse response: MeshMessage,
               toAcknowledgedMessage request: AcknowledgedMeshMessage,
               from source: Address){
        // Ignore.
    }
    
}
