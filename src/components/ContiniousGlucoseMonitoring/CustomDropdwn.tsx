import { Text, TouchableOpacity } from '../Themed';
import { Dropdown } from "react-native-element-dropdown";
import { StyleSheet, NativeModules, View } from 'react-native';

interface Props {
    placeholder?: string, data: Array<{ value: number, desc: string }>, value: any, setter: (value: number) => void
}

export const CustomDropdwn: React.FC<Props> = ({ placeholder, data, value, setter }) => {

    return (
        <View style={{ width: '100%' }}>
            {placeholder && (
                <Text style={[styles.desc]}>{placeholder}</Text>
            )}
            <Dropdown
                style={[styles.dropdown]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                itemTextStyle={styles.item}
                data={data}
                placeholder={placeholder}
                value={value}
                onChange={(v: any) => {
                    setter(v.value);
                }}
                maxHeight={200}
                labelField="desc"
                valueField="value"
                renderItem={(item) => <Text style={[styles.text]}>{item.desc}</Text>}
            />
        </View>
    )

}

const styles = StyleSheet.create({
    dropdown: {
        // borderWidth: 0.5,
        // borderRadius: 8,
        paddingHorizontal: 8,
        fontSize: 10,
        height: 50,
        // width: '100%',
        marginBottom: 15
    },
    item: {
        paddingHorizontal: 10,
    },
    placeholderStyle: {
        fontSize: 14,
    },
    selectedTextStyle: {
        fontSize: 13,
        // height: 50,
        // textAlignVertical: 'center'
    },
    text: {
        padding: 17,
    },
    desc: {
        fontWeight: 'bold',
        fontSize: 12
    }
})