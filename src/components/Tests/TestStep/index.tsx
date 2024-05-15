import { View, StyleSheet } from 'react-native';
import { Text } from '../../Themed';
import React from 'react';
import Colors from '../../../constants/Colors';
import * as Progress from 'react-native-progress';

interface Props {
    stepName: string;
    desc?: string;
    progress?: number;
    totalRounds: number;
    currentRound: number;
}

const TestStep: React.FC<Props> = ({
    stepName, desc, progress, currentRound, totalRounds
}) => {
    return (
        <View style={[styles.box]}>
            <View style={[styles.textContainer]}>
                <Text style={[styles.title]}>
                    {stepName} ({currentRound}/{totalRounds})
                </Text>

                <Text style={[styles.desc]}>
                    {desc}
                </Text>
            </View>
            <View>
                <Progress.Circle
                    size={50}
                    progress={progress}
                    showsText={true}
                    textStyle={{ fontSize: 14 }}
                    color={Colors.active}
                    borderWidth={0} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    title: {
        fontSize: 15,
        lineHeight: 25,
        fontWeight: 'bold',
        letterSpacing: 0.25,
    },
    textContainer: {
        maxWidth: '80%'
    },
    desc: {
        fontSize: 13,
        letterSpacing: 0.25,
    },
    box: {
        borderRadius: 22,
        backgroundColor: Colors.lightGray,
        minHeight: 60,
        paddingVertical: 6,
        marginBottom: 8,
        paddingHorizontal: 16,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    header: {
        backgroundColor: Colors.lightGray,
        padding: 10,
        alignItems: 'center',
        shadowColor: 'rgba(0,0,0,0.4)',
        shadowOffset: {
            height: 1,
            width: 0,
        },
        shadowOpacity: 1,
        shadowRadius: 3,
        elevation: 5,

    }
});

export default TestStep;