import Foundation
import NordicMesh

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
    
  func model(_ model: NordicMesh.Model, didReceiveAcknowledgedMessage request: any NordicMesh.AcknowledgedMeshMessage, from source: NordicMesh.Address, sentTo destination: NordicMesh.MeshAddress) throws -> any NordicMesh.MeshResponse {
        switch request {
            // No acknowledged message supported by this Model.
        default:
            fatalError("Message not supported: \(request)")
        }
    }
    
  func model(_ model: NordicMesh.Model, didReceiveUnacknowledgedMessage message: any NordicMesh.UnacknowledgedMeshMessage, from source: NordicMesh.Address, sentTo destination: NordicMesh.MeshAddress) {
        handle(message, sentFrom: source)
    }
    
  func model(_ model: NordicMesh.Model, didReceiveResponse response: any NordicMesh.MeshResponse, toAcknowledgedMessage request: any NordicMesh.AcknowledgedMeshMessage, from source: NordicMesh.Address) {
        handle(response, sentFrom: source)
    }
  
    
}

extension BMSensorClientDelegate {

  fileprivate func handle(_ message: MeshMessage, sentFrom source: Address) {
    // Ignore.
  }

}
