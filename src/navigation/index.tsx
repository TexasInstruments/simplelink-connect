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
import { NavigationContainer, DefaultTheme, DarkTheme, Theme, DrawerActions, useNavigation, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import * as React from 'react';
import { Alert, ColorSchemeName, Linking, NativeEventEmitter, NativeModules, Platform, View, Text, useWindowDimensions, BackHandler } from 'react-native';
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
import ScannerTutorialScreen from '../screens/ScannerTutorialScreen';
import CharacteristicsSettingsDrawer from '../screens/CharacteristicsSettingsDrawer';
import TestParametersScreen from '../screens/StressTestViews/TestParametersScreen';
import StressTestScreen from '../screens/StressTestViews/StressTestScreen';
import GattTestScreen from '../screens/StressTestViews/GattTestScreen';
import { useCharacteristicViewContext } from '../context/CharactristicViewContext';
import FilterSortOptionsScreen from '../screens/FilterSortOptionsScreen';
import ConfigRepositoryUrlScreen from '../screens/ConfigRepositoryUrlScreen';
import BleMesh from '../components/BleMesh';
import BleMeshScanner from '../components/BleMesh/BleMeshScanner';
import BleMeshProvisionNode from '../components/BleMesh/BleMeshProvisionNode';
import BleMeshNetworkKeys from '../components/BleMesh/BleMeshNetworkKeys';
import HomeScreen from '../screens/HomeScreen';
import BrandIcon from '../components/BrandIcon';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BleMeshApplicationKeys from '../components/BleMesh/BleMeshApplicationKeys';
import { GenericModelView } from '../components/BleMesh/ModelViews/GenericModelView';
import { downloadDataToLocalStorage } from '../services/DownloadFileUtils';
import { Dialog, Menu, Portal, TextInput } from 'react-native-paper';
import BleMeshConfigureNode from '../components/BleMesh/BleMeshConfigureNode';
import { callMeshModuleFunction } from '../components/BleMesh/meshUtils';
import BleMeshProxies from '../components/BleMesh/BleMeshProxies';
import BleMeshBindAppKeysScreen from '../components/BleMesh/BleMesNodeQuickSetup/BindApplicationKeys';
import BleMeshSubscribeModelsScreen from '../components/BleMesh/BleMesNodeQuickSetup/Subscribe';
import BleMeshSetPublicationModelsScreen from '../components/BleMesh/BleMesNodeQuickSetup/Publication';
import TestResultsScreen from '../screens/StressTestViews/TestResultsScreen';
import MeshTutorialScreen from '../screens/MeshTutorialScreen';
import { useServiceViewContext } from '../context/ServiceViewContext';
import BleMeshProvisioners from '../components/BleMesh/BleMeshProvisioners';
import BleMeshGroups from '../components/BleMesh/BleMeshGroups';
import AboutScreen from '../screens/AboutScreen';
import ZephyrDFUServiceModel from '../screens/ServiceSpecificViews/ZephyrDFUServiceModel';

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
}: {
  colorScheme: ColorSchemeName;
}) {
  return (
    <FilterSortProvider>
      <NavigationContainer
        linking={LinkingConfiguration}
        theme={colorScheme === 'dark' ? DarkThemeExtended : DefaultThemeExtended}
      >
        <RootNavigator />
      </NavigationContainer>
    </FilterSortProvider>
  );
}

/**
 * A root stack navigator is often used for displaying modals on top of all other content.
 * https://reactnavigation.org/docs/modal
 */
