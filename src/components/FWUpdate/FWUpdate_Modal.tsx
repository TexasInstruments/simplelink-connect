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
import { Platform, ScrollView, EventSubscription } from 'react-native';
import { LinearProgress } from '@rneui/base';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Text, TouchableOpacity, View } from '../Themed';
import Colors from '../../constants/Colors';
import BleManager from 'react-native-ble-manager';
import { decode } from 'base-64';
import { useNavigation } from '@react-navigation/native';
import { DeviceScreenNavigationProp } from '../../../types';
import IdleTimerManager from 'react-native-idle-timer';
import { v4 } from 'uuid';
import { UUID } from './constants/Uuids';
import { OadEvent, OadProtocolOpCode, OadResetServiceOpCodes, MsOadState } from './constants/OpCodes';
import { OadStatus } from './constants/Statuses';
import { MsOadFileType, MsOadImageHalf } from './constants/MsOadFileTypes';
import { buf2hex } from '../../hooks/convert';
import SelectFirmwareImage from './SelectFirmwareImage/index';
import { Buffer } from 'buffer';
import { useFirmwareRepoContext } from '../../context/FirmwareRepoContext';
import * as DocumentPicker from 'expo-document-picker';
import { AntDesign } from '@expo/vector-icons';
import { useMsOad } from './FWUpdate_MsOad';

interface Props {
  peripheralId: string;
}

type FW = {
  label: string;
  value: string;
  version: string;
  hwType: string;
  imageType: ImageType;
  local?: boolean;
  bytes: Uint8Array;
};

