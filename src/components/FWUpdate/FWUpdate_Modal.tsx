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

import React, { useMemo } from 'react';
import { NativeModules, NativeEventEmitter, Platform, ScrollView } from 'react-native';
import { LinearProgress } from '@rneui/base';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Text, TouchableOpacity, View } from '../Themed';
import Colors from '../../constants/Colors';
import useColorScheme from '../../hooks/useColorScheme';
import BleManager from 'react-native-ble-manager';
import { decode } from 'base-64';
import { useNavigation } from '@react-navigation/native';
import { DeviceScreenNavigationProp } from '../../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import IdleTimerManager from 'react-native-idle-timer';
import DocumentPicker from 'react-native-document-picker';
import { v4 } from 'uuid';
import fs from 'react-native-fs';
import { UUID } from './constants/Uuids';
import { OadEvent, OadProtocolOpCode, OadResetServiceOpCodes } from './constants/OpCodes';
import { OadStatus } from './constants/Statuses';
import { buf2hex } from '../../hooks/convert';
import SelectFirmwareImage from './SelectFirmwareImage/index';
import * as Keychain from 'react-native-keychain';

interface Props {
  peripheralId: string;
}

type FW = {
  label: string;
  value: string;
  version: string;
  hwType: string;
  imageType: string;
  local?: boolean;
  bytes: Uint8Array;
};

export type Repository = {
  url: string;
  name: string;
  owner: string;
  visibility: 'public' | 'private';
  accessToken?: string;
}

let availableFirmwares: FW[] = [];

