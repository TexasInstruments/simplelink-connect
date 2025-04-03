import Foundation
import nRFMeshProvision

class BMSensorClientDelegate: ModelDelegate {
    let messageTypes: [UInt32 : MeshMessage.Type]
    let isSubscriptionSupported: Bool = true
    
    // TODO: Implement Sensor Client publications.
    let publicationMessageComposer: MessageComposer? = nil
    
    init() {
        let types: [StaticMeshMessage.Type] = [
            SensorDescriptorStatus.self,
            SensorCadenceStatus.self,
            SensorSettingsStatus.self,
            SensorSettingStatus.self,
            SensorStatus.self,
            SensorColumnStatus.self,
            SensorSeriesStatus.self,
        ]
        messageTypes = types.toMap()
    }
    
    func model(_ model: Model, didReceiveAcknowledgedMessage request: AcknowledgedMeshMessage,
               from source: Address, sentTo destination: MeshAddress) throws -> MeshMessage {
        switch request {
            // No acknowledged message supported by this Model.
        default:
            fatalError("Message not supported: \(request)")
        }
    }
    
    func model(_ model: Model, didReceiveUnacknowledgedMessage message: MeshMessage,
               from source: Address, sentTo destination: MeshAddress) {
        handle(message, sentFrom: source)
    }
    
    func model(_ model: Model, didReceiveResponse response: MeshMessage,
               toAcknowledgedMessage request: AcknowledgedMeshMessage,
               from source: Address) {
        handle(response, sentFrom: source)
    }
    
}

private extension BMSensorClientDelegate {
    
    func handle(_ message: MeshMessage, sentFrom source: Address) {
        // Ignore.
    }
    
}