type ImageType = 'bim' | 'mcuboot' | null;

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
  const [progress, setProgress] = useState<number>(0);
  const [imgLength, setImgLength] = useState<number>(0);
  const [localFileError, setLocalFileError] = useState<'success' | 'error' | 'cancelled' | 'fs' | 'unknownImgType' | null>(null);
  const [deviceSwVersion, setDeviceSwVersion] = useState<string | undefined>(undefined);

  const { currentRepoDetails, updateRepository } = useFirmwareRepoContext();

  // Initialize MS-OAD hook (all MS-OAD state and functions are managed here)
  const msOad = useMsOad({
    peripheralId,
    setStatus,
    setProgress,
    setUpdating,
    writeWaitNotify,
    getSwVersion,
    getImgVersionFromImg,
    setDeviceSwVersion,
  });

  let fakeUpdateInterval = useRef<ReturnType<typeof setInterval>>(null);

  const charValueSubscription = useRef<EventSubscription | null>(null);
  const disconnectSubscription = useRef<EventSubscription | null>(null);

  let fwImageByteArray: Uint8Array;
  let blockSize = 20;
  let numBlocks = 0;

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
    async function fetchFirmwares() {
      let accessToken = null;
      if (currentRepoDetails.visibility === 'private') {
        accessToken = currentRepoDetails.accessToken;
      }
      getAvailableFw(currentRepoDetails.name, currentRepoDetails.owner, accessToken)
        .then(() => {
          console.log('getAvailableFw success');
        })
        .catch((error) => {
          console.log('getAvailableFw error ', error);
        });
    }

    async function queryInitialDeviceVersion() {
      // Query device version when entering the screen
      setStatus('Querying device version...');
      const version = await getSwVersion();
      if (version) {
        setDeviceSwVersion(version);
        setStatus('Ready for firmware update');
      } else {
        setStatus('Ready for firmware update (version query failed)');
      }
    }

    msOad.isMultistepOadMode().then((isMsOad) => {
      if (!isMsOad) {
        // classic OAD, fetch firmwares.
        fetchFirmwares();
      } else {
        // MS-OAD mode, query device version
        queryInitialDeviceVersion();
      }
    })

    return () => {
      setUpdating(false);
      if (fakeUpdateInterval.current) {
        clearInterval(fakeUpdateInterval.current);
      }

    };
  }, []);

  useEffect(() => {
    console.log('repo URL changed', currentRepoDetails.url);

    getAvailableFw(currentRepoDetails.name, currentRepoDetails.owner, currentRepoDetails.accessToken)
      .then(() => {
        console.log('getAvailableFw success');
      })
      .catch((error) => {
        console.log('getAvailableFw error ', error);
      });

    return () => {
      setUpdating(false);
      if (fakeUpdateInterval.current) {
        clearInterval(fakeUpdateInterval.current);
      }
    };
  }, [currentRepoDetails]);

  useEffect(() => {
    if (selectedFW != undefined) {
      getFwUpdateImage();
    }
  }, [selectedFW]);

  useEffect(() => {
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
    } else if (localFileError == 'unknownImgType') {
      return { message: 'Unknown Image Type!', color: 'red' };
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

  const startFwUpdate = () => {
    console.log('startFwUpdate');
    setUpdating(true);

    if (msOad.msOadEnabled) {
      asyncStartMsOadUpdate(peripheralId);
    } else {
      asyncStartFwUpdate(peripheralId);
    }
  };

  const cancel = () => {
    setUpdating(false);
    setSelectedFW(undefined);
    setProgress(0);

    /* Remove the block response listener */
    charValueSubscription.current?.remove();

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
    fwImageByteArray = await getFwUpdateImage();

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

  async function asyncStartMsOadUpdate(peripheralId: string) {
    console.log('Starting MS-OAD update flow');
    msOad.logMsOad('=== MS-OAD UPDATE STARTED ===');

    try {
      // Validate that all 4 files are loaded
      if (!msOad.msOadImagesLoaded[MsOadFileType.ORIGINAL_V1] ||
        !msOad.msOadImagesLoaded[MsOadFileType.NEW_V2]) {
        const errorMsg = 'Missing MS-OAD firmware images - both original and new required';
        msOad.logMsOad(`ERROR: ${errorMsg}`);
        alert('Please upload both MS-OAD firmware images (Original FW and New FW) before starting the update.\n\nEach file should be 0x76800 (485,376) bytes and will be automatically split.');
        setStatus('Missing MS-OAD firmware images');
        setUpdating(false);
        return;
      }

      msOad.logMsOad('Both MS-OAD firmware images loaded (Original V1 and New V2)');

      /* Set the MTU Size - Android only API 21+, iOS initiates an MTU exchange automatically upon connection */
      if (Platform.OS === 'android') {
        await BleManager.requestConnectionPriority(peripheralId, 1);
        let mtu = await BleManager.requestMTU(peripheralId, 255);
        msOad.logMsOad(`MTU set to: ${mtu}`);
      }

      // Query current MS-OAD state
      const currentState = await msOad.getMsOadState();
      msOad.logMsOad(`Initial state: ${msOad.getMsOadStateDescription(currentState)} (${currentState})`);

      // If in IDLE state, initialize MS-OAD
      if (currentState === MsOadState.MS_OAD_IDLE) {
        setStatus('Sending image identify request...');
        msOad.logMsOad('PHASE 1: Initialization - Sending image identify request');

        // Step 1: Send image identify request with new image (first half bootable) header
        const newImageFirstHalf = msOad.getImageHalf(MsOadFileType.NEW_V2, MsOadImageHalf.FIRST_HALF);

        const identifySuccess = await msOad.sendMsOadImageIdentifyRequest(peripheralId, newImageFirstHalf!, writeWaitNotify);
        if (!identifySuccess) {
          msOad.logMsOad('ERROR: Image identify request failed');
          setStatus('Image identify request failed');
          setUpdating(false);
          return;
        }

        // Step 2: Initialize MS-OAD
        setStatus('Initializing MS-OAD...');
        msOad.logMsOad('Sending MS-OAD init command...');

        // Set up disconnect listener BEFORE sending init command
        const resetPromise = msOad.handleMsOadDeviceReset(peripheralId);

        // Now send the init command (device will reset immediately)
        const initSuccess = await msOad.initMsOad();

        if (!initSuccess) {
          msOad.logMsOad('ERROR: Failed to initialize MS-OAD');
          setStatus('Failed to initialize MS-OAD');
          setUpdating(false);
          return;
        }

        // Wait for device reset and reconnection
        setStatus('Waiting for device reset...');
        await resetPromise;
      }
      else if (currentState === MsOadState.MS_OAD_UNINITIALIZED) {
        msOad.logMsOad('Device in UNINITIALIZED state');
      }
      else {
        // Device is already in an MS-OAD state, continue from there
        msOad.logMsOad(`Resuming from existing state: ${msOad.getMsOadStateDescription(currentState)}`);
        await msOad.handleMsOadStateTransfer(peripheralId, currentState);
      }
    } catch (error) {
      console.error('MS-OAD update error:', error);
      const errorMsg = `MS-OAD update failed: ${error}`;
      msOad.logMsOad(`ERROR: ${errorMsg}`);
      setStatus(errorMsg);
      setUpdating(false);
    }
  }

  async function getAvailableFw(repoName: string, repoOwner: string | null, accessToken: string | undefined) {
    const apiUrl = currentRepoDetails.useGitHub ? `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main` : currentRepoDetails.url;

    const headers = {
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      'Cache-Control': 'no-store',
    };

    fetch(`${apiUrl}/firmware.json`, currentRepoDetails.useGitHub ? { headers } : undefined)
      .then(async (data) => {
        if (!data.ok) {
          setStatus('Server not found');
          console.error('fetch error: ', data.status, data.statusText);
          alert(`Error fetching firmwares from ${apiUrl}/firmware.json. \nstatus: ${data.status + data.statusText}`)
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
        console.error('fetch error: ', error);
        alert(`Error fetching firmwares from ${apiUrl}/firmware.json. \nerror: ${error}`)

      });
  }

  async function getFwUpdateImage(): Promise<Uint8Array> {
    let accessToken: any = null;

    if (currentRepoDetails.visibility === 'private') {
      accessToken = currentRepoDetails.accessToken;
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
        const apiUrl = currentRepoDetails.useGitHub ? `https://raw.githubusercontent.com/${currentRepoDetails.owner}/${currentRepoDetails.name}/main` : currentRepoDetails.url;

        fetch(apiUrl + '/' + (selectedFW ?? ''), currentRepoDetails.useGitHub ? { headers } : undefined)
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
        alert('Device did not reset to OAD service. Press reset button on device');
      }, 12000);

      disconnectSubscription.current?.remove();

      /* Wait for device to disconnect then connect again, and find the OAD service */
      disconnectSubscription.current = BleManager.onDisconnectPeripheral(
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

          disconnectSubscription.current?.remove();
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

    disconnectSubscription.current?.remove();
    disconnectSubscription.current = BleManager.onDisconnectPeripheral(
      () => {
        setProgress(1);
        setStatus('Device reset');
        console.log('resetAfterOad - device disconnected');

        disconnectSubscription.current?.remove();
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
    /* Get the SW Version - Response format (7 bytes):
        uint8       cmdID;         //!< Ctrl Op-code (0x07)
        uint8       major;         //!< Major version
        uint8       minor;         //!< Minor version
        uint8       reserved;      //!< Reserved/padding byte
        uint8       revision;      //!< Revision number (single byte)
        uint16      build;         //!< Build number (2 bytes, little-endian)

        Example: [7, 2, 3, 0, 4, 0, 0] = version 2.3.4.0
    */
    var ImgControlPointCmd = new Uint8Array([OadProtocolOpCode.OAD_REQ_GET_SW_VER]);
    let rsp = await writeWaitNotify(
      peripheralId,
      UUID.OadServiceUuid,
      UUID.ImageControlPointUuid,
      true,
      ImgControlPointCmd,
      1
    );
    let SWVersion;
    if (rsp[0] == OadProtocolOpCode.OAD_REQ_GET_SW_VER) {
      // Parse MCUboot version from BLE response: major.minor.revision.build
      const major = rsp[1];          // byte 1: major
      const minor = rsp[2];          // byte 2: minor
      // rsp[3] is padding/reserved
      const revision = rsp[4];       // byte 4: revision (single byte)
      const buildNum = rsp[5] | (rsp[6] << 8);  // bytes 5-6: build (2 bytes little-endian)

      SWVersion = `${major}.${minor}.${revision}.${buildNum}`;
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
          (fwImageByteArray[8] +
            (fwImageByteArray[9] << 8)) +
          ((fwImageByteArray[10]) +
            (fwImageByteArray[11] << 8));


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
    rsp = await writeWaitNotify(
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
    rsp = await writeWaitNotify(
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

  // Original OAD block transfer function
  function sendImageBlocks(peripheralId: string): void {
    setStatus('FW Update in progress');
    charValueSubscription.current?.remove();

    console.log('sendImageBlocks: fwImageByteArray.length: ', fwImageByteArray.length);
    let prevProgress = 0;

    // Add event listener for original OAD block requests
    charValueSubscription.current = BleManager.onDidUpdateValueForCharacteristic(
      async ({ value, peripheral, characteristic, service }: { value: number[]; peripheral: string; characteristic: string; service: string }) => {
        let blockRequested: number;

        // Block request
        if (characteristic.toUpperCase() === UUID.ImageControlPointUuid && value[0] === OadProtocolOpCode.OAD_RSP_BLK_RSP_NOTIF) {

          // Download complete
          if (value[1] === OadStatus.OAD_PROFILE_DL_COMPLETE) {
            console.log('OAD download complete');
            charValueSubscription.current?.remove();

            // Regular OAD: send ENABLE_IMG
            let ImgControlPointCmd = new Uint8Array([OadEvent.OAD_EVT_ENABLE_IMG]);
            var ImgControlPointCmdArray = Array.from(ImgControlPointCmd);

            try {
              await BleManager.writeWithoutResponse(
                peripheralId,
                UUID.OadServiceUuid,
                UUID.ImageControlPointUuid,
                ImgControlPointCmdArray,
                1
              );
              console.log('Sent OAD_EVT_ENABLE_IMG');
              setProgress(1);
              setStatus('Firmware update complete!');
            } catch (error) {
              console.log('Write failed: ' + error);
              setStatus('Failed to enable image');
            }
          }
          // Block request - send next block
          else if (value[1] === OadStatus.OAD_PROFILE_SUCCESS) {
            blockRequested = value[2] + (value[3] << 8) + (value[4] << 16) + (value[5] << 24);

            let progressUpdate = 0.98 * (blockRequested / numBlocks);
            if (Math.floor(progressUpdate * 100) > prevProgress) {
              setProgress(progressUpdate);
            }
            prevProgress = Math.floor(progressUpdate * 100);

            const fwImageByteOffset = blockRequested * blockSize;

            // Last block - reduce block size to match last bytes of image
            if (blockRequested === numBlocks) {
              blockSize = fwImageByteArray.length - blockSize * numBlocks;
              console.log('LastBlock: size %d', blockSize);
            }

            console.log('Block Request[' + blockSize + ']: ' + blockRequested + ' of ' + numBlocks);

            const blockData = fwImageByteArray.slice(fwImageByteOffset, fwImageByteOffset + blockSize);
            await writeBlock(peripheralId, blockRequested, blockData, blockSize);
          }
          // Error
          else {
            console.log('Unknown OAD response status: ' + value[1]);
            alert('OAD Failed');
            setStatus('OAD block transfer failed');
            setProgress(0);
          }
        }
        // OAD Finished - received ENABLE_IMG confirmation
        else if (characteristic.toUpperCase() === UUID.ImageControlPointUuid && value[0] === OadEvent.OAD_EVT_ENABLE_IMG) {
          console.log('Received ENABLE_IMG confirmation', value[1]);
          resetAfterOad(peripheral);
        }
      }
    );

    // Send START_OAD command
    console.log('Sending OAD_EVT_START_OAD command');
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
  ): Promise<void> {
    let BlockRspCmd = new Uint8Array(blockSize + 4);

    BlockRspCmd[3] = (blockRequested >> 24) & 0xff;
    BlockRspCmd[2] = (blockRequested >> 16) & 0xff;
    BlockRspCmd[1] = (blockRequested >> 8) & 0xff;
    BlockRspCmd[0] = blockRequested & 0xff;

    /* copy in image data after header */
    BlockRspCmd.set(blockData, 4);
    var BlockRspCmdArray = Array.from(BlockRspCmd);

    // Return the Promise so await works properly
    return BleManager.write(
      peripheralId,
      UUID.OadServiceUuid,
      UUID.ImageBlockRequestUuid,
      BlockRspCmdArray,
      BlockRspCmd.length
    ).catch((error: any) => {
      console.error('Block write failed for block ' + blockRequested, error);
      throw error;
    });
  }

  async function writeWaitNotify(
    peripheralId: string,
    serviceUuid: string,
    charUuid: string,
    withoutResponse: boolean,
    cmdByteArray: Uint8Array,
    len: number
    //@ts-ignore
  ): Array {
    // To enable BleManagerDidUpdateValueForCharacteristic listener
    await BleManager.startNotification(peripheralId, serviceUuid, charUuid);

    return new Promise((resolve, reject) => {
      let subscription = BleManager.onDidUpdateValueForCharacteristic(
        ({ value, peripheral, characteristic, service }: { value: number[]; peripheral: string; characteristic: string; service: string }) => {
          subscription.remove();
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
        })
        .catch((error: any) => {
          // Failure code
          console.error('Write failed:', error);
          reject();
        });
    });
  }


  const blobToUint8Array = (blob: Blob): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          resolve(new Uint8Array(reader.result as ArrayBuffer));
        } else {
          reject(new Error('Failed to convert blob to ArrayBuffer'));
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  };

  const addFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        setLocalFileError('cancelled');
        return;
      }

      const file = result.assets[0];

      if (!file?.uri) {
        throw new Error('File URI is undefined');
      }

      // Fetch the file as blob
      const response = await fetch(file.uri);
      const blob = await response.blob();

      // Convert blob to Uint8Array using FileReader
      const bytes = await blobToUint8Array(blob);

      // Firmware parsing logic
      const imgVersionMajor = bytes[20];
      const imgVersionMinor = bytes[21];
      const imgRevision = bytes[22] + (bytes[23] << 8);
      const imgBuildNum =
        bytes[24] +
        (bytes[25] << 8) +
        (bytes[26] << 16) +
        (bytes[27] << 24);

      const buildVersion =
        `${imgVersionMajor}.${imgVersionMinor}.${imgRevision}.${imgBuildNum}`;

      const imageType = getImgType(bytes);

      if (!imageType) {
        setLocalFileError('unknownImgType');
        return;
      }

      const uploadedImage = {
        hwType: 'N/A',
        imageType,
        label: file.name ?? 'Not specified',
        version: buildVersion,
        value: v4(),
        local: true,
        bytes,
      };

      setFirmwares(prev => [uploadedImage, ...prev]);
      setSelectedFW(uploadedImage.value);
      setSelectedHW('N/A');

      console.log('✅ File parsed successfully');
    } catch (err) {
      console.error('addFile error:', err);
      setLocalFileError('error');
    }
  };

  function getImgType(imgContent: Uint8Array): ImageType {
    let magicNumber = new Uint8Array(imgContent.buffer.slice(0, 4));
    let hexMagicNumber = Buffer.from(magicNumber).toString('hex');

    if (hexMagicNumber === '3db8f396' || hexMagicNumber === '3db8f397') {
      return 'mcuboot';
    }
    else if (hexMagicNumber === '43433236') {
      return 'bim';
    }
    else {
      return null;
    }
  }

  return (
    <ScrollView >
      {!msOad.msOadEnabled ? (
        <>
          <SelectFirmwareImage
            hwTypes={hwTypes}
            selectedHW={selectedHW}
            setSelectedHW={setSelectedHW}
            firmwares={firmwares}
            setSelectedFW={setSelectedFW}
            selectedFW={selectedFW}
          />
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
        </>
      ) : (
        <View style={{ marginBottom: 10 }}>
          {/* Header */}
          <Text style={[styles.sectionHeader, { backgroundColor: Colors.lightGray }]}>
            Upload Firmware Images</Text>
          <View style={styles.msOadSummaryContainer}>
            <Text style={styles.msOadSubtitle}>
              Upload 2 complete firmware images - the new firmware and the original firmware (for rollback).
            </Text>

            {/* File Cards - Complete firmware images (app splits automatically) */}
            <View style={styles.msOadCardsContainer}>
              {/* Original FW v1 */}
              <TouchableOpacity
                onPress={() => !msOad.msOadImagesLoaded[MsOadFileType.ORIGINAL_V1] && msOad.addMsOadFile(MsOadFileType.ORIGINAL_V1)}
                style={[
                  styles.msOadCard,
                  msOad.msOadImagesLoaded[MsOadFileType.ORIGINAL_V1] && styles.msOadCardUploaded
                ]}
                activeOpacity={msOad.msOadImagesLoaded[MsOadFileType.ORIGINAL_V1] ? 1 : 0.7}
              >
                <View style={[
                  styles.msOadCardIcon,
                  msOad.msOadImagesLoaded[MsOadFileType.ORIGINAL_V1] && styles.msOadCardIconUploaded
                ]}>
                  {msOad.msOadImagesLoaded[MsOadFileType.ORIGINAL_V1] ? (
                    <AntDesign name="check" size={20} color={'white'} />
                  ) : (
                    <AntDesign name="file-text" size={20} color={Colors.gray} />
                  )}
                </View>
                <View style={[styles.msOadCardContent, msOad.msOadImagesLoaded[MsOadFileType.ORIGINAL_V1] && styles.msOadCardUploaded]}>
                  <Text style={styles.msOadCardTitle}>Original Firmware</Text>
                  <Text style={[styles.msOadCardSubtitle, !msOad.msOadImagesLoaded[MsOadFileType.ORIGINAL_V1] && { color: Colors.blue }]} numberOfLines={1}>
                    {msOad.msOadImagesLoaded[MsOadFileType.ORIGINAL_V1]
                      ? msOad.msOadFileNames[MsOadFileType.ORIGINAL_V1]
                      : 'Tap to upload'}
                  </Text>
                </View>
                {msOad.msOadImagesLoaded[MsOadFileType.ORIGINAL_V1] && (
                  <TouchableOpacity
                    onPress={() => msOad.removeMsOadFile(MsOadFileType.ORIGINAL_V1)}
                    style={styles.msOadCardRemove}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <AntDesign name="close" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* New FW v2 */}
              <TouchableOpacity
                onPress={() => !msOad.msOadImagesLoaded[MsOadFileType.NEW_V2] && msOad.addMsOadFile(MsOadFileType.NEW_V2)}
                style={[
                  styles.msOadCard,
                  msOad.msOadImagesLoaded[MsOadFileType.NEW_V2] && styles.msOadCardUploaded
                ]}
                activeOpacity={msOad.msOadImagesLoaded[MsOadFileType.NEW_V2] ? 1 : 0.7}
              >
                <View style={[
                  styles.msOadCardIcon,
                  msOad.msOadImagesLoaded[MsOadFileType.NEW_V2] && styles.msOadCardIconUploaded
                ]}>
                  {msOad.msOadImagesLoaded[MsOadFileType.NEW_V2] ? (
                    <AntDesign name="check" size={20} color={'white'} />
                  ) : (
                    <AntDesign name="file-text" size={20} color={Colors.gray} />
                  )}
                </View>
                <View style={[styles.msOadCardContent, msOad.msOadImagesLoaded[MsOadFileType.NEW_V2] && styles.msOadCardUploaded]}>
                  <Text style={styles.msOadCardTitle}>New Firmware</Text>
                  <Text style={[styles.msOadCardSubtitle, !msOad.msOadImagesLoaded[MsOadFileType.NEW_V2] && { color: Colors.blue }]} numberOfLines={1}>
                    {msOad.msOadImagesLoaded[MsOadFileType.NEW_V2]
                      ? msOad.msOadFileNames[MsOadFileType.NEW_V2]
                      : 'Tap to upload'}
                  </Text>

                </View>
                {msOad.msOadImagesLoaded[MsOadFileType.NEW_V2] && (
                  <TouchableOpacity
                    onPress={() => msOad.removeMsOadFile(MsOadFileType.NEW_V2)}
                    style={styles.msOadCardRemove}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <AntDesign name="close" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            {localFileErrorMessage.message ? (
              <Text style={{ color: localFileErrorMessage.color, textAlign: 'center', marginTop: 10 }}>
                {localFileErrorMessage.message}
              </Text>
            ) : null}
          </View>
        </View>
      )}

      {!msOad.msOadEnabled && (
        <View style={{ marginBottom: 20 }}>
          <Text
            style={[styles.sectionHeader, { backgroundColor: Colors.lightGray }]}
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
      )}

      {msOad.msOadEnabled && (
        <View style={{ marginBottom: 10 }}>
          <Text
            style={[styles.sectionHeader, { backgroundColor: Colors.lightGray }]}
          >
            OAD Information
          </Text>
          <View style={styles.msOadSummaryContainer}>
            <Text style={styles.msOadSummaryTitle}>Uploaded Firmware Files:</Text>

            {/* Original Firmware */}
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.msOadSummaryItem}>
                Original Firmware: {msOad.msOadImagesLoaded[MsOadFileType.ORIGINAL_V1] ? `${msOad.getMsOadImage(MsOadFileType.ORIGINAL_V1)?.length.toLocaleString()} bytes (v${msOad.msOadVersions[MsOadFileType.ORIGINAL_V1]})` : 'N/A'}
              </Text>
            </View>

            {/* New Firmware */}
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.msOadSummaryItem}>
                New Firmware: {msOad.msOadImagesLoaded[MsOadFileType.NEW_V2] ? `${msOad.getMsOadImage(MsOadFileType.NEW_V2)?.length.toLocaleString()} bytes (v${msOad.msOadVersions[MsOadFileType.NEW_V2]})` : 'N/A'}
              </Text>
            </View>

            {/* Device Information */}
            <Text style={styles.msOadSummaryTitle}>Device Information:</Text>
            <Text style={[styles.msOadSummaryItem]}>
              Current SW Version: {deviceSwVersion || 'Querying...'}
            </Text>
          </View>
        </View>
      )}

      <View style={{ flex: 2 }}>
        <Text
          style={[styles.sectionHeader, { backgroundColor: Colors.lightGray }]}
        >
          Status
        </Text>
        <Text style={{ paddingLeft: 20, marginTop: 20 }}>{status}</Text>
        {updating && (
          <View>
            <Text style={{ textAlign: 'center', marginTop: 20 }}>
              Progress
            </Text>
            <LinearProgress
              value={msOad.msOadEnabled ? msOad.msOadOverallProgress : progress}
              color={Colors.blue}
              style={[styles.linearProgress]}
            />
            <Text style={{ marginBottom: 10, textAlign: 'center' }}>
              {Math.floor((msOad.msOadEnabled ? msOad.msOadOverallProgress : progress) * 100).toFixed(0)}%
            </Text>
          </View>
        )}
      </View>
      {
        progress < 1 && (
          <View
            style={{ flex: 2, flexDirection: 'row', justifyContent: 'space-evenly', marginVertical: 30 }}
          >
            <TouchableOpacity style={[styles.buttonWrapper]} onPress={cancel}>
              <Text style={{ color: Colors.blue, fontSize: 18 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.buttonWrapper,
                {
                  opacity: updating || (msOad.msOadEnabled ?
                    (!msOad.msOadImagesLoaded[MsOadFileType.ORIGINAL_V1] || !msOad.msOadImagesLoaded[MsOadFileType.NEW_V2]) :
                    selectedFW == null) ? 0.6 : 1,
                },
              ]}
              disabled={updating || (msOad.msOadEnabled ?
                (!msOad.msOadImagesLoaded[MsOadFileType.ORIGINAL_V1] || !msOad.msOadImagesLoaded[MsOadFileType.NEW_V2]) :
                selectedFW == null)}
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
            style={{ flex: 2, flexDirection: 'row', justifyContent: 'space-evenly', marginVertical: 30 }}
          >
            <TouchableOpacity style={[styles.buttonWrapper, { width: "90%" }]} onPress={cancel}>
              <Text style={{ color: Colors.blue, fontSize: 18 }}>Done</Text>
            </TouchableOpacity>
          </View>
        )
      }

      {/* MS-OAD Log Export Button */}
      {/* {msOad.msOadEnabled && (
        <View style={{ marginTop: 30, marginBottom: 20 }}>
          <Text style={[styles.sectionHeader, { backgroundColor: Colors.lightGray }]}>
            MS-OAD Logs
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', paddingVertical: 15 }}>
            <TouchableOpacity
              style={[styles.buttonWrapper]}
              onPress={msOad.exportMsOadLogs}
            >
              <Text style={{ color: Colors.blue, fontSize: 18 }}>Export Logs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.buttonWrapper, { borderColor: Colors.blue, borderWidth: 1 }]}
              onPress={msOad.clearMsOadLogs}
            >
              <Text style={{ color: Colors.blue, fontSize: 18 }}>Clear Logs</Text>
            </TouchableOpacity>
          </View>
        </View>
      )} */}
    </ScrollView >
  );
};

const styles = StyleSheet.create({
  dialogTitle: { color: 'white', textAlign: 'center' },
  buttonWrapper: {
    paddingHorizontal: 20,
    alignItems: 'center',
    borderColor: Colors.blue,
    borderWidth: 1
  },
  linearProgress: {
    height: 10,
    width: '80%',
    alignSelf: 'center',
    marginVertical: 10,
    borderRadius: 5,
  },
  sectionHeader: {
    paddingLeft: 10,
    fontSize: 20,
    fontWeight: 'bold',
    paddingVertical: 20,
  },
  // MS-OAD Card-based styles
  msOadSubtitle: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 10,
  },
  msOadCardsContainer: {
    gap: 12,
  },
  msOadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.lightGray,
  },
  msOadCardUploaded: {
    borderStyle: 'solid',
    borderColor: Colors.active,
    backgroundColor: '#f8faff',
  },
  msOadCardIcon: {
    width: 30,
    height: 30,
    borderRadius: 22,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  msOadCardIconUploaded: {
    backgroundColor: Colors.active,
  },
  msOadCardContent: {
    flex: 1,
  },
  msOadCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'black',
    marginBottom: 2,
  },
  msOadCardSubtitle: {
    fontSize: 13,
    color: Colors.gray,
  },
  msOadCardRemove: {
    padding: 8,
    backgroundColor: 'rgba(221, 0, 0, 0.06)',
    borderRadius: 20,
  },
  msOadSummaryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  msOadSummaryTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  msOadSummaryItem: {
    paddingLeft: 10,
    paddingVertical: 2,
  },
  msOadSummarySuccess: {
    paddingTop: 10,
    color: '#28a745',
    fontWeight: 'bold',
  },
});

export default FWUpdate_Modal;