import Foundation
import NordicMesh

class BMSceneSetupServerDelegate: ModelDelegate {

    /// Maximum size of the Scene Register.
    private static let maxScenes = 16
    
    /// The Scene Server model, which this model extends.
    let server: BMSceneServerDelegate
    
    let messageTypes: [UInt32 : MeshMessage.Type]
    let isSubscriptionSupported: Bool = true
    let publicationMessageComposer: MessageComposer? = nil
    
    init(server delegate: BMSceneServerDelegate) {
        let types: [StaticMeshMessage.Type] = [
            SceneStore.self,
            SceneStoreUnacknowledged.self,
            SceneDelete.self,
            SceneDeleteUnacknowledged.self
        ]
        messageTypes = types.toMap()
        server = delegate
    }
    
    // MARK: - Message handlers
    
  func model(_ model: NordicMesh.Model, didReceiveAcknowledgedMessage request: any NordicMesh.AcknowledgedMeshMessage, from source: NordicMesh.Address, sentTo destination: NordicMesh.MeshAddress) throws -> any NordicMesh.MeshResponse {
        switch request {
        case let request as SceneStore:
            // Little validation.
            guard request.scene.isValidSceneNumber else {
                throw ModelError.invalidMessage
            }
            
            // Scene Register may contain up to 16 stored Scenes.
            // Overwriting is allowed.
            guard storedScenes.count < Self.maxScenes ||
                  storedScenes.contains(request.scene) else {
                return SceneRegisterStatus(report: currentScene,
                                           and: storedScenes,
                                           with: .sceneRegisterFull)
            }
            
            setCurrentScene(request.scene)
            
            // Store the scene on all Models that support Scenes.
            MeshNetworkManager.instance.localElements
                .flatMap { $0.models }
                .compactMap { $0.delegate as? StoredWithSceneModelDelegate }
                .forEach { $0.store(with: request.scene) }
            
        case let request as SceneDelete:
            // Little validation.
            guard request.scene.isValidSceneNumber else {
                throw ModelError.invalidMessage
            }
            
            // If no such Scene was found, return an error.
            guard let index = storedScenes.firstIndex(of: request.scene) else {
                return SceneRegisterStatus(report: currentScene,
                                           and: storedScenes,
                                           with: .sceneNotFound)
            }
            
            removeScene(at: index)
            
        default:
            fatalError("Not possible")
        }
        
        return SceneRegisterStatus(report: currentScene, and: storedScenes)
    }
    
  func model(_ model: NordicMesh.Model, didReceiveUnacknowledgedMessage message: any NordicMesh.UnacknowledgedMeshMessage, from source: NordicMesh.Address, sentTo destination: NordicMesh.MeshAddress) {
        switch message {
        case let request as SceneStoreUnacknowledged:
            // Little validation.
            guard request.scene.isValidSceneNumber else {
                return
            }
            
            // Scene Register may contain up to 16 stored Scenes.
            // Overwriting is allowed.
            guard storedScenes.count < Self.maxScenes ||
                  storedScenes.contains(request.scene) else {
                return
            }
            setCurrentScene(request.scene)
            
            // Store the scene on all Models that support Scenes.
            MeshNetworkManager.instance.localElements
                .flatMap { $0.models }
                .compactMap { $0.delegate as? StoredWithSceneModelDelegate }
                .forEach { $0.store(with: request.scene) }
            
        case let request as SceneDeleteUnacknowledged:
            // Little validation.
            guard request.scene.isValidSceneNumber else {
                return
            }
            
            // If no such Scene was found, ignore
            guard let index = storedScenes.firstIndex(of: request.scene) else {
                return
            }
            removeScene(at: index)
            
        default:
            // Not possible.
            break
        }
    }
    
  func model(_ model: NordicMesh.Model, didReceiveResponse response: any NordicMesh.MeshResponse, toAcknowledgedMessage request: any NordicMesh.AcknowledgedMeshMessage, from source: NordicMesh.Address) {
        // Not possible.
    }
    
}
