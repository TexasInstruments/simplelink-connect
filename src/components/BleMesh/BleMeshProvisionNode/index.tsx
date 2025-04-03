import { Text, TouchableOpacity } from '../../Themed';
import { StyleSheet, NativeModules, Dimensions, View, NativeEventEmitter, Alert, EmitterSubscription } from 'react-native';
import Colors from '../../../constants/Colors';
import { useEffect, useRef, useState, } from 'react';
import { useNavigation } from '@react-navigation/native';
import PeripheralIcon from '../../PeripheralIcon';
import Spacing from '../../Spacing';
import { Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearProgress } from '@rneui/base';
import { GenericMeshModal, GenericModalData } from '../GenericMeshModal';
import { callMeshModuleFunction, meshStyles, NetworkKey } from '../meshUtils';
import { Skeleton } from '@rneui/themed';
import LinearGradient from 'react-native-linear-gradient';

interface IdentifiedNode {
    unicastAddress: number,
    name: string,
    networkKey: string,
    numberOfElement: number
}

const BleMeshProvisionNode: React.FC<{ icon: string }> = ({ icon }) => {

    const { MeshModule } = NativeModules;
    const bleMeshEmitter = new NativeEventEmitter(MeshModule);

    const [identifiedNode, setIdentifiedNode] = useState<IdentifiedNode | null>(null);
    const identifiedNodeRef = useRef<IdentifiedNode | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [state, setState] = useState<string>('');
    const [progress, setProgress] = useState<number>(0);
    const [inProvisioningProgress, setInProvisioningProgress] = useState<boolean>(false);

    const [isEditModalVisible, setIsModalVisible] = useState<boolean>(false);
    const [modalData, setModalData] = useState<GenericModalData>({ title: 'Edit', currentValue: '', onClickSave: (val: string) => console.log(val), label: '' })

    let connectionListener: EmitterSubscription;
    let navigation = useNavigation();

    useEffect(() => {
        bleMeshEmitter.addListener('onNodeIdentified', handleNodeUpdated);
        connectionListener = bleMeshEmitter.addListener('onNodeConnected', handleNodeConnected);
        bleMeshEmitter.addListener('onStateChange', handleStatusChanged);
        bleMeshEmitter.addListener('onProgressUpdate', handleProgressUpdate);
        bleMeshEmitter.addListener('onProvisionCompleted', handleProvisionCompleted);

        // Cleanup the listener when the component unmounts
        return () => {
            bleMeshEmitter.removeAllListeners('onNodeIdentified');
            bleMeshEmitter.removeAllListeners('onProvisionCompleted');
            bleMeshEmitter.removeAllListeners('onStateChange');
            bleMeshEmitter.removeAllListeners('onProgressUpdate');
            connectionListener.remove();
        };
    }, [navigation]);

    const handleProgressUpdate = (progress: string) => {
        setProgress(Number(progress));
    }

    const handleNodeUpdated = async (nodeData: IdentifiedNode) => {
        bleMeshEmitter.removeAllListeners('onNodeIdentified');
        let keys = await callMeshModuleFunction('getMeshSubNetworksKeys') as NetworkKey[];

        let key = keys.find(key => {
            if (key.key === nodeData.networkKey) {
                return key.name
            }
        })

        let unprovisionedNode: IdentifiedNode = {
            ...nodeData,
            networkKey: key ? key.name : nodeData.networkKey,
        }

        setIdentifiedNode(unprovisionedNode);
        identifiedNodeRef.current = unprovisionedNode;
    }

    const handleNodeConnected = async (status: string) => {
        setIsConnected(true);

        if (status == 'disconnected') {
            Alert.alert('Connection Timed Out')
            navigation.navigate('BleMesh');
            return;
        }
        connectionListener.remove();
        callMeshModuleFunction('identifyNode');
    }

    const handleStatusChanged = async (newState: string) => {
        setState(newState);
    }

    const handleProvisionCompleted = (status: string) => {
        if (status == 'success') {
            navigation.navigate('BleMeshConfigureNode', { unicastAddr: identifiedNodeRef.current!.unicastAddress, isConnecting: false });
        }
        else {
            Alert.alert('Error', status)
        }
    }

    const startProvisionNode = () => {
        setInProvisioningProgress(true);
        callMeshModuleFunction('startProvisioningNode');
    }

    const onPressEditNodeName = () => {
        setModalData({
            title: 'Edit Node Name',
            onClickSave: onEditNodeName,
            currentValue: identifiedNode!.name,
            label: 'name'
        });
        setIsModalVisible(true);
    }

    const onPressEditUnicastAddr = () => {
        setModalData({
            title: 'Edit Node Unicast Address',
            onClickSave: onEditNodeAddress,
            currentValue: '0x' + identifiedNode!.unicastAddress.toString(16),
            label: 'unicast address'
        });
        setIsModalVisible(true);
    }

    const onEditNodeName = async (name: string) => {
        let node = await callMeshModuleFunction('editUnprovisionedNodeName', name) as IdentifiedNode;
        handleNodeUpdated(node);
    }

    const onEditNodeAddress = async (addr: string) => {
        // Trim input and check if it's a valid number
        const parsedAddr = Number(addr.trim());

        if (isNaN(parsedAddr) || !Number.isInteger(parsedAddr)) {
            Alert.alert("Invalid Address", "Please enter a valid numeric address.");
            return;
        }

        // Ensure address is within the valid range (e.g., 1 to 32767 for unicast addresses)
        if (parsedAddr < 0x0001 || parsedAddr > 0x7FFF) {
            Alert.alert("Invalid Address", "Address must be between 0x0001 and 0x7FFF.");
            return;
        }

        try {
            let node = await callMeshModuleFunction('editUnprovisionedNodeAddr', Number(addr)) as IdentifiedNode;
            handleNodeUpdated(node);
        }
        catch (e) {
            const errorMessage = e.message || "An unknown error occurred";
            Alert.alert("Error", errorMessage);
        }
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[meshStyles.infoContainer, { backgroundColor: Colors.lightGray }]}>
                <View
                    style={[meshStyles.deviceInfoIconContainer]}>
                    <PeripheralIcon icon={icon} size={32} />
                </View>
                <Spacing spaceT={10} />
                <Text style={[meshStyles.deviceName]}>{identifiedNode?.name}</Text>
            </View>

            {/* Body */}
            <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
                {/* state */}
                <Text style={{ fontSize: 15 }} >
                    State:{' '}
                    <Text style={{ fontWeight: 'bold' }}>
                        {state}
                    </Text>
                </Text>

                {/* info */}
                {identifiedNode && (
                    <View style={{ paddingTop: 20 }}>
                        <View style={[meshStyles.optionsBox]}>
                            <View style={[meshStyles.item]}>
                                <Text style={[meshStyles.subject]}>Name</Text>
                                <View style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Text >{identifiedNode?.name ? identifiedNode?.name : 'N/A'}</Text>
                                    <TouchableOpacity style={{ marginLeft: 10 }} onPress={onPressEditNodeName}>
                                        <Icon name="edit" size={20} />
                                    </TouchableOpacity>
                                </View>

                            </View>
                            <Divider />
                            <View style={[meshStyles.item]}>
                                <Text style={[meshStyles.subject]}>Unicast address</Text>
                                <View style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Text>0x{identifiedNode?.unicastAddress.toString(16).toLocaleUpperCase()}</Text>
                                    <TouchableOpacity style={{ marginLeft: 10 }} onPress={onPressEditUnicastAddr}>
                                        <Icon name="edit" size={20} />
                                    </TouchableOpacity>
                                </View>

                            </View>
                        </View>

                        <View style={[meshStyles.optionsBox]}>
                            <View style={[meshStyles.item]}>
                                <Text style={[meshStyles.subject]}>Element Count</Text>
                                <Text>{identifiedNode?.numberOfElement}</Text>

                            </View>
                        </View>
                        {!inProvisioningProgress && (
                            <TouchableOpacity style={[meshStyles.button]} onPress={startProvisionNode}>
                                <Text style={[meshStyles.textButton]}>Provision</Text>
                            </TouchableOpacity>
                        )}

                    </View>
                )}

                {(!identifiedNode && !isConnected) &&
                    <View style={{ marginTop: 20 }}>
                        <Skeleton animation='wave' LinearGradientComponent={LinearGradient} style={{ height: 40, marginBottom: 10 }} />
                        <Skeleton animation='wave' LinearGradientComponent={LinearGradient} style={{ height: 40, marginBottom: 10 }} />
                        <Skeleton animation='wave' LinearGradientComponent={LinearGradient} style={{ height: 40, marginBottom: 0 }} />
                    </View>
                }

                {inProvisioningProgress && (
                    <View>
                        <Text style={{ textAlign: 'center' }}>Progress</Text>
                        <LinearProgress value={progress} color={Colors.blue} style={[styles.linearProgress]} />
                        <Text style={{ marginBottom: 10, textAlign: 'center' }}>
                            {Math.floor(progress * 100).toFixed(0)}%
                        </Text>
                    </View>
                )}
            </View>
            <GenericMeshModal
                setModalVisible={setIsModalVisible}
                visible={isEditModalVisible}
                title={modalData.title}
                currentValue={modalData.currentValue}
                onClickSave={modalData.onClickSave}
                label={modalData.label}
            />

        </View>
    );
};

const styles = StyleSheet.create({
    linearProgress: {
        height: 10,
        width: '80%',
        alignSelf: 'center',
        marginVertical: 10,
        borderRadius: 5,
    },
    container: {
        height: '100%',
        backgroundColor: Colors.lightGray
    },
    row: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignContent: 'flex-start',
    }
});

export default BleMeshProvisionNode;
