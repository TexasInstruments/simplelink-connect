//
//  ModelExtension.swift
//  SimplelinkConnect
//
//  Created by IL Tools on 27/07/2025.
//

import Foundation
import NordicMesh

extension Model {

  /// Returns whether the Model is subscribed to the given ``Group``.
  ///
  /// - parameter group: The Group to check subscription to.
  /// - returns: `True` if the Model is subscribed to the Group,
  ///            `false` otherwise.
  public func isSubscribed(to group: Group) -> Bool {
    return isSubscribed(to: group.address)
  }

  /// Whether the Model supports model publication defined in Section 4.2.3 in
  /// Bluetooth Mesh Profile 1.0.1 specification.
  ///
  /// - returns: `true` if the model supports model publication, `false` ir it doesn't
  ///            or `nil` if unknown.
  /// - since: 4.0.0
  public var supportsModelPublication: Bool? {
    if !isBluetoothSIGAssigned {
      return true
    }
    switch modelIdentifier {
    // Foundation
    case .configurationServerModelId: return false
    case .configurationClientModelId: return false
    case .healthServerModelId: return true
    case .healthClientModelId: return true
    // Configuration models added in Mesh Protocol 1.1
    case .remoteProvisioningServerModelId: return false
    case .remoteProvisioningClientModelId: return false
    case .directedForwardingConfigurationServerModelId: return false
    case .directedForwardingConfigurationClientModelId: return false
    case .bridgeConfigurationServerModelId: return false
    case .bridgeConfigurationClientModelId: return false
    case .privateBeaconServerModelId: return false
    case .privateBeaconClientModelId: return false
    case .onDemandPrivateProxyServerModelId: return false
    case .onDemandPrivateProxyClientModelId: return false
    case .sarConfigurationServerModelId: return false
    case .sarConfigurationClientModelId: return false
    case .opcodesAggregatorServerModelId: return false
    case .opcodesAggregatorClientModelId: return false
    case .largeCompositionDataServerModelId: return false
    case .largeCompositionDataClientModelId: return false
    case .solicitationPduRplConfigurationServerModelId: return false
    case .solicitationPduRplConfigurationClientModelId: return false
    // Generic
    case .genericOnOffServerModelId: return true
    case .genericOnOffClientModelId: return true
    case .genericLevelServerModelId: return true
    case .genericLevelClientModelId: return true
    case .genericDefaultTransitionTimeServerModelId: return true
    case .genericDefaultTransitionTimeClientModelId: return true
    case .genericPowerOnOffServerModelId: return true
    case .genericPowerOnOffSetupServerModelId: return false
    case .genericPowerOnOffClientModelId: return true
    case .genericPowerLevelServerModelId: return true
    case .genericPowerLevelSetupServerModelId: return false
    case .genericPowerLevelClientModelId: return true
    case .genericBatteryServerModelId: return true
    case .genericBatteryClientModelId: return true
    case .genericLocationServerModelId: return true
    case .genericLocationSetupServerModelId: return false
    case .genericLocationClientModelId: return true
    case .genericAdminPropertyServerModelId: return true
    case .genericManufacturerPropertyServerModelId: return true
    case .genericUserPropertyServerModelId: return true
    case .genericClientPropertyServerModelId: return true
    case .genericPropertyClientModelId: return true
    // Sensors
    case .sensorServerModelId: return true
    case .sensorSetupServerModelId: return true
    case .sensorClientModelId: return true
    // Time and Scenes
    case .timeServerModelId: return true
    case .timeSetupServerModelId: return false
    case .timeClientModelId: return true
    case .sceneServerModelId: return true
    case .sceneSetupServerModelId: return false
    case .sceneClientModelId: return true
    case .schedulerServerModelId: return true
    case .schedulerSetupServerModelId: return false
    case .schedulerClientModelId: return true
    // Lighting
    case .lightLightnessServerModelId: return true
    case .lightLightnessSetupServerModelId: return false
    case .lightLightnessClientModelId: return true
    case .lightCTLServerModelId: return true
    case .lightCTLSetupServerModelId: return false
    case .lightCTLClientModelId: return true
    case .lightCTLTemperatureServerModelId: return true
    case .lightHSLServerModelId: return true
    case .lightHSLSetupServerModelId: return false
    case .lightHSLClientModelId: return true
    case .lightHSLHueServerModelId: return true
    case .lightHSLSaturationServerModelId: return true
    case .lightXyLServerModelId: return true
    case .lightXyLSetupServerModelId: return false
    case .lightXyLClientModelId: return true
    case .lightLCServerModelId: return true
    case .lightLCSetupServerModelId: return true
    case .lightLCClientModelId: return true
    default: return true
    }
  }

