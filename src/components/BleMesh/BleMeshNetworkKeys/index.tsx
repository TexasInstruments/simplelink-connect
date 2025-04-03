import { Text, TouchableOpacity } from '../../Themed';
import { StyleSheet, View, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import Colors from '../../../constants/Colors';
import { useEffect, useRef, useState, } from 'react';
import { Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ScrollView } from 'react-native-gesture-handler';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { AddNetworkKeyDialog } from './AddNetworkKeyDialog';
import { GenericMeshModal, GenericModalData } from '../GenericMeshModal';
import { callMeshModuleFunction, meshStyles } from '../meshUtils';

export interface NetworkKey {
    expand?: boolean,
    index: number,
    key: string,
    name: string,
    timestamp: string
}

const BleMeshNetworkKeys: React.FC = () => {

    const [primaryNetKey, setPrimaryNetKey] = useState<NetworkKey>();
    const [subNetKeys, setSubNetKeys] = useState<NetworkKey[]>([]);
    const [addKeyModalVisible, setAddKeyModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [modalData, setModalData] = useState<GenericModalData>({ title: 'Edit', currentValue: '', onClickSave: (val: string) => console.log(val), label: '' })

    const keyToEdit = useRef<NetworkKey>();

    useEffect(() => {
        getMeshNetworksKeys();
    }, []);

    const getMeshNetworksKeys = async () => {
        try {
            const primaryKey = await callMeshModuleFunction('getMeshPrimaryNetworksKey') as NetworkKey;
            let extendedKey;
            if (Platform.OS === 'android') {
                extendedKey = { ...primaryKey, expand: false, timestamp: new Date(primaryKey.timestamp).toLocaleString() }
            }
            else {
                extendedKey = { ...primaryKey, expand: false, timestamp: new Date(primaryKey.timestamp * 1000).toLocaleString() }
            }
            setPrimaryNetKey(extendedKey);

            const subKeys = await callMeshModuleFunction('getMeshSubNetworksKeys') as NetworkKey[];
            let extendedKeys;
            if (Platform.OS === 'android') {
                extendedKeys = subKeys.map((key: NetworkKey) => { return { ...key, expand: false, timestamp: new Date(key.timestamp).toLocaleString() } });
            }
            else {
                extendedKeys = subKeys.map((key: NetworkKey) => { return { ...key, expand: false, timestamp: new Date(key.timestamp * 1000).toLocaleString() } });
            }
            setSubNetKeys(extendedKeys);
        }
        catch (e) {
            console.error(e);
        }
    };

    const removeNetKey = async (keyIndex: number) => {
        try {
            const removed = await callMeshModuleFunction('removeNetworksKey', keyIndex);

            // Remove key from state
            let updatedKeys = subNetKeys.filter(k => k.index != keyIndex);
            setSubNetKeys(updatedKeys);

        } catch (e) {
            console.error(e);
        }
    };

    const toggleExpand = (toggledKey: any, isPrimaryKey: boolean) => {
        if (isPrimaryKey) {
            let updatedKey = { ...primaryNetKey, expand: !primaryNetKey?.expand }
            setPrimaryNetKey(updatedKey);
        }
        else {
            let updatedNetKeys = subNetKeys.map(key =>
                key.index === toggledKey.index ? { ...key, expand: !key.expand } : key
            );
            setSubNetKeys(updatedNetKeys);
        }
    };

    const openAddKeyModal = () => {
        setAddKeyModalVisible(true);
        collapseAll();
    };

    const onPressEditKeyName = (key: NetworkKey) => {
        setModalData({
            title: 'Edit Key Name',
            currentValue: key.name,
            onClickSave: editKeyName,
            label: 'name',
        });
        keyToEdit.current = key;
        setIsEditModalVisible(true);
    }

    const onPressEditKeyVal = (key: NetworkKey) => {
        setModalData({
            title: 'Edit Key',
            currentValue: key.key,
            onClickSave: editKeyValue,
            label: 'key',
        });
        keyToEdit.current = key;
        setIsEditModalVisible(true);

    }

    const editKeyName = async (newName: string) => {
        await callMeshModuleFunction('editNetworksKey', keyToEdit.current?.index, newName, keyToEdit.current?.key)
        getMeshNetworksKeys();
    };

    const editKeyValue = async (newVal: string) => {
        if (!/^[0-9A-Fa-f]+$/.test(newVal)) {
            Alert.alert("Invalid Key", "The key must contain only hexadecimal characters (0-9, A-F).");
            return;
        }
        if (newVal.length != 32) {
            Alert.alert("Invalid Key", "The key must be 16 bytes");
            return;
        }
        await callMeshModuleFunction('editNetworksKey', keyToEdit.current?.index, keyToEdit.current?.name, newVal)
        getMeshNetworksKeys();

    };

    const DisplayNetworkKey = ({ netKey, isPrimaryKey }: any) => {
        return (
            <View style={[meshStyles.optionsBox, meshStyles.shadow]}>
                <TouchableOpacity style={[meshStyles.item]} onPress={() => toggleExpand(netKey, isPrimaryKey)}>
                    <Text style={[meshStyles.subject]}>{netKey.name}</Text>
                    <Icon name={netKey.expand ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={20} />
                </TouchableOpacity>
                {
                    (netKey.expand && (
                        <View style={{ paddingHorizontal: 10, marginBottom: 10 }}>
                            <View style={[meshStyles.item]}>
                                <View>
                                    <Text style={[meshStyles.topic]}>Name</Text>
                                    <Text style={[meshStyles.text]}>{netKey.name}</Text>
                                </View>
                                <TouchableOpacity style={{ marginLeft: 10 }} onPress={() => onPressEditKeyName(netKey)}>
                                    <Icon name="edit" size={20} />
                                </TouchableOpacity>
                            </View>
                            <Divider />
                            <View style={[meshStyles.item]}>
                                <View>
                                    <Text style={[meshStyles.topic]}>Key</Text>
                                    <Text numberOfLines={1} style={[meshStyles.text, { maxWidth: 200 }]}>{netKey.key}</Text>

                                </View>
                                <TouchableOpacity style={{ marginLeft: 10 }} onPress={() => onPressEditKeyVal(netKey)}>
                                    <Icon name="edit" size={20} />
                                </TouchableOpacity>

                            </View>
                            <Divider />
                            <View style={[meshStyles.item]}>
                                <View>
                                    <Text style={[meshStyles.topic]} >Last modified</Text>
                                    <Text style={[meshStyles.text]}>{netKey.timestamp}</Text>
                                </View>
                            </View>
                            <Divider />
                            <View style={[meshStyles.item]}>
                                <View>
                                    <Text style={[meshStyles.topic]}>Key index</Text>
                                    <Text style={[meshStyles.text]}>{netKey.index}</Text>

                                </View>
                            </View>
                            {!isPrimaryKey && (
                                <TouchableOpacity style={[styles.row, { justifyContent: 'center', alignContent: 'center' }]} onPress={() => removeNetKey(netKey.index)}>
                                    <Text style={{ color: Colors.primary, marginRight: 5 }}> Remove key</Text>
                                    <FontAwesome5 name="trash-alt" size={15} color={Colors.primary} />
                                </TouchableOpacity>
                            )}

                        </View>
                    ))
                }

            </View>
        )
    };

    const collapseAll = () => {
        setSubNetKeys(subNetKeys.map(key => ({ ...key, expand: false })));
        setPrimaryNetKey({ ...primaryNetKey, expand: false });
    }

    return (
        <KeyboardAvoidingView style={meshStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={100}>
            <Text style={meshStyles.title}>Network Keys</Text>
            <ScrollView>
                <Text style={[meshStyles.subject, { marginBottom: 10 }]}>Primary Network Key</Text>
                {primaryNetKey && (<DisplayNetworkKey netKey={primaryNetKey} isPrimaryKey={true} />)}
                <View style={{ height: 15 }} />
                <Text style={[meshStyles.subject, { marginBottom: 10 }]}>Sub Network Keys</Text>
                {subNetKeys.map((key, index) => {
                    return <DisplayNetworkKey netKey={key} key={index} isPrimaryKey={false} />;
                })}
                {subNetKeys.length === 0 && <Text>No sub keys available</Text>}

            </ScrollView>

            <TouchableOpacity
                style={meshStyles.fab}
                onPress={openAddKeyModal}
            >
                <MaterialCommunityIcons
                    name="plus-thick"
                    size={23}
                    color="white"
                    style={{ marginRight: 8 }}
                />
                <Text style={[meshStyles.fabText]}>Add Sub Key</Text>
            </TouchableOpacity>

            <AddNetworkKeyDialog
                setModalVisible={setAddKeyModalVisible}
                visible={addKeyModalVisible}
                netKeys={subNetKeys}
                setNetKeys={setSubNetKeys}
            />
            <GenericMeshModal
                setModalVisible={setIsEditModalVisible}
                visible={isEditModalVisible}
                title={modalData.title}
                currentValue={modalData.currentValue}
                onClickSave={modalData.onClickSave}
                label={modalData.label}
            />

        </KeyboardAvoidingView>
    );

};

const styles = StyleSheet.create({
    row: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%'
    },
});

export default BleMeshNetworkKeys;
