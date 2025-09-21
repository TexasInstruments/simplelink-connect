import { Text, TouchableOpacity } from '../Themed';
import { StyleSheet, NativeModules, View, NativeEventEmitter, InteractionManager, EmitterSubscription, Alert, Platform } from 'react-native';
import Colors from '../../constants/Colors';
import { useCallback, useRef, useState, } from 'react';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { FAB } from 'react-native-paper';
import { ApplicationKey, callMeshModuleFunction, Feature, MeshNode, meshStyles } from './meshUtils';
import { GenericMeshModal } from './GenericMeshModal';
import { ScrollView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BleMesh: React.FC = () => {

    const { MeshModule } = NativeModules;
    const bleMeshEmitter = new NativeEventEmitter(MeshModule);

    let navigation = useNavigation();
    let initialFocus = useRef<boolean>(true);

    const [netName, setNetName] = useState('');
    const [netTimestamp, setNetTimestamp] = useState('');
    const [nodes, setNodes] = useState([]);
    const [isEditNameModalVisible, setIsEditNameModalVisible] = useState<boolean>(false);

    useFocusEffect(
        useCallback(() => {
            let networkListener: EmitterSubscription;
            const task = InteractionManager.runAfterInteractions(async () => {
                networkListener = bleMeshEmitter.addListener('onNetworkLoaded', handleNetworkLoaded);

                // connect to proxy if needed
                let autoConnect = await AsyncStorage.getItem('@proxyAutoConnect');
                callMeshModuleFunction('updateAutomaticConnection', autoConnect === 'true');

                if (initialFocus.current) {
                    console.log('focused');
                    initialFocus.current = false;
                } else {
                }
                try {
                    callMeshModuleFunction('loadMeshNetwork');
                } catch (error) {
                    console.error(error);
                }

            });

            return () => {
                console.log('unfocused');
                bleMeshEmitter.removeAllListeners('onNetworkLoaded');
                task.cancel();
            };
        }, [])
    );

    const onAddNodePressed = async () => {
        const keys = await callMeshModuleFunction('getMeshApplicationsKeys') as ApplicationKey[];
        if (!keys || keys.length == 0) {
            Alert.alert('Error', 'Please add at least one application key to network before provisioning node.', [
                {
                    text: 'OK',
                    onPress: async () => navigation.navigate('BleMeshApplicationKeys'),
                    style: 'destructive',
                },
                { text: 'Cancel', onPress: () => console.log('Cancel Pressed') },
            ]);
        }
        else {
            navigation.navigate('BleMeshScanner', { scanProvisionedNodes: false, unicastAddr: undefined })
        }
    }

    const handleNetworkLoaded = async () => {
        let networkName;
        networkName = await callMeshModuleFunction('getMeshNetworkName') as string;

        setNetName(networkName);

        let nodes = await callMeshModuleFunction('getProvisionedMeshNodes');
        console.log(nodes)
        if (nodes) {
            setNodes(nodes);
        }

        let timestamp = await callMeshModuleFunction('getMeshNetworkTimestamp');
        // Convert the timestamp to a Date object
        let date;
        if (Platform.OS === 'android') {
            date = new Date(Number(timestamp));
        }
        else {
            date = new Date(timestamp * 1000);;

        }

        // Define formatting options
        const options = {
            weekday: 'long',       // e.g., "Monday"
            year: 'numeric',       // e.g., "2023"
            month: 'long',         // e.g., "October"
            day: '2-digit',        // e.g., "07"
            hour: '2-digit',       // e.g., "05"
            minute: '2-digit',     // e.g., "23"
            second: '2-digit',     // e.g., "45"
            hour12: false          // Use 24-hour format
        };

        // Format the date
        const formattedDate = date.toLocaleString('en-US', options);
        setNetTimestamp(formattedDate);

    };

    const DisplayNode = ({ node }: { node: MeshNode }) => {
        return (
            <View style={[styles.node, meshStyles.shadow]}>
                <View style={[styles.row, { justifyContent: 'space-between' }]}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.nodeName} numberOfLines={2} ellipsizeMode="tail">
                            {node.name ?? "Unknown"}
                        </Text>
                        <Text style={styles.nodeCompany}>{node.company}</Text>
                    </View>
                    <View style={styles.featureList}>

                        {node.features.map((value, index) => {
                            return <Feature feature={value} key={index} />
                        })}
                    </View>
                </View>
                <View style={[styles.row, { justifyContent: 'space-between' }]}>

                    <View style={{ display: 'flex', flexDirection: 'column', width: "60%", marginTop: 10, justifyContent: 'space-between' }}>
                        <View style={[styles.row, { justifyContent: 'space-between' }]}>
                            <Text style={styles.topic}>Unicast Address</Text>
                            <Text>0x{node.unicastAddress.toString(16).toLocaleUpperCase()}</Text>
                        </View>
                        <View style={[styles.row, { justifyContent: 'space-between' }]}>
                            <Text style={styles.topic}>Elements</Text>
                            <Text>{node.numberOfElements}</Text>

                        </View>
                        <View style={[styles.row, { justifyContent: 'space-between' }]}>
                            <Text style={styles.topic}>Models</Text>
                            <Text>{node.numberOfModels}</Text>

                        </View>
                    </View>
                    <FAB
                        icon="arrow-right"
                        style={[styles.button, { width: 40, alignSelf: 'flex-end' }]}
                        onPress={() => navigation.navigate('BleMeshConfigureNode', { unicastAddr: node.unicastAddress, isConnecting: false })}
                        size={'small'}
                        color='black'
                    />
                </View>
            </View>
        )
    };

    const onEditNetName = async (newName: string) => {
        try {
            await callMeshModuleFunction('setMeshNetworkName', newName);
            let networkName = await callMeshModuleFunction('getMeshNetworkName') as string;

            setNetName(networkName);

        } catch (err) { console.error(err); }
    };

    return (
        <View style={styles.container}>
            <View style={styles.titleContainer}>
                <Text style={styles.title} numberOfLines={1}>{netName}</Text>
                <Icon name="edit" size={30} onPress={() => setIsEditNameModalVisible(true)} />
            </View>
            <Text style={styles.subtitle}>Last update: {netTimestamp}</Text>

            {!nodes.length && (
                <Text style={{ marginTop: 50, marginBottom: 50 }}> No nodes in your network</Text>
            )}
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {nodes.map((node, index) => {
                    return <DisplayNode node={node} key={index} />
                })}

                <TouchableOpacity
                    style={[meshStyles.button, meshStyles.shadow, { backgroundColor: 'white' }]}
                    onPress={onAddNodePressed}
                >
                    <Text style={styles.addButtonText}>Add node</Text>
                </TouchableOpacity>

            </ScrollView>


            <GenericMeshModal
                setModalVisible={setIsEditNameModalVisible}
                visible={isEditNameModalVisible}
                title={'Edit Network Name'}
                currentValue={netName}
                onClickSave={onEditNetName}
                label='Network Name'
            />
        </View >

    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: Colors.lightGray,
        height: '100%'
    },
    title: {
        fontSize: 24,
        // flex: 1,
        alignItems: 'center',
        fontWeight: '500',
        marginRight: 10,
        alignSelf: 'center',
    },
    subtitle: {
        color: Colors.gray,
        fontWeight: '500',
        alignSelf: 'center',
        marginBottom: 30

    },
    titleContainer: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    row: {
        display: 'flex',
        flexDirection: 'row',
    },
    nodeName: {
        fontSize: 20,
        flexWrap: 'wrap',
        fontWeight: 'bold',
    },
    nodeCompany: {
        fontSize: 14,
        fontWeight: '500',
    },
    node: {
        backgroundColor: 'white',
        marginBottom: 14,
        borderRadius: 20,
        padding: 20,
    },
    topic: {
        fontWeight: '200',
    },
    featureAvatar: {
        width: 30,
        height: 30,
        marginLeft: -6,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureText: {
        color: 'white',
        fontSize: 17,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    featureList: {
        display: 'flex',
        flexDirection: 'row',
    },
    button: {
        backgroundColor: 'white',
        borderRadius: 50,
    },
    addButton: {
        height: 40,
        width: '40%',
        marginTop: 10,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 30,
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 2,
        backgroundColor: 'white',
    },
    addButtonText: {
        color: Colors.blue,
        fontSize: 16,
    },
});

export default BleMesh;
