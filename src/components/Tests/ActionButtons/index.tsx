import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../../Themed';
import React from 'react';
import Colors from '../../../constants/Colors';

interface Props {
    isRunning: boolean;
    stopTest: any;
    handleExportLogs: any;
    handleExportResults: any;
    runAgain: any;
}

const ActionButtons: React.FC<Props> = ({
    isRunning, stopTest, handleExportLogs, handleExportResults, runAgain
}: Props) => {
    return (
        <View style={{}}>

            <TouchableOpacity
                onPress={isRunning ? stopTest : runAgain}
                style={[{
                    ...styles.button,
                    borderWidth: 0.5,
                    borderColor: Colors.blue,
                    marginHorizontal: 30,
                    height: 40,
                }]}>
                <Text style={[{ ...styles.text, marginRight: 8 }]}>{isRunning ? 'Stop' : 'Run Again'}</Text>
            </TouchableOpacity>

            <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 20, marginHorizontal: 30, }}>
                <TouchableOpacity
                    disabled={isRunning}
                    onPress={handleExportLogs}
                    style={[{
                        ...styles.button,
                        opacity: isRunning ? 0.4 : 1,
                    }]}>
                    <Text style={[{ ...styles.text }]}>Download Logs</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    disabled={isRunning}
                    onPress={handleExportResults}
                    style={[{
                        ...styles.button,
                        opacity: isRunning ? 0.4 : 1
                    }]}
                    testID='RunTestButton'
                    accessibilityLabel='RunTestButton'
                >
                    <Text style={[{ ...styles.text }]}>Download Results</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        borderRadius: 4,
    },
    text: {
        fontSize: 18,
        lineHeight: 21,
        color: Colors.blue,
    },
});

export default ActionButtons;