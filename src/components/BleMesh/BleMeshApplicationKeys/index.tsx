import { Text, TouchableOpacity } from '../../Themed';
import { StyleSheet, View, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import Colors from '../../../constants/Colors';
import { useEffect, useRef, useState, } from 'react';
import { Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ScrollView } from 'react-native-gesture-handler';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { GenericMeshModal, GenericModalData } from '../GenericMeshModal';
import { AddAppKeyDialog } from './AddAppKeyDialog';
import { ApplicationKey, callMeshModuleFunction, meshStyles } from '../meshUtils';

const BleMeshApplicationKeys: React.FC = () => {

    const [appKeys, setAppKeys] = useState<any>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [addKeyModalVisible, setAddKeyModalVisible] = useState(false);
    const [modalData, setModalData] = useState<GenericModalData>({ title: 'Edit', currentValue: '', onClickSave: (val: string) => console.log(val), label: '' })
    const keyToEdit = useRef<ApplicationKey>();

    useEffect(() => {
        getMeshApplicationKeys();
    }, []);

    const getMeshApplicationKeys = async () => {
        try {
            const keys = await callMeshModuleFunction('getMeshApplicationsKeys') as ApplicationKey[];
            if (!keys) {
                return;
            }
            let extendedKeys = keys.map(key => { return { ...key, expand: false } });
            setAppKeys(extendedKeys);
        }
        catch (e) {
            console.error(e);
        }
    };

    const removeAppKey = async (keyIndex: number) => {
        try {
            const removed = await callMeshModuleFunction('removeAppKey', keyIndex);
            // Remove key from state
            let updatedKeys = appKeys.filter(k => k.index != keyIndex);
            setAppKeys(updatedKeys);
        } catch (e) {
            console.error(e);
        }
    };

    const toggleExpand = (toggledKey: any) => {
        let updatedAppKeys = appKeys.map(key =>
            key.index === toggledKey.index ? { ...key, expand: !key.expand } : key
        );
        setAppKeys(updatedAppKeys);
    };

    const openAddKeyModal = () => {
        setAddKeyModalVisible(true);
    };

    const onPressEditKeyName = (key: ApplicationKey) => {
        setModalData({
            title: 'Edit Key Name',
            currentValue: key.name,
            onClickSave: editKeyName,
            label: 'name',
        });
        keyToEdit.current = key;
        setModalVisible(true);
    }

    const onPressEditKeyVal = (key: ApplicationKey) => {
        setModalData({
            title: 'Edit Key',
            currentValue: key.key,
            onClickSave: editKeyValue,
            label: 'key',
        });
        keyToEdit.current = key;
        setModalVisible(true);

    }

    const editKeyName = async (newName: string) => {

        await callMeshModuleFunction('editAppKey', keyToEdit.current?.index, newName, keyToEdit.current?.key)
        getMeshApplicationKeys();
    }

    const editKeyValue = async (newVal: string) => {
        if (!/^[0-9A-Fa-f]+$/.test(newVal)) {
            Alert.alert("Invalid Key", "The key must contain only hexadecimal characters (0-9, A-F).");
            return;
        }
        if (newVal.length != 32) {
            Alert.alert("Invalid Key", "The key must be 16 bytes");
            return;
        }

        await callMeshModuleFunction('editAppKey', keyToEdit.current?.index, keyToEdit.current?.name, newVal)
        getMeshApplicationKeys();

    }

    const DisplayApplicationKey = ({ appKey }: { appKey: ApplicationKey }) => {
        return (
            <View style={[meshStyles.optionsBox, meshStyles.shadow]}>
                <TouchableOpacity style={[meshStyles.item]} onPress={() => toggleExpand(appKey)}>
                    <Text style={[meshStyles.subject]}>{appKey.name}</Text>
                    <Icon name={appKey.expand ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={20} />
                </TouchableOpacity>
                {
                    (appKey.expand && (
                        <View style={{ paddingHorizontal: 10, marginBottom: 10 }}>
                            <View style={[meshStyles.item]}>
                                <View>
                                    <Text style={[meshStyles.topic]}>Name</Text>
                                    <Text style={[styles.text]}>{appKey.name}</Text>
                                </View>
                                <TouchableOpacity style={{ marginLeft: 10 }} onPress={() => onPressEditKeyName(appKey)}>
                                    <Icon name="edit" size={20} />
                                </TouchableOpacity>
                            </View>
                            <Divider />
                            <View style={[meshStyles.item]}>
                                <View>
                                    <Text style={[meshStyles.topic]}>Key</Text>
                                    <Text numberOfLines={1} style={[styles.text, { maxWidth: 200 }]}>{appKey.key}</Text>

                                </View>
                                <TouchableOpacity style={{ marginLeft: 10 }} onPress={() => onPressEditKeyVal(appKey)}>
                                    <Icon name="edit" size={20} />
                                </TouchableOpacity>

                            </View>
                            <Divider />
                            <View style={[meshStyles.item]}>
                                <View>
                                    <Text style={[meshStyles.topic]}>Key index</Text>
                                    <Text style={[styles.text]}>{appKey.index}</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={[styles.row, { justifyContent: 'center', alignContent: 'center' }]} onPress={() => removeAppKey(appKey.index)}>
                                <Text style={[meshStyles.textButton, { marginRight: 5, color: Colors.primary }]}>Remove key</Text>
                                <FontAwesome5 name="trash-alt" size={15} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>
                    ))
                }

            </View>
        )
    };

    return (
        <KeyboardAvoidingView style={meshStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Text style={meshStyles.title}>Application Keys</Text>
            {appKeys.length === 0 && <Text style={{ marginTop: 10 }}>No application key available</Text>}
            <ScrollView>
                {appKeys.map((key, index) => {
                    return <DisplayApplicationKey appKey={key} key={index} />;
                })}
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
                <Text style={[meshStyles.fabText]}>Add Key</Text>
            </TouchableOpacity>
            <GenericMeshModal
                setModalVisible={setModalVisible}
                visible={modalVisible}
                title={modalData.title}
                currentValue={modalData.currentValue}
                onClickSave={modalData.onClickSave}
                label={modalData.label} />

            <AddAppKeyDialog
                setModalVisible={setAddKeyModalVisible}
                visible={addKeyModalVisible}
                appKeys={appKeys}
                setAppKeys={setAppKeys} />

        </KeyboardAvoidingView>
    );

};

const styles = StyleSheet.create({
    row: {
        display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%'
    },
    text: {
        color: Colors.gray
    },

});

export default BleMeshApplicationKeys;
