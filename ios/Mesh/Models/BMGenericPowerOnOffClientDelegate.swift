import Foundation
import NordicMesh

class BMGenericPowerOnOffClientDelegate: ModelDelegate {
 
    let messageTypes: [UInt32 : MeshMessage.Type]
    let isSubscriptionSupported: Bool = true
    
    var publicationMessageComposer: MessageComposer? {
        func compose() -> MeshMessage {
            return GenericOnPowerUpSetUnacknowledged(state: self.state)
        }
        let request = compose()
        return {
            return request
        }
    }
    
    /// The current value of the Generic On Power Up state.
    var state: OnPowerUp = .default {
        didSet {
            publish(using: MeshNetworkManager.instance)
        }
    }
    
    init() {
        let types: [StaticMeshMessage.Type] = [
            GenericOnPowerUpStatus.self
        ]
        messageTypes = types.toMap()
    }
    
    // MARK: - Message handlers
    
    func model(_ model: Model, didReceiveAcknowledgedMessage request: AcknowledgedMeshMessage,
               from source: Address, sentTo destination: MeshAddress) throws -> any NordicMesh.MeshResponse {
        fatalError("Message not supported: \(request)")
    }
    
  func model(_ model: NordicMesh.Model, didReceiveUnacknowledgedMessage message: any NordicMesh.UnacknowledgedMeshMessage, from source: NordicMesh.Address, sentTo destination: NordicMesh.MeshAddress) {
        // The status message may be received here if the Generic Power OnOff Server model
        // has been configured to publish. Ignore this message.
    }
    
  func model(_ model: NordicMesh.Model, didReceiveResponse response: any NordicMesh.MeshResponse, toAcknowledgedMessage request: any NordicMesh.AcknowledgedMeshMessage, from source: NordicMesh.Address) {
        // Ignore.
    }
}
