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

/**
 * If you are not familiar with React Navigation, refer to the "Fundamentals" guide:
 * https://reactnavigation.org/docs/getting-started
 *
 */
import { FontAwesome, AntDesign } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme, DarkTheme, Theme, DrawerActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import * as React from 'react';
import { ColorSchemeName, NativeEventEmitter, NativeModules, Platform, useWindowDimensions } from 'react-native';
import Colors from '../constants/Colors';
import useColorScheme from '../hooks/useColorScheme';
import NotFoundScreen from '../screens/NotFoundScreen';
import ScanScreen from '../screens/ScanScreen';
import DeviceDetailsScreen from '../screens/DeviceDetailsScreen';
import {
  RootDrawerParamList,
  RootStackParamList,
  RootTabParamList,
  RootTabScreenProps,
} from '../../types';
import LinkingConfiguration from './LinkingConfiguration';
import CharacteristicScreen from '../screens/CharacteristicScreen';
import { TouchableOpacity } from '../components/Themed';
import SettingsModal from '../screens/SettingsModal';
import FilterSortProvider from '../context/FilterSortContext';
import FwUpdateServiceModel from '../screens/ServiceSpecificViews/FwUpdateServiceModel';
import TutorialScreen from '../screens/TutorialScreen';
import CharacteristicsSettingsDrawer from '../screens/CharacteristicsSettingsDrawer';
import IopParametersScreen from '../screens/IopTestViews/IopParametersScreen';
import IopTestScreen from '../screens/IopTestViews/IopTestScreen';
import GattTestScreen from '../screens/IopTestViews/GattTestScreen';
import { useCharacteristicViewContext } from '../context/CharactristicViewContext';
import FilterSortOptionsScreen from '../screens/FilterSortOptionsScreen';
import ConfigRepositoryUrlScreen from '../screens/ConfigRepositoryUrlScreen';

let DefaultThemeExtended: Theme = {
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    border: Colors.primary,
    card: Colors.primary,
    text: Colors.light.text,
    primary: Colors.primary,
  },
};

let DarkThemeExtended: Theme = {
  dark: true,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    border: Colors.primary,
    card: Colors.primary,
    text: Colors.dark.text,
    primary: Colors.primary,
  },
};

export default function Navigation({
  colorScheme,
  showTutorial,
}: {
  colorScheme: ColorSchemeName;
  showTutorial: boolean;
}) {
  return (
    <FilterSortProvider>
      <NavigationContainer
        linking={LinkingConfiguration}
        theme={colorScheme === 'dark' ? DarkThemeExtended : DefaultThemeExtended}
      >
        <RootNavigator showTutorial={showTutorial} />
      </NavigationContainer>
    </FilterSortProvider>
  );
}

/**
 * A root stack navigator is often used for displaying modals on top of all other content.
 * https://reactnavigation.org/docs/modal
 */
const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator({ showTutorial }: { showTutorial: boolean }) {
  const { charactristicView, serviceName, hasSpecificScreen, hasTestOption } = useCharacteristicViewContext();
  const { fontScale } = useWindowDimensions();

  return (
    <Stack.Navigator initialRouteName={showTutorial ? 'Tutorial' : 'Root'} id="stack">
      <Stack.Screen name="Root" component={BottomTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="NotFound" component={NotFoundScreen} options={{ title: 'Oops!' }} />
      <Stack.Screen name="Characteristics"
        component={CharacteristicsDrawer}
        options={({ navigation }) => ({
          title: hasSpecificScreen ? (charactristicView === 'advanced' ? 'Characteristic' : serviceName) : 'Characteristic',
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#cc0000',
          },
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={'color'} />,
          headerTintColor: 'white',
          headerTitleStyle: {
            fontSize: 17 / fontScale
          },
          headerShown: true,
          headerLeft: (props) => (
            <TouchableOpacity
              {...props}
              onPress={() => navigation.goBack()}
            >
              <AntDesign name="left" size={24} color="white" />
            </TouchableOpacity>
          ),
          headerRight: () => {
            if (!hasSpecificScreen && !hasTestOption) {
              return null;
            } else {
              return (
                <TouchableOpacity style={{ paddingRight: 15 }} onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}>
                  <FontAwesome name="gear" size={24} color="white" />
                </TouchableOpacity>
              )
            }
          },
        })}
      />
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen
          name="FwUpdateServiceModel"
          component={FwUpdateServiceModel}
          options={{
            title: 'Firmware Update',
            headerTintColor: 'white',
            headerTitleStyle: {
              fontSize: 17 / fontScale
            },
          }}
        />



      </Stack.Group>
      <Stack.Screen name="Tutorial" component={TutorialScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="IopParameters"
        component={IopParametersScreen}
        options={({ navigation }) => ({
          title: 'Stress Test',
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#cc0000',
          },
          headerTitleStyle: {
            fontSize: 17 / fontScale
          },
          headerTintColor: 'white',
          headerLeft: (props) => {
            return (
              //We could use some svg icon
              <TouchableOpacity {...props} onPress={() => navigation.pop()} >
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity>)
          }
        })}
      />
      <Stack.Screen
        name="GattTesting"
        component={GattTestScreen}
        options={({ navigation }) => ({
          title: 'GATT Testing',
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#cc0000',
          },
          headerTitleStyle: {
            fontSize: 17 / fontScale
          },
          headerTintColor: 'white',
          headerLeft: (props) => {
            return (
              //We could use some svg icon
              <TouchableOpacity {...props} onPress={() => navigation.pop()} >
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity>)
          }
        })}
      />

      <Stack.Screen
        name="IopTest"
        component={IopTestScreen}
        options={({ navigation }) => ({
          title: 'Stress Test',
          headerTitleStyle: {
            fontSize: 17 / fontScale
          },
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#cc0000',
          },
          headerTintColor: 'white',
          headerLeft: (props) => {
            return (
              //We could use some svg icon
              <TouchableOpacity {...props} onPress={() => { navigation.pop(); console.log(navigation) }} >
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity>)
          }
        })}
      />
      <Stack.Screen
        name="FilterSortOptions"
        component={FilterSortOptionsScreen}
        options={({ navigation }) => ({
          title: 'Settings',
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#cc0000',
          },
          headerTitleStyle: {
            fontSize: 17 / fontScale
          },
          headerTintColor: 'white',
          headerLeft: (props) => {
            return (
              //We could use some svg icon
              <TouchableOpacity {...props} onPress={() => { navigation.pop(); console.log(navigation) }} >
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity>)
          }
        })}
      />
      <Stack.Screen
        name="ConfigRepository"
        component={ConfigRepositoryUrlScreen}
        options={({ navigation }) => ({
          title: 'Settings',
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#cc0000',
          },
          headerTitleStyle: {
            fontSize: 17 / fontScale
          },
          headerTintColor: 'white',
          headerLeft: (props) => {
            return (
              //We could use some svg icon
              <TouchableOpacity {...props} onPress={() => { navigation.pop(); console.log(navigation) }} >
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity>)
          }
        })}
      />
    </Stack.Navigator>
  );
}

