//
//  QuickSetupNode.swift
//  SimplelinkConnect
//
//  Created by IL Tools on 20/02/2025.
//

import Foundation
import NordicMesh

@objc(QuickSetupNode)
class QuickSetupNode: NSObject {

  // MARK: - Private properties

  private var node: Node!
  private var tasks: [MeshTask] = []
  private var handler: MessageHandle?
  private var inProgress: Bool = true
  private var current: Int = -1
  private var taskResults: [(task: String, success: Bool)] = []
  private var completion: (([(String, Bool)]) -> Void)?

  func executeNext() {
    current += 1

    let current = current

    // Are we done?
    if current >= tasks.count || !inProgress {
      handler = nil
      inProgress = false
      print("Configuration Complete", taskResults)
      
      // Call completion handler with results
      completion!(taskResults)
      return
    }

    // Pop new task and execute.
    let task = tasks[current]

    var skipped: Bool!
    switch task {
    // Skip application keys if a network key was not sent.
    case .sendApplicationKey(let applicationKey):
      skipped = !node.knows(networkKey: applicationKey.boundNetworkKey)
    // Skip binding models to Application Keys not known to the Node.
    case .bind(let applicationKey, to: _):
      skipped = !node.knows(applicationKey: applicationKey)
    // Skip publication with keys that failed to be sent.
    case .setPublication(let publish, to: _):
      skipped = !node.knows(applicationKeyIndex: publish.index)
    default:
      skipped = false
    }

    guard !skipped else {
      executeNext()
      return
    }
    let manager = AppDelegate.shared.meshNetworkManager!

    // Send the message.
    do {
      switch task {
      // Publication Set message can be sent to a different node in some cases.
      case .setPublication(_, to: let model):
        guard let address = model.parentElement?.parentNode?.unicastAddress
        else {
          fallthrough
        }
        handler = try manager.send(task.message, to: address)
      default:
        handler = try manager.send(task.message, to: node)
      }
    } catch {
      taskResults.append(
        (
          task:
            "Failed to send message \(task.message.opCode) to node \(node.unicastAddress)",
          success: false
        ))

    }
  }

  func bindAppKeyToListModels(
    node: Node, applicationKey: ApplicationKey, models: [Model],
    completion: @escaping ([[String: Any]]) -> Void
  ) {
    resetParams()
    self.node = node
    self.completion = { results in
      let formattedResults = results.map { result in
        return [
          "task": result.0,
          "success": result.1,
        ]
      }
      completion(formattedResults)
    }

    /// Check if the app key added to the node, if not the first task should add it.
    if !node.knows(applicationKeyIndex: applicationKey.index) {
      self.tasks = [.sendApplicationKey(applicationKey)]
    }
    models.forEach { model in
      self.tasks.append(.bind(applicationKey, to: model))
    }
    self.inProgress = true
    self.current = -1
    print("Starting binding process for \(models.count) models.")
    let manager = AppDelegate.shared.meshNetworkManager!
    manager.delegate = self

    executeNext()
  }

  func subscribeToListModels(
    node: Node, group: Group, models: [Model],
    completion: @escaping ([[String: Any]]) -> Void
  ) {
    resetParams()

    self.node = node
    self.completion = { results in
      let formattedResults = results.map { result in
        return [
          "task": result.0,
          "success": result.1,
        ]
      }
      completion(formattedResults)
    }

    models.forEach { model in
      self.tasks.append(.subscribe(model, to: group))
    }

    self.inProgress = true
    self.current = -1
    print("Starting subscribing process for \(models.count) models.")
    let manager = AppDelegate.shared.meshNetworkManager!
    manager.delegate = self

    executeNext()
  }

  func resetParams() {
    self.taskResults = []
    self.tasks = []
    self.current = -1
    self.inProgress = false
  }

  func setPublicationToListModels(
    node: Node, models: [Model], pubish: Publish,
    applicationKey: ApplicationKey,
    completion: @escaping ([[String: Any]]) -> Void
  ) {
    resetParams()

    self.node = node
    self.completion = { results in
      let formattedResults = results.map { result in
        return [
          "task": result.0,
          "success": result.1,
        ]
      }
      completion(formattedResults)
    }
    /// Check if the app key added to the node, if not the first task should add it.
    if !node.knows(applicationKeyIndex: applicationKey.index) {
      self.tasks = [.sendApplicationKey(applicationKey)]
    }

    models.forEach { model in
      if !model.isBoundTo(applicationKey) {
        self.tasks.append(.bind(applicationKey, to: model))
      }
      self.tasks.append(.setPublication(pubish, to: model))
    }

    self.inProgress = true
    self.current = -1

    print("Starting set publication process for \(models.count) models.")
    let manager = AppDelegate.shared.meshNetworkManager!
    manager.delegate = self

    executeNext()
  }

}


extension QuickSetupNode : LoggerDelegate {
  func log(message: String, ofCategory category: NordicMesh.LogCategory, withLevel level: NordicMesh.LogLevel) {
    print(category, message)
  }
}

extension QuickSetupNode : MeshNetworkDelegate {

  func meshNetworkManager(
    _ manager: NordicMesh.MeshNetworkManager,
    didReceiveMessage message:  any NordicMesh.MeshMessage,
    sentFrom source: NordicMesh.Address,
    to destination: NordicMesh.MeshAddress
  ) {
    print(
      "QuickSetupNode message from \(source): \(message), opCode: 0x\(String(format: "%02X", message.opCode))"
    )

    let current = current
    if current >= 0 && current < tasks.count
      && message.opCode == tasks[current].message.responseOpCode
    {
      if let status = message as? ConfigStatusMessage {
        if status.isSuccess {
          taskResults.append((task: tasks[current].title, success: true))
        } else {
          taskResults.append(
            (
              task: "\(tasks[current].title) Failed: \(status.message)",
              success: false
            ))
        }
      } else {
        taskResults.append((task: tasks[current].title, success: true))

      }

      executeNext()
    }
  }
 
}
