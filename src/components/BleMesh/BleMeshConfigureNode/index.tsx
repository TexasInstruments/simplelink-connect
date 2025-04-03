import { Text, TouchableOpacity } from '../../Themed';
import { StyleSheet, NativeModules, View, NativeEventEmitter, InteractionManager, Alert } from 'react-native';
import Colors from '../../../constants/Colors';
import { useCallback, useEffect, useRef, useState, } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import PeripheralIcon from '../../PeripheralIcon';
import Spacing from '../../Spacing';
import { Divider, Menu } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Feature, meshStyles, Model, ProvisionedNode, Element, callMeshModuleFunction } from '../meshUtils';
import { BleMeshNodeConfigScreenProps, companyNameToBrandIcon } from '../../../../types';
import { ScrollView } from 'react-native-gesture-handler';
import { GenericMeshModal, GenericModalData } from '../GenericMeshModal';
import { AddNetKeyModal } from './AddNetKey';
import { AddAppKeyModal } from './AddAppKey';
import { Skeleton } from '@rneui/themed';
import LinearGradient from 'react-native-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props extends BleMeshNodeConfigScreenProps { };

interface ExpandItem {
    elementName: string,
    expanded: boolean
}

const BleMeshConfigureNode: React.FC<Props> = ({ route }) => {
    const { unicastAddr, isConnecting } = route.params
    const { MeshModule } = NativeModules;
    const bleMeshEmitter = new NativeEventEmitter(MeshModule);

    const [provisionedNode, setProvisionedNode] = useState<ProvisionedNode | null>(null);
    const [expandedArray, setExpandedArray] = useState<ExpandItem[]>([]);
    const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
    const [isNetKeyModalVisible, setIsNetKeyModalVisible] = useState<boolean>(false);
    const [isAddAppKeyModalVisible, setIsAddAppKeyModalVisible] = useState<boolean>(false);
    const [modalData, setModalData] = useState<GenericModalData>({ title: 'Edit', currentValue: '', onClickSave: (val: string) => console.log(val), label: '' })
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [isConnectingState, setIsConnectingState] = useState<boolean>(false);
    const isConnectingRef = useRef<boolean>(false)
    const [setupMenuVisible, setSetupMenuVisible] = useState(false);

    let navigation = useNavigation();

    useEffect(() => {
        getProvisionedNode();
    }, [isNetKeyModalVisible, isAddAppKeyModalVisible]);

    useEffect(() => {
        const nodeConnectedListener = bleMeshEmitter.addListener('onNodeConnected', checkConnectionStatus);
        setIsConnectingState(isConnecting);
        isConnectingRef.current = isConnecting;

        // getProvisionedNode();
        checkConnectionStatus();

        return () => {
            nodeConnectedListener.remove()
        }

    }, [route.params]);

    useFocusEffect(
        useCallback(() => {
            const nodeConnectedListener = bleMeshEmitter.addListener('onNodeConnected', checkConnectionStatus);
            const task = InteractionManager.runAfterInteractions(() => {
                try {
                    setIsConnectingState(isConnecting);
                    isConnectingRef.current = isConnecting;
                    checkConnectionStatus();

                } catch (error) {
                    console.error(error);
                }

            });

            return () => {
                nodeConnectedListener.remove()
                task.cancel();
            };
        }, [isConnecting])
    );

    const checkConnectionStatus = async () => {
        try {
            let isConnected = await callMeshModuleFunction('isDeviceConnected', unicastAddr) as boolean;
            setIsConnected(isConnected);
            getProvisionedNode();

            if (isConnected) {
                isConnectingRef.current = false;
                setIsConnectingState(isConnectingRef.current);
            }
        } catch (e) {
            console.error(e)
        }

    };

    const getProvisionedNode = async () => {
        try {
            let node = await callMeshModuleFunction('getProvisionedNode', unicastAddr) as ProvisionedNode;
            if (node) {
                setProvisionedNode(node);
                let expandedArray: ExpandItem[] = [];
                node.elements.forEach((element) => {
                    expandedArray.push({ elementName: element.name, expanded: false })
                });
                setExpandedArray(expandedArray);
            }
        }
        catch (e) {
            console.error(e);
        }
    };

    const toggleExpand = (elementName: string) => {
        let updatedArray = expandedArray.map((element) => {
            if (element.elementName === elementName) {
                return {
                    ...element,
                    expanded: !element.expanded
                };
            }
            return element;
        });

        setExpandedArray(updatedArray);
    };

    const removeNodeFromNetwork = async () => {
        Alert.alert("Are you sure you want to remove node from your network?", "", [
            {
                text: "Yes",
                onPress: async () => {
                    await callMeshModuleFunction('removeNodeFromNetwork', unicastAddr);
                    navigation.navigate('BleMesh');
                },
                style: "destructive"
            },
            {
                text: "No",
                onPress: () => { },
                style: "cancel"
            }
        ]);
    };

    const editNodeName = async (nodeName: string) => {
        let edited = await callMeshModuleFunction('editProvisionedNodeName', unicastAddr, nodeName);
        getProvisionedNode();
    };

    const editNodeTtl = async (ttl: string) => {
        const parsedTtl = Number(ttl.trim());

        // Validate if it's a number and within the valid range
        if (isNaN(parsedTtl) || !Number.isInteger(parsedTtl) || (parsedTtl !== 0 && (parsedTtl < 2 || parsedTtl > 127))) {
            Alert.alert("Invalid TTL", "TTL must be either 0 or a number between 2 and 127.");
            return;
        }

        try {
            await callMeshModuleFunction('editProvisionedNodeTtl', unicastAddr, Number(ttl));
            getProvisionedNode();

        }
        catch (e) {
            const errorMessage = e.message || "An unknown error occurred";
            Alert.alert("Error", errorMessage);
        }
    };

    const onPressEditNodeName = () => {
        setModalData({
            title: 'Edit Node Name', currentValue: provisionedNode!.name, onClickSave: editNodeName, label: 'name'
        });
        setIsEditModalVisible(true);
    };

    const onPressEditTtl = () => {
        setModalData({
            title: 'Edit TTL', currentValue: provisionedNode!.ttl.toString(), onClickSave: editNodeTtl, label: 'TTL'
        });
        setIsEditModalVisible(true);
    };

    const onPressEditNetworkKeys = () => {
        setIsNetKeyModalVisible(true)
    };

    const onPressEditAppKeys = () => {
        setIsAddAppKeyModalVisible(true)
    };

    const onConnectPressed = async () => {
        if (isConnectingState) return;

        else if (!isConnected) {
            setIsConnectingState(false);
            navigation.navigate('BleMeshScanner', { scanProvisionedNodes: true, unicastAddr: unicastAddr })
        }

        else {
            callMeshModuleFunction('disconnect');
            setIsConnectingState(false);
        }
    };

    const navigateToModalView = async (elementId: number, model: Model) => {
        let res = await callMeshModuleFunction('selectModel', unicastAddr, elementId, model.id, model.type.includes("SIG"));
        navigation.navigate('GenericModelView', { unicastAddr: unicastAddr, model: model });

    };

    const openMenu = () => setSetupMenuVisible(true);
    const closeMenu = () => setSetupMenuVisible(false);

    const QuickNodeSetupMenu = () => {
        return (
            <Menu
                contentStyle={{ backgroundColor: 'white' }}
                visible={setupMenuVisible}
                onDismiss={closeMenu}
                anchor={
                    <TouchableOpacity disabled={!isConnected} style={[meshStyles.button, meshStyles.shadow, { marginTop: 0, flexDirection: 'row', opacity: isConnected ? 1 : 0.5 }]} onPress={openMenu}>
                        <MaterialCommunityIcons name="wrench" size={20} color={Colors.blue} />
                        <Text style={[meshStyles.textButton, { color: Colors.blue, marginLeft: 5, fontWeight: '600' }]}>Quick Node Setup</Text>
                    </TouchableOpacity>
                }
            >
                {/* https://pictogrammers.com/library/mdi/ */}
                <Menu.Item onPress={() => { navigation.navigate('BleMeshBindAppKeysScreen', { unicastAddr: unicastAddr, elements: provisionedNode?.elements }); closeMenu(); }} title="Bind Application Keys" leadingIcon={() => (
                    <MaterialCommunityIcons name="link" size={25} />
                )} />

                <Menu.Item onPress={() => { navigation.navigate('BleMeshSubscribeModelsScreen', { unicastAddr: unicastAddr, elements: provisionedNode?.elements }); closeMenu(); }} title="Subscribe" leadingIcon={() => (
                    <MaterialCommunityIcons name="bell-plus" size={25} />
                )} />
                <Menu.Item onPress={() => { navigation.navigate('BleMeshSetPublicationModelsScreen', { unicastAddr: unicastAddr, elements: provisionedNode?.elements }); closeMenu(); }} title="Set Publication" leadingIcon={() => (
                    <MaterialCommunityIcons name="send-circle-outline" size={25} />
                )} titleStyle={{}} />
            </Menu >
        );
    }
    const DisplayModal = ({ model, element }: { model: Model, element: Element }) => {
        return (
            <TouchableOpacity style={{ paddingHorizontal: 10 }} onPress={() => navigateToModalView(element.address, model)}>
                <Divider />
                <View style={[meshStyles.item]}>
                    <View style={{ display: 'flex', flexDirection: 'column' }}>
                        <Text style={[styles.modelName]}>{model.name}</Text>
                        <Text style={[styles.modelDesc]}>{model.type}  0x{model.id.toString(16)}</Text>
                    </View>
                    <Icon name={"chevron-right"} size={20} style={{ marginLeft: 10 }} />
                </View>
            </TouchableOpacity>
        );
    };

    const DisplayElement = ({ element, expand }: { element: Element, expand: boolean }) => {
        return (
            <View style={[meshStyles.optionsBox, { opacity: isConnected ? 1 : 0.5 }]} >
                <TouchableOpacity style={[meshStyles.item]} onPress={() => toggleExpand(element.name)} disabled={!isConnected}>
                    <Text style={[meshStyles.subject]}>{element.name}</Text>
                    <View style={{ display: 'flex', flexDirection: 'row' }}>
                        <Text numberOfLines={1} allowFontScaling style={[styles.modelName, { paddingLeft: 10 }]}>{element.models.length} models</Text>
                        <Icon name={!expand ? "expand-more" : "expand-less"} size={20} style={{ marginLeft: 10 }} />

                    </View>

                </TouchableOpacity>
                {expand && (
                    element.models.map((model, index) => (
                        <DisplayModal key={index} model={model} element={element} />
                    ))
                )}

            </View>
        )
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[meshStyles.infoContainer, { backgroundColor: Colors.lightGray }]}>
                <View style={[meshStyles.deviceInfoIconContainer]}>
                    <PeripheralIcon icon={companyNameToBrandIcon(provisionedNode?.company)} size={32} />
                </View>
                <Spacing spaceT={10} />
                <Text style={[meshStyles.deviceName]}>{provisionedNode?.name}</Text>
            </View>

            {/* Data */}
            <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    {/* state */}
                    <Text style={{ fontSize: 15 }} >
                        State:{' '}
                        <Text style={{ fontWeight: 'bold' }}>
                            Provisioned
                        </Text>
                    </Text>
                    <TouchableOpacity onPress={onConnectPressed} disabled={isConnectingState}>
                        <Text style={[meshStyles.textButton, { fontSize: 15 }]}>{isConnectingState ? 'Connecting...' : (isConnected ? 'Disconnect' : 'Connect')}</Text>
                    </TouchableOpacity>
                </View>

                {provisionedNode && !isConnectingState && (
                    <ScrollView style={{ maxHeight: '100%' }} contentContainerStyle={{ paddingBottom: 50, }}>
                        <View style={[meshStyles.optionsBox]}>
                            <View style={[meshStyles.item]}>
                                <Text style={[meshStyles.subject]}>Name</Text>
                                <View style={[styles.textIconContainer]}>
                                    <Text numberOfLines={1}>{provisionedNode?.name}</Text>
                                    <TouchableOpacity style={{ marginLeft: 10 }} onPress={onPressEditNodeName} disabled={!isConnected}>
                                        <Icon name="edit" size={20} style={{ opacity: isConnected ? 1 : 0.2 }} />
                                    </TouchableOpacity>
                                </View>

                            </View>
                            <Divider />
                            <View style={[meshStyles.item]}>
                                <Text style={[meshStyles.subject]}>Unicast address</Text>
                                <Text >0x{provisionedNode?.unicastAddress.toString(16).toLocaleUpperCase()}</Text>
                            </View>
                            <Divider />
                            <View style={[meshStyles.item]}>
                                <Text style={[meshStyles.subject]}>Default TTL</Text>
                                <View style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Text numberOfLines={1} allowFontScaling style={{ paddingLeft: 10 }}>{provisionedNode?.ttl}</Text>
                                    <TouchableOpacity style={{ marginLeft: 10 }} onPress={onPressEditTtl} disabled={!isConnected}>
                                        <Icon name="edit" size={20} style={{ opacity: isConnected ? 1 : 0.2 }} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                        <View style={[meshStyles.optionsBox]}>
                            <View style={[meshStyles.item]}>
                                <Text style={[meshStyles.subject]}>Features</Text>

                                <View style={[styles.featureList]}>
                                    {provisionedNode && (
                                        provisionedNode.features.map((feature, index) => <Feature feature={feature} key={index} />)
                                    )}
                                </View>
                            </View>
                        </View>

                        {/* Keys */}
                        <View style={[meshStyles.optionsBox]}>
                            {/* Device Key */}
                            <View style={[meshStyles.item]}>
                                <Text style={[meshStyles.subject]}>Device key</Text>
                                <Text style={{ flex: 1 }} numberOfLines={1} >{provisionedNode?.deviceKey}</Text>
                            </View>
                            <Divider />

                            {/* Network Keys */}
                            <View style={[meshStyles.item]}>
                                <Text style={[meshStyles.subject]}>Network keys</Text>
                                <View style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Text>{provisionedNode?.addedNetworkKeysNum}</Text>
                                    <TouchableOpacity onPress={onPressEditNetworkKeys} disabled={!isConnected}>
                                        <Icon name="edit" size={20} style={{ opacity: isConnected ? 1 : 0.2, marginLeft: 10 }} />
                                    </TouchableOpacity>
                                </View>

                            </View>
                            <Divider />

                            {/* Application Keys */}
                            <View style={[meshStyles.item]}>
                                <Text style={[meshStyles.subject]}>Application keys</Text>
                                <View style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Text>{provisionedNode?.addedApplicationKeysNum}</Text>
                                    <TouchableOpacity onPress={onPressEditAppKeys} disabled={!isConnected}>
                                        <Icon name="edit" size={20} style={{ opacity: isConnected ? 1 : 0.2, marginLeft: 10 }} />
                                    </TouchableOpacity>
                                </View>

                            </View>
                        </View>

                        {/* Elements */}
                        {provisionedNode.elements.map((element, index) => {
                            let expandedItem = expandedArray.find(e => e.elementName === element.name);
                            let expand = false;
                            if (expandedItem === undefined) { return; }
                            else { expand = expandedItem.expanded }
                            return (
                                <DisplayElement key={index} element={element} expand={expand} />
                            )
                        })}

                        <View style={[styles.row]}>
                            {QuickNodeSetupMenu()}
                            <TouchableOpacity style={[meshStyles.button, meshStyles.shadow, { marginTop: 0, flexDirection: 'row' }]} onPress={removeNodeFromNetwork}>
                                <MaterialCommunityIcons name="delete-outline" size={20} color={Colors.primary} />
                                <Text style={[meshStyles.textButton, { color: Colors.primary, marginLeft: 5, fontWeight: '600' }]}>Remove Node</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                )}

                {(!provisionedNode || isConnectingState) &&
                    <View >
                        <Skeleton animation='wave' LinearGradientComponent={LinearGradient} style={{ height: 40, marginBottom: 10 }} />
                        <Skeleton animation='wave' LinearGradientComponent={LinearGradient} style={{ height: 40, marginBottom: 10 }} />
                        <Skeleton animation='wave' LinearGradientComponent={LinearGradient} style={{ height: 40, marginBottom: 0 }} />
                    </View>
                }

            </View>

            <AddNetKeyModal
                setModalVisible={setIsNetKeyModalVisible}
                visible={isNetKeyModalVisible}
                unicastAddress={unicastAddr}
            />

            <AddAppKeyModal
                setModalVisible={setIsAddAppKeyModalVisible}
                visible={isAddAppKeyModalVisible}
                unicastAddress={unicastAddr}
            />

            <GenericMeshModal
                setModalVisible={setIsEditModalVisible}
                visible={isEditModalVisible}
                title={modalData.title}
                currentValue={modalData.currentValue}
                onClickSave={modalData.onClickSave}
                label={modalData.label}
            />
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        height: '100%',
        backgroundColor: Colors.lightGray
    },
    row: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignContent: 'flex-start',
    },
    featureList: {
        display: 'flex',
        flexDirection: 'row',
    },
    modelDesc: {
        color: Colors.gray,
        fontSize: 12,
    },
    modelName: {
        fontSize: 14,
    },
    textIconContainer: {
        display: 'flex',
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'flex-end',
    }

});

export default BleMeshConfigureNode;
