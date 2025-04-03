import React, { useEffect, useRef, useState } from 'react';
import {
    Text,
    TouchableOpacity,
    StyleSheet,
    View,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,

} from 'react-native';
import { AddressRange, callMeshModuleFunction, meshStyles, ProvisionerNode } from '../meshUtils';
import Colors from '../../../constants/Colors';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Divider } from 'react-native-paper';
import { GenericModalData, GenericMeshModal } from '../GenericMeshModal';
import { AddressRangeMeshModal, AddressRangeModalData } from './AddressRangeMeshModal';
import { SceneRangeMeshModal, SceneRangeModalData } from './ScenesRangeMeshModal';

const BleMeshProvisioners: React.FC = () => {

    const [provisioners, setProvisioners] = useState<ProvisionerNode[]>([]);
    const [isTextModalVisible, setIsTextModalVisible] = useState(false);
    const [isAddrRangeModalVisible, setIsAddrRangeModalVisible] = useState(false);
    const [isSceneRangeModalVisible, setIsSceneRangeModalVisible] = useState(false);
    const [textModalData, setTextModalData] = useState<GenericModalData>({ title: 'Edit', currentValue: '', onClickSave: (val: string) => console.log(val), label: '' })
    const [addressRangeModalData, setAddressRangeModalData] = useState<AddressRangeModalData>({ title: 'Edit', currentValue: [], onClickSave: (val: string) => console.log(val) })
    const [sceneRangeModalData, setSceneRangeModalData] = useState<SceneRangeModalData>({ title: 'Edit', currentValue: [], onClickSave: (val: string) => console.log(val) })
    const provisionerToEdit = useRef<ProvisionerNode>();

    useEffect(() => {
        getProvisioners();
    }, []);

    const getProvisioners = async () => {
        let data = (await callMeshModuleFunction('getProvisioners')) as ProvisionerNode[];
        setProvisioners(data);
    };

    const toggleExpand = (toggledKey: any) => {
        let updatedProvisioners = provisioners.map(provisioners =>
            provisioners.unicastAddress === toggledKey ? { ...provisioners, expand: !provisioners.expand } : provisioners
        );
        setProvisioners(updatedProvisioners);
    };

    const isValidHex = (hex: string): boolean => {
        const hexRegex = /^[0-9A-Fa-f]{1,4}$/; // Matches 1 to 4 hex digits (0001 - FFFF)
        const intValue = parseInt(hex, 16);
        return hexRegex.test(hex) && intValue >= 1 && intValue <= 0xFFFF
    };

    const handlePressedEditName = async (provisioner: ProvisionerNode) => {
        setTextModalData({
            title: 'Edit Provisioner Name',
            currentValue: provisioner.name,
            onClickSave: editProvName,
            label: 'name',
        });
        provisionerToEdit.current = provisioner;
        setIsTextModalVisible(true);
    };

    const editProvName = async (newVal: string) => {
        await callMeshModuleFunction('editProvisionerName', parseInt(provisionerToEdit.current!.unicastAddress, 16), newVal);
        getProvisioners();
    };

    const handlePressedEditUnicastAddress = async (provisioner: ProvisionerNode) => {
        setTextModalData({
            title: 'Edit Provisioner Unicast Address',
            currentValue: provisioner.unicastAddress,
            onClickSave: editProvUnicastAddress,
            label: 'Address (hex)',
        });
        provisionerToEdit.current = provisioner;
        setIsTextModalVisible(true);
    };

    const editProvUnicastAddress = async (newVal: string) => {
        if (!isValidHex(newVal)) {
            Alert.alert("Address must be a valid hex (0001 - FFFF)")
            return;
        }
        try {
            let res = await callMeshModuleFunction('editProvisionerUnicastAddress', parseInt(provisionerToEdit.current!.unicastAddress, 16), parseInt(newVal, 16));
            if (res !== "success") {
                Alert.alert("Error edit provisioner address", res);
            } else {
                getProvisioners();
            }
        }
        catch (e) {
            console.error(e);
            Alert.alert("Failed to edit Provisioner Address", e.message);
        }
    };

    const handlePressedEditTtl = async (provisioner: ProvisionerNode) => {
        setTextModalData({
            title: 'Edit Provisioner TTL',
            currentValue: provisioner.ttl == "N/A" ? '5' : provisioner.ttl.toString(),
            onClickSave: editProvTtl,
            label: 'TTL (0-127)',
        });
        provisionerToEdit.current = provisioner;
        setIsTextModalVisible(true);
    };

    const editProvTtl = async (newVal: string) => {
        let ttl = parseInt(newVal, 10);
        if (ttl < 0 || ttl > 127) {
            Alert.alert("TTL must be a number between 0 and 127");
            return;
        }
        try {
            let res = await callMeshModuleFunction('editProvisionerTtl', parseInt(provisionerToEdit.current!.unicastAddress, 16), ttl);
            if (res !== "success") {
                Alert.alert("Error edit provisioner TTL", res);
            } else {
                getProvisioners();
            }
        }
        catch (e) {
            console.error(e);
            Alert.alert("Failed to edit Provisioner TTL", e);
        }
    };

    const handlePressedEditUnicastRanges = async (provisioner: ProvisionerNode) => {
        setAddressRangeModalData({
            title: 'Edit Unicast Ranges',
            currentValue: provisioner.allocatedUnicastAddress,
            onClickSave: editProvUnicastRanges,
        });
        provisionerToEdit.current = provisioner;
        setIsAddrRangeModalVisible(true);
    };

    const editProvUnicastRanges = async (newRanges: AddressRange[]) => {
        try {
            let res = await callMeshModuleFunction('editProvisionerUnicastRanges', parseInt(provisionerToEdit.current!.unicastAddress, 16), newRanges);
            if (res !== "success") {
                Alert.alert("Error edit provisioner unicast ranges", res);
            } else {
                getProvisioners();
            }
        }
        catch (e) {
            console.error(e);
            Alert.alert("Failed to edit provisioner unicast ranges", e);
        }
    };

    const handlePressedEditGroupRanges = async (provisioner: ProvisionerNode) => {
        setAddressRangeModalData({
            title: 'Edit Group Ranges',
            currentValue: provisioner.allocatedGroupsAddress,
            onClickSave: editProvGroupRanges,
        });
        provisionerToEdit.current = provisioner;
        setIsAddrRangeModalVisible(true);
    };

    const editProvGroupRanges = async (newRanges: AddressRange[]) => {
        try {
            let res = await callMeshModuleFunction('editProvisionerGroupRanges', parseInt(provisionerToEdit.current!.unicastAddress, 16), newRanges);
            if (res !== "success") {
                Alert.alert("Error edit provisioner group ranges", res);
            } else {
                getProvisioners();
            }
        }
        catch (e) {
            console.error(e);
            Alert.alert("Failed to edit provisioner group ranges", e);
        }
    };

    const handlePressedEditScenesRanges = async (provisioner: ProvisionerNode) => {
        setSceneRangeModalData({
            title: 'Edit Scenes Ranges',
            currentValue: provisioner.allocatedSceneAddress,
            onClickSave: editProvScenesRanges,
        });
        provisionerToEdit.current = provisioner;
        setIsSceneRangeModalVisible(true);
    };

    const editProvScenesRanges = async (newRanges: AddressRange[]) => {
        try {
            let res = await callMeshModuleFunction('editProvisionerScenesRanges', parseInt(provisionerToEdit.current!.unicastAddress, 16), newRanges);
            if (res !== "success") {
                Alert.alert("Error edit provisioner Scenes ranges", res);
            } else {
                getProvisioners();
            }
        }
        catch (e) {
            console.error(e);
            Alert.alert("Failed to edit provisioner Scenes ranges", e);
        }
    };

    const DisplayProvisionerNode = ({ provisioner }: { provisioner: ProvisionerNode }) => {
        return (
            <View style={[meshStyles.optionsBox, meshStyles.shadow]}>
                <TouchableOpacity style={[meshStyles.item]} onPress={() => toggleExpand(provisioner.unicastAddress)}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', flex: 1 }}>
                        <Text style={[meshStyles.subject, { flex: 1 }]} numberOfLines={1} >{provisioner.name}</Text>
                        <Text style={[meshStyles.subject]} >{provisioner.isCurrent ? '(Current)' : ''}</Text>
                    </View>
                    <Icon name={provisioner.expand ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={20} />
                </TouchableOpacity>
                {
                    (provisioner.expand && (
                        <View style={{ paddingHorizontal: 10, marginBottom: 10 }}>
                            {/* Name */}
                            <View style={[meshStyles.item]}>
                                <View>
                                    <Text style={[meshStyles.topic]}>Name</Text>
                                    <Text style={[styles.text]}>{provisioner.name}</Text>
                                </View>
                                <TouchableOpacity style={{ marginLeft: 10 }} onPress={() => handlePressedEditName(provisioner)}>
                                    <Icon name="edit" size={20} />
                                </TouchableOpacity>
                            </View>
                            <Divider />
                            {/* Unicast Address */}
                            <View style={[meshStyles.item]}>
                                <View>
                                    <Text style={[meshStyles.topic]}>Unicast Address</Text>
                                    <Text numberOfLines={1} style={[styles.text, { maxWidth: 200 }]}>0x{provisioner.unicastAddress.padStart(4, '0')}</Text>
                                </View>
                                <TouchableOpacity style={{ marginLeft: 10 }} onPress={() => handlePressedEditUnicastAddress(provisioner)}>
                                    <Icon name="edit" size={20} />
                                </TouchableOpacity>

                            </View>
                            <Divider />
                            {/* Device Key */}
                            {provisioner.deviceKey && (
                                <>
                                    <View style={[meshStyles.item]}>
                                        <View>
                                            <Text style={[meshStyles.topic]}>Device Key</Text>
                                            <Text numberOfLines={1} style={[styles.text]}>{provisioner.deviceKey}</Text>
                                        </View>
                                    </View>
                                    <Divider /></>
                            )}
                            {/* TTL */}
                            <View style={[meshStyles.item]}>
                                <View>
                                    <Text style={[meshStyles.topic]}>TTL</Text>
                                    <Text numberOfLines={1} style={[styles.text, { maxWidth: 200 }]}>{provisioner.ttl}</Text>
                                </View>
                                <TouchableOpacity style={{ marginLeft: 10 }} onPress={() => handlePressedEditTtl(provisioner)}>
                                    <Icon name="edit" size={20} />
                                </TouchableOpacity>

                            </View>
                            <Divider />
                            {/* Unicast Ranges */}
                            <View style={[meshStyles.item, { paddingVertical: 8 }]}>
                                <View>
                                    <Text style={[meshStyles.topic]}>Allocated Unicast Ranges</Text>
                                    {provisioner.allocatedUnicastAddress.map((addressRange, index) => (
                                        <Text key={index} numberOfLines={1} style={[styles.text, { maxWidth: 200 }]}>
                                            0x{addressRange.lowAddress.toString(16).padStart(4, '0').toLocaleUpperCase()} - 0x{addressRange.highAddress.toString(16).padStart(4, '0').toLocaleUpperCase()}
                                        </Text>
                                    ))}
                                </View>
                                <TouchableOpacity style={{ marginLeft: 10 }} onPress={() => handlePressedEditUnicastRanges(provisioner)}>
                                    <Icon name="edit" size={20} />
                                </TouchableOpacity>
                            </View>
                            <Divider />
                            {/* Group Ranges */}
                            <View style={[meshStyles.item, { paddingVertical: 8 }]}>
                                <View>
                                    <Text style={[meshStyles.topic]}>Allocated Group Ranges</Text>
                                    {provisioner.allocatedGroupsAddress.map((addressRange, index) => (
                                        <Text key={index} numberOfLines={1} style={[styles.text, { maxWidth: 200 }]}>
                                            0x{addressRange.lowAddress.toString(16).padStart(4, '0').toLocaleUpperCase()} - 0x{addressRange.highAddress.toString(16).padStart(4, '0').toLocaleUpperCase()}
                                        </Text>
                                    ))}
                                </View>
                                <TouchableOpacity style={{ marginLeft: 10 }} onPress={() => handlePressedEditGroupRanges(provisioner)}>
                                    <Icon name="edit" size={20} />
                                </TouchableOpacity>
                            </View>
                            <Divider />
                            {/* Scenes Ranges */}
                            <View style={[meshStyles.item, { paddingVertical: 8 }]}>
                                <View>
                                    <Text style={[meshStyles.topic]}>Allocated Scenes Ranges</Text>
                                    {provisioner.allocatedSceneAddress.map((addressRange, index) => (
                                        <Text key={index} numberOfLines={1} style={[styles.text, { maxWidth: 200 }]}>
                                            0x{addressRange.firstScene.toString(16).padStart(4, '0').toLocaleUpperCase()} - 0x{addressRange.lastScene.toString(16).padStart(4, '0').toLocaleUpperCase()}
                                        </Text>
                                    ))}
                                </View>
                                <TouchableOpacity style={{ marginLeft: 10 }} onPress={() => handlePressedEditScenesRanges(provisioner)}>
                                    <Icon name="edit" size={20} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                }
            </View>
        )
    };

    return (
        <KeyboardAvoidingView style={meshStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Text style={meshStyles.title}>Network Provisioners</Text>
            <ScrollView >
                {provisioners.map((provisionerNode, index) => {
                    return <DisplayProvisionerNode provisioner={provisionerNode} key={index} />;
                })}

            </ScrollView>

            <GenericMeshModal
                setModalVisible={setIsTextModalVisible}
                visible={isTextModalVisible}
                title={textModalData.title}
                currentValue={textModalData.currentValue}
                onClickSave={textModalData.onClickSave}
                label={textModalData.label}
            />

            <AddressRangeMeshModal
                setModalVisible={setIsAddrRangeModalVisible}
                visible={isAddrRangeModalVisible}
                title={addressRangeModalData.title}
                currentValue={addressRangeModalData.currentValue}
                onClickSave={addressRangeModalData.onClickSave}
            />
            <SceneRangeMeshModal
                setModalVisible={setIsSceneRangeModalVisible}
                visible={isSceneRangeModalVisible}
                title={sceneRangeModalData.title}
                currentValue={sceneRangeModalData.currentValue}
                onClickSave={sceneRangeModalData.onClickSave}
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
    text: {
        color: Colors.gray,
        paddingVertical: 3
    },
});
export default BleMeshProvisioners;
