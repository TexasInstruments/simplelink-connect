import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../../Themed';
import React from 'react';
import Colors from '../../../constants/Colors';
import { useNavigation } from '@react-navigation/native';

interface Props {
    isRunning: boolean;
    stopTest: any;
    runAgain: any;
    isGattTestingOnly: boolean;
}

const ActionButtons: React.FC<Props> = ({
    isRunning, stopTest, runAgain, isGattTestingOnly
}: Props) => {
    const navigation = useNavigation();
    return (
        <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 }}>
            <TouchableOpacity
                onPress={isRunning ? stopTest : runAgain}
                style={[{
                    ...styles.button,
                }]}>
                <Text style={[{ ...styles.text }]}>{isRunning ? 'Stop' : 'Run Again'}</Text>
            </TouchableOpacity>
            {!isRunning && (
                <TouchableOpacity
                    onPress={() => navigation.navigate('TestResultsScreen', { isGattTestingOnly: isGattTestingOnly })}
                    style={[{
                        ...styles.button,

                    }]}>
                    <Text style={[{ ...styles.text }]}>{'View Results'}</Text>
                </TouchableOpacity>

            )}
        </View>
    );
};

const styles = StyleSheet.create({
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        borderWidth: 0.5,
        borderColor: Colors.blue,
        marginHorizontal: 20,
        height: 40,
        flex: 1,
    },
    text: {
        fontSize: 18,
        lineHeight: 21,
        color: Colors.blue,
    },
});

export default ActionButtons;