const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { characteristicView, serviceName, hasSpecificScreen, hasTestOption } = useCharacteristicViewContext();
  const { fontScale } = useWindowDimensions();
  const [meshMenuVisible, setMeshMenuVisible] = React.useState(false);
  const { MeshModule } = NativeModules;

  const openMenu = () => setMeshMenuVisible(true);
  const closeMenu = () => setMeshMenuVisible(false);

  const exportMeshNetwork = async () => {
    try {
      let networkJson = await callMeshModuleFunction('exportNetwork') as string;
      downloadDataToLocalStorage(networkJson, 'mesh_network.json', 'application/json');
      closeMenu();

    } catch (error) {
      console.log('Error exporting network: ', error);
    }
  }

  const resetMeshNetwork = async () => {
    await callMeshModuleFunction('resetNetwork');
    await callMeshModuleFunction('setMeshNetworkName', 'TI Mesh Network');
    closeMenu();

  }

  return (
    <Stack.Navigator initialRouteName={'HomeScreen'} id="stack">

      <Stack.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={() => ({
          title: 'SimpleLink Connect',
          headerTitleAlign: 'start',
          headerStyle: {
            backgroundColor: '#cc0000',
          },
          headerTitleStyle: {
            fontSize: 20 / fontScale,
            fontWeight: '500',
          },
          headerTintColor: 'white',
          headerLeft: (props) => {
            return (
              <View style={{ marginRight: 10 }}>
                <BrandIcon size={25} name={"TI"} color='white' />
              </View>
            )
          }
        })}
      />
      <Stack.Screen name="Scanner" component={BottomTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="NotFound" component={NotFoundScreen} options={{ title: 'Oops!' }} />
      <Stack.Screen name="Characteristics"
        component={CharacteristicsDrawer}
        options={({ navigation }) => ({
          title: hasSpecificScreen ? (characteristicView === 'advanced' ? 'Characteristic' : serviceName) : 'Characteristic',
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
              testID='backButton' accessibilityLabel='backButton'
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
                <TouchableOpacity style={{ paddingRight: 15 }} onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} testID='openSettings' accessibilityLabel='openSettings'>
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
        <Stack.Screen
          name="ZephyrDFUServiceModel"
          component={ZephyrDFUServiceModel}
          options={{
            title: 'Firmware Update',
            headerTintColor: 'white',
            headerTitleStyle: {
              fontSize: 17 / fontScale
            },
          }}
        />
      </Stack.Group>
      <Stack.Screen name="ScannerTutorial" component={ScannerTutorialScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MeshTutorial" component={MeshTutorialScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="TestParameters"
        component={TestParametersScreen}
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
              <TouchableOpacity {...props} onPress={() => navigation.navigate('HomeScreen')} testID='backButton' accessibilityLabel='backButton'>
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity>)
          },
        })}
      />
      <Stack.Screen
        name="AboutScreen"
        component={AboutScreen}
        options={({ navigation }) => ({
          title: 'About',
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
              <TouchableOpacity {...props} onPress={() => navigation.navigate('HomeScreen')} testID='backButton' accessibilityLabel='backButton'>
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity>)
          },
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
              <TouchableOpacity {...props} onPress={() => navigation.pop()} testID='backButton' accessibilityLabel='backButton'>
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity>)
          }
        })}
      />

      <Stack.Screen
        name="TestResultsScreen"
        component={TestResultsScreen}
        options={({ navigation }) => ({
          title: 'Test Results',
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
              <TouchableOpacity {...props} onPress={() => navigation.pop()} testID='backButton' accessibilityLabel='backButton'>
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity>)
          }
        })}
      />

      <Stack.Screen
        name="StressTest"
        component={StressTestScreen}
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
              <TouchableOpacity {...props} onPress={() => { navigation.pop(); console.log(navigation) }} testID='backButton' accessibilityLabel='backButton'>
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
              <TouchableOpacity {...props} onPress={() => { navigation.pop(); }} testID='backButton' accessibilityLabel='backButton'>
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
              <TouchableOpacity {...props} onPress={() => { navigation.pop(); }} testID='backButton' accessibilityLabel='backButton'>
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity>)
          }
        })}
      />
      <Stack.Screen
        name="BleMesh"
        component={BleMesh}
        options={({ navigation }) => ({
          title: 'BLE Mesh',
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
              <TouchableOpacity {...props} onPress={() => { navigation.navigate('HomeScreen') }} >
                <Icon name="home" size={24} color="white" />
              </TouchableOpacity>)
          },
          headerRight: () => {
            return (
              <Menu
                contentStyle={{ backgroundColor: 'white' }}
                visible={meshMenuVisible}
                onDismiss={closeMenu}
                anchor={
                  <TouchableOpacity style={{ paddingRight: 15 }} onPress={openMenu}>
                    <MaterialCommunityIcons name="dots-vertical" size={24} color="white" />
                  </TouchableOpacity>
                }
              >
                {/* https://pictogrammers.com/library/mdi/ */}
                <Menu.Item
                  onPress={() => { navigation.navigate('BleMeshGroupsScreen'); closeMenu() }}
                  title="Groups"
                  leadingIcon={(({ size }) => (
                    <MaterialCommunityIcons name="account-group" size={size} color={"black"}></MaterialCommunityIcons>
                  ))}
                  titleStyle={{ color: "black" }}
                />
                <Menu.Item
                  onPress={() => { navigation.navigate('BleMeshProvisionerScreen'); closeMenu() }}
                  title="Provisioners"
                  leadingIcon={(({ size }) => (
                    <MaterialCommunityIcons name="transit-connection-horizontal" size={size} color={"black"}></MaterialCommunityIcons>
                  ))}
                  titleStyle={{ color: "black" }}
                />
                <Menu.Item
                  onPress={() => { navigation.navigate('BleMeshProxies'); closeMenu() }}
                  title="Proxies"
                  leadingIcon={(({ size }) => (
                    <MaterialCommunityIcons name="arrow-decision" size={size} color={"black"}></MaterialCommunityIcons>
                  ))}
                  titleStyle={{ color: "black" }}
                />
                <Menu.Item
                  onPress={() => { navigation.navigate('BleMeshNetworkKeys'); closeMenu() }}
                  title="Configure network keys"
                  leadingIcon={(({ size }) => (
                    <MaterialCommunityIcons name="key" size={size} color={"black"}></MaterialCommunityIcons>
                  ))}
                  titleStyle={{ color: "black" }}
                />
                <Menu.Item
                  onPress={() => { navigation.navigate('BleMeshApplicationKeys'); closeMenu() }}
                  title="Configure app keys"
                  leadingIcon={(({ size }) => (
                    <MaterialCommunityIcons name="key" size={size} color={"black"}></MaterialCommunityIcons>
                  ))}
                  titleStyle={{ color: "black" }} />
                <Menu.Item
                  onPress={exportMeshNetwork}
                  title="Export network"
                  leadingIcon={(({ size }) => (
                    <MaterialCommunityIcons name="download" size={size} color={"black"}></MaterialCommunityIcons>
                  ))}
                  titleStyle={{ color: "black" }}
                />
                <Menu.Item
                  onPress={resetMeshNetwork}
                  title="Reset network"
                  leadingIcon={(({ size }) => (
                    <MaterialCommunityIcons name="trash-can-outline" size={size} color={"black"}></MaterialCommunityIcons>
                  ))}
                  titleStyle={{ color: "black" }}
                />
                <Menu.Item
                  onPress={() => { navigation.navigate('MeshTutorial'); closeMenu(); }}
                  title="Show Tutorial"
                  leadingIcon={(({ size }) => (
                    <MaterialCommunityIcons name="information" size={size} color={"black"}></MaterialCommunityIcons>
                  ))}
                  titleStyle={{ color: "black" }} rippleColor={"black"}
                />

              </Menu >
            );
          },
        })}
      />
      < Stack.Screen
        name="BleMeshNetworkKeys"
        component={BleMeshNetworkKeys}
        options={({ navigation }) => ({
          title: 'BLE Mesh',
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
              <TouchableOpacity {...props} onPress={() => { navigation.pop(); }} >
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity >)
          }
        })}
      />
      < Stack.Screen
        name="BleMeshProxies"
        component={BleMeshProxies}
        options={({ navigation }) => ({
          title: 'BLE Mesh',
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
              <TouchableOpacity {...props} onPress={() => { navigation.pop(); }} >
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity >)
          }
        })}
      />
      < Stack.Screen
        name="BleMeshProvisionerScreen"
        component={BleMeshProvisioners}
        options={({ navigation }) => ({
          title: 'Provisioners',
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
              <TouchableOpacity {...props} onPress={() => { navigation.pop(); }} >
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity >)
          }
        })}
      />
      < Stack.Screen
        name="BleMeshGroupsScreen"
        component={BleMeshGroups}
        options={({ navigation }) => ({
          title: 'Groups',
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
              <TouchableOpacity {...props} onPress={() => { navigation.pop(); }} >
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity >)
          }
        })}
      />
      < Stack.Screen
        name="BleMeshBindAppKeysScreen"
        component={BleMeshBindAppKeysScreen}
        options={({ navigation }) => ({
          title: 'Bind Application Keys',
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
              <TouchableOpacity {...props} onPress={() => { navigation.pop(); }} >
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity >)
          }
        })}
      />
      < Stack.Screen
        name="BleMeshSubscribeModelsScreen"
        component={BleMeshSubscribeModelsScreen}
        options={({ navigation }) => ({
          title: 'Subscribe',
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
              <TouchableOpacity {...props} onPress={() => { navigation.pop(); }} >
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity >)
          }
        })}
      />
      < Stack.Screen
        name="BleMeshSetPublicationModelsScreen"
        component={BleMeshSetPublicationModelsScreen}
        options={({ navigation }) => ({
          title: 'Set Publication',
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
              <TouchableOpacity {...props} onPress={() => { navigation.pop(); }} >
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity >)
          }
        })}
      />
      < Stack.Screen
        name="BleMeshApplicationKeys"
        component={BleMeshApplicationKeys}
        options={({ navigation }) => ({
          title: 'BLE Mesh',
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
              <TouchableOpacity {...props} onPress={() => { navigation.pop(); }} >
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity>)
          }
        })}
      />
      < Stack.Screen
        name="BleMeshScanner"
        component={BleMeshScanner}
        options={({ navigation }) => ({
          title: 'Add Node',
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
              <TouchableOpacity {...props} onPress={() => { navigation.pop(); }} >
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity>)
          }
        })}
      />
      < Stack.Screen
        name="BleMeshProvisionNode"
        component={BleMeshProvisionNode}
        options={({ navigation }) => ({
          title: 'Provision Node',
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
              <TouchableOpacity {...props} onPress={async () => { navigation.navigate('BleMesh'); await callMeshModuleFunction('disconnect'); console.log('CALLING DISCONNECT') }} >
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity>)
          }
        })}
      />
      <Stack.Screen
        name="BleMeshConfigureNode"
        component={BleMeshConfigureNode}
        options={({ navigation }) => ({
          title: 'Configure Node',
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
              <TouchableOpacity {...props} onPress={() => { navigation.navigate('BleMesh'); }} >
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity>)
          }
        })}
      />
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen
          name="GenericModelView"
          component={GenericModelView}
          options={{
            title: 'Node Model',
            headerTintColor: 'white',
            headerTitleStyle: {
              fontSize: 17 / fontScale
            },
            headerTitleAlign: 'center'
          }}
        />
      </Stack.Group>
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
      <Drawer.Screen name="DrawerRoot"
        component={ScanScreen}
        options={({ route, navigation }) => ({
          title: 'Scanner',
          headerTitleStyle: { color: 'white' },
          tabBarIcon: ({ }) => <TabBarIcon name="code" color={'color'} />,
          headerLeft: (props) => {
            const goHome = () => {
              const BleManagerModule = NativeModules.BleManager;
              const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
              bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral');
              bleManagerEmitter.removeAllListeners('BleManagerStopScan');
              bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');
              navigation.navigate('HomeScreen');
            };

            return (
              <TouchableOpacity {...props} style={{ paddingLeft: 15 }} onPress={goHome}>
                <Icon name="home" size={24} color="white" />
              </TouchableOpacity>
            );
          },
        })}

      />
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
  const { hasOadOption, hasDfuOption, peripheralInfo, handleRequestMTU, handleCreateBond, handleRemoveBond, isBonded } = useServiceViewContext();

  const [deviceMenuVisible, setDeviceMenuVisible] = React.useState(false);
  const [requestMtuDialogVisible, setRequestMtuDialogVisible] = React.useState(false);
  const [requestedMtu, setRequestedMtu] = React.useState('');
  const [isPeripheralBonded, setIsPeripheralBonded] = React.useState(isBonded);

  const closeMenu = () => setDeviceMenuVisible(false);
  const openMenu = () => setDeviceMenuVisible(true);
  const openRequestMtuDialog = () => setRequestMtuDialogVisible(true);
  const closeRequestMtuDialog = () => setRequestMtuDialogVisible(false)

  React.useEffect(() => {
    setIsPeripheralBonded(isBonded);
  }, [isBonded])

  const openFWUpdateModal = (navigation: any) => {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'OAD Service',
        'For OAD process please connect and pair to the device using the iOS\'s Bluetooth interface.',
        [
          {
            text: 'Continue',
            onPress: () => navigation.navigate('Characteristics', {
              peripheralInfo: peripheralInfo!,
              serviceUuid: 'f000ffc0-0451-4000-b000-000000000000'.toLocaleUpperCase(),
              icon: {
                type: 'font-awesome-5',
                iconName: 'download',
              },
              serviceName: 'TI OAD',
            }),
            style: 'cancel',
          },
          {
            text: 'Go to Bluetooth',
            onPress: () => Linking.openURL('App-Prefs:Bluetooth'),
            style: 'destructive',
          },

        ],
      );
    }
    else {
      navigation.navigate('Characteristics', {
        peripheralInfo: peripheralInfo!,
        serviceUuid: 'f000ffc0-0451-4000-b000-000000000000',
        icon: {
          type: 'font-awesome-5',
          iconName: 'download',
        },
        serviceName: 'TI OAD',
      })
    }
  }

  const openDfuModal = (navigation: any) => {
    navigation.navigate('Characteristics', {
      peripheralInfo: peripheralInfo!,
      serviceUuid: '8d53dc1d-1db7-4cd3-868b-8a527460aa84',
      icon: {
        type: 'font-awesome-5',
        iconName: 'download',
      },
      serviceName: 'Zephyr MCU Manager Service',
    })

  }

  const requestMtu = () => {
    const mtuValue = parseInt(requestedMtu, 10);
    if (isNaN(mtuValue) || mtuValue <= 0) {
      Alert.alert('Invalid MTU', 'Please enter a valid MTU value.');
      return;
    }

    // Call your BLE method to request MTU here
    console.log('Requesting MTU:', mtuValue);
    handleRequestMTU(mtuValue)

    closeRequestMtuDialog();
  };
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
              <TouchableOpacity {...props} style={{ paddingLeft: 15 }} onPress={goBack} testID='backButton' accessibilityLabel='backButton'>
                <AntDesign name="left" size={24} color="white" />
              </TouchableOpacity>
            );
          },
          headerRight: () => {
            if (Platform.OS === 'ios' && !hasOadOption && !hasDfuOption) {
              return null;
            }
            else {
              return (
                <>
                  <Menu
                    contentStyle={{ backgroundColor: 'white' }}
                    visible={deviceMenuVisible}
                    onDismiss={closeMenu}
                    anchor={
                      <TouchableOpacity style={{ paddingRight: 15 }} onPress={openMenu}>
                        <MaterialCommunityIcons name="dots-vertical" size={24} color="white" />
                      </TouchableOpacity>
                    }
                  >
                    {/* https://pictogrammers.com/library/mdi/ */}
                    {Platform.OS == 'android' && (
                      <Menu.Item onPress={() => { openRequestMtuDialog(); closeMenu() }} title="Request MTU" leadingIcon="swap-horizontal" />
                    )}

                    {Platform.OS == 'android' && !isPeripheralBonded && (
                      <Menu.Item onPress={() => { handleCreateBond(); closeMenu() }} title="Create Bond" leadingIcon="key-plus" />
                    )}
                    {Platform.OS == 'android' && isPeripheralBonded && (
                      <Menu.Item onPress={() => { handleRemoveBond(); closeMenu() }} title="Remove Bond" leadingIcon="key-minus" />
                    )}
                    {hasOadOption && (
                      <Menu.Item onPress={() => { openFWUpdateModal(navigation); closeMenu() }} title="Firmware Update (TI OAD)" leadingIcon="update" />
                    )}
                    {hasDfuOption && (
                      <Menu.Item onPress={() => { openDfuModal(navigation); closeMenu() }} title="Firmware Update (SMP)" leadingIcon={(({ size }) => (
                        <FontAwesome name="download" size={size} color={"black"}></FontAwesome>
                      ))} />
                    )}

                  </Menu >
                  <Portal>
                    <Dialog
                      visible={requestMtuDialogVisible}
                      onDismiss={closeRequestMtuDialog}
                      style={{ backgroundColor: 'white' }}
                    >
                      <Dialog.Title
                        style={{
                          fontSize: 20,
                          fontWeight: 'bold',
                        }}
                      >
                        Request MTU
                      </Dialog.Title>
                      <Dialog.Content>
                        <TextInput
                          placeholder="Enter MTU value"
                          keyboardType="numeric"
                          value={requestedMtu}
                          onChangeText={setRequestedMtu}
                          activeUnderlineColor={Colors.active}
                          style={{ backgroundColor: Colors.lightGray, fontSize: 16 / useWindowDimensions().fontScale }}
                        />
                      </Dialog.Content>
                      <Dialog.Actions
                        style={{ justifyContent: 'space-between' }}
                      >
                        <TouchableOpacity onPress={closeRequestMtuDialog}>
                          <Text style={{ color: Colors.blue }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={requestMtu}>
                          <Text style={{ color: Colors.blue }}>Request</Text>
                        </TouchableOpacity>
                      </Dialog.Actions>
                    </Dialog>
                  </Portal>
                </>
              );
            }
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
