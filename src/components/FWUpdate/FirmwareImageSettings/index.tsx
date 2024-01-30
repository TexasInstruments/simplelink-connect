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

import { StyleSheet, Modal, TextInput, Pressable, Platform, SafeAreaView } from 'react-native';
import Colors from '../../../constants/Colors';
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from '../../Themed';
import { Portal, Provider } from 'react-native-paper';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dropdown } from 'react-native-element-dropdown';
import { Repository } from '../FWUpdate_Modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
    isVisible: boolean,
    onClose: any,
    onUrlChange: any,
    currentRepository: Repository
}

const SUCCESS = {
    color: Colors.buttonSliderOn,
    text: 'Connection established'
}

const FAILURE = {
    color: Colors.primary,
    text: 'Failed to connect'
}

const REQUEST = {
    color: Colors.blue,
    text: 'Test Connection'
}

const FirmwareImageSettings: React.FC<Props> = ({ isVisible, onClose, onUrlChange, currentRepository }) => {

    const [repoOwner, setRepoOwner] = useState(currentRepository.owner);
    const [repoName, setRepoName] = useState(currentRepository.name);
    const [accessToken, setAccessToken] = useState(currentRepository.accessToken ? currentRepository.accessToken : '');
    const [repoVisibility, setRepoVisibility] = useState(currentRepository.visibility);

    const [buttonText, setButtonText] = useState(REQUEST.text);
    const [buttonColor, setButtonColor] = useState(REQUEST.color);

    const [errorMessage, setErrorMessage] = useState({ show: false, text: '' });
    const [connectionEstablished, setConnectionEstablished] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showToken, setShowToken] = useState(false);

    const visibilityOptions = [
        { label: 'Public', value: 'public' },
        { label: 'Private', value: 'private' },
    ];

    useEffect(() => {
        // reset values
        initiateStates();
        setRepoOwner(currentRepository.owner);
        setRepoName(currentRepository.name);
        setRepoVisibility(currentRepository.visibility);
        setAccessToken(currentRepository.accessToken ? currentRepository.accessToken : '');
    }, [, currentRepository, isVisible]);

    const initiateStates = () => {
        if (buttonColor !== REQUEST.color) {
            setButtonColor(REQUEST.color)
            setButtonText(REQUEST.text)
            setErrorMessage({ show: false, text: '' })
            setConnectionEstablished(false)
            setShowToken(false)
            setRepoVisibility('')
        }
    }

    const testRepoConnection = async (repoOwner: string, repoName: string, accessToken: string) => {
        try {
            const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}`;
            const headers = accessToken ? { Authorization: `token ${accessToken}` } : {};

            const response = await fetch(apiUrl, { headers });
            console.log(JSON.stringify(response))
            if (!response.ok && response.status === 401) {
                setErrorMessage({ show: true, text: 'Bad credentials, please make sure your access token is correct' })
            }
            else if (!response.ok && (response.status === 403 || response.status === 404)) {
                setErrorMessage({ show: true, text: 'Repository not found, if the repository is private please enter your GitHub private access token' })
            }
            return response.ok;
        } catch (error) {
            console.error('Error testing repo connection:', error);
            return false;
        }
    };

    const handleConnect = async () => {
        setLoading(true);
        try {

            let testConnection;

            if (repoVisibility == 'public' && accessToken) {
                setAccessToken('')
                await Keychain.resetGenericPassword()
                console.log('Access token has been reset')
                testConnection = await testRepoConnection(repoOwner, repoName, '');
            }
            else {
                testConnection = await testRepoConnection(repoOwner, repoName, accessToken);
            }

            setConnectionEstablished(testConnection)

            if (testConnection) {
                setButtonColor(SUCCESS.color)
                setButtonText(SUCCESS.text)
                setErrorMessage({ show: false, text: '' })
            } else {
                console.error('Connection failed. Please check your details.');
                setButtonColor(FAILURE.color)
                setButtonText(FAILURE.text)
            }
            setLoading(false)
        } catch (error) {
            setLoading(false)
            console.error('Error connecting to the repository:', error);
        }
    };

    const saveRepoDetails = async (repoOwner: string, repoName: string, accessToken: string, repoVisibility: string) => {
        try {
            // Save the access token and repo details securely

            if (accessToken) {
                if (repoVisibility === 'private') {
                    await Keychain.setGenericPassword('access_token', accessToken);
                    setAccessToken(accessToken);
                    console.log('Access token deleted successfully');
                }
                else {
                    // Delete access token from local storage if new repository is public.
                    await Keychain.resetGenericPassword()
                    setAccessToken('')
                }
            }
            await AsyncStorage.setItem('@repo_owner', repoOwner);
            await AsyncStorage.setItem('@repo_name', repoName);
            await AsyncStorage.setItem('@visibility', repoVisibility);

            // Update state
            setRepoOwner(repoOwner);
            setRepoName(repoName);
        } catch (error) {
            console.error('Error saving repo details:', error);
        }
    };

    const handleSave = async () => {
        const newRepoUrl = `https://github.com/${repoOwner}/${repoName}`
        await saveRepoDetails(repoOwner, repoName, accessToken, repoVisibility);
        onUrlChange(newRepoUrl, repoName, accessToken, repoOwner, repoVisibility);
        onClose();
    };

    return (
        <Provider>
            <Portal>
                <Modal visible={isVisible} transparent>
                    <View
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        }}>
                        <View style={[styles.modal]}>
                            <Text style={{ fontSize: 20, fontWeight: "bold" }}>Change Repository URL</Text>
                            <Text style={{ color: Colors.gray, fontSize: 13, padding: 3, marginBottom: 3 }}> https://github.com/{repoOwner ? repoOwner : ' ___ '}/{repoName ? repoName : '___'}</Text>
                            <SafeAreaView>
                                <Text style={[styles.labelStyle]}>Repository Owner</Text>
                                <TextInput
                                    editable
                                    style={[styles.textInput]}
                                    placeholder="Enter Repository Owner"
                                    value={repoOwner}
                                    onChangeText={(owner) => { setRepoOwner(owner.trim()); initiateStates(); }}
                                />

                                <Text style={[styles.labelStyle]}>Repository Name</Text>
                                <TextInput
                                    editable
                                    style={[styles.textInput]}
                                    placeholder="Enter Repository Name"
                                    value={repoName}
                                    onChangeText={(name) => { setRepoName(name.trim()); initiateStates(); }}
                                />

                                <Text style={[styles.labelStyle]}>Repository Visibility</Text>
                                <Dropdown
                                    style={[styles.dropdown]}
                                    placeholderStyle={styles.placeholderStyle}
                                    selectedTextStyle={styles.selectedTextStyle}
                                    itemTextStyle={styles.item}
                                    data={visibilityOptions}
                                    placeholder='Repository Visibility'
                                    value={repoVisibility}
                                    onChange={(v: any) => {
                                        setRepoVisibility(v.value);
                                    }}
                                    labelField="label"
                                    valueField="value"
                                />

                                {repoVisibility == 'private' && (
                                    <View >
                                        <Text style={[styles.labelStyle]}>Access Token</Text>
                                        <View style={[styles.accessTokenContainer]}>

                                            <TextInput
                                                secureTextEntry={!showToken}
                                                editable
                                                style={[styles.accessTokenInput]}
                                                placeholder="Access Token - if repository is private"
                                                value={accessToken}
                                                onChangeText={(token) => { setAccessToken(token); initiateStates(); }}
                                            ></TextInput>
                                            <MaterialCommunityIcons
                                                name={showToken ? 'eye-off' : 'eye'}
                                                size={24}
                                                color="gray"
                                                style={styles.icon}
                                                onPress={() => setShowToken(!showToken)}
                                            />
                                        </View>

                                    </View>
                                )}

                                <Pressable
                                    onPress={handleConnect}
                                    disabled={!repoOwner || !repoName || loading || !repoVisibility || (repoVisibility == 'private' && !accessToken)}
                                    style={[{
                                        ...styles.button,
                                        borderWidth: Platform.OS === 'ios' ? 4 : 0,
                                        height: 40,
                                        backgroundColor: buttonColor,
                                        borderColor: buttonColor,
                                        opacity: (!repoOwner || !repoName || loading || !repoVisibility || (repoVisibility == 'private' && !accessToken)) ? 0.4 : 1,
                                    }]}>
                                    <Text style={[styles.text]}>{buttonText}</Text>
                                </Pressable>

                                {errorMessage.show && (
                                    <Text style={{ color: Colors.primary, padding: 3, fontSize: 13 }}>
                                        {errorMessage.text}
                                    </Text>
                                )}
                            </SafeAreaView>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-evenly' }}>
                                <TouchableOpacity style={[styles.buttonWrapper]} onPress={onClose}>
                                    <Text style={{ color: Colors.blue, fontSize: 15 }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.buttonWrapper, { opacity: !connectionEstablished ? 0.6 : 1, },]}
                                    onPress={handleSave}
                                    disabled={!connectionEstablished}>
                                    <Text style={{ color: Colors.blue, fontSize: 15 }}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </Portal >
        </Provider >
    );
};

