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

import React from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { LinearProgress } from '@rneui/base';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Text, TouchableOpacity, View } from '../../../components/Themed';
import Colors from '../../../constants/Colors';
import useColorScheme from '../../../hooks/useColorScheme';
import BleManager from 'react-native-ble-manager';
import { encode as btoa, decode } from 'base-64';
import { useNavigation } from '@react-navigation/native';
import { DeviceScreenNavigationProp } from '../../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import services from '../../../assets/services';
import IdleTimerManager from 'react-native-idle-timer';

interface Props {
  peripheralId: string;
}

type FW = {
  label: string;
  value: string;
  version: string;
  hwType: string;
  imageType: string;
};

let availableFirmwares: FW[] = [];

const FWUpdate_Modal: React.FC<Props> = ({ peripheralId }) => {
  let navigation = useNavigation<DeviceScreenNavigationProp>();

  const [openDropdown, setOpenDropdown] = useState<boolean>(false);
  const [selectedFW, setSelectedFW] = useState<string>();
  const [firmwares, setFirmwares] = useState<FW[]>(availableFirmwares);
  const [status, setStatus] = useState<String>('');
  const [updating, setUpdating] = useState<boolean>(false);
  const [blockNum, setBlockNum] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [imgVersionStr, setImgVersionStr] = useState<String>('');
  const [imgLength, setImgLength] = useState<number>(0);

  let fakeUpdateInterval = useRef<ReturnType<typeof setInterval>>();

  let theme = useColorScheme();

  const BleManagerModule = NativeModules.BleManager;
  const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

  const OadServiceUuid = 'F000FFC0-0451-4000-B000-000000000000';
  const ImageIdentifyWriteUuid = 'F000FFC1-0451-4000-B000-000000000000';
  const ImageBlockRequestUuid = 'F000FFC2-0451-4000-B000-000000000000';
  const ImageControlPointUuid = 'F000FFC5-0451-4000-B000-000000000000';

  const OadResetServiceUuid = 'F000FFD0-0451-4000-B000-000000000000';
  const OadResetCharUuid = 'F000FFD1-0451-4000-B000-000000000000';

  /*!
   * Using OAD Reset Service start a new OAD operation OAD_RESET_CMD_START_OAD
   * The target device will invalidate the current running image and begin
   * the update process
   */
  const OadResetCharOadResetCmdStartOad = 0x01;

  /*!
   * Get Block Size external control command op-code
   * This command is used by a peer to determine what is the largest block
   * size the target can support
   */
  const ImageControlPointGetBlkSize = 0x01;

  /*!
   * Start OAD external control command op-code
   * This command is used to tell the target device that the configuration stage
   * has completed and it is time to start sending block requests
   */
  const ImageControlPointStartOad = 0x03;

  /*!
   * Enable image external control command op-code
   * This command is used to enable an image after download, instructing the
   * target to prepare the image to run and then reboot
   */
  const ImageControlPointEnableImg = 0x04;

  /*!
   * Cancel OAD external control command op-code
   * This command is used to cancel the OAD process
   */
  const ImageControlPointCancelOad = 0x05;

  /*!
   * Disable block notification external control command op-code
   * This command is used to disable the image block request notifications
   */
  const ImageControlPointDisableBlkNotify = 0x06;

  /*!
   * Get software version external control command op-code
   * This command is used to query the OAD target device for its software version
   */
  const ImageControlPointGetSwVer = 0x07;

  /*!
   * Get status external control command op-code
   * This command is used to query the status of the OAD process.
   */
  const ImageControlPointGetImgStat = 0x08;

  /*!
   * Get profile version external control command op-code
   * This command is used to query the version of the OAD profile
   */
  const ImageControlPointGetProfileVer = 0x09;

  /*!
   * Get device type external control command op-code
   * This command is used to query type of the device the profile is running on
   */
  const ImageControlPointGetDevType = 0x10;

  /*!
   * Get image info external control command op-code
   * This command is used to get the image info structure corresponding to the
   * the image asked for
   */
  const ImageControlPointGetImgInfo = 0x11;

  /*!
   * Send block request external control command op-code
   * This command is used to send a block request notification to the peer device
   */
  const OAD_EXT_CTRL_BLK_RSP_NOTIF = 0x12;

  /*!
   * Erase bonds external control command op-code
   * This command is used to erase all BLE bonding info on the device
   */
  const OAD_EXT_CTRL_ERASE_BONDS = 0x13;

  const OAD_EXT_CTRL_BLK_RSP_SUCCESS = 0;
  const OAD_EXT_CTRL_BLK_RSP_DL_COMPLETE = 14;

  let fwImageByteArray: Uint8Array;
  let blockSize = 20;
  let numBlocks = 0;

  let blockEventSubstription: any = undefined

  console.log('FWUpdate_Modal', peripheralId)

  useEffect(() => {
    /* component mounting, disable lock screen sleep */
    IdleTimerManager.setIdleTimerDisabled(true, 'fw-update-screen');

    /* returned function will be called on component unmount */
    return () => {
      /* component unmounting, enable lock screen sleep */
      IdleTimerManager.setIdleTimerDisabled(false, 'fw-update-screen');
    }
  }, []);

  useEffect(() => {
    console.log('selectedFW selected: ', selectedFW);
    if(selectedFW != undefined)
    {
      getFwUdateImage();
    }
  }, [selectedFW]);

  useEffect(() => {
    console.log('firmwares changed');
  }, [firmwares]);

  const getUserRepository = async (): Promise<String> => {
    let userRepo = await AsyncStorage.getItem('@repository');
    return userRepo
      ? userRepo
      : 'https://github.com/Bluwbee/ti-simplelink-connect-fw-bins/raw/master/';
  };

  useEffect(() => {
    console.log('clear');

    console.log('getAvailableFw');
    getAvailableFw()
      .then(() => {
        console.log('getAvailableFw success');
      })
      .catch((error) => {
        console.log('getAvailableFw error ', error);
      });

    return () => {
      setUpdating(false);
      clearInterval(fakeUpdateInterval.current);
    };
  }, []);

  const startFwUpdate = () => {
    console.log('startFwUpdate');
    setUpdating(true);
    asyncStartFwUpdate(peripheralId);
  };

  const cancel = () => {
    setUpdating(false);
    setSelectedFW(null);
    setProgress(0);

    /* Remove the block response listener */
    bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic')

    /* cancel OAD on the device */
    let ImgControlPointCancelCmd = new Uint8Array([ImageControlPointCancelOad]);
    var cmdArray = Array.from(ImgControlPointCancelCmd);
    BleManager.writeWithoutResponse(
      peripheralId,
      OadServiceUuid,
      ImageControlPointUuid,
      cmdArray,
      1
    )

    navigation.goBack();
  };

  async function asyncStartFwUpdate(peripheralId: string) {
    console.log('calling getFwUdateImage: ', peripheralId);
    fwImageByteArray = await getFwUdateImage();

    let oadService = await checkOadServices(peripheralId);

    if (oadService === OadResetServiceUuid) {
      oadService = await resetToOadServices(peripheralId);
    }

    if (oadService === oadService) {
      await sendiImagUpdateReq(peripheralId);
      sendImageBlocks(peripheralId);
    } else {
      console.log('oadServiceError');
    }
  }

  async function getAvailableFw() {
    let repository = await getUserRepository();
    console.log('getAvailableFw: ', repository);
    fetch(`${repository}/firmware.json`, 
      {headers: 
        {'Cache-Control': 'no-store'}
      })
      .then(async (data) => {
        let fwFile = await data.blob();

        let fwFileContents = fwFile.slice(0, fwFile.size);

        const fileReaderInstance = new FileReader();
        fileReaderInstance.readAsDataURL(fwFileContents);
        fileReaderInstance.onload = () => {
          const content = decode(
            fileReaderInstance.result?.substr('data:application/octet-stream;base64,'.length)
          );

          let fetchedFirmwares: string = ''
          
          try {
            fetchedFirmwares = JSON.parse(content);

            let mappedFetchedFirmwares = fetchedFirmwares.map((fw) => ({
              label: fw.fileName,
              value: fw.fileName,
              version: fw.version,
              hwType: fw.hwType,
              imageType: fw.imageType,
            }));
            console.log(mappedFetchedFirmwares);

            setFirmwares(mappedFetchedFirmwares);

            console.log('Connected FW server')
            setStatus('Connected FW server');      
          }
          catch {
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
    let repository = await getUserRepository();

    return new Promise((resolve, reject) => {
      console.log('getFwUdateImage');

      fetch( repository + (selectedFW??''), {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
        })
        .then(async (data) => {

          let binary = await data.blob();

          let bytes = binary.slice(0, binary.size);

          const fileReaderInstance = new FileReader();
          fileReaderInstance.readAsDataURL(bytes);
          fileReaderInstance.onload = () => {
            const content = decode(
              fileReaderInstance.result?.substr('data:application/octet-stream;base64,'.length)
            );

            const buffer = new ArrayBuffer(content.length);
            let fwImageBinary = new Uint8Array(buffer);

            fwImageBinary.set(Array.from(content).map((c) => c.charCodeAt(0)));

            resolve(fwImageBinary);

            console.log('Found selected FW image ', fwImageBinary.length);
            if(fwImageBinary.length > 0)
            {
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

  async function checkOadServices(peripheralId: string) {
    console.log('checkOadServices');
    return new Promise((resolve, reject) => {
      BleManager.startNotification(peripheralId, OadServiceUuid, ImageIdentifyWriteUuid)
        .then(() => {
          console.log('device has OadServiceUuid');
          setStatus('Found OAD Service');
          BleManager.stopNotification(peripheralId, OadServiceUuid, ImageIdentifyWriteUuid).then(
            () => {
              resolve(OadServiceUuid);
            }
          );
        })
        .catch((e) => {
          console.log('device does not have OadServiceUuid ', e);

          let oadResetCmd = new Uint8Array([OadResetCharOadResetCmdStartOad]);
          var oadResetCmdArray = Array.from(oadResetCmd);

          BleManager.writeWithoutResponse(
            peripheralId,
            OadResetServiceUuid,
            OadResetCharUuid,
            oadResetCmdArray
          )
            .then(() => {
              console.log('device has OadResetCharUuid');
              setStatus('Resetting OAD Reset Service');
              resolve(OadResetServiceUuid);
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
                BleManager.startNotification(peripheralId, OadServiceUuid, ImageIdentifyWriteUuid)
                  .then(() => {
                    console.log('device has ImageIdentifyWriteUuid');
                    setStatus('Found OAD Service');
                    BleManager.stopNotification(
                      peripheralId,
                      OadServiceUuid,
                      ImageIdentifyWriteUuid
                    ).then(() => {
                      resolve(OadServiceUuid);
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

  function resetafterOad(peripheralId: string) {
    setStatus('Waiting for device reset in to new FW');
    setProgress(0.98);

    bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');
    let oadServericeListiner = bleManagerEmitter.addListener(
      'BleManagerDisconnectPeripheral',
      () => {
        setProgress(1);
        setStatus('Device reset');
        console.log('resetafterOad - device disconnected');

        oadServericeListiner.remove();
      }
    );
  }

  async function sendiImagUpdateReq(peripheralId: string) {
    console.log('sendiImagUpdateReq');

    setStatus('Starting FW Update');

    /* Get the SW Version */
    var ImgControlPointCmd = new Uint8Array([ImageControlPointGetSwVer]);
    let rsp = await writeWaitNtfy(
      peripheralId,
      OadServiceUuid,
      ImageControlPointUuid,
      true,
      ImgControlPointCmd,
      1
    );
    console.log('SW Version: ', rsp);

    // /* Set the MTU Size - Android only API 21+ */
    if (Platform.OS === 'android') {
      await BleManager.requestConnectionPriority(peripheralId, 1);
      await BleManager.requestMTU(peripheralId, 255);
    }

    /* Prepare Image identify command */
    const buffer = new ArrayBuffer(18);
    let imgIdentifyPayload = new Uint8Array(buffer);

    let imgTotLength = fwImageByteArray.length;
    
    if (firmwares.find((fw) => fw.value === selectedFW)?.imageType === 'mcuboot') {
      console.log('sendiImagUpdateReq: Mcuboot image');
      /* Copy image header */
      imgIdentifyPayload.set(fwImageByteArray.slice(0, 18));

      console.log('fwImageByteArray[0]: ', fwImageByteArray[0]);
      console.log('fwImageByteArray[1]: ', fwImageByteArray[1]);
      console.log('fwImageByteArray[2]: ', fwImageByteArray[2]);
      console.log('fwImageByteArray[3]: ', fwImageByteArray[3]);

      /* check MCUBoot header Magic */
      if (
        fwImageByteArray[0] != 0x3d ||
        fwImageByteArray[1] != 0xb8 ||
        fwImageByteArray[2] != 0xf3 ||
        (fwImageByteArray[3] != 0x96 && fwImageByteArray[3] != 0x97)
      ) {
        cancel();
        alert('Not an MCU Boot image');
      }

      let imgVersionMajor = fwImageByteArray[20];
      let imgVersionMinor = fwImageByteArray[21];
      let imgRevision = fwImageByteArray[22] + (fwImageByteArray[23] << 8);
      let imgBuildNum =
        fwImageByteArray[24] +
        (fwImageByteArray[25] << 8) +
        (fwImageByteArray[26] << 16) +
        (fwImageByteArray[27] << 24);

      setImgVersionStr(
              imgVersionMajor + '.' + 
              imgVersionMinor + '.' + 
              imgRevision + '.' + 
              imgBuildNum)

      console.log('mcuboot img version: ', imgVersionStr);

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
        fwImageByteArray[fwImageByteArray.length - 1].toString(16)

      console.log('MCUBoot Swap Magic: ', mcuBootMapgicSwap);

      if( mcuBootMapgicSwap != '77c295f360d2ef7f355250f2cb67980') {
        console.log('Not swap image');

        /* Length is read from header and must include header */
        imgTotLength =
          fwImageByteArray[12] +
          (fwImageByteArray[13] << 8) +
          (fwImageByteArray[14] << 16) +
          (fwImageByteArray[15] << 24);

        console.log('MCUBoot imgLength: ', imgTotLength);

        let headerLen =
          fwImageByteArray[8] +
          (fwImageByteArray[9] << 8) +
          (fwImageByteArray[10] << 16) +
          (fwImageByteArray[11] << 24);

        console.log('tlv magic 0', fwImageByteArray[imgTotLength + headerLen]);
        console.log('tlv magic 1', fwImageByteArray[imgTotLength + headerLen + 1]);

        /* check TLV header Magic */
        if (
          fwImageByteArray[imgTotLength + headerLen + 1] != 0x69 ||
          (fwImageByteArray[imgTotLength + headerLen] != 0x07 &&
            fwImageByteArray[imgTotLength + headerLen] != 0x08)
        ) {
          cancel();
          alert('Bad TLV Magic');
        }

        let tlvLength =
          fwImageByteArray[imgTotLength + headerLen + 2] +
          (fwImageByteArray[imgTotLength + headerLen + 3] << 8);

        console.log('headerLen: ', headerLen);
        console.log('tlvLength: ', tlvLength);

        /* add MCU Boot header and trailer size */
        imgTotLength += headerLen + tlvLength;
        console.log('imgTotLength: ', imgTotLength);
        imgIdentifyPayload[12] = imgTotLength & 0x000000ff;
        imgIdentifyPayload[13] = (imgTotLength & 0x0000ff00) >> 8;
        imgIdentifyPayload[14] = (imgTotLength & 0x00ff0000) >> 16;
        imgIdentifyPayload[15] = (imgTotLength & 0xff000000) >> 24;

        fwImageByteArray = fwImageByteArray.slice(0, imgTotLength);
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

    setImgLength(imgTotLength)
    console.log('imgLength:', imgTotLength)

    /* Read the Block Size */
    blockSize = 20;
    ImgControlPointCmd = new Uint8Array([ImageControlPointGetBlkSize]);
    rsp = await writeWaitNtfy(
      peripheralId,
      OadServiceUuid,
      ImageControlPointUuid,
      true,
      ImgControlPointCmd,
      1
    );
    console.log('Block Size: ', rsp);
    /* check it is a response for the correct size */
    if (rsp[0] == ImageControlPointGetBlkSize) {
      /* Store block size */
      blockSize = rsp[1] + (rsp[2] << 8) - 4;
      console.log('blockSize ', blockSize);
      numBlocks = Math.floor(imgTotLength / blockSize);
      console.log('numBlocks ', numBlocks);
    } else {
      console.log('Error: Block size response not for block size command');
    }

    /* Send Image identify command */
    console.log('imgIdentifyPayload ', imgIdentifyPayload);
    rsp = await writeWaitNtfy(
      peripheralId,
      OadServiceUuid,
      ImageIdentifyWriteUuid,
      true,
      imgIdentifyPayload,
      18
    );
    console.log('ImageIdentify Rsp: ', rsp);

    if (rsp == 0) {
      setStatus('Image header accepted');
    } else {
      setStatus('Image header reject - select correct image type');
    }

    BleManager.startNotification(peripheralId, OadServiceUuid, ImageControlPointUuid);
  }

  function sendImageBlocks(peripheralId: string): void {
    setStatus('FW Update in progress');

    bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');

    console.log('sendImageBlocks: fwImageByteArray.length: ', fwImageByteArray.length);
    let prevProgress = 0;
    // Add event listener
    blockEventSubstription = bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      async ({ value, peripheral, characteristic, service }) => {
        //console.log('blockEventSubstription:')

        //console.log('characteristic: ',  characteristic)
        //console.log('charUpdate[0]: ',  value[0])

        let blockRequested: number;

        if (
          characteristic.toUpperCase() === ImageControlPointUuid &&
          value[0] === OAD_EXT_CTRL_BLK_RSP_NOTIF
        ) {
          if (value[1] === OAD_EXT_CTRL_BLK_RSP_DL_COMPLETE) {
            console.log('OAD_EXT_CTRL_BLK_RSP_NOTIF status: OAD_EXT_CTRL_BLK_RSP_DL_COMPLETE');

            console.log('FwUpdate completed');
            //blockEventSubstription.remove();
            //BleManager.stopNotification(peripheralId, OadServiceUuid, ImageControlPointUuid);

            let ImgControlPointCmd = new Uint8Array([ImageControlPointEnableImg]);
            var ImgControlPointCmdArray = Array.from(ImgControlPointCmd);
            BleManager.writeWithoutResponse(
              peripheralId,
              OadServiceUuid,
              ImageControlPointUuid,
              ImgControlPointCmdArray,
              1
            ).then(() => {
                // Success code
                console.log('Writen: ' + ImgControlPointCmdArray);
              })
              .catch((error) => {
                console.log('Write faled  ' + error);
              });
          } else if (value[1] === OAD_EXT_CTRL_BLK_RSP_SUCCESS) {
            //console.log('OAD_EXT_CTRL_BLK_RSP_NOTIF status: OAD_EXT_CTRL_BLK_RSP_SUCCESS')

            blockRequested = value[2] + (value[3] << 8) + (value[4] << 16) + (value[5] << 24);

            let progressUpdate = 0.98 * (blockRequested / numBlocks);
            //console.log('progressUpdate: ', progressUpdate)
            if (Math.floor(progressUpdate * 100) > prevProgress) {
              setProgress(progressUpdate);
            }
            prevProgress = Math.floor(progressUpdate * 100);

            const fwImageByteOffset = blockRequested * blockSize;
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

            // if(blockRequested == (numBlocks)) {
            //   await BleManager.stopNotification(peripheralId, OadServiceUuid, ImageControlPointUuid);
            //   await bleManagerEmitter.removeAllListeners("BleManagerDidUpdateValueForCharacteristic");
            // }

            await writeBlock(peripheralId, blockRequested, blockData, blockSize);

            // if(blockRequested === (numBlocks-1))
            // {
            //   let ImgControlPointCmd = new Uint8Array([ImageControlPointDisableBlkNotify])
            //   await writeWaitNtfy(peripheralId, OadServiceUuid, ImageControlPointUuid, true, ImgControlPointCmd, 1);
            // }
          } else {
            console.log('unknown  OAD_EXT_CTRL_BLK_RSP_NOTIF response ' + value[1])
            alert('OAD Failed')
            setStatus('Found selected FW image')
            setProgress(0);
          }
        } else if (
          characteristic.toUpperCase() === ImageControlPointUuid &&
          value[0] === ImageControlPointEnableImg
        ) {
          console.log('got ImageControlPointEnableImg');
          resetafterOad(peripheral);
        } else {
          /* unknown request */
          console.log(
            'unknwon blockEventSubstription char ' + characteristic + ' or command ' + value[0]
          );
        }
      }
    );

    console.log('Sending ImageControlPointStartOad command');
    let ImgControlPointCmd = new Uint8Array([ImageControlPointStartOad]);
    var ImgControlPointCmdArray = Array.from(ImgControlPointCmd);
    BleManager.writeWithoutResponse(
      peripheralId,
      OadServiceUuid,
      ImageControlPointUuid,
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
      OadServiceUuid,
      ImageBlockRequestUuid,
      BlockRspCmdArray,
      BlockRspCmd.length
    )
      .then(() => {
        //console.log("writeBlock writen");
      })
      .catch((error) => {
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
          console.log('writeWaitNtfy Writen: ' + cmdByteArray);
        })
        .catch((error) => {
          // Failure code
          console.log('ImgControlPointCmdArray error: ', error);
          reject();
        });
    });
  }

  return (
    <View style={{ flex: 1, width: '100%', marginLeft: 'auto', marginRight: 'auto' }}>
      <View style={{ flex: 1, width: '100%', zIndex: 100 }}>
        <Text
          style={{
            paddingLeft: 10,
            fontSize: 20,
            fontWeight: 'bold',
            backgroundColor: Colors.lightGray,
            paddingVertical: 20,
          }}
        >
          Select Firmware Image
        </Text>
        <DropDownPicker
          disabled={updating}
          zIndex={100}
          containerStyle={[styles.dropDownPickerContainer]}
          placeholder="Select firmware version"
          open={openDropdown}
          setOpen={setOpenDropdown}
          items={firmwares}
          setItems={setFirmwares}
          value={selectedFW}
          setValue={setSelectedFW}
          theme={theme === 'dark' ? 'DARK' : 'LIGHT'}
        />
      </View>
      <View style={{ paddingTop: 40, marginVertical: 20 }}>
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
          Hardware Type: {firmwares.find((fw) => fw.value === selectedFW)?.hwType}{' '}
        </Text>
        <Text style={{ paddingVertical: 2, paddingLeft: 20 }}>
          Image Type: {firmwares.find((fw) => fw.value === selectedFW)?.imageType}{' '}
        </Text>
        <Text style={{ paddingVertical: 2, paddingLeft: 20 }}>
          Image Version: {firmwares.find((fw) => fw.value === selectedFW)?.version}{' '}
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
      {progress < 1 && (
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
      )}
      {progress == 1 && (
        <View
          style={{ flex: 2, flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 30 }}
        >
          <TouchableOpacity style={[styles.buttonWrapper]} onPress={cancel}>
            <Text style={{ color: Colors.blue, fontSize: 18 }}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#1b1b1b', opacity: 0.6 },
  dropDownPickerContainer: {
    width: '90%',
    alignContent: 'center',
    alignSelf: 'center',
    marginVertical: 15,
  },
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
