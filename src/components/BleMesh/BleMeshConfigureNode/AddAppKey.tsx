import { Text, TouchableOpacity } from '../../Themed';
import { StyleSheet, NativeModules, View, Alert, Modal, NativeEventEmitter } from 'react-native';
import Colors from '../../../constants/Colors';
import { useEffect, useState } from 'react';
import { callMeshModuleFunction, meshStyles } from '../meshUtils';
import CheckBox from '@react-native-community/checkbox';
import { ApplicationKey } from '../BleMeshApplicationKeys';

interface Props {
    setModalVisible: any;
    visible: boolean;
    unicastAddress: number;
}

interface ExtendedAppKey extends ApplicationKey {
    checked: boolean;
}

export const AddAppKeyModal: React.FC<Props> = ({ visible, setModalVisible, unicastAddress }) => {

    const { MeshModule } = NativeModules;
    const bleMeshEmitter = new NativeEventEmitter(MeshModule);

    const [appKeys, setAppKeys] = useState<ExtendedAppKey[]>();
    const [nodeKeys, setNodeKeys] = useState<ApplicationKey[]>([]);

    useEffect(() => {
        const appKeyListener = bleMeshEmitter.addListener('onAppKeyUpdated', handleAppKeyUpdated);

        getNodeKeys();

        return () => {
            appKeyListener.remove();
        };

    }, [])

    useEffect(() => {
        if (visible) {
            getNodeKeys();
        }
    }, [visible]);

    useEffect(() => {
        getAppKeys();
    }, [nodeKeys]);

    const handleAppKeyUpdated = (message: string) => {
        if (message != "success") {
            Alert.alert("Update application keys failed", message)
        }
        getNodeKeys();

    }

    const getAppKeys = async () => {
        try {
            const appKeys = await callMeshModuleFunction('getMeshApplicationsKeys') as ApplicationKey[];
            if (appKeys) {
                let extendsAppKeys = appKeys.map((key: ApplicationKey) => {

                    if (nodeKeys.find((nodeKey) => key.index === nodeKey.index) != undefined) {
                        return { ...key, checked: true };
                    }
                    else {
                        return { ...key, checked: false };

                    }
                })
                setAppKeys(extendsAppKeys);
            }
        }
        catch (e) { console.error(e) }
    };

    const getNodeKeys = async () => {
        try {
            const appKeys = await callMeshModuleFunction('getProvisionedNodeAppKeys', unicastAddress) as ApplicationKey[]
            setNodeKeys(appKeys);
        }
        catch (e) { console.error(e) }
    }

    const handleAddAppKey = async (appKey: ExtendedAppKey) => {
        // add appKey
        if (!appKey.checked) {
            await callMeshModuleFunction('addNodeAppKey', unicastAddress, appKey.index)

        }
        // remove key
        else {
            await callMeshModuleFunction('removeNodeAppKeys', unicastAddress, appKey.index)

        }
        getNodeKeys();
    }

    const DisplayAppKey = ({ appKey }: { appKey: ExtendedAppKey }) => {
        return (
            <View style={[styles.keyContainer]}>
                <CheckBox
                    value={appKey.checked}
                    // color={Colors.active}
                    onValueChange={() => {
                        handleAddAppKey(appKey);
                    }} />
                <Text style={[styles.keyText]}>{appKey.name}</Text>
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
                    <Text style={meshStyles.title}>Application Keys </Text>
                    {
                        (!appKeys || appKeys.length == 0) &&
                        <>
                            <Text>No available app keys!</Text>
                            <Text>Go to main page to add an application key.</Text>
                        </>
                    }
                    {
                        appKeys && appKeys.map((appKey, index) => {
                            return <DisplayAppKey appKey={appKey} key={index} />
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