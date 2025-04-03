import Foundation
import nRFMeshProvision

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
               from source: Address, sentTo destination: MeshAddress) -> MeshMessage {
        fatalError("Message not supported: \(request)")
    }
    
    func model(_ model: Model, didReceiveUnacknowledgedMessage message: MeshMessage,
               from source: Address, sentTo destination: MeshAddress) {
        // The status message may be received here if the Generic Power OnOff Server model
        // has been configured to publish. Ignore this message.
    }
    
    func model(_ model: Model, didReceiveResponse response: MeshMessage,
               toAcknowledgedMessage request: AcknowledgedMeshMessage,
               from source: Address) {
        // Ignore.
    }
}
