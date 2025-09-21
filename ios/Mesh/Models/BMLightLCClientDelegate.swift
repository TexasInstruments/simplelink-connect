//
//  LightLCClientDelegate.swift
//  SimplelinkConnect
//
//  Created by IL Tools on 21/11/2024.
//
import Foundation
import NordicMesh

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
    
  func model(_ model: NordicMesh.Model, didReceiveAcknowledgedMessage request: any NordicMesh.AcknowledgedMeshMessage, from source: NordicMesh.Address, sentTo destination: NordicMesh.MeshAddress) throws -> any NordicMesh.MeshResponse {
    fatalError("Not possible")

  }
  
  func model(_ model: NordicMesh.Model, didReceiveUnacknowledgedMessage message: any NordicMesh.UnacknowledgedMeshMessage, from source: NordicMesh.Address, sentTo destination: NordicMesh.MeshAddress) {
    
  }
  
  func model(_ model: NordicMesh.Model, didReceiveResponse response: any NordicMesh.MeshResponse, toAcknowledgedMessage request: any NordicMesh.AcknowledgedMeshMessage, from source: NordicMesh.Address) {
    
  }
    
}
