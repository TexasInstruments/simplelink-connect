import Foundation
import NordicMesh

class BMGenericLevelServerDelegate: StoredWithSceneModelDelegate {

    /// The Generic Default Transition Time Server model, which this model depends on.
    let defaultTransitionTimeServer: BMGenericDefaultTransitionTimeServerDelegate
    
    let messageTypes: [UInt32 : MeshMessage.Type]
    let isSubscriptionSupported: Bool = true
    
    var publicationMessageComposer: MessageComposer? {
        func compose() -> MeshMessage {
            if let transition = self.state.transition, transition.remainingTime > 0 {
                return GenericLevelStatus(level: self.state.value,
                                          targetLevel: transition.targetValue,
                                          remainingTime: TransitionTime(transition.remainingTime))
            } else {
                return GenericLevelStatus(level: self.state.value)
            }
        }
        let request = compose()
        return {
            return request
        }
    }
    
    /// States stored with Scenes.
    ///
    /// The key is the Scene number as HEX (4-character hexadecimal string).
    private var storedScenes: [String: Int16]
    /// User defaults are used to store state with Scenes.
    private let defaults: UserDefaults
    /// The key, under which scenes are stored.
    private let key: String
    
    /// Model state.
    private var state = BMGenericState<Int16>(Int16.min) {
        willSet {
            // If the state has changed due to a different reason than
            // recalling a Scene, the Current Scene in Scene Server model
            // has to be invalidated.
            if !newValue.storedWithScene,
               let network = MeshNetworkManager.instance.meshNetwork {
                networkDidExitStoredWithSceneState(network)
            }
        }
        didSet {
            if let transition = state.transition, transition.remainingTime > 0 {
                DispatchQueue.main.asyncAfter(deadline: .now() + transition.remainingTime) { [weak self] in
                    guard let self = self else { return }
                    // If the state has not change since it was set,
                    // remove the Transition.
                    if self.state.transition?.start == transition.start {
                        self.state = BMGenericState<Int16>(self.state.transition?.targetValue ?? self.state.value)
                    }
                }
            }
            let state = self.state
            if let observer = observer {
                DispatchQueue.main.async {
                    observer(state)
                }
            }
        }
    }
    /// The last transaction details.
    private let transactionHelper = TransactionHelper()
    /// The state observer.
    private var observer: ((BMGenericState<Int16>) -> ())?
    
    init(_ meshNetwork: MeshNetwork,
         defaultTransitionTimeServer delegate: BMGenericDefaultTransitionTimeServerDelegate,
         elementIndex: UInt8) {
        let types: [StaticMeshMessage.Type] = [
            GenericLevelGet.self,
            GenericLevelSet.self,
            GenericLevelSetUnacknowledged.self,
            GenericDeltaSet.self,
            GenericDeltaSetUnacknowledged.self,
            GenericMoveSet.self,
            GenericMoveSetUnacknowledged.self
        ]
        messageTypes = types.toMap()
        
        defaultTransitionTimeServer = delegate
        
        defaults = UserDefaults(suiteName: meshNetwork.uuid.uuidString)!
        key = "genericLevelServer_\(elementIndex)_scenes"
        storedScenes = defaults.dictionary(forKey: key) as? [String: Int16] ?? [:]
    }
    
    // MARK: - Scene handlers
    
    func store(with scene: SceneNumber) {
      storedScenes[String(format: "%04X", scene)] = state.value
        defaults.set(storedScenes, forKey: key)
    }
    
    func recall(_ scene: SceneNumber, transitionTime: TransitionTime?, delay: UInt8?) {
        guard let level = storedScenes[String(format: "%04X", scene)] else {
            return
        }
        if let transitionTime = transitionTime,
           let delay = delay {
            state = BMGenericState<Int16>(transitionFrom: state, to: level,
                                       delay: TimeInterval(delay) * 0.005,
                                       duration: transitionTime.interval,
                                       storedWithScene: true)
        } else {
            state = BMGenericState<Int16>(level, storedWithScene: true)
        }
    }
    
    // MARK: - Message handlers
    
