//
//  MeshTask.swift
//  SimplelinkConnect
//
//  Created by IL Tools on 20/02/2025.
//

import Foundation
import NordicMesh

enum MeshTask {
  case getCompositionData(page: UInt8)
  case getDefaultTtl
  case setDefaultTtl(_ ttl: UInt8)
  case readRelayStatus
  case disableRelayFeature
  case readNetworkTransitStatus
  case readBeaconStatus
  case setBeacon(enabled: Bool)
  case readGATTProxyStatus
  case setGATTProxy(enabled: Bool)
  case readFriendStatus
  case setFriend(enabled: Bool)
  case readNodeIdentityStatus(_ networkKey: NetworkKey)
  case readHeartbeatPublication
  case setHeartbeatPublication(
    countLog: UInt8,
    periodLog: UInt8,
    destination: Address,
    ttl: UInt8, networkKey: NetworkKey,
    triggerFeatures: NodeFeatures)
  case readHeartbeatSubscription
  case setHeartbeatSubscription(
    source: Address, destination: Address, periodLog: UInt8)
  case sendNetworkKey(_ networkKey: NetworkKey)
  case sendApplicationKey(_ applicationKey: ApplicationKey)
  case bind(_ applicationKey: ApplicationKey, to: Model)
  case subscribe(_ model: Model, to: Group)
  case setPublication(_ publish: Publish, to: Model)

  var title: String {
    switch self {
    case .getCompositionData(let page):
      return "Get Composition Page \(page)"
    case .getDefaultTtl:
      return "Read default TTL"
    case .setDefaultTtl(let ttl):
      return "Set Default TTL to \(ttl)"
    case .readRelayStatus:
      return "Read Relay Status"
    case .disableRelayFeature:
      return "Disabling Relay Retransmission"
    case .readNetworkTransitStatus:
      return "Read Network Transit Status"
    case .readBeaconStatus:
      return "Read Beacon Status"
    case .setBeacon(let enable):
      return "\(enable ? "Enable" : "Disable") Secure Network Beacons"
    case .readGATTProxyStatus:
      return "Read GATT Proxy Status"
    case .setGATTProxy(enabled: let enable):
      return "\(enable ? "Enable" : "Disable") GATT Proxy Feature"
    case .readFriendStatus:
      return "Read Friend Status"
    case .setFriend(enabled: let enable):
      return "\(enable ? "Enable" : "Disable") Friend Feature"
    case .readNodeIdentityStatus(let key):
      return "Read Node Identity Status for \(key.name)"
    case .readHeartbeatPublication:
      return "Read Heartbeat Publication"
    case .setHeartbeatPublication:
      return "Set Heartbeat Publication"
    case .readHeartbeatSubscription:
      return "Read Heartbeat Subscription"
    case .setHeartbeatSubscription:
      return "Set Heartbeat Subscription"
    case .sendNetworkKey(let key):
      return "Add \(key.name)"
    case .sendApplicationKey(let key):
      return "Add \(key.name)"
    case .bind(let key, to: let model):
      return
        "Bind \(key.name) to \((model.name ?? "")!) modal 0x\( String(format: "%04X",model.modelIdentifier))"
    case .subscribe(let model, to: let group):
      return
        "Subscribe \((model.name ?? "" )!) modal 0x\( String(format: "%04X",model.modelIdentifier)) to \(group.name)"
    case .setPublication(_, let model):
      return
        "Set Publication to \((model.name ?? "" )!) modal 0x\( String(format: "%04X",model.modelIdentifier))"
    }
  }

  var message: AcknowledgedConfigMessage {
    switch self {
    case .getCompositionData(let page):
      return ConfigCompositionDataGet(page: page)
    case .getDefaultTtl:
      return ConfigDefaultTtlGet()
    case .setDefaultTtl(let ttl):
      return ConfigDefaultTtlSet(ttl: ttl)
    case .readRelayStatus:
      return ConfigRelayGet()
    case .disableRelayFeature:
      return ConfigRelaySet()
    case .readNetworkTransitStatus:
      return ConfigNetworkTransmitGet()
    case .readBeaconStatus:
      return ConfigBeaconGet()
    case .setBeacon(enabled: let enable):
      return ConfigBeaconSet(enable: enable)
    case .readGATTProxyStatus:
      return ConfigGATTProxyGet()
    case .setGATTProxy(enabled: let enable):
      return ConfigGATTProxySet(enable: enable)
    case .readFriendStatus:
      return ConfigFriendGet()
    case .setFriend(enabled: let enable):
      return ConfigFriendSet(enable: enable)
    case .readNodeIdentityStatus(let key):
      return ConfigNodeIdentityGet(networkKey: key)
    case .readHeartbeatPublication:
      return ConfigHeartbeatPublicationGet()
    case .setHeartbeatPublication(
      let countLog, let periodLog, let destination, let ttl, let networkKey,
      triggerFeatures: let features):
      return ConfigHeartbeatPublicationSet(
        startSending: countLog, heartbeatMessagesEvery: periodLog,
        secondsTo: destination,
        usingTtl: ttl, andNetworkKey: networkKey,
        andEnableHeartbeatMessagesTriggeredByChangeOf: features)
        ?? ConfigHeartbeatPublicationSet()
    case .readHeartbeatSubscription:
      return ConfigHeartbeatSubscriptionGet()
    case .setHeartbeatSubscription(let source, let destination, let periodLog):
      return ConfigHeartbeatSubscriptionSet(
        startProcessingHeartbeatMessagesFor: periodLog,
        secondsSentFrom: source, to: destination)
        ?? ConfigHeartbeatSubscriptionSet()
    case .sendNetworkKey(let key):
      return ConfigNetKeyAdd(networkKey: key)
    case .sendApplicationKey(let key):
      return ConfigAppKeyAdd(applicationKey: key)
    case .bind(let key, to: let model):
      return ConfigModelAppBind(applicationKey: key, to: model)!
    case .subscribe(let model, to: let group):
      if let message = ConfigModelSubscriptionAdd(group: group, to: model) {
        return message
      } else {
        return ConfigModelSubscriptionVirtualAddressAdd(
          group: group, to: model)!
      }
    case .setPublication(let publish, let model):
      if let message = ConfigModelPublicationSet(publish, to: model) {
        return message
      } else {
        return ConfigModelPublicationVirtualAddressSet(publish, to: model)!
      }
    }
  }
}
