import { Text, TouchableOpacity } from '../../Themed';
import { StyleSheet, NativeModules, View, Alert, Modal, NativeEventEmitter } from 'react-native';
import Colors from '../../../constants/Colors';
import { useEffect, useState } from 'react';
import { callMeshModuleFunction, meshStyles } from '../meshUtils';
import { NetworkKey } from '..';
import CheckBox from '@react-native-community/checkbox';

interface Props {
    setModalVisible: any;
    visible: boolean;
    unicastAddress: number;
}

interface ExtendedNetworkKey extends NetworkKey {
    checked: boolean;
}

export const AddNetKeyModal: React.FC<Props> = ({ visible, setModalVisible, unicastAddress }) => {

    const { MeshModule } = NativeModules;
    const bleMeshEmitter = new NativeEventEmitter(MeshModule);

    const [primaryNetKey, setPrimaryNetKey] = useState<ExtendedNetworkKey>();
    const [subNetworkKeys, setSubNetKeys] = useState<ExtendedNetworkKey[]>([]);
    const [nodeKeys, setNodeKeys] = useState<NetworkKey[]>([]);

    useEffect(() => {
        const netKeyListener = bleMeshEmitter.addListener('onNetworkKeyUpdated', handleNetworkKeyUpdated);

        getNodeKeys();

        return () => {
            bleMeshEmitter.removeAllListeners('onNetworkKeyUpdated');
        };

    }, [])

    useEffect(() => {
        getNetworksKeys();
    }, [nodeKeys]);

    const handleNetworkKeyUpdated = (message: string) => {
        if (message != "success") {
            Alert.alert("Update network keys failed", message)
        }
        getNodeKeys();

    }

    const getNetworksKeys = async () => {
        try {
            const netKeys = await callMeshModuleFunction('getMeshSubNetworksKeys') as NetworkKey[];
            if (netKeys) {
                let extendsNetKeys = netKeys.map((key: NetworkKey) => {

                    if (nodeKeys.find((nodeKey) => key.index === nodeKey.index) != undefined) {
                        return { ...key, checked: true };
                    }
                    else {
                        return { ...key, checked: false };

                    }
                })
                setSubNetKeys(extendsNetKeys);
            }

            const primaryNetKey = await callMeshModuleFunction('getMeshPrimaryNetworksKey') as NetworkKey;
            if (nodeKeys.find((nodeKey) => primaryNetKey.index === nodeKey.index) != undefined) {
                setPrimaryNetKey({ ...primaryNetKey, checked: true });
            }
            else {
                setPrimaryNetKey({ ...primaryNetKey, checked: false });

            }
        }
        catch (e) { console.error(e) }
    };

    const getNodeKeys = async () => {
        try {
            const netKeys = await callMeshModuleFunction('getProvisionedNodeNetworkKeys', unicastAddress) as NetworkKey[];

            setNodeKeys(netKeys)
        }
        catch (e) { console.error(e) }
    }

    const handleAddSubNetKey = async (netKey: ExtendedNetworkKey) => {
        // add netkey
        if (!netKey.checked) {
            await callMeshModuleFunction('addNodeNetworkKeys', unicastAddress, netKey.index)

        }
        // remove key
        else {
            await callMeshModuleFunction('removeNodeNetworkKeys', unicastAddress, netKey.index)

        }
        getNodeKeys();
    }

    const DisplayPrimaryNetKey = ({ netKey }: { netKey: ExtendedNetworkKey }) => {
        return (
            <View style={[styles.keyContainer]}>
                <CheckBox
                    disabled
                    value={netKey.checked}
                    // color={Colors.active}
                    onValueChange={() => {
                        setPrimaryNetKey({ ...primaryNetKey, checked: !primaryNetKey.checked })
                    }} />
                <Text style={[styles.keyText]}>{netKey.name}</Text>
            </View>
        )
    }

    const DisplaySubNetKey = ({ netKey }: { netKey: ExtendedNetworkKey }) => {
        return (
            <View style={[styles.keyContainer]}>
                <CheckBox
                    value={netKey.checked}
                    // color={Colors.active}
                    onValueChange={() => {
                        handleAddSubNetKey(netKey);
                    }} />
                <Text style={[styles.keyText]}>{netKey.name}</Text>
            </View>
        )
    }

    return (
        <Modal
            transparent={true}
            visible={visible}
            onRequestClose={() => {
                setModalVisible(!visible);
            }}>
            <View style={[styles.centeredView]}>
                <View style={styles.modalView}>
                    <Text style={meshStyles.title}>Node Network Keys </Text>
                    {primaryNetKey && <DisplayPrimaryNetKey netKey={primaryNetKey} />}
                    {
                        subNetworkKeys && subNetworkKeys.map((netKey, index) => {
                            return <DisplaySubNetKey netKey={netKey} key={index} />
                        })
                    }
                    <TouchableOpacity onPress={() => setModalVisible(!visible)} style={{ alignSelf: 'flex-end', marginTop: 20 }}>
                        <Text style={{ textAlign: 'center', color: Colors.blue }}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    )
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',  // Darkens the background
    },
    modalView: {
        width: '100%',
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 35,
    },
    container: {
        height: '100%',
        padding: 30,
        backgroundColor: Colors.lightGray
    },
    keyText: {
        fontSize: 16,
        marginLeft: 8
    },
    keyContainer: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 3
    }
});