      func model(_ model: NordicMesh.Model, didReceiveAcknowledgedMessage request: any NordicMesh.AcknowledgedMeshMessage, from source: NordicMesh.Address, sentTo destination: NordicMesh.MeshAddress) throws -> any NordicMesh.MeshResponse {
            switch request {
            case let request as GenericLevelSet:
                // Ignore a repeated request (with the same TID) from the same source
                // and sent to the same destination when it was received within 6 seconds.
                guard transactionHelper.isNewTransaction(request, from: source, to: destination) else {
                    break
                }
                
                /// Message execution delay in 5 millisecond steps. By default 0.
                let delay = TimeInterval(request.delay ?? 0) * 0.005
                /// The time that an element will take to transition to the target
                /// state from the present state. If not set, the default transition
                /// time from Generic Default Transition Time Server model is used.
                let transitionTime = request.transitionTime
                    .or(defaultTransitionTimeServer.defaultTransitionTime)
                // Start a new transition.
                state = BMGenericState<Int16>(transitionFrom: state, to: request.level,
                                            delay: delay,
                                            duration: transitionTime.interval)

            case let request as GenericDeltaSet:
                let targetLevel = Int16(truncatingIfNeeded: Int32(state.value) + request.delta)
                
                /// A flag indicating whether the message is sent as a continuation
                /// (using the same transaction) as the last one.
                let continuation = transactionHelper.isTransactionContinuation(request, from: source, to: destination)
                /// Message execution delay in 5 millisecond steps. By default 0.
                let delay = TimeInterval(request.delay ?? 0) * 0.005
                /// The time that an element will take to transition to the target
                /// state from the present state. If not set, the default transition
                /// time from Generic Default Transition Time Server model is used.
                let transitionTime = request.transitionTime
                    .or(defaultTransitionTimeServer.defaultTransitionTime)
                // Is the same transaction already in progress?
                if continuation, let transition = state.transition, transition.remainingTime > 0 {
                    // Continue the same transition.
                    state = BMGenericState<Int16>(continueTransitionFrom: state, to: targetLevel,
                                                delay: delay,
                                                duration: transitionTime.interval)
                } else {
                    // Start a new transition.
                    state = BMGenericState<Int16>(transitionFrom: state, to: targetLevel,
                                                delay: delay,
                                                duration: transitionTime.interval)
                }
                
            case let request as GenericMoveSet:
                // Ignore a repeated request (with the same TID) from the same source
                // and sent to the same destination when it was received within 6 seconds.
                guard transactionHelper.isNewTransaction(request, from: source, to: destination) else {
                    break
                }
                
                /// Message execution delay in 5 millisecond steps. By default 0.
                let delay = TimeInterval(request.delay ?? 0) * 0.005
                /// The time that an element will take to transition to the target
                /// state from the present state. If not set, the default transition
                /// time from Generic Default Transition Time Server model is used.
                let transitionTime = request.transitionTime
                    .or(defaultTransitionTimeServer.defaultTransitionTime)
                // Start a new transition.
                state = BMGenericState<Int16>(animateFrom: state, to: request.deltaLevel,
                                            delay: delay,
                                            duration: transitionTime.interval)
                
            case is GenericLevelGet:
                break
                
            default:
                fatalError("Not possible")
            }

            // Reply with GenericLevelStatus.
            if let transition = state.transition, transition.remainingTime > 0 {
                return GenericLevelStatus(level: state.value,
                                          targetLevel: transition.targetValue,
                                          remainingTime: TransitionTime(transition.remainingTime))
            } else {
                return GenericLevelStatus(level: state.value)
            }
        }
        
      func model(_ model: NordicMesh.Model, didReceiveUnacknowledgedMessage message: any NordicMesh.UnacknowledgedMeshMessage, from source: NordicMesh.Address, sentTo destination: NordicMesh.MeshAddress){
            switch message {
            case let request as GenericLevelSetUnacknowledged:
                // Ignore a repeated request (with the same TID) from the same source
                // and sent to the same destination when it was received within 6 seconds.
                guard transactionHelper.isNewTransaction(request, from: source, to: destination) else {
                    break
                }
                
                /// Message execution delay in 5 millisecond steps. By default 0.
                let delay = TimeInterval(request.delay ?? 0) * 0.005
                /// The time that an element will take to transition to the target
                /// state from the present state. If not set, the default transition
                /// time from Generic Default Transition Time Server model is used.
                let transitionTime = request.transitionTime
                    .or(defaultTransitionTimeServer.defaultTransitionTime)
                // Start a new transition.
                state = BMGenericState<Int16>(transitionFrom: state, to: request.level,
                                            delay: delay,
                                            duration: transitionTime.interval)

            case let request as GenericDeltaSetUnacknowledged:
                let targetLevel = Int16(truncatingIfNeeded: Int32(state.value) + request.delta)
                
                /// A flag indicating whether the message is sent as a continuation
                /// (using the same transaction) as the last one.
                let continuation = transactionHelper.isTransactionContinuation(request, from: source, to: destination)
                /// Message execution delay in 5 millisecond steps. By default 0.
                let delay = TimeInterval(request.delay ?? 0) * 0.005
                /// The time that an element will take to transition to the target
                /// state from the present state. If not set, the default transition
                /// time from Generic Default Transition Time Server model is used.
                let transitionTime = request.transitionTime
                    .or(defaultTransitionTimeServer.defaultTransitionTime)
                // Is the same transaction already in progress?
                if continuation, let transition = state.transition, transition.remainingTime > 0 {
                    // Continue the same transition.
                    state = BMGenericState<Int16>(continueTransitionFrom: state, to: targetLevel,
                                                delay: delay,
                                                duration: transitionTime.interval)
                } else {
                    // Start a new transition.
                    state = BMGenericState<Int16>(transitionFrom: state, to: targetLevel,
                                                delay: delay,
                                                duration: transitionTime.interval)
                }
                    
            case let request as GenericMoveSetUnacknowledged:
                // Ignore a repeated request (with the same TID) from the same source
                // and sent to the same destination when it was received within 6 seconds.
                guard transactionHelper.isNewTransaction(request, from: source, to: destination) else {
                    break
                }
                
                /// Message execution delay in 5 millisecond steps. By default 0.
                let delay = TimeInterval(request.delay ?? 0) * 0.005
                /// The time that an element will take to transition to the target
                /// state from the present state. If not set, the default transition
                /// time from Generic Default Transition Time Server model is used.
                let transitionTime = request.transitionTime
                    .or(defaultTransitionTimeServer.defaultTransitionTime)
                // Start a new transition.
                state = BMGenericState<Int16>(animateFrom: state, to: request.deltaLevel,
                                            delay: delay,
                                            duration: transitionTime.interval)
                
            default:
                // Not possible.
                break
            }
        }
        
      func model(_ model: NordicMesh.Model, didReceiveResponse response: any NordicMesh.MeshResponse, toAcknowledgedMessage request: any NordicMesh.AcknowledgedMeshMessage, from source: NordicMesh.Address){
            // Not possible.
        }

    
  
    
    /// Sets a model state observer.
    ///
    /// - parameter observer: The observer that will be informed about
    ///                       state changes.
    func observe(_ observer: @escaping (BMGenericState<Int16>) -> ()) {
        self.observer = observer
        observer(state)
    }
    
}
