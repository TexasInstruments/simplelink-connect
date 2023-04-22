import { StyleSheet } from 'react-native';
import BleScanner from '../src/components/BleScanner';
import { useEffect } from 'react';
import { Icon } from '@rneui/themed';
import { TouchableOpacity, View } from '../components/Themed';

export default function ScanScreen({ navigation, route }: any) {
  useEffect(() => {
    navigation.setOptions({
      headerRight() {
        return (
          <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
            <Icon
              name="dots-vertical"
              type="material-community"
              color={'black'}
              size={26}
              style={{ paddingRight: 15 }}
            />
          </TouchableOpacity>
        );
      },
    });
  }, []);

  return (
      <BleScanner navigation={navigation} route={route} />
  );
}