const styles = StyleSheet.create({
    accessTokenContainer: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: 'gray',
        borderWidth: 0.5,
        borderRadius: 4,
        paddingRight: 10,
        marginBottom: 8,

    },
    icon: {
        marginLeft: 10,
    },
    accessTokenInput: {
        flex: 1,
        height: 45,
        padding: 8,
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        paddingHorizontal: 32,
        borderWidth: 0.5,
        borderRadius: 4,
        elevation: 3,
    },
    text: {
        fontSize: 16,
        lineHeight: 21,
        fontWeight: 'bold',
        letterSpacing: 0.25,
        color: 'white',
    },
    labelStyle: {
        fontWeight: "bold",
        fontSize: 12,
        marginBottom: 3
    },
    textInput: {
        borderColor: 'gray',
        borderRadius: 4,
        borderWidth: 0.5,
        padding: 8,
        height: 45,
        marginBottom: 8,
    },
    modal: {
        width: '90%',
        minHeight: 300,
        padding: 16,
        fontSize: 20,
        backgroundColor: 'white',
        borderRadius: 8,
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    header: {
        paddingLeft: 10,
        backgroundColor: Colors.lightGray,
        paddingVertical: 10,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center'
    },
    container: {
        backgroundColor: '#1b1b1b',
        // padding: 16,
    },
    dropdown: {
        alignContent: 'center',
        alignSelf: 'center',
        width: '100%',
        height: 45,
        borderColor: 'gray',
        borderWidth: 0.5,
        borderRadius: 4,
        color: 'black',
        padding: 8,
        marginBottom: 8,
    },
    placeholderStyle: {
        color: 'black',
        fontSize: 14,
    },
    selectedTextStyle: {
        fontSize: 14,
        color: 'black',
    },
    item: {
        color: 'black',
        fontSize: 14,
    },
    buttonWrapper: {
        paddingVertical: 10,
        alignItems: 'center',
    },
});
export default FirmwareImageSettings;
