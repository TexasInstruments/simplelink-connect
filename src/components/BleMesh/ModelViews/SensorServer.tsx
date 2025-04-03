import React, { useEffect } from 'react';
import { useState } from 'react';
import { NativeEventEmitter, NativeModules, StyleSheet } from 'react-native';
import { Text, TouchableOpacity, View } from '../../Themed';
import { callMeshModuleFunction, meshStyles } from '../meshUtils';
import Colors from '../../../constants/Colors';


export interface SensorInfo {
    propertyName: string;
    propertyValue: string;
    timestamp: string;
}

export const SensorServer: React.FC<{ boundApplicationsKeys: number[], unicastAddr: number }> = ({ boundApplicationsKeys, unicastAddr }) => {

    const { MeshModule } = NativeModules;
    const bleMeshEmitter = new NativeEventEmitter(MeshModule);

    const [sensorInformation, setSensorInformation] = useState<SensorInfo[]>([]);

    const dateOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    const handleSensorGet = (message: any) => {
        let newInfo: SensorInfo = {
            ...message,
            timestamp: new Date().toLocaleTimeString('en-GB', dateOptions)
        }
        setSensorInformation(prev => [...prev, newInfo]);
        bleMeshEmitter.removeAllListeners('onSensorGet');

    }

    const getSensorInformation = () => {
        bleMeshEmitter.addListener('onSensorGet', handleSensorGet);

        callMeshModuleFunction('sendSensorGet', unicastAddr);
    }

    return (

        <View style={{ marginBottom: 20, backgroundColor: Colors.lightGray }}>
            <View style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'row', backgroundColor: Colors.lightGray }}>
                <Text style={[styles.title]}>Sensor Information</Text>
                <TouchableOpacity onPress={getSensorInformation} disabled={boundApplicationsKeys.length === 0}>
                    <Text style={[meshStyles.textButton, { opacity: boundApplicationsKeys.length === 0 ? 0.4 : 1 }]}>Get</Text>
                </TouchableOpacity>
            </View>
            {
                sensorInformation.length === 0 && (
                    <View style={[styles.dataContainer,]}>
                        <Text style={[styles.name]}>None</Text>
                    </View>
                )
            }
            {
                sensorInformation.map((info, index) => {
                    return (
                        <View style={[styles.dataContainer, { marginBottom: 5 }]} key={index}>
                            <View style={{ display: 'flex', flexDirection: 'column' }}>
                                <Text style={[styles.name]}>{info.propertyName}</Text>
                                <Text style={[styles.val]}>{info.propertyValue}</Text>
                            </View>
                            <Text style={[styles.val]}>{info.timestamp}</Text>
                        </View>
                    );
                })
            }
        </View>

    )
};


const styles = StyleSheet.create({
    dataContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        marginBottom: 25,
        paddingHorizontal: 20,
        paddingVertical: 10,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: {
        fontWeight: '500',
        fontSize: 16,
        marginBottom: 10
    },
    name: {
        fontSize: 16
    },
    val: {
        fontWeight: '200',
        fontSize: 14
    }
});