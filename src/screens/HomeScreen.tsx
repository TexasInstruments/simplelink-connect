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

import { StyleSheet, TouchableOpacity, View, Image, InteractionManager } from 'react-native';
import { Text } from '../components/Themed';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Colors from '../constants/Colors';
import { useCallback, useState } from 'react';
import { callMeshModuleFunction } from '../components/BleMesh/meshUtils';
import { useTutorialsContext } from '../context/TutorialContext';

const HomeScreen: React.FC = () => {
    const { meshTutorial, scannerTutorial } = useTutorialsContext();
    const [showMeshTutorial, setShowMeshTutorial] = useState(false);
    const [showScannerTutorial, setShowScannerTutorial] = useState(false);
    let navigation = useNavigation();

    useFocusEffect(
        useCallback(() => {
            const task = InteractionManager.runAfterInteractions(async () => {
                try {
                    callMeshModuleFunction('meshInit');
                    setShowMeshTutorial(await meshTutorial());
                    setShowScannerTutorial(await scannerTutorial());
                } catch (error) {
                    console.error(error);
                }

            });

            return async () => {
                console.log('unfocused');
                task.cancel();
            };
        }, [])
    );

    const MenuItem = ({ imgPath, subject, navigationPath, navigationParams }: any) => {
        return (
            <View style={[styles.menuItemContainer]}>
                <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate(navigationPath, navigationParams)} disabled={subject == 'About'}>
                    <Image style={[styles.image]} source={imgPath} />
                </TouchableOpacity >
                <Text style={styles.subject}>{subject}</Text>
            </View >

        )
    }

    return (
        <View style={[styles.container]}>

            <View style={[styles.menuContainer, { flex: 1, }]}>
                <View style={[styles.row, { marginBottom: 30 }]}>
                    <MenuItem imgPath={require('../assets/images/menu_icons/scanner.png')} subject={'Scanner'} navigationPath={!showScannerTutorial ? 'Scanner' : 'ScannerTutorial'} />
                    <MenuItem imgPath={require('../assets/images/menu_icons/mesh_network.png')} subject={'Mesh Network'} navigationPath={!showMeshTutorial ? 'BleMesh' : 'MeshTutorial'} />
                </View>
                <View style={[styles.row, { flex: 1 }]}>
                    <MenuItem imgPath={require('../assets/images/menu_icons/stress_tests.png')} subject={'Stress Tests'} navigationPath='TestParameters' navigationParams={{ testService: null, peripheralId: null, peripheralName: null }} />
                    <MenuItem imgPath={require('../assets/images/menu_icons/about.png')} subject={'About'} />
                </View>
            </View>
            <View style={styles.footer}>
                <Text style={styles.footerText}><Text style={{ color: Colors.blue }}>Version: </Text>2.0.2</Text>
                <Text style={styles.footerText}><Text style={{ color: Colors.blue }}>Developed by: </Text>Texas Instruments</Text>
            </View>
        </View>
    )
};

export default HomeScreen;

const styles = StyleSheet.create({
    image: {
        width: 100,
        height: 100,
    },
    container: {
        height: '100%',
        padding: 20,
        backgroundColor: Colors.lightGray
    },
    row: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center'
    },
    menuItemContainer: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
    },
    menuItem: {
        backgroundColor: 'white',
        marginHorizontal: 10,
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
        elevation: 2,
    },
    menuContainer: {
        width: '100%',
        marginBottom: 60,
        marginTop: 10,
    },
    number: {
        fontSize: 60,
        fontWeight: '500',
    },
    subject: {
        textAlign: 'center',
        fontSize: 17,
        padding: 5,
        fontWeight: '500',
    },
    footer: {
        alignItems: 'center',
        paddingBottom: 40,
    },
    footerText: {
        textAlign: 'center',
        paddingTop: 10,
        fontSize: 14,
    },


});