const FWUpdate_Modal: React.FC<Props> = ({ peripheralId }: any) => {

  let navigation = useNavigation<DeviceScreenNavigationProp>();
  const [selectedFW, setSelectedFW] = useState<string>();
  const [selectedHW, setSelectedHW] = useState<string>();
  const [firmwares, setFirmwares] = useState<FW[]>(availableFirmwares);
  const [hwTypes, setHwTypes] = useState([]);
  const [status, setStatus] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);
  const [blockNum, setBlockNum] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [imgLength, setImgLength] = useState<number>(0);
  const [localFileError, setLocalFileError] = useState<'success' | 'error' | 'cancelled' | 'fs' | null>(null);
  const [currentRepoUrl, setCurrentRepoUrl] = useState('');
  const [repository, setRepository] = useState<Repository>({
    url: 'https://github.com/TexasInstruments/simplelink-connect-fw-bins',
    name: 'simplelink-connect-fw-bins',
    owner: 'TexasInstruments',
    visibility: 'public'
  })

  let fakeUpdateInterval = useRef<ReturnType<typeof setInterval>>();

  let theme = useColorScheme();

  const BleManagerModule = NativeModules.BleManager;
  const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

  let fwImageByteArray: Uint8Array;
  let blockSize = 20;
  let numBlocks = 0;

  let blockEventSubstription: any = undefined;

  console.log('FWUpdate_Modal', peripheralId);

  useEffect(() => {
    /* component mounting, disable lock screen sleep */
    IdleTimerManager.setIdleTimerDisabled(true, 'fw-update-screen');

    /* returned function will be called on component unmount */
    return () => {
      /* component unmounting, enable lock screen sleep */
      IdleTimerManager.setIdleTimerDisabled(false, 'fw-update-screen');
    };
  }, []);

  useEffect(() => {
    async function getRepoDetails() {
      let repo = await getUserRepository();
      let accessToken = null;
      if (repo.visibility === 'private') {
        accessToken = await getAccessToken();
      }
      getAvailableFw(repo.name, repo.owner, accessToken)
        .then(() => {
          console.log('getAvailableFw success');
        })
        .catch((error) => {
          console.log('getAvailableFw error ', error);
        });
      setCurrentRepoUrl(repo.url);
      return { ...repo, accessToken: accessToken }
    }

    getRepoDetails().then((details) => { setRepository(details) })

    return () => {
      setUpdating(false);
      clearInterval(fakeUpdateInterval.current);

    };
  }, []);

  useEffect(() => {
    console.log('repo URL changed', repository.url);

    getAvailableFw(repository.name, repository.owner, repository.accessToken)
      .then(() => {
        console.log('getAvailableFw success');
      })
      .catch((error) => {
        console.log('getAvailableFw error ', error);
      });
    setCurrentRepoUrl(repository.url);

    return () => {
      setUpdating(false);
      clearInterval(fakeUpdateInterval.current);
    };
  }, [repository.url]);

  useEffect(() => {
    console.log('selectedFW selected: ', selectedFW);
    if (selectedFW != undefined) {
      getFwUdateImage();
    }
  }, [selectedFW]);

  useEffect(() => {
    console.log('firmwares changed');
    // Create unique hardware types list from current firmwares.
    const uniqueHwTypesSet = new Set();
    uniqueHwTypesSet.add('All');
    firmwares.forEach((firmware) => {
      uniqueHwTypesSet.add(firmware.hwType);
    });
    setHwTypes(Array.from(uniqueHwTypesSet).map(hwType => ({ value: hwType, label: hwType })))

  }, [firmwares]);

  let localFileErrorMessage = useMemo(() => {
    if (localFileError == 'error') {
      return { message: 'Something went wrong while loading file!', color: 'red' };
    } else if (localFileError == 'success') {
      return { message: 'File loaded successfuly!', color: 'green' };
    } else if (localFileError == 'cancelled') {
      return { message: 'User cancelled picking!', color: 'red' };
    } else if (localFileError == 'fs') {
      return { message: 'Error with parsing file!', color: 'red' };
    } else {
      return { message: '', color: 'black' };
    }
  }, [localFileError]);

  //Toggle filepicker messages
  useEffect(() => {
    if (!localFileErrorMessage) return;
    let timeout = setTimeout(() => {
      setLocalFileError(null);
    }, 2000);

    return () => {
      clearTimeout(timeout);
    };
  }, [localFileErrorMessage]);

  const getUserRepository = async () => {
    let owner = await AsyncStorage.getItem('@repo_owner');
    let name = await AsyncStorage.getItem('@repo_name');
    let visibility = await AsyncStorage.getItem('@visibility');
    let savedURL = `https://github.com/${owner}/${name}`

    if (!owner || !name) {
      owner = 'TexasInstruments'
      name = 'simplelink-connect-fw-bins'
      savedURL = 'https://github.com/TexasInstruments/simplelink-connect-fw-bins'
      visibility = 'public'
    }

    let repo = { owner: owner, name: name, url: savedURL, visibility: visibility }
    return repo

  };

  const getAccessToken = async () => {
    try {
      const credentials = await Keychain.getGenericPassword();
      console.log(credentials);
      return credentials ? credentials.password : null;
    }
    catch (error) {
      console.log('no access token')
      return null;
    }

  };

  const startFwUpdate = () => {
    console.log('startFwUpdate');
    setUpdating(true);
    asyncStartFwUpdate(peripheralId);
  };

  const cancel = () => {
    setUpdating(false);
    setSelectedFW(undefined);
    setProgress(0);

    /* Remove the block response listener */
    bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');

    /* cancel OAD on the device */
    let ImgControlPointCancelCmd = new Uint8Array([OadEvent.OAD_EVT_CANCEL_OAD]);
    var cmdArray = Array.from(ImgControlPointCancelCmd);
    BleManager.writeWithoutResponse(
      peripheralId,
      UUID.OadServiceUuid,
      UUID.ImageControlPointUuid,
      cmdArray,
      1
    );

    navigation.goBack();
  };

  async function asyncStartFwUpdate(peripheralId: string) {
    console.log('calling getFwUdateImage: ', peripheralId);
    fwImageByteArray = await getFwUdateImage();

    let oadService = await checkOadServices(peripheralId);

    // ON CHIP - need to reset to the persistent application to start running oad process
    if (oadService === UUID.OadResetServiceUuid) {
      // Wait reset process to end
      oadService = await resetToOadServices(peripheralId);
    }

    if (oadService === oadService) {
      // Prepare for sending image
      await sendImagUpdateReq(peripheralId);
      // Start sending image
      sendImageBlocks(peripheralId);

    } else {
      console.log('oadServiceError');
    }
  }

  async function getAvailableFw(repoName: string, repoOwner: string, accessToken: string | undefined) {
    const apiUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main`;

    console.log('getAvailableFw: ', apiUrl);
    console.log('accessToken: ', accessToken);

    const headers = {
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      'Cache-Control': 'no-store',
    };

    fetch(`${apiUrl}/firmware.json`, { headers })
      .then(async (data) => {
        if (!data.ok) {
          setStatus('Server not found');
          console.error('fetch error: ', data.status, data.statusText);
          setFirmwares([])
        }

        let fwFile = await data.blob();

        let fwFileContents = fwFile.slice(0, fwFile.size);

        const fileReaderInstance = new FileReader();
        fileReaderInstance.readAsDataURL(fwFileContents);
        fileReaderInstance.onload = () => {
          const content = decode(
            //@ts-ignore
            fileReaderInstance.result?.substr('data:application/octet-stream;base64,'.length)
          );

          let fetchedFirmwares: string = '';

          try {
            fetchedFirmwares = JSON.parse(content);

            //@ts-ignore
            let mappedFetchedFirmwares = fetchedFirmwares.map((fw) => ({
              label: fw.fileName.split('/').pop(),
              value: fw.fileName,
              version: fw.version,
              hwType: fw.hwType,
              imageType: fw.imageType,
            }));
            console.log(mappedFetchedFirmwares);

            setFirmwares(mappedFetchedFirmwares);

            console.log('Connected FW server');
            setStatus('Connected FW server');
          } catch {
            setStatus('No FW images found');
          }
          //resolve(true)
        };
      })
      .catch((error) => {
        setStatus('Server not found');
        console.log('fetch error: ', error);
        //reject(error);
      });
  }

  async function getFwUdateImage(): Promise<Uint8Array> {
    /* After selecting Fw, get image from repo */
    let repoDetails = await getUserRepository();

    let accessToken: any = null;

    if (repoDetails.visibility === 'private') {
      accessToken = await getAccessToken();
    }
    let checkIfLocalFile = firmwares.find((fw) => fw.value == selectedFW);

    if (checkIfLocalFile?.local) {
      return new Promise((resolve, reject) => {
        if (typeof checkIfLocalFile?.bytes !== 'object') {
          reject('UInt8Array');
        }
        resolve(checkIfLocalFile!.bytes);
      });
    } else {
      return new Promise((resolve, reject) => {
        console.log('getFwUdateImage');
        const headers = {
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        };
        const apiUrl = `https://raw.githubusercontent.com/${repoDetails.owner}/${repoDetails.name}/main`;

        fetch(apiUrl + '/' + (selectedFW ?? ''), {
          headers,
        })
          .then(async (data) => {
            if (!data.ok) {
              setStatus('Server not found');
              console.error('fetch error: ', data.status, data.statusText);
            }

            let binary = await data.blob();

            let bytes = binary.slice(0, binary.size);

            const fileReaderInstance = new FileReader();
            fileReaderInstance.readAsDataURL(bytes);
            fileReaderInstance.onload = () => {
              const content = decode(
                //@ts-ignore
                fileReaderInstance.result?.substr('data:application/octet-stream;base64,'.length)
              );

              const buffer = new ArrayBuffer(content.length);
              let fwImageBinary = new Uint8Array(buffer);

              fwImageBinary.set(Array.from(content).map((c) => c.charCodeAt(0)));

              resolve(fwImageBinary);

              console.log('Found selected FW image ', fwImageBinary.length);
              if (fwImageBinary.length > 0) {
                setStatus('Found selected FW image');
              }
            };
          })
          .catch((error) => {
            setStatus('Selected FW image not found');
            console.log('fetch error: ', error);
            reject(error);
          });
      });
    }
  }

  async function checkOadServices(peripheralId: string) {
    console.log('checkOadServices');
    return new Promise((resolve, reject) => {

      BleManager.startNotification(peripheralId, UUID.OadServiceUuid, UUID.ImageIdentifyWriteUuid)
        // OFF-CHIP and DUAL-IMAGE
        .then(() => {
          console.log('device has OadServiceUuid');
          setStatus('Found OAD Service');
          BleManager.stopNotification(peripheralId, UUID.OadServiceUuid, UUID.ImageIdentifyWriteUuid).then(
            () => {
              resolve(UUID.OadServiceUuid);
            }
          );
        })
        // ON-CHIP
        .catch((e: any) => {
          console.log('device does not have OadServiceUuid ', e);
          // Start a new OAD operation, the target device will invalidate the current running image and begin the update process.
          let oadResetCmd = new Uint8Array([OadResetServiceOpCodes.OAD_RESET_CMD_START_OAD]);
          var oadResetCmdArray = Array.from(oadResetCmd);

          // Send reset command
          BleManager.writeWithoutResponse(
            peripheralId,
            UUID.OadResetServiceUuid,
            UUID.OadResetCharUuid,
            oadResetCmdArray
          )
            .then(() => {
              console.log('device has OadResetCharUuid');
              setStatus('Resetting OAD Reset Service');
              resolve(UUID.OadResetServiceUuid);
            })
            .catch(() => {
              console.log('device does not have OadResetServiceUuid');
              setStatus('No OAD Services Found');
              reject;
            });
        });
    });
  }

  async function resetToOadServices(peripheralId: string) {
    return new Promise((resolve, reject) => {
      setStatus('Waiting for device to reset to OAD Service');
      let resetTimer = setTimeout(() => {
        console.log('resetToOadServices: device did not reset');
        alert('Device did not reset to OAD ervice. Press reset button on device');
      }, 12000);

      bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');

      /* Wait for device to disconnect then connect again, and find the OAD service */
      let oadServericeListiner = bleManagerEmitter.addListener(
        'BleManagerDisconnectPeripheral',
        () => {
          clearTimeout(resetTimer);
          setStatus('Device reset');
          console.log('resetToOadServices - device disconnected');
          console.log('resetToOadServices - sending connect request');
          BleManager.connect(peripheralId)
            .then(() => {
              setStatus('Discovering OAD Service');
              BleManager.retrieveServices(peripheralId).then(() => {
                console.log('resetToOadServices - device connected');
                BleManager.startNotification(peripheralId, UUID.OadServiceUuid, UUID.ImageIdentifyWriteUuid)
                  .then(() => {
                    console.log('device has ImageIdentifyWriteUuid');
                    setStatus('Found OAD Service');
                    BleManager.stopNotification(
                      peripheralId,
                      UUID.OadServiceUuid,
                      UUID.ImageIdentifyWriteUuid
                    ).then(() => {
                      resolve(UUID.OadServiceUuid);
                    });
                  })
                  .catch(() => {
                    console.log('OAD Services Not Found');
                    alert(
                      'OAD Service not found.\n\nClose the app, turn BLE off and on in setting and retry OAD'
                    );
                  });
              });
            })
            .catch(() => {
              console.log('device not reset in to app containing OadServiceUuid');
              setStatus('OAD Service Reset Failed');
              reject();
            });

          oadServericeListiner.remove();
        }
      );

      /* Device app has OadResetServiceUuid service, and it has been written to in 
        checkOadServices. We need to send retrieveServices to make device reset into 
        app with  the OadServiceUuid, Then when it disconnect, reconnect to the app 
        running OadServiceUuid */
      console.log('resetToOadServices - sending retrieveServices');
      BleManager.retrieveServices(peripheralId);
    });
  }

  function resetAfterOad(peripheralId: string) {
    setStatus('Waiting for device reset in to new FW');
    setProgress(0.98);

    bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');
    let oadServericeListiner = bleManagerEmitter.addListener(
      'BleManagerDisconnectPeripheral',
      () => {
        setProgress(1);
        setStatus('Device reset');
        console.log('resetAfterOad - device disconnected');

        oadServericeListiner.remove();
      }
    );
  }

  function updateImgSizeInImgHeader(payload: Uint8Array, imgSize: number) {
    console.log('payload before updating', buf2hex(payload))

    payload[12] = imgSize & 0xFF;
    payload[13] = (imgSize >> 8) & 0xFF;
    payload[14] = (imgSize >> 16) & 0xFF;
    payload[15] = (imgSize >> 24) & 0xFF;

    console.log('payload after updating', buf2hex(payload))
    return payload;
  }

  async function getSwVersion() {
    /* Get the SW Version - Response: 
        uint8       cmdID;                     //!< Ctrl Op-code
        uint8       swVer[MCUBOOT_SW_VER_LEN]; //!< App version
    */
    var ImgControlPointCmd = new Uint8Array([OadProtocolOpCode.OAD_REQ_GET_SW_VER]);
    let rsp = await writeWaitNtfy(
      peripheralId,
      UUID.OadServiceUuid,
      UUID.ImageControlPointUuid,
      true,
      ImgControlPointCmd,
      1
    );
    let SWVersion;
    if (rsp[0] == OadProtocolOpCode.OAD_REQ_GET_SW_VER) {
      SWVersion = rsp[1] + (rsp[2] << 8);
      console.log('SW Version: ', SWVersion);
    }

    return SWVersion;
  }

  function getImgVersionFromImg(fwImageByteArray: Uint8Array | number[]) {
    let imgVersionMajor = fwImageByteArray[20];
    let imgVersionMinor = fwImageByteArray[21];
    let imgRevision = fwImageByteArray[22] + (fwImageByteArray[23] << 8);
    let imgBuildNum =
      fwImageByteArray[24] +
      (fwImageByteArray[25] << 8) +
      (fwImageByteArray[26] << 16) +
      (fwImageByteArray[27] << 24);

    return imgVersionMajor + '.' + imgVersionMinor + '.' + imgRevision + '.' + imgBuildNum
  }

  async function sendImagUpdateReq(peripheralId: string) {
    console.log('sendImagUpdateReq');

    setStatus('Starting FW Update');
    await getSwVersion();

    /* Set the MTU Size - Android only API 21+, iOS initiates an MTU exchange automatically upon connection */
    if (Platform.OS === 'android') {
      await BleManager.requestConnectionPriority(peripheralId, 1);
      let mtu = await BleManager.requestMTU(peripheralId, 255);
      console.log('MTU:', mtu)
    }
    let rsp;

    /* Prepare Image identify command */
    const buffer = new ArrayBuffer(18);
    let imgIdentifyPayload = new Uint8Array(buffer);

    let imgLength = fwImageByteArray.length;
    if (firmwares.find((fw) => fw.value === selectedFW)?.imageType === 'mcuboot') {
      console.log('sendiImagUpdateReq: Mcuboot image');
      /** MCU BOOT Image header structure
       * IMAGE_MAGIC            0x96f3b83d
       * IMAGE_HEADER_SIZE      32
       * struct image_header {
       *   uint32_t ih_magic;
       *   uint32_t ih_load_addr;
       *   uint16_t ih_hdr_size;             Size of image header (bytes).
       *   uint16_t ih_protect_tlv_size;     Size of protected TLV area (bytes). 
       *   uint32_t ih_img_size;             Does not include header.
       *   uint32_t ih_flags;                IMAGE_F_[...]. 
       *   struct image_version ih_ver;
       *   uint32_t _pad1;
       * };
       */

      /* Copy image header - first 18 bytes */
      imgIdentifyPayload.set(fwImageByteArray.slice(0, 18));

      /* Update image size to be real size instead of the size written in the input img */
      imgIdentifyPayload = updateImgSizeInImgHeader(imgIdentifyPayload, imgLength)

      /* check MCUBoot header Magic (4 first bytes)- should be  0x96f3b83d*/
      if (fwImageByteArray[0] != 0x3d || fwImageByteArray[1] != 0xb8 || fwImageByteArray[2] != 0xf3 || (fwImageByteArray[3] != 0x96 && fwImageByteArray[3] != 0x97)) {
        cancel();
        alert('Not an MCU Boot image');
      }

      /* Find img version */
      const versionString = getImgVersionFromImg(fwImageByteArray)
      console.log('MCUBOOT img version: ', versionString);

      let mcuBootMapgicSwap =
        fwImageByteArray[fwImageByteArray.length - 16].toString(16) +
        fwImageByteArray[fwImageByteArray.length - 15].toString(16) +
        fwImageByteArray[fwImageByteArray.length - 14].toString(16) +
        fwImageByteArray[fwImageByteArray.length - 13].toString(16) +
        fwImageByteArray[fwImageByteArray.length - 12].toString(16) +
        fwImageByteArray[fwImageByteArray.length - 11].toString(16) +
        fwImageByteArray[fwImageByteArray.length - 10].toString(16) +
        fwImageByteArray[fwImageByteArray.length - 9].toString(16) +
        fwImageByteArray[fwImageByteArray.length - 8].toString(16) +
        fwImageByteArray[fwImageByteArray.length - 7].toString(16) +
        fwImageByteArray[fwImageByteArray.length - 6].toString(16) +
        fwImageByteArray[fwImageByteArray.length - 5].toString(16) +
        fwImageByteArray[fwImageByteArray.length - 4].toString(16) +
        fwImageByteArray[fwImageByteArray.length - 3].toString(16) +
        fwImageByteArray[fwImageByteArray.length - 2].toString(16) +
        fwImageByteArray[fwImageByteArray.length - 1].toString(16);

      console.log('MCUBoot Swap Magic: ', mcuBootMapgicSwap);

      if (mcuBootMapgicSwap != '77c295f360d2ef7f355250f2cb67980') {
        console.log('Not swap image');

        /* Length is read from header and must include header */
        imgLength =
          fwImageByteArray[12] +
          (fwImageByteArray[13] << 8) +
          (fwImageByteArray[14] << 16) +
          (fwImageByteArray[15] << 24);

        console.log('MCUBoot imgLength: ', imgLength);

        let headerLen =
          fwImageByteArray[8] +
          (fwImageByteArray[9] << 8) +
          (fwImageByteArray[10] << 16) +
          (fwImageByteArray[11] << 24);

        console.log('tlv magic 0', fwImageByteArray[imgLength + headerLen]);
        console.log('tlv magic 1', fwImageByteArray[imgLength + headerLen + 1]);

        /* check TLV header Magic */
        if (
          fwImageByteArray[imgLength + headerLen + 1] != 0x69 ||
          (fwImageByteArray[imgLength + headerLen] != 0x07 &&
            fwImageByteArray[imgLength + headerLen] != 0x08)
        ) {
          cancel();
          alert('Bad TLV Magic');
        }

        let tlvLength =
          fwImageByteArray[imgLength + headerLen + 2] +
          (fwImageByteArray[imgLength + headerLen + 3] << 8);

        console.log('headerLen: ', headerLen);
        console.log('tlvLength: ', tlvLength);

        /* add MCU Boot header and trailer size */
        imgLength += headerLen + tlvLength;
        console.log('imgTotLength: ', imgLength);
        imgIdentifyPayload[12] = imgLength & 0x000000ff;
        imgIdentifyPayload[13] = (imgLength & 0x0000ff00) >> 8;
        imgIdentifyPayload[14] = (imgLength & 0x00ff0000) >> 16;
        imgIdentifyPayload[15] = (imgLength & 0xff000000) >> 24;

        fwImageByteArray = fwImageByteArray.slice(0, imgLength);
      }
    } else {
      console.log('sendiImagUpdateReq: TI image');
      /* Send Image identify command */
      /* Image ID */
      imgIdentifyPayload.set(fwImageByteArray.slice(0, 8));
      /* Bim Ver */
      imgIdentifyPayload.set(fwImageByteArray.slice(12, 14), 8);
      /* imgCpStat, crcStat, imgType, imgNo */
      imgIdentifyPayload.set(fwImageByteArray.slice(16, 20), 10);
      /* Length */
      imgIdentifyPayload.set(fwImageByteArray.slice(24, 28), 14);
    }

    setImgLength(imgLength);
    console.log('imgLength:', imgLength);

    /* Read the Block Size */
    blockSize = 20;
    let ImgControlPointCmd = new Uint8Array([OadProtocolOpCode.OAD_REQ_GET_BLK_SZ]);
    rsp = await writeWaitNtfy(
      peripheralId,
      UUID.OadServiceUuid,
      UUID.ImageControlPointUuid,
      true,
      ImgControlPointCmd,
      1
    );
    console.log('Block Size: ', rsp);
    /* check it is a response for the correct size */
    if (rsp[0] == OadProtocolOpCode.OAD_REQ_GET_BLK_SZ) {
      /* Store block size */
      blockSize = rsp[1] + (rsp[2] << 8) - 4;
      console.log('blockSize ', blockSize);
      numBlocks = Math.floor(imgLength / blockSize);
      console.log('numBlocks ', numBlocks);
    } else {
      console.log('Error: Block size response not for block size command');
    }

    /* Send Image identify command - send the image header to target to give him opportunity to accept or decline the image */
    console.log('imgIdentifyPayload ', buf2hex(imgIdentifyPayload));
    rsp = await writeWaitNtfy(
      peripheralId,
      UUID.OadServiceUuid,
      UUID.ImageIdentifyWriteUuid,
      true,
      imgIdentifyPayload,
      18
    );
    console.log('ImageIdentify Rsp: ', rsp);

    if (rsp == OadStatus.OAD_PROFILE_SUCCESS) {
      setStatus('Image header accepted');
    } else {
      setStatus('Image header reject - select correct image type');
      console.log('Invalid image', rsp)
    }

    BleManager.startNotification(peripheralId, UUID.OadServiceUuid, UUID.ImageControlPointUuid);
  }

  function sendImageBlocks(peripheralId: string): void {
    setStatus('FW Update in progress');

    bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');

    console.log('sendImageBlocks: fwImageByteArray.length: ', fwImageByteArray.length);
    let prevProgress = 0;
    // Add event listener- after getting the image header, the target asked for the image blocks.
    blockEventSubstription = bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      async ({ value, peripheral, characteristic, service }) => {
        /*
        value[0] -> opCode
        value[1] -> Status of previous block write
        value[2] -> Requested block number
        */
        console.log('blockEventSubstription:')
        console.log('OpCode: 0x' + value[0].toString(16))
        if (value[0] == OadProtocolOpCode.OAD_RSP_BLK_RSP_NOTIF) { // Block Request
          console.log('Previous Block Status: ', value[1].toString(16))
          console.log('Requested Block: ', value[2] + (value[3] << 8) + (value[4] << 16) + (value[5] << 24))
        }

        console.log('characteristic: ', characteristic)

        let blockRequested: number;

        // Block request
        if (
          characteristic.toUpperCase() === UUID.ImageControlPointUuid &&
          value[0] === OadProtocolOpCode.OAD_RSP_BLK_RSP_NOTIF
        ) {
          // OAD image payload download complete.
          if (value[1] === OadStatus.OAD_PROFILE_DL_COMPLETE) {

            console.log(' OadProtocolOpCode.OAD_RSP_BLK_RSP_NOTIF status: OAD_EXT_CTRL_BLK_RSP_DL_COMPLETE');

            console.log('FwUpdate completed');
            //blockEventSubstription.remove();
            //BleManager.stopNotification(peripheralId, OadServiceUuid, ImageControlPointUuid);

            // Enable an image after download,  instructing the target to prepare the image to run and then reboot.
            let ImgControlPointCmd = new Uint8Array([OadEvent.OAD_EVT_ENABLE_IMG]);
            var ImgControlPointCmdArray = Array.from(ImgControlPointCmd);
            BleManager.writeWithoutResponse(
              peripheralId,
              UUID.OadServiceUuid,
              UUID.ImageControlPointUuid,
              ImgControlPointCmdArray,
              1
            )
              .then(() => {
                // Success code
                console.log('Writen: ' + ImgControlPointCmdArray);
              })
              .catch((error: string) => {
                console.log('Write faled  ' + error);
              });
          }
          // OAD succeeded.
          else if (value[1] === OadStatus.OAD_PROFILE_SUCCESS) {
            //console.log(' OadProtocolOpCode.OAD_RSP_BLK_RSP_NOTIF status: OadStatus.OAD_PROFILE_SUCCESS')

            blockRequested = value[2] + (value[3] << 8) + (value[4] << 16) + (value[5] << 24);

            let progressUpdate = 0.98 * (blockRequested / numBlocks);
            //console.log('progressUpdate: ', progressUpdate)
            if (Math.floor(progressUpdate * 100) > prevProgress) {
              setProgress(progressUpdate);
            }
            prevProgress = Math.floor(progressUpdate * 100);

            const fwImageByteOffset = blockRequested * blockSize;
            // Last block
            if (blockRequested === numBlocks) {
              console.log(
                'fwImageByteArray.length %d, blockSize %d, numBlocks %d',
                fwImageByteArray.length,
                blockSize,
                numBlocks
              );
              /* last block, reduce block size to match last bytes of image */
              blockSize = fwImageByteArray.length - blockSize * numBlocks;
              console.log('LastBlock: size %d', blockSize);

              // BleManager.stopNotification(peripheralId, OadServiceUuid, ImageControlPointUuid);
              // let ImgControlPointCmd = new Uint8Array([ImageControlPointDisableBlkNotify])
              // await writeWaitNtfy(peripheralId, OadServiceUuid, ImageControlPointUuid, true, ImgControlPointCmd, 1);
            }

            //console.log('Block Request image size: ', fwImageByteArray.length);
            console.log('Block Request[' + blockSize + ']: ' + blockRequested + ' of ' + numBlocks);

            const blockData = fwImageByteArray.slice(
              fwImageByteOffset,
              fwImageByteOffset + blockSize
            );
            // console.log('block data', buf2hex(blockData))

            // if(blockRequested == (numBlocks)) {
            //   await BleManager.stopNotification(peripheralId, OadServiceUuid, ImageControlPointUuid);
            //   await bleManagerEmitter.removeAllListeners("BleManagerDidUpdateValueForCharacteristic");
            // }

            // Send block data

            await writeBlock(peripheralId, blockRequested, blockData, blockSize);

            // if(blockRequested === (numBlocks-1))
            // {
            //   let ImgControlPointCmd = new Uint8Array([ImageControlPointDisableBlkNotify])
            //   await writeWaitNtfy(peripheralId, OadServiceUuid, ImageControlPointUuid, true, ImgControlPointCmd, 1);
            // }
          }
          // OAD Failed
          else {
            console.log('unknown OadProtocolOpCode.OAD_RSP_BLK_RSP_NOTIF response ' + value[1]);
            alert('OAD Failed');
            setStatus('Found selected FW image');
            setProgress(0);
          }

        }
        // OAD Finished
        else if (
          characteristic.toUpperCase() === UUID.ImageControlPointUuid &&
          value[0] === OadEvent.OAD_EVT_ENABLE_IMG
        ) {
          console.log('got ImageControlPointEnableImg !!!!!', value[1]);
          resetAfterOad(peripheral);
        }
        // Unknown request
        else {
          console.log(
            'unknwon blockEventSubstription char ' + characteristic + ' or command ' + value[0]
          );
        }
      }
    );

    console.log('Sending ImageControlPointStartOad command');
    let ImgControlPointCmd = new Uint8Array([OadEvent.OAD_EVT_START_OAD]);
    var ImgControlPointCmdArray = Array.from(ImgControlPointCmd);
    BleManager.writeWithoutResponse(
      peripheralId,
      UUID.OadServiceUuid,
      UUID.ImageControlPointUuid,
      ImgControlPointCmdArray,
      1
    );
  }

  function writeBlock(
    peripheralId: string,
    blockRequested: number,
    blockData: Uint8Array,
    blockSize: number
  ) {
    let BlockRspCmd = new Uint8Array(blockSize + 4);

    BlockRspCmd[3] = (blockRequested >> 24) & 0xff;
    BlockRspCmd[2] = (blockRequested >> 16) & 0xff;
    BlockRspCmd[1] = (blockRequested >> 8) & 0xff;
    BlockRspCmd[0] = blockRequested & 0xff;

    /* copy in image data after header */
    BlockRspCmd.set(blockData, 4);
    var BlockRspCmdArray = Array.from(BlockRspCmd);

    //console.log('writingBlock[' + BlockRspCmd.length + ']: ' + blockRequested + ' [' + BlockRspCmd[4].toString(16) + ']...[' + BlockRspCmd[BlockRspCmd.length - 1].toString(16) + ']')
    //console.log('BlockRspCmdArray len', BlockRspCmdArray.length)

    BleManager.write(
      peripheralId,
      UUID.OadServiceUuid,
      UUID.ImageBlockRequestUuid,
      BlockRspCmdArray,
      BlockRspCmd.length
    )
      .then(() => {
        //console.log("writeBlock writen");
      })
      .catch((error: any) => {
        // Failure code
        //console.log('Block wite error: ', error);
      });
  }

  async function writeWaitNtfy(
    peripheralId: string,
    serviceUuid: string,
    charUuid: string,
    withoutResponse: boolean,
    cmdByteArray: Uint8Array,
    len: number
    //@ts-ignore
  ): Array {
    console.log('writeWaitNtfy');
    // To enable BleManagerDidUpdateValueForCharacteristic listener
    await BleManager.startNotification(peripheralId, serviceUuid, charUuid);

    return new Promise((resolve, reject) => {
      let substription = bleManagerEmitter.addListener(
        'BleManagerDidUpdateValueForCharacteristic',
        ({ value, peripheral, characteristic, service }) => {
          // Convert bytes array to string
          //const data = bytesToString(value);
          console.log('norififcation for char ' + characteristic + ' data:' + value);

          substription.remove();

          resolve(value);
        }
      );

      var cmdArray = Array.from(cmdByteArray);

      let writeFunction = BleManager.write;
      if (withoutResponse) {
        writeFunction = BleManager.writeWithoutResponse;
      }

      writeFunction(peripheralId, serviceUuid, charUuid, cmdArray, len)
        .then(() => {
          // Success code
          console.log('writeWaitNtfy Writen: ' + buf2hex(cmdByteArray));
        })
        .catch((error: any) => {
          // Failure code
          console.log('ImgControlPointCmdArray error: ', error);
          reject();
        });
    });
  }

  const addFile = () => {
    try {
      DocumentPicker.pickSingle({
        mode: 'import',
        copyTo: 'cachesDirectory',
      })
        .then(async (pickedFile: { fileCopyUri: any; uri: RequestInfo; name: any; }) => {
          if (!pickedFile.fileCopyUri) throw Error('File URI error');
          setLocalFileError('success');

          //https://github.com/itinance/react-native-fs#readfilepath-string-length--0-position--0-encodingoroptions-any-promisestring
          //We could use fs.read(filepath: string, length = 0, position = 0, 'base64'): Promise<string>
          //to fill the FW properties if the binary files provide them.

          try {
            let convert;

            if (Platform.OS === 'android') {
              convert = await fetch(pickedFile.uri);
            } else {
              //https://github.com/itinance/react-native-fs#readfilefilepath-string-encoding-string-promisestring
              let base64Data = await fs.readFile(decodeURIComponent(pickedFile.uri), 'base64');
              convert = await fetch(`data:application/octet-stream;base64,${base64Data}`);
            }

            let binary = await convert.blob();

            let bytes = binary.slice(0, binary.size);

            const fileReaderInstance = new FileReader();
            fileReaderInstance.readAsDataURL(bytes);
            fileReaderInstance.onload = () => {
              const content = decode(
                //@ts-ignore
                fileReaderInstance.result?.substr('data:application/octet-stream;base64,'.length)
              );

              const buffer = new ArrayBuffer(content.length);
              let binaryImage = new Uint8Array(buffer);

              binaryImage.set(Array.from(content).map((c) => c.charCodeAt(0)));

              let imgVersionMajor = binaryImage[20];
              let imgVersionMinor = binaryImage[21];
              let imgRevision = binaryImage[22] + (binaryImage[23] << 8);
              let imgBuildNum =
                binaryImage[24] +
                (binaryImage[25] << 8) +
                (binaryImage[26] << 16) +
                (binaryImage[27] << 24);

              let buildVersion =
                imgVersionMajor + '.' + imgVersionMinor + '.' + imgRevision + '.' + imgBuildNum;

              let uploadedImage = {
                hwType: 'N/A',
                imageType: 'mcuboot',
                label: pickedFile.name ?? 'Not specified',
                version: buildVersion,
                value: v4(),
                local: true,
                bytes: binaryImage,
              };

              setFirmwares((prev) => [
                uploadedImage,
                ...prev,
              ]);

              setSelectedFW(uploadedImage.value)
              setSelectedHW('N/A');
              console.log('File pushed to the FW array!');
            };
          } catch (error) {
            setLocalFileError('fs');
            console.error(error, 'react-native-fs');
            return;
          }
        })
        .catch((error: any) => {
          if (DocumentPicker.isCancel(error)) {
            setLocalFileError('cancelled');
          } else {
            setLocalFileError('error');
          }
        });
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        setLocalFileError('cancelled');
      } else {
        setLocalFileError('error');
      }
    }
  };

  return (
    <View style={{ flex: 1, width: '100%', marginHorizontal: 'auto' }}>
      <ScrollView >
        <SelectFirmwareImage
          currentRepoUrl={currentRepoUrl}
          hwTypes={hwTypes}
          selectedHW={selectedHW}
          setSelectedHW={setSelectedHW}
          firmwares={firmwares}
          setSelectedFW={setSelectedFW}
          selectedFW={selectedFW}
          repository={repository}
          setRepository={setRepository} />
        <View
          style={{
            flexDirection: 'column',
            marginTop: 15,
            marginHorizontal: 'auto',
            width: '100%',
            alignItems: 'center',
          }}
        >
          <Text>OR</Text>
          <TouchableOpacity onPress={addFile} style={{ paddingTop: 10 }}>
            <Text style={{ color: Colors.blue }}>Add local file</Text>
          </TouchableOpacity>
          <Text style={{ color: localFileErrorMessage.color }}>{localFileErrorMessage.message}</Text>
        </View>
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              paddingLeft: 10,
              fontSize: 20,
              fontWeight: 'bold',
              backgroundColor: Colors.lightGray,
              paddingVertical: 20,
            }}
          >
            Image details
          </Text>
          <Text style={{ paddingTop: 10, paddingVertical: 2, paddingLeft: 20 }}>
            <Text style={{ fontWeight: "bold" }} >Hardware Type: </Text>{firmwares.find((fw) => fw.value === selectedFW)?.hwType}{' '}
          </Text>
          <Text style={{ paddingVertical: 2, paddingLeft: 20 }}>
            <Text style={{ fontWeight: "bold" }} >Image Type: </Text> {firmwares.find((fw) => fw.value === selectedFW)?.imageType}{' '}
          </Text>
          <Text style={{ paddingVertical: 2, paddingLeft: 20 }}>
            <Text style={{ fontWeight: "bold" }} >Image Version: </Text>{firmwares.find((fw) => fw.value === selectedFW)?.version}{' '}
          </Text>
          <Text style={{ paddingVertical: 2, paddingLeft: 20 }}>
            <Text style={{ fontWeight: "bold" }} >Image File Name: </Text> {firmwares.find((fw) => fw.value === selectedFW)?.label}{' '}
          </Text>
        </View>
        <View style={{ flex: 2 }}>
          <Text
            style={{
              paddingLeft: 10,
              fontSize: 20,
              fontWeight: 'bold',
              backgroundColor: Colors.lightGray,
              paddingVertical: 20,
            }}
          >
            Status
          </Text>
          <Text style={{ paddingLeft: 20, paddingVertical: 20 }}>{status}</Text>
          {updating && (
            <View>
              <Text style={{ textAlign: 'center' }}>Progress</Text>
              <LinearProgress value={progress} color={Colors.blue} style={[styles.linearProgress]} />
              <Text style={{ marginBottom: 10, textAlign: 'center' }}>
                {Math.floor(progress * 100).toFixed(0)}%
              </Text>
            </View>
          )}
        </View>
        {
          progress < 1 && (
            <View
              style={{ flex: 2, flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 30 }}
            >
              <TouchableOpacity style={[styles.buttonWrapper]} onPress={cancel}>
                <Text style={{ color: Colors.blue, fontSize: 18 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.buttonWrapper,
                  {
                    opacity: updating || selectedFW == null ? 0.6 : 1,
                  },
                ]}
                disabled={updating || selectedFW == null}
                onPress={startFwUpdate}
              >
                <Text style={{ color: Colors.blue, fontSize: 18 }}>Update</Text>
              </TouchableOpacity>
            </View>
          )
        }
        {
          progress == 1 && (
            <View
              style={{ flex: 2, flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 30 }}
            >
              <TouchableOpacity style={[styles.buttonWrapper]} onPress={cancel}>
                <Text style={{ color: Colors.blue, fontSize: 18 }}>Done</Text>
              </TouchableOpacity>
            </View>
          )
        }
      </ScrollView >
    </View >
  );
};

const styles = StyleSheet.create({
  dialogTitle: { color: 'white', textAlign: 'center' },
  buttonWrapper: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  linearProgress: {
    height: 10,
    width: '80%',
    alignSelf: 'center',
    marginVertical: 10,
    borderRadius: 5,
  },
});

export default FWUpdate_Modal;