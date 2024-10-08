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

import { StyleSheet } from 'react-native';
import Colors from '../../../constants/Colors';
import { Dropdown } from 'react-native-element-dropdown';
import { SetStateAction, useEffect, useState, } from 'react';
import { View, Text } from '../../Themed';
import { FirmwareRepo, useFirmwareRepoContext } from '../../../context/FirmwareRepoContext';


interface Props {
    hwTypes: any[],
    selectedFW: string | undefined,
    selectedHW: string | undefined,
    setSelectedHW: (hw: string) => void,
    setSelectedFW: (fw: string) => void,
    firmwares: any[],
}

const SelectFirmwareImage: React.FC<Props> = ({
    hwTypes,
    selectedHW,
    setSelectedHW,
    firmwares,
    setSelectedFW,
    selectedFW,

}) => {
    const { currentRepoDetails } = useFirmwareRepoContext();
    const [repoDetails, setRepoDetails] = useState<FirmwareRepo | null>(null);

    useEffect(() => {
        setRepoDetails(currentRepoDetails)
    }, [currentRepoDetails])

    const getRelevantFirmwares = () => {
        if (selectedHW === 'All') {
            return firmwares;
        }
        let relevantFW = firmwares.filter((fw: { hwType: string; }) => fw.hwType == selectedHW)
        return relevantFW.length > 0 ? relevantFW : firmwares
    }

    return (
        <View style={{ width: '100%', zIndex: 100 }}>
            <View >
                <Text style={styles.header}>
                    Select Firmware Image
                </Text >
            </View>
            <View style={{ paddingHorizontal: 10, marginTop: 5 }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold' }}>Server URL:
                    {repoDetails?.useGitHub && (
                        <Text style={{ fontSize: 14, fontWeight: 'normal' }}> {`https://github.com/${repoDetails?.owner}/${repoDetails?.name}`}</Text>
                    )}
                    {!(repoDetails?.useGitHub) && (
                        <Text style={{ fontSize: 14, fontWeight: 'normal' }}> {repoDetails?.url}</Text>
                    )}
                </Text>
            </View>
            <Dropdown
                style={[styles.dropdown]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                itemTextStyle={styles.item}
                data={hwTypes}
                maxHeight={200}
                labelField="label"
                valueField="value"
                placeholder='Select HW Type'
                value={selectedHW}
                onChange={(item: { value: SetStateAction<string | undefined>; }) => {
                    setSelectedHW(item.value);
                }}
            />
            <Dropdown
                style={[styles.dropdown]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                itemTextStyle={styles.item}
                data={getRelevantFirmwares()}
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder='Select Firmware'
                value={selectedFW}
                onChange={(item: { value: SetStateAction<string | undefined>; }) => {
                    setSelectedFW(item.value);
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingLeft: 10,
        fontSize: 20,
        fontWeight: 'bold',
        backgroundColor: Colors.lightGray,
        paddingVertical: 20,
    },
    container: {
        backgroundColor: '#1b1b1b',
        // padding: 16,
    },
    dropdown: {
        marginTop: 15,
        alignContent: 'center',
        alignSelf: 'center',
        width: '90%',
        height: 50,
        borderColor: 'gray',
        borderWidth: 0.5,
        borderRadius: 8,
        paddingHorizontal: 8,
    },
    label: {
        position: 'absolute',
        backgroundColor: 'blue',
        left: 22,
        top: 8,
        zIndex: 999,
        paddingHorizontal: 8,
        fontSize: 14,
    },
    placeholderStyle: {
        fontSize: 14,
    },
    selectedTextStyle: {
        fontSize: 14,
    },
    item: {
        fontSize: 14,
    },
});
export default SelectFirmwareImage;
