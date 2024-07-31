/*
 * Copyright (c) 2023, Texas Instruments Incorporated
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * *  Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *
 * *  Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * *  Neither the name of Texas Instruments Incorporated nor the names of
 *    its contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { TouchableOpacity, View } from '../components/Themed';
import { Text } from '../components/Themed';
import { TextInput as Input, StyleSheet, Image, useWindowDimensions, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import Colors from '../constants/Colors';
import Icon from 'react-native-vector-icons/Ionicons';
import { Divider } from 'react-native-paper';

interface Props extends DrawerContentComponentProps { }

const SettingsModal: React.FC<Props> = ({ navigation }) => {
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  const { fontScale } = useWindowDimensions();

  useEffect(() => {
    let checkTutorial = async () => {
      try {
        let data = await AsyncStorage.getItem('@tutorial');

        if (!data) throw Error('Tutorial shown!');

        setShowTutorial(true);
      } catch (error) {
        setShowTutorial(false);
      }
    };

    checkTutorial();
  }, []);

  const changeTutorialState = async (value: boolean) => {

    if (value) {
      setShowTutorial(value);
      await AsyncStorage.setItem('@tutorial', JSON.stringify(true));
      return;
    } else {
      setShowTutorial(value);
      await AsyncStorage.removeItem('@tutorial');
      return;
    }
  };

  function handleTesting() {
    navigation.navigate('IopParameters', { testService: null, peripheralId: null, peripheralName: null });
    navigation.closeDrawer();
  }

  const handleNavigation = (screen: string) => {
    navigation.navigate(screen);
    navigation.closeDrawer();
  };


  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            <Image source={require('../assets/images/icon-app.png')} style={styles.image} />
          </View>

          <Text style={styles.description}>
            This application connects your SimpleLink(TM) devices to your smartphone with Bluetooth Low Energy support.
          </Text>

          <View style={styles.menu}>
            <Divider />

            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('FilterSortOptions')}>
              <Icon name="filter" size={25} color={Colors.blue} style={styles.icon} />
              <Text style={[styles.menuText, { fontSize: 16 / fontScale, }]}>Filter and Sort Options</Text>
            </TouchableOpacity>
            <Divider />

            <TouchableOpacity style={styles.menuItem} onPress={handleTesting}>
              <Icon name="flask" size={25} color={Colors.blue} style={styles.icon} />
              <Text style={[styles.menuText, { fontSize: 16 / fontScale, }]}>Enter Stress Test Mode</Text>
            </TouchableOpacity>
            <Divider />

            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigation('ConfigRepository')}>
              <Icon name="git-network-outline" size={25} color={Colors.blue} style={styles.icon} />
              <Text style={[styles.menuText, { fontSize: 16 / fontScale, }]}>Config OAD Repository</Text>
            </TouchableOpacity>
            <Divider />
            <View style={[styles.menuItem]} >
              <Text style={{ fontSize: 16 / fontScale }}>Skip tutorial at start:</Text>
              <View style={{ marginLeft: 'auto' }}>
                <Switch
                  value={showTutorial}
                  onValueChange={(value) => {
                    changeTutorialState(value);
                  }}
                />
              </View>
            </View>
          </View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}><Text style={{ color: Colors.blue }}>Version: </Text>1.3.6</Text>
          <Text style={styles.footerText}><Text style={{ color: Colors.blue }}>Developed by: </Text>Texas Instruments</Text>
          <Text style={styles.footerText}><Text style={{ color: Colors.blue }}>Credits: </Text>Tony Cave (Bluwbee LTD)</Text>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    marginHorizontal: 10,
  },
  imageContainer: {
    marginTop: 15,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  image: {
    width: '100%',
    height: undefined,
    aspectRatio: 19 / 3,
    resizeMode: 'contain',
  },
  description: {
    textAlign: 'center',
    marginBottom: 20,
  },
  menu: {
    marginTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    // borderBottomColor: Colors.lightGray,
    // borderBottomWidth: 1,
    height: 80,
  },
  menuText: {
    color: Colors.blue,
    marginLeft: 10,
  },
  icon: {
    width: 30,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    textAlign: 'center',
    paddingTop: 10,
    fontSize: 14,
  },
});

export default SettingsModal;
