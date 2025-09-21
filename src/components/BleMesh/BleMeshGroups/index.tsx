import React, { useEffect, useRef, useState } from 'react';
import {
    Text,
    TouchableOpacity,
    StyleSheet,
    View,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { callMeshModuleFunction, Group, meshStyles } from '../meshUtils';
import Colors from '../../../constants/Colors';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Divider } from 'react-native-paper';
import { GenericModalData, GenericMeshModal } from '../GenericMeshModal';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { CreateGroupDialog } from './CreateGroupDialog';

const BleMeshGroups: React.FC = () => {

    const [isTextModalVisible, setIsTextModalVisible] = useState(false);
    const [groups, setGroups] = useState<Group[]>([]);
    const [isCreateGroupDialogVisible, setIsCreateGroupDialogVisible] = useState<boolean>(false);
    const [textModalData, setTextModalData] = useState<GenericModalData>({ title: 'Edit', currentValue: '', onClickSave: (val: string) => console.log(val), label: '' })
    const groupToEdit = useRef<Group>();


    useEffect(() => {
        getGroups();
    }, [, isCreateGroupDialogVisible]);


    const getGroups = async () => {
        let groups = await callMeshModuleFunction('getGroups') as Group[];
        console.log(groups)
        setGroups(groups);
    };

    const toggleExpand = (toggledKey: any) => {
        let updatedGroups = groups.map(group =>
            group.address === toggledKey ? { ...group, expand: !group.expand } : group
        );
        setGroups(updatedGroups);
    };

    const handlePressedEditName = async (group: Group) => {
        setTextModalData({
            title: 'Edit Group Name',
            currentValue: group.name,
            onClickSave: editGroupName,
            label: 'name',
        });
        groupToEdit.current = group;
        setIsTextModalVisible(true);
    };

    const editGroupName = async (newVal: string) => {
        await callMeshModuleFunction('editGroupName', groupToEdit.current!.address, newVal);
        getGroups();
    };

    const handleCreateGroup = async () => {
        setIsCreateGroupDialogVisible(true)
    }

    const removeGroup = async (group: Group) => {
        await callMeshModuleFunction('removeGroup', group.address);
        getGroups();
    }

    const DisplayGroup = ({ group }: { group: Group }) => {
        return (
            <View style={[meshStyles.optionsBox, meshStyles.shadow]}>
                <TouchableOpacity style={[meshStyles.item]} onPress={() => toggleExpand(group.address)}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', flex: 1 }}>
                        <Text style={[meshStyles.subject, { flex: 1 }]} numberOfLines={1} >{group.name}</Text>
                    </View>
                    <Icon name={group.expand ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={20} />
                </TouchableOpacity>
                {
                    (group.expand && (
                        <View style={{ paddingHorizontal: 10, marginBottom: 10 }}>
                            {/* Name */}
                            <View style={[meshStyles.item]}>
                                <View>
                                    <Text style={[meshStyles.topic]}>Name</Text>
                                    <Text style={[styles.text]}>{group.name}</Text>
                                </View>
                                <TouchableOpacity style={{ marginLeft: 10 }} onPress={() => handlePressedEditName(group)}>
                                    <Icon name="edit" size={20} />
                                </TouchableOpacity>
                            </View>
                            <Divider />
                            {/* Address */}
                            <View style={[meshStyles.item]}>
                                <View>
                                    <Text style={[meshStyles.topic]}>Unicast Address</Text>
                                    <Text numberOfLines={1} style={[styles.text, { maxWidth: 200 }]}>0x{group.address.toString(16).padStart(4, '0')}</Text>
                                </View>

                            </View>

                            {/* Remove Group */}
                            <TouchableOpacity style={[styles.row, { justifyContent: 'center', alignContent: 'center', alignItems: 'center' }]} onPress={() => removeGroup(group)}>
                                <Text style={[meshStyles.textButton, { marginRight: 5, color: Colors.primary }]}>Remove Group</Text>
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
            <Text style={meshStyles.title}>Network Groups</Text>
            <ScrollView >
                {groups.map((group, index) => {
                    return <DisplayGroup group={group} key={index} />;
                })}

                {groups.length == 0 && (
                    <Text>No groups in your network, click on "Create Group" to create new group.</Text>
                )}

            </ScrollView>

            <TouchableOpacity
                style={meshStyles.fab}
                onPress={handleCreateGroup}
            >
                <MaterialCommunityIcons
                    name="plus-thick"
                    size={23}
                    color="white"
                    style={{ marginRight: 8 }}
                />
                <Text style={[meshStyles.fabText]}>Create Group</Text>
            </TouchableOpacity>

            <GenericMeshModal
                setModalVisible={setIsTextModalVisible}
                visible={isTextModalVisible}
                title={textModalData.title}
                currentValue={textModalData.currentValue}
                onClickSave={textModalData.onClickSave}
                label={textModalData.label}
            />

            <CreateGroupDialog
                setModalVisible={setIsCreateGroupDialogVisible}
                visible={isCreateGroupDialogVisible}
                groups={groups}
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
export default BleMeshGroups;
