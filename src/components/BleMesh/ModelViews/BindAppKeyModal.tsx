import { Text, TouchableOpacity } from '../../Themed';
import { StyleSheet, NativeModules, View, Alert, Modal, NativeEventEmitter } from 'react-native';
import Colors from '../../../constants/Colors';
import { useEffect, useState } from 'react';
import { callMeshModuleFunction, meshStyles } from '../meshUtils';
import { ApplicationKey } from '../BleMeshApplicationKeys';
import CheckBox from '@react-native-community/checkbox';

interface Props {
    setModalVisible: any;
    visible: boolean;
    unicastAddress: number;
}

interface ExtendedAppKey extends ApplicationKey {
    checked: boolean;
}

export const BindAppKeyModal: React.FC<Props> = ({ visible, setModalVisible, unicastAddress }) => {

    const { MeshModule } = NativeModules;
    const bleMeshEmitter = new NativeEventEmitter(MeshModule);

    const [appKeys, setAppKeys] = useState<ExtendedAppKey[]>();
    const [boundedKeys, setBoundedKeys] = useState<number[]>([]);

    useEffect(() => {
        const appKeyListener = bleMeshEmitter.addListener('onModelKeyUpdated', handleModelKeyUpdated);
        getBoundApplicationKey();

        return () => {
            appKeyListener.remove();
        };

    }, [visible])

    useEffect(() => {
        getAppKeys();
    }, [boundedKeys]);


    const handleModelKeyUpdated = (message: string) => {
        if (message !== "Success") {
            Alert.alert("Bind application key failed", message);
            return;
        }
        getBoundApplicationKey();

    }

    const getBoundApplicationKey = async () => {
        try {
            const boundKeys = await callMeshModuleFunction('getModelBoundKeys') as number[];
            setBoundedKeys(boundKeys);
        }
        catch (e) { console.error(e) }
    }

    const getAppKeys = async () => {
        try {
            const appKeys = await callMeshModuleFunction('getProvisionedNodeAppKeys', unicastAddress) as ApplicationKey[]
            if (appKeys) {
                let extendsAppKeys = appKeys.map((key: ApplicationKey) => {

                    if (boundedKeys.find((keyIndex) => key.index == keyIndex) != undefined) {
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

    const bindAppKey = async (appKeyIndex: number) => {
        await callMeshModuleFunction('bindAppKey', unicastAddress, appKeyIndex);
    }

    const unbindAppKey = async (appKeyIndex: number) => {

        Alert.alert('Unbind Application Key', 'Are you sure you want to unbind key?', [
            {
                text: 'Yes',
                onPress: async () => await callMeshModuleFunction('unbindAppKey', appKeyIndex, unicastAddress),
                style: 'destructive',
            },
            { text: 'Cancel', onPress: () => console.log('Cancel Pressed') },
        ]);
    }

    const handleBindAppKey = async (appKey: ExtendedAppKey) => {
        // add appKey
        if (!appKey.checked) {
            await bindAppKey(appKey.index);

        }
        // remove key
        else {
            await unbindAppKey(appKey.index);

        }
        getBoundApplicationKey();
    }

    const DisplayAppKey = ({ appKey }: { appKey: ExtendedAppKey }) => {
        return (
            <View style={[styles.keyContainer]}>

                <CheckBox
                    value={appKey.checked}
                    // color={Colors.active}
                    onValueChange={() => {
                        handleBindAppKey(appKey);
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
                    <Text style={[meshStyles.title]}>Bind Application Key</Text>
                    {
                        appKeys && appKeys.map((appKey, index) => {
                            return <DisplayAppKey appKey={appKey} key={index} />
                        })
                    }
                    {
                        (!appKeys || appKeys.length == 0) && (
                            <Text>No application keys are bound to this node. Go back to bind application keys</Text>
                        )
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