/**
 * A bottom tab navigator displays tab buttons on the bottom of the display to switch screens.
 * https://reactnavigation.org/docs/bottom-tab-navigator
 */
const BottomTab = createBottomTabNavigator<RootTabParamList>();

const Drawer = createDrawerNavigator<RootDrawerParamList>();

function DrawerNavigation() {
  return (
    <Drawer.Navigator
      id="drawer"
      screenOptions={{
        headerLeft: () => undefined,
        drawerStyle: { backgroundColor: '#fff', width: '75%', },
      }}
      drawerContent={(props) => <SettingsModal {...props} />}
    >
      <Drawer.Screen name="DrawerRoot" component={ScanScreen} options={{
        title: 'Scanner',
        headerTitleAlign: 'left',
        headerTintColor: 'white',
      }} />
    </Drawer.Navigator>
  );
}

const CharacteristicSettingDrawer = createDrawerNavigator();

function CharacteristicsDrawer({ route, navigation }) {

  return (
    <CharacteristicSettingDrawer.Navigator
      id="CharacteristicSettingDrawer"
      screenOptions={() => ({
        headerLeft: () => undefined,
        drawerStyle: { backgroundColor: '#fff', width: '70%' },
        drawerPosition: "right",
        drawerType: Platform.OS == 'android' ? 'front' : 'back',
      })
      }
      drawerContent={(props) => <CharacteristicsSettingsDrawer {...props} />}
    >
      <CharacteristicSettingDrawer.Screen name="Characteristics" component={CharacteristicScreen} initialParams={{ ...route.params }}
        options={{
          headerShown: false
        }}
      />
    </CharacteristicSettingDrawer.Navigator>
  );
};

function BottomTabNavigator() {
  const colorScheme = useColorScheme();

  return (
    <BottomTab.Navigator
      id="bottom"
      initialRouteName="ScanTab"
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarInactiveTintColor: Colors[colorScheme].text,
        headerTitleAlign: 'center',
        tabBarStyle: { display: 'none' },
      }}
    >
      <BottomTab.Screen
        name="ScanTab"
        component={DrawerNavigation}
        options={({ navigation }: RootTabScreenProps<'ScanTab'>) => ({
          title: 'Scanner',
          headerTitleAlign: 'center',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={'color'} />,
        })}
      />
      <BottomTab.Screen
        name="DeviceTab"
        component={DeviceDetailsScreen}
        options={({ route, navigation }: RootTabScreenProps<'DeviceTab'>) => ({
          title: 'Services',
          headerTitleStyle: { color: 'white' },
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={'color'} />,
          headerLeft: (props) => {
            const goBack = () => {
              const BleManagerModule = NativeModules.BleManager;
              const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
              bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');
              navigation.goBack();
            };

            return (
              <TouchableOpacity {...props} style={{ paddingLeft: 15 }} onPress={goBack}>
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity>
            );
          },
        })}
      />

    </BottomTab.Navigator>
  );
}

/**
 * You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
 */
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={30} style={{ marginBottom: -3 }} {...props} />;
}
