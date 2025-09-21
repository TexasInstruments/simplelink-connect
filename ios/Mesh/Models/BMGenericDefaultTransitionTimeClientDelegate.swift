import Foundation
import NordicMesh

class BMGenericDefaultTransitionTimeClientDelegate: ModelDelegate {
  let messageTypes: [UInt32: MeshMessage.Type]
  let isSubscriptionSupported: Bool = true

  var publicationMessageComposer: MessageComposer? {
    func compose() -> MeshMessage {
      return GenericDefaultTransitionTimeSetUnacknowledged(
        transitionTime: self.defaultTransitionTime)
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

  func model(
    _ model: NordicMesh.Model,
    didReceiveAcknowledgedMessage request: any NordicMesh
      .AcknowledgedMeshMessage, from source: NordicMesh.Address,
    sentTo destination: NordicMesh.MeshAddress
  ) throws -> any NordicMesh.MeshResponse {
    fatalError("Not possible")
  }

  func model(
    _ model: NordicMesh.Model,
    didReceiveUnacknowledgedMessage message: any NordicMesh
      .UnacknowledgedMeshMessage, from source: NordicMesh.Address,
    sentTo destination: NordicMesh.MeshAddress
  ) {
    // The status message may be received here if the Generic Default
    // Transition Time Server model has been configured to publish.
    // Ignore this message.
  }

  func model(
    _ model: NordicMesh.Model,
    didReceiveResponse response: any NordicMesh.MeshResponse,
    toAcknowledgedMessage request: any NordicMesh.AcknowledgedMeshMessage,
    from source: NordicMesh.Address
  ) {
    // Ignore.
  }

}
