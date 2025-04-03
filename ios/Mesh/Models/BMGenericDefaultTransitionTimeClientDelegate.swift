import Foundation
import nRFMeshProvision

class BMGenericDefaultTransitionTimeClientDelegate: ModelDelegate {
    let messageTypes: [UInt32 : MeshMessage.Type]
    let isSubscriptionSupported: Bool = true
    
    var publicationMessageComposer: MessageComposer? {
        func compose() -> MeshMessage {
            return GenericDefaultTransitionTimeSetUnacknowledged(transitionTime: self.defaultTransitionTime)
        }
        let request = compose()
        return {
            return request
        }
    }
    
    /// This property represents the Default Transition Time State.
    ///
    /// Setting the value will publish a Generic Default Transition Time Set Unacknowleged
    /// message if publication was set for the model.
    ///
    /// Initially, the value is "unknown time".
    var defaultTransitionTime: TransitionTime = TransitionTime() {
        didSet {
            publish(using: MeshNetworkManager.instance)
        }
    }
    
    init() {
        let types: [StaticMeshMessage.Type] = [
            GenericDefaultTransitionTimeStatus.self
        ]
        messageTypes = types.toMap()
    }
    
    // MARK: - Message handlers
    
    func model(_ model: Model, didReceiveAcknowledgedMessage request: AcknowledgedMeshMessage,
               from source: Address, sentTo destination: MeshAddress) throws -> MeshMessage {
        fatalError("Not possible")
    }
    
    func model(_ model: Model, didReceiveUnacknowledgedMessage message: MeshMessage,
               from source: Address, sentTo destination: MeshAddress) {
        // The status message may be received here if the Generic Default
        // Transition Time Server model has been configured to publish.
        // Ignore this message.
    }
    
    func model(_ model: Model, didReceiveResponse response: MeshMessage,
               toAcknowledgedMessage request: AcknowledgedMeshMessage,
               from source: Address) {
        // Ignore.
    }
}
