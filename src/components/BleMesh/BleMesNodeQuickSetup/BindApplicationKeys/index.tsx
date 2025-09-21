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
import { ApplicationKey, callMeshModuleFunction, meshStyles, Model, Element } from '../../meshUtils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ModelSelectionList from '../ModelSelectionList';
import StatusesPopup from '../StatusesPopup';

export interface NetworkKey {
    expand?: boolean;
    index: number;
    key: string;
    name: string;
    timestamp: string;
}


const BleMeshBindAppKeysScreen: React.FC = ({ route }) => {
    const { MeshModule } = NativeModules;
    const bleMeshEmitter = new NativeEventEmitter(MeshModule);
    const { unicastAddr, elements }: { unicastAddr: number, elements: Element[] } = route.params;

    const [applicationKeys, setApplicationKeys] = useState<ApplicationKey[]>([]);
    const [selectedApplicationKeyIdx, setSelectedApplicationKeyIdx] = useState<number | null>(null);
    const [selectedModels, setSelectedModels] = useState<{ modelId: number, elementId: number, modelType: string }[]>([]);
    const [isVisible, setIsVisible] = useState(false);
    const [results, setResults] = useState<{ task: string, success: boolean }[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    const navigation = useNavigation();

    useEffect(() => {
        const listener = bleMeshEmitter.addListener('onBindAppKeysDone', handleBindDone);
        getApplicationKeys();
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

    const handleBindDone = (data: any) => {
        setResults(data);
        setIsVisible(true);
        setLoading(false);
    };

    const getApplicationKeys = async () => {
        const keys = await callMeshModuleFunction('getMeshApplicationsKeys') as ApplicationKey[];
        setApplicationKeys(keys);
        setSelectedApplicationKeyIdx(keys[0].index);
    };

    const handleBindModels = async () => {
        setLoading(true);
        await callMeshModuleFunction('bindAppKeyToModels', unicastAddr, selectedApplicationKeyIdx, selectedModels);
    }

    const disabledModels = () => {
        let disabledModels: Model[] = []
        elements.map((element) => {
            element.models.map((model) => {
                if (!model.isBindingSupported) {
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
            <Text style={meshStyles.title}>Bind Application Keys</Text>

            <ScrollView style={{ height: '100%' }} contentContainerStyle={{ paddingBottom: 50 }}>
                <View style={{ flexDirection: 'column' }}>
                    <Text style={styles.label}>Select Application Key</Text>
                    <Dropdown
                        style={[meshStyles.dropdown, { flex: undefined, backgroundColor: 'white', borderWidth: 0 }]}
                        placeholderStyle={meshStyles.placeholderStyle}
                        selectedTextStyle={meshStyles.selectedTextStyle}
                        data={applicationKeys}
                        maxHeight={200}
                        labelField="name"
                        valueField="index"
                        placeholder=""
                        value={selectedApplicationKeyIdx}
                        onChange={(item) => setSelectedApplicationKeyIdx(item.index)}
                    />
                </View>

                <View style={{ flexDirection: 'column' }}>
                    <Text style={styles.label}>Select Models To Bind</Text>
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
                    onPress={handleBindModels}
                    style={[meshStyles.fab, { opacity: selectedModels.length == 0 ? 0.3 : 1 }]}
                    disabled={selectedModels.length == 0}
                >
                    <MaterialCommunityIcons
                        name="check-all"
                        size={23}
                        color="white"
                        style={{ marginRight: 8 }}
                    />
                    <Text style={[meshStyles.fabText]}>Bind</Text>
                </TouchableOpacity>)}
            <StatusesPopup unicastAddr={unicastAddr} results={results} isVisible={isVisible} setIsVisible={setIsVisible} title={'Binding Completed'} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    label: {
        fontSize: 16,
        marginBottom: 10,
        fontWeight: '500',
    }
});

export default BleMeshBindAppKeysScreen;
