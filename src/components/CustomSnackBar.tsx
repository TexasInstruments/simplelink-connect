import { Text, TouchableOpacity } from './Themed';
import { View } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { Icon } from '@rneui/base';

interface Props {
    isVisible: boolean;
    close: any;
    success: boolean;
    message: string;
    duration?: number;
}

export const CustomSnackBar: React.FC<Props> = ({ isVisible, close, success, message, duration }) => {

    return (
        <Snackbar
            visible={isVisible}
            onDismiss={close}
            duration={duration ? duration : 5000}
            elevation={5}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Icon name={success ? "check" : "error"} size={24} color={success ? "#00FF91" : "#FF5F5F"} />
                    <Text allowFontScaling adjustsFontSizeToFit numberOfLines={3} style={{ marginLeft: 8, flex: 1, color: success ? "#00FF91" : "#FF5F5F", fontWeight: 'bold' }}>{message}</Text>
                </View>
                <TouchableOpacity onPress={close}>
                    <Icon name="close" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </Snackbar>
    )

}