  /// Whether the Model supports model subscription defined in Section 4.2.4 in
  /// Bluetooth Mesh Profile 1.0.1 specification.
  ///
  /// - returns: `true` if the model supports model subscription, `false` ir it doesn't
  ///            or `nil` if unknown.
  /// - since: 4.0.0
  public var supportsModelSubscriptions: Bool? {
    if !isBluetoothSIGAssigned {
      return true
    }
    switch modelIdentifier {
    // Foundation
    case .configurationServerModelId: return false
    case .configurationClientModelId: return false
    case .healthServerModelId: return true
    case .healthClientModelId: return true
    // Configuration models added in Mesh Protocol 1.1
    case .remoteProvisioningServerModelId: return false
    case .remoteProvisioningClientModelId: return false
    case .directedForwardingConfigurationServerModelId: return false
    case .directedForwardingConfigurationClientModelId: return false
    case .bridgeConfigurationServerModelId: return false
    case .bridgeConfigurationClientModelId: return false
    case .privateBeaconServerModelId: return false
    case .privateBeaconClientModelId: return false
    case .onDemandPrivateProxyServerModelId: return false
    case .onDemandPrivateProxyClientModelId: return false
    case .sarConfigurationServerModelId: return false
    case .sarConfigurationClientModelId: return false
    case .opcodesAggregatorServerModelId: return false
    case .opcodesAggregatorClientModelId: return false
    case .largeCompositionDataServerModelId: return false
    case .largeCompositionDataClientModelId: return false
    case .solicitationPduRplConfigurationServerModelId: return false
    case .solicitationPduRplConfigurationClientModelId: return false
    // Generic
    case .genericOnOffServerModelId: return true
    case .genericOnOffClientModelId: return true
    case .genericLevelServerModelId: return true
    case .genericLevelClientModelId: return true
    case .genericDefaultTransitionTimeServerModelId: return true
    case .genericDefaultTransitionTimeClientModelId: return true
    case .genericPowerOnOffServerModelId: return true
    case .genericPowerOnOffSetupServerModelId: return true
    case .genericPowerOnOffClientModelId: return true
    case .genericPowerLevelServerModelId: return true
    case .genericPowerLevelSetupServerModelId: return true
    case .genericPowerLevelClientModelId: return true
    case .genericBatteryServerModelId: return true
    case .genericBatteryClientModelId: return true
    case .genericLocationServerModelId: return true
    case .genericLocationSetupServerModelId: return true
    case .genericLocationClientModelId: return true
    case .genericAdminPropertyServerModelId: return true
    case .genericManufacturerPropertyServerModelId: return true
    case .genericUserPropertyServerModelId: return true
    case .genericClientPropertyServerModelId: return true
    case .genericPropertyClientModelId: return true
    // Sensors
    case .sensorServerModelId: return true
    case .sensorSetupServerModelId: return true
    case .sensorClientModelId: return true
    // Time and Scenes
    case .timeServerModelId: return true
    case .timeSetupServerModelId: return false
    case .timeClientModelId: return true
    case .sceneServerModelId: return true
    case .sceneSetupServerModelId: return true
    case .sceneClientModelId: return true
    case .schedulerServerModelId: return true
    case .schedulerSetupServerModelId: return true
    case .schedulerClientModelId: return true
    // Lighting
    case .lightLightnessServerModelId: return true
    case .lightLightnessSetupServerModelId: return true
    case .lightLightnessClientModelId: return true
    case .lightCTLServerModelId: return true
    case .lightCTLSetupServerModelId: return true
    case .lightCTLClientModelId: return true
    case .lightCTLTemperatureServerModelId: return true
    case .lightHSLServerModelId: return true
    case .lightHSLSetupServerModelId: return true
    case .lightHSLClientModelId: return true
    case .lightHSLHueServerModelId: return true
    case .lightHSLSaturationServerModelId: return true
    case .lightXyLServerModelId: return true
    case .lightXyLSetupServerModelId: return true
    case .lightXyLClientModelId: return true
    case .lightLCServerModelId: return true
    case .lightLCSetupServerModelId: return true
    case .lightLCClientModelId: return true
    default: return true
    }
  }

