//
//  GenericLevelClientDelegate.swift
//  SimplelinkConnect
//
//  Created by IL Tools on 21/11/2024.
//

import Foundation
import NordicMesh

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
    
  func model(_ model: NordicMesh.Model, didReceiveAcknowledgedMessage request: any NordicMesh.AcknowledgedMeshMessage, from source: NordicMesh.Address, sentTo destination: NordicMesh.MeshAddress) throws -> any NordicMesh.MeshResponse {
        fatalError("Not possible")
    }
    
  func model(_ model: NordicMesh.Model, didReceiveUnacknowledgedMessage message: any NordicMesh.UnacknowledgedMeshMessage, from source: NordicMesh.Address, sentTo destination: NordicMesh.MeshAddress) {
        // The status message may be received here if the Generic Level Server model
        // has been configured to publish. Ignore this message.
    }
    
  func model(_ model: NordicMesh.Model, didReceiveResponse response: any NordicMesh.MeshResponse, toAcknowledgedMessage request: any NordicMesh.AcknowledgedMeshMessage, from source: NordicMesh.Address){
        // Ignore.
    }
    
}
