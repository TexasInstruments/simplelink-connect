import { StyleSheet, useWindowDimensions } from 'react-native'
import React from 'react';
import Colors from '../../constants/Colors';
import { TextInput } from 'react-native-paper';

interface Props {
    label: string;
    value: string;
    onChangeText: any;
    onSubmitEditing?: any;
    keyboardType?: 'default' | 'numeric';
}

const TextInputFeild: React.FC<Props> = ({
    label, value, onChangeText, onSubmitEditing, keyboardType
}: Props) => {
    if (!keyboardType) keyboardType = 'default';
    const { fontScale } = useWindowDimensions();
    const styles = makeStyles(fontScale);
    return (
        <TextInput
            editable
            keyboardType={keyboardType}
            mode='outlined'
            style={[styles.textInput]}
            label={label}
            value={value}
            onChangeText={onChangeText}
            underlineColor="gray"
            activeOutlineColor={Colors.active}
            testID='newAddressInput'
            accessibilityLabel='newAddressInput'
            returnKeyType='send'
            onSubmitEditing={onSubmitEditing}
            allowFontScaling
        />
    );
};

const makeStyles = (fontScale: number) => StyleSheet.create({
    textInput: {
        borderColor: 'gray',
        borderRadius: 0,
        backgroundColor: 'white',
        marginBottom: 15,
        fontSize: 16 / fontScale,
    },
});

export default TextInputFeild;