  public var supportModelBinding: Bool {
    if !isBluetoothSIGAssigned {
      return true
    }
    switch modelIdentifier {
    // Foundation
    case .configurationServerModelId: return false
    case .configurationClientModelId: return false
    case .healthServerModelId: return true
    case .healthClientModelId: return true
    // Configuration models added in Mesh Protocol 1.1
    case .remoteProvisioningServerModelId: return false
    case .remoteProvisioningClientModelId: return false
    case .directedForwardingConfigurationServerModelId: return false
    case .directedForwardingConfigurationClientModelId: return false
    case .bridgeConfigurationServerModelId: return false
    case .bridgeConfigurationClientModelId: return false
    case .privateBeaconServerModelId: return false
    case .privateBeaconClientModelId: return false
    case .onDemandPrivateProxyServerModelId: return false
    case .onDemandPrivateProxyClientModelId: return false
    case .sarConfigurationServerModelId: return false
    case .sarConfigurationClientModelId: return false
    case .opcodesAggregatorServerModelId: return false
    case .opcodesAggregatorClientModelId: return false
    case .largeCompositionDataServerModelId: return false
    case .largeCompositionDataClientModelId: return false
    case .solicitationPduRplConfigurationServerModelId: return false
    case .solicitationPduRplConfigurationClientModelId: return false
    // Generic
    case .genericOnOffServerModelId: return true
    case .genericOnOffClientModelId: return true
    case .genericLevelServerModelId: return true
    case .genericLevelClientModelId: return true
    case .genericDefaultTransitionTimeServerModelId: return true
    case .genericDefaultTransitionTimeClientModelId: return true
    case .genericPowerOnOffServerModelId: return true
    case .genericPowerOnOffSetupServerModelId: return true
    case .genericPowerOnOffClientModelId: return true
    case .genericPowerLevelServerModelId: return true
    case .genericPowerLevelSetupServerModelId: return true
    case .genericPowerLevelClientModelId: return true
    case .genericBatteryServerModelId: return true
    case .genericBatteryClientModelId: return true
    case .genericLocationServerModelId: return true
    case .genericLocationSetupServerModelId: return true
    case .genericLocationClientModelId: return true
    case .genericAdminPropertyServerModelId: return true
    case .genericManufacturerPropertyServerModelId: return true
    case .genericUserPropertyServerModelId: return true
    case .genericClientPropertyServerModelId: return true
    case .genericPropertyClientModelId: return true
    // Sensors
    case .sensorServerModelId: return true
    case .sensorSetupServerModelId: return true
    case .sensorClientModelId: return true
    // Time and Scenes
    case .timeServerModelId: return true
    case .timeSetupServerModelId: return false
    case .timeClientModelId: return true
    case .sceneServerModelId: return true
    case .sceneSetupServerModelId: return true
    case .sceneClientModelId: return true
    case .schedulerServerModelId: return true
    case .schedulerSetupServerModelId: return true
    case .schedulerClientModelId: return true
    // Lighting
    case .lightLightnessServerModelId: return true
    case .lightLightnessSetupServerModelId: return true
    case .lightLightnessClientModelId: return true
    case .lightCTLServerModelId: return true
    case .lightCTLSetupServerModelId: return true
    case .lightCTLClientModelId: return true
    case .lightCTLTemperatureServerModelId: return true
    case .lightHSLServerModelId: return true
    case .lightHSLSetupServerModelId: return true
    case .lightHSLClientModelId: return true
    case .lightHSLHueServerModelId: return true
    case .lightHSLSaturationServerModelId: return true
    case .lightXyLServerModelId: return true
    case .lightXyLSetupServerModelId: return true
    case .lightXyLClientModelId: return true
    case .lightLCServerModelId: return true
    case .lightLCSetupServerModelId: return true
    case .lightLCClientModelId: return true
    default: return true

    }

  }
}
