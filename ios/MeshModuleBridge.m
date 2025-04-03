#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(MeshModule, RCTEventEmitter)


RCT_EXTERN_METHOD(meshInit:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(loadMeshNetwork:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(getMeshNetworkName:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(getProvisionedMeshNodes:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(getMeshNetworkTimestamp:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(getMeshPrimaryNetworksKey:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(generateNetworksKey:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(generateAppKey:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(getMeshSubNetworksKeys:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(removeNetworksKey: (NSInteger) keyIndex callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(removeAppKey: (NSInteger) keyIndex callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(getProvisionedNodeNetworkKeys: (NSInteger) unicastAddress callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(getProvisionedNodeAppKeys: (NSInteger) unicastAddress callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(editNetworksKey:(NSInteger)keyIndex newName:(NSString *)newName newHexKeyString:(NSString *)newHexKeyString callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(editAppKey:(NSInteger)keyIndex newName:(NSString *)newName newHexKeyString:(NSString *)newHexKeyString callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(addNetworksKey:(NSString *)name hexKeyString:(NSString *)hexKeyString callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(addAppKey:(NSString *)name hexKeyString:(NSString *)hexKeyString callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(addNodeNetworkKeys:(NSInteger)unicastAddress keyIndex:(NSInteger)keyIndex callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(addNodeAppKey:(NSInteger)unicastAddress keyIndex:(NSInteger)keyIndex callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(editProvisionedNodeName:(NSInteger)unicastAddress nodeName:(NSString *)nodeName callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(editProvisionedNodeTtl:(NSInteger)unicastAddress newTtl:(NSInteger)newTtl callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(removeNodeNetworkKeys:(NSInteger)unicastAddress keyIndex:(NSInteger)keyIndex callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(removeNodeAppKeys:(NSInteger)unicastAddress keyIndex:(NSInteger)keyIndex callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(getProvisionedNode:(NSInteger)unicastAddress callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(removeNodeFromNetwork:(NSInteger)unicastAddress callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(setMeshNetworkName:(NSString *)newNetName callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(selectUnprovisionedNode:(NSString *)nodeId callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(selectProvisionedNodeToConnect:(NSString *)nodeId unicastAddress:(NSInteger)unicastAddress  callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(startScan:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(stopScan:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(identifyNode:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(exportNetwork:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(resetNetwork:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(getMeshApplicationsKeys:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(startProvisioningNode:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(isDeviceConnected:(NSInteger)unicastAddress callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(reconnectToProxy:(NSInteger)unicastAddress callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(getPublicationSettings:(NSInteger)unicastAddress callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(getSubscriptions:(NSInteger)unicastAddress callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(disconnect:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(getModelBoundKeys:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(getGroups:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(selectModel:(NSInteger)unicastAddress elementAddr:(NSInteger)elementAddr modelId:(NSInteger)modelId isSigModel:(BOOL)isSigModel callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(bindAppKey:(NSInteger)unicastAddress appKeyIndex:(NSInteger)appKeyIndex callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(removePublication:(NSInteger)unicastAddress callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(unbindAppKey:(NSInteger)appKeyIndex unicastAddress:(NSInteger)unicastAddress callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(unsubscribe:(NSInteger)subscriptionInx unicastAddress:(NSInteger)unicastAddress callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(createNewGroup:(NSString *)groupName groupAddress:(NSInteger)groupAddress callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(subscribeToExistingGroup:(NSInteger)unicastAddress groupAddress:(NSInteger)groupAddress callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(subscribe:(NSInteger)nodeUnicastAddress addressToSuscribe:(NSInteger)addressToSuscribe callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(subscribeToNewGroup:(NSInteger)unicastAddress newGroupName:(NSString *)newGroupName groupAddress:(NSInteger)groupAddress callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(generateGroupAddress:(NSString *)newGroupName callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(setPublication:(NSInteger)unicastAddress
                  addressType:(NSInteger)addressType
                  appKeyIndex:(NSInteger)appKeyIndex
                  publishTtl:(NSInteger)publishTtl
                  publishAddress:(NSString *)publishAddress
                  publishPeriodInterval:(NSInteger)publishPeriodInterval
                  publishPeriodResolution:(NSString *)publishPeriodResolution
                  retransmitCount:(NSInteger)retransmitCount
                  retransmitInterval:(NSInteger)retransmitInterval
                  callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(sendSensorGet:(NSInteger)nodeUnicastAddress callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(sendVendorModelMessage:(NSInteger)sendVendorModelMessage opcode:(NSInteger)opcode parameters:(NSString *)parameters callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(editUnprovisionedNodeName:(NSString *)newNodeName callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(editUnprovisionedNodeAddr:(NSInteger)newNodeAddr callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(addProxyFilterAddresses:(NSArray *)addresses callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(removeProxyFilterAddress:(NSString *)address callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(setProxyFilterType:(NSInteger)filterType callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(getProxyStatus:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(bindAppKeyToModels:(NSInteger)unicastAddress
                  appKeyIndex:(NSInteger)appKeyIndex
                  models:(NSArray)models
                  callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(subscribeModels:(NSInteger)unicastAddress
                  groupAddress:(NSString *)groupAddress
                  models:(NSArray)models
                  callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(setPublicationToModelList:(NSInteger)unicastAddress
                  groupAddress:(NSString *)groupAddress
                  models:(NSArray)models
                  appKeyIndex:(NSInteger)appKeyIndex
                  publishTtl:(NSInteger)publishTtl
                  publishPeriodInterval:(NSInteger)publishPeriodInterval
                  publishPeriodResolution:(NSString *)publishPeriodResolution
                  retransmitCount:(NSInteger)retransmitCount
                  retransmitInterval:(NSInteger)retransmitInterval
                  callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(getProvisioners:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(editProvisionerName:(NSInteger)provisionerUnicastAddress
                  newName:(NSString *)newName
                  callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(editProvisionerUnicastAddress:(NSInteger)provisionerUnicastAddress
                  newAddress:(NSInteger)newAddress
                  callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(editProvisionerTtl:(NSInteger)provisionerUnicastAddress
                  ttl:(NSInteger)ttl
                  callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(editProvisionerUnicastRanges:(NSInteger)provisionerUnicastAddress
                  ranges:(NSArray)ranges
                  callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(editProvisionerGroupRanges:(NSInteger)provisionerUnicastAddress
                  ranges:(NSArray)ranges
                  callback:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(editProvisionerScenesRanges:(NSInteger)provisionerUnicastAddress
                  ranges:(NSArray)ranges
                  callback:(RCTResponseSenderBlock)callback)

@end
