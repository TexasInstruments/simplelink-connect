import React, { useEffect, useState } from 'react';
import {
    Text,
    TouchableOpacity,
    StyleSheet,
    View,
    ScrollView,
    NativeEventEmitter,
    NativeModules,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { callMeshModuleFunction, Group, meshStyles, Model, Element } from '../../meshUtils';
import Colors from '../../../../constants/Colors';
import { MaterialCommunityIcons, MaterialIcons, Octicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TextInput } from 'react-native-paper';
import ModelSelectionList from '../ModelSelectionList';
import StatusesPopup from '../StatusesPopup';

export interface NetworkKey {
    expand?: boolean;
    index: number;
    key: string;
    name: string;
    timestamp: string;
}


const BleMeshSubscribeModelsScreen: React.FC = ({ route }) => {
    const { MeshModule } = NativeModules;
    const bleMeshEmitter = new NativeEventEmitter(MeshModule);
    const { unicastAddr, elements } = route.params;

    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [selectedAddress, setSelectedAddress] = useState<string>();
    const [selectedModels, setSelectedModels] = useState<{ modelId: number, elementId: number, modelType: string }[]>([]);
    const [isVisible, setIsVisible] = useState(false);
    const [results, setResults] = useState<{ task: string, success: boolean }[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [useExistingGroup, setUseExistingGroup] = useState<boolean>(true);
    const [newGroupName, setNewGroupName] = useState<string>('My Group');
    const [newGroupAddress, setNewGroupAddress] = useState<string>('');

    const navigation = useNavigation();

    useEffect(() => {
        const listener = bleMeshEmitter.addListener('onSubscriptionDone', handleSubscribeDone);
        setLoading(false);

        getGroups();
        checkConnectionStatus();

        return () => {
            listener.remove();
        };
    }, []);

    const checkConnectionStatus = async () => {
        try {
            let isConnected = await callMeshModuleFunction('isDeviceConnected', unicastAddr) as boolean;
            if (!isConnected) {
                Alert.alert("Device disconnected")
                navigation.navigate('BleMesh')
            }

        } catch (e) {
            console.error(e)
        }

    };

    const generateGroupAddress = async () => {
        let address = await callMeshModuleFunction('generateGroupAddress', newGroupName) as number;
        if (address !== -1) {
            setNewGroupAddress(address.toString(16));
        }
    };

    const handleSubscribeDone = (data: any) => {
        getGroups();
        setResults(data);
        setIsVisible(true);
        setLoading(false);
    };

    const getGroups = async () => {
        let groups = await callMeshModuleFunction('getGroups') as Group[];
        setGroups(groups);
        generateGroupAddress();
        setNewGroupName('My Group ' + (groups.length + 1));

        if (groups.length <= 0) {
            setUseExistingGroup(false);
        }
        else {
            setSelectedGroup(groups[0]);
            setUseExistingGroup(true);
        }
    };

    const handleSubscribeModels = async () => {
        try {
            setLoading(true);
            let address = selectedAddress;

            if (!useExistingGroup) {
                if (!/^[0-9A-Fa-f]{1,4}$/.test(newGroupAddress)) {
                    alert("Invalid group address! Must be a hex value (0xC000 - 0xFEFF).");
                    setLoading(false);
                    return;
                }

                const parsedAddress = parseInt(newGroupAddress, 16);
                if (isNaN(parsedAddress)) {
                    alert("Invalid group address! ");
                    setLoading(false);
                    return;
                }

                let res = await callMeshModuleFunction('createNewGroup', newGroupName, parseInt(newGroupAddress, 16)) as { success: boolean, address: number, error?: string };
                if (res.success) {
                    address = res.address.toString(16);
                    setSelectedAddress(address);
                }
                else {
                    Alert.alert("Error creating new group!", res.error || "");
                    setLoading(false);
                    return
                }
            }
            else {
                if (selectedGroup) {
                    address = selectedGroup?.address.toString(16);
                    setSelectedAddress(address);
                }
            }
            await callMeshModuleFunction('subscribeModels', unicastAddr, address, selectedModels);
        } catch (err) {
            Alert.alert(err.toString());
        }
    }

    const disabledModels = () => {
        let disabledModels: Model[] = []
        elements.map((element: Element) => {
            element.models.map((model) => {
                if (!model.isSubscribeSupported) {
                    disabledModels.push(model)
                }
            })
        })
        return disabledModels
    }

    return (
        <SafeAreaView
            style={meshStyles.container} edges={['left', 'right', 'bottom']}
        >
            <Text style={meshStyles.title}>Models Subscriptions</Text>

            <ScrollView style={{ height: '100%' }} contentContainerStyle={{ paddingBottom: 50 }}>
                <View style={{ flexDirection: 'column' }}>
                    <Text style={[styles.label, { marginBottom: 5 }]}>Select Groups to subscribe the models to </Text>
                    <View style={{ marginBottom: 20, }}>
                        {
                            !(groups.length > 0) && (
                                <Text style={{ marginBottom: 5, fontWeight: '600', color: Colors.gray, fontSize: 14 }}>There are no groups in your network, please create one</Text>
                            )
                        }
                        <View>
                            {groups.length > 0 && (
                                <>
                                    <View style={[styles.radioButtonContainer]}>
                                        <TouchableOpacity onPress={() => setUseExistingGroup(!useExistingGroup)}>
                                            {useExistingGroup ? (
                                                <MaterialCommunityIcons name="check-circle" size={20} color={Colors.blue} style={styles.checkIcon} />
                                            ) : (
                                                <MaterialIcons name="circle" size={20} color='white' style={styles.checkIcon} />
                                            )}
                                        </TouchableOpacity>
                                        <Text>Use existing group</Text>
                                    </View>

                                    {
                                        useExistingGroup && (
                                            <Dropdown
                                                style={[meshStyles.dropdown, { marginLeft: 30, backgroundColor: 'white', borderWidth: 0, marginBottom: 10 }]}
                                                placeholderStyle={meshStyles.placeholderStyle}
                                                selectedTextStyle={meshStyles.selectedTextStyle}
                                                data={groups}
                                                maxHeight={200}
                                                labelField="name"
                                                valueField="address"
                                                placeholder='Select group'
                                                value={selectedGroup}
                                                onChange={(item) => {
                                                    setSelectedGroup(item);
                                                }}
                                            />
                                        )
                                    }
                                </>
                            )}

                            <View style={[styles.radioButtonContainer]}>
                                <TouchableOpacity onPress={() => setUseExistingGroup(!useExistingGroup)}>
                                    {!useExistingGroup ? (
                                        <MaterialCommunityIcons name="check-circle" size={20} color={Colors.blue} style={styles.checkIcon} />
                                    ) : (
                                        <MaterialIcons name="circle" size={20} color='white' style={styles.checkIcon} />
                                    )}
                                </TouchableOpacity>
                                <Text>Create new group to subscribe</Text>
                            </View>
                            {
                                !useExistingGroup && (
                                    <View style={{ marginLeft: 30 }}>
                                        <TextInput
                                            mode='flat'
                                            label={'Name'}
                                            style={[styles.textInput]}
                                            value={newGroupName}
                                            onChangeText={setNewGroupName}
                                            underlineColor="gray"
                                            activeUnderlineColor={Colors.active}
                                        />

                                        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                            <Text>0x</Text>
                                            <TextInput
                                                mode='flat'
                                                label={'Group Address'}
                                                style={[styles.textInput, { marginLeft: 5, marginBottom: 0, flex: 1 }]}
                                                value={newGroupAddress}
                                                onChangeText={(text) => {
                                                    const hexOnly = text.replace(/[^0-9A-Fa-f]/g, ""); // Remove non-hex characters
                                                    setNewGroupAddress(hexOnly);
                                                }}
                                                underlineColor="gray"
                                                activeUnderlineColor={Colors.active}
                                            />
                                        </View>
                                    </View>
                                )
                            }
                        </View>
                    </View>

                </View>

                <View style={{ flexDirection: 'column' }}>
                    <Text style={styles.label}>Select Models</Text>
                    <ModelSelectionList elements={elements} disabledModels={disabledModels()} selectedModels={selectedModels} setSelectedModels={setSelectedModels} />

                </View>
            </ScrollView>


            {loading ? (
                <TouchableOpacity
                    style={meshStyles.fab}
                    disabled
                >
                    <ActivityIndicator size={25} color="white" />

                </TouchableOpacity>

            ) : (
                <TouchableOpacity
                    style={[meshStyles.fab, { opacity: selectedModels.length == 0 ? 0.3 : 1 }]}
                    onPress={handleSubscribeModels}
                    disabled={selectedModels.length == 0}
                >
                    <MaterialCommunityIcons
                        name="check-all"
                        size={23}
                        color="white"
                        style={{ marginRight: 8 }}
                    />
                    <Text style={[meshStyles.fabText]}>Subscribe</Text>
                </TouchableOpacity>
            )}
            <StatusesPopup results={results} isVisible={isVisible} setIsVisible={setIsVisible} title={'Subscription Completed'} unicastAddr={unicastAddr} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    label: {
        fontSize: 16,
        marginBottom: 10,
        fontWeight: '500',
    },
    textInput: {
        borderColor: 'gray',
        borderRadius: 8,
        backgroundColor: 'white',
        marginBottom: 15,
        fontSize: 14,
    },
    radioButtonContainer: {
        display: 'flex',
        flexDirection: 'row',
        marginBottom: 10,
        alignItems: 'center'
    },
    checkIcon: {
        marginRight: 10,
        borderColor: 'black',

    }
});

export default BleMeshSubscribeModelsScreen;
