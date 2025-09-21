//
//  UInt16Extension.swift
//  SimplelinkConnect
//
//  Created by IL Tools on 27/07/2025.
//

import Foundation
public extension UInt16 {
    // Foundation
    static let configurationServerModelId: UInt16 = 0x0000
    static let configurationClientModelId: UInt16 = 0x0001
    static let healthServerModelId: UInt16 = 0x0002
    static let healthClientModelId: UInt16 = 0x0003
    // Configuration models added in Mesh Protocol 1.1
    static let remoteProvisioningServerModelId: UInt16 = 0x0004
    static let remoteProvisioningClientModelId: UInt16 = 0x0005
    static let directedForwardingConfigurationServerModelId: UInt16 = 0x0006
    static let directedForwardingConfigurationClientModelId: UInt16 = 0x0007
    static let bridgeConfigurationServerModelId: UInt16 = 0x0008
    static let bridgeConfigurationClientModelId: UInt16 = 0x0009
    static let privateBeaconServerModelId: UInt16 = 0x000A
    static let privateBeaconClientModelId: UInt16 = 0x000B
    static let onDemandPrivateProxyServerModelId: UInt16 = 0x000C
    static let onDemandPrivateProxyClientModelId: UInt16 = 0x000D
    static let sarConfigurationServerModelId: UInt16 = 0x000E
    static let sarConfigurationClientModelId: UInt16 = 0x000F
    static let opcodesAggregatorServerModelId: UInt16 = 0x0010
    static let opcodesAggregatorClientModelId: UInt16 = 0x0011
    static let largeCompositionDataServerModelId: UInt16 = 0x0012
    static let largeCompositionDataClientModelId: UInt16 = 0x0013
    static let solicitationPduRplConfigurationServerModelId: UInt16 = 0x0014
    static let solicitationPduRplConfigurationClientModelId: UInt16 = 0x0015
    // Generic
    static let genericOnOffServerModelId: UInt16 = 0x1000
    static let genericOnOffClientModelId: UInt16 = 0x1001
    static let genericLevelServerModelId: UInt16 = 0x1002
    static let genericLevelClientModelId: UInt16 = 0x1003
    static let genericDefaultTransitionTimeServerModelId: UInt16 = 0x1004
    static let genericDefaultTransitionTimeClientModelId: UInt16 = 0x1005
    static let genericPowerOnOffServerModelId: UInt16 = 0x1006
    static let genericPowerOnOffSetupServerModelId: UInt16 = 0x1007
    static let genericPowerOnOffClientModelId: UInt16 = 0x1008
    static let genericPowerLevelServerModelId: UInt16 = 0x1009
    static let genericPowerLevelSetupServerModelId: UInt16 = 0x100A
    static let genericPowerLevelClientModelId: UInt16 = 0x100B
    static let genericBatteryServerModelId: UInt16 = 0x100C
    static let genericBatteryClientModelId: UInt16 = 0x100D
    static let genericLocationServerModelId: UInt16 = 0x100E
    static let genericLocationSetupServerModelId: UInt16 = 0x100F
    static let genericLocationClientModelId: UInt16 = 0x1010
    static let genericAdminPropertyServerModelId: UInt16 = 0x1011
    static let genericManufacturerPropertyServerModelId: UInt16 = 0x1012
    static let genericUserPropertyServerModelId: UInt16 = 0x1013
    static let genericClientPropertyServerModelId: UInt16 = 0x1014
    static let genericPropertyClientModelId: UInt16 = 0x1015
    // Sensors
    static let sensorServerModelId: UInt16 = 0x1100
    static let sensorSetupServerModelId: UInt16 = 0x1101
    static let sensorClientModelId: UInt16 = 0x1102
    // Time and Scenes
    static let timeServerModelId: UInt16 = 0x1200
    static let timeSetupServerModelId: UInt16 = 0x1201
    static let timeClientModelId: UInt16 = 0x1202
    static let sceneServerModelId: UInt16 = 0x1203
    static let sceneSetupServerModelId: UInt16 = 0x1204
    static let sceneClientModelId: UInt16 = 0x1205
    static let schedulerServerModelId: UInt16 = 0x1206
    static let schedulerSetupServerModelId: UInt16 = 0x1207
    static let schedulerClientModelId: UInt16 = 0x1208
    // Lighting
    static let lightLightnessServerModelId: UInt16 = 0x1300
    static let lightLightnessSetupServerModelId: UInt16 = 0x1301
    static let lightLightnessClientModelId: UInt16 = 0x1302
    static let lightCTLServerModelId: UInt16 = 0x1303
    static let lightCTLSetupServerModelId: UInt16 = 0x1304
    static let lightCTLClientModelId: UInt16 = 0x1305
    static let lightCTLTemperatureServerModelId: UInt16 = 0x1306
    static let lightHSLServerModelId: UInt16 = 0x1307
    static let lightHSLSetupServerModelId: UInt16 = 0x1308
    static let lightHSLClientModelId: UInt16 = 0x1309
    static let lightHSLHueServerModelId: UInt16 = 0x130A
    static let lightHSLSaturationServerModelId: UInt16 = 0x130B
    static let lightXyLServerModelId: UInt16 = 0x130C
    static let lightXyLSetupServerModelId: UInt16 = 0x130D
    static let lightXyLClientModelId: UInt16 = 0x130E
    static let lightLCServerModelId: UInt16 = 0x130F
    static let lightLCSetupServerModelId: UInt16 = 0x1310
    static let lightLCClientModelId: UInt16 = 0x1311
    // BLOB Transfer
    static let blobTransferServer: UInt16 = 0x1400
    static let blobTransferClient: UInt16 = 0x1401
    // Device Firmware Update
    static let firmwareUpdateServer: UInt16 = 0x1402
    static let firmwareUpdateClient: UInt16 = 0x1403
    static let firmwareDistributionServer: UInt16 = 0x1404
    static let firmwareDistributionClient: UInt16 = 0x1405
}
