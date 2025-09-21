import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, NativeEventEmitter, NativeModules, Platform, ScrollView, StyleSheet } from 'react-native';
import { LinearProgress } from '@rneui/base';
import { Text, TouchableOpacity, View } from '../Themed';
import Colors from '../../constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import DocumentPicker from 'react-native-document-picker';
import { useNavigation } from '@react-navigation/native';
import { DeviceScreenNavigationProp } from '../../../types';
import { v4 } from 'uuid';
import fs from 'react-native-fs';
import { Buffer } from 'buffer';
import { decode } from 'base-64';
import { TextInput, Menu, Divider } from 'react-native-paper';
import { CustomSnackBar } from '../CustomSnackBar';
import { Dropdown } from 'react-native-element-dropdown';
import { CheckBox } from '@rneui/themed';
import Icon from "react-native-vector-icons/MaterialIcons";
import IdleTimerManager from 'react-native-idle-timer';
import { MaterialCommunityIcons } from '@expo/vector-icons';


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
  uri: string;
};

type DeviceDetails = {
  bufCount: number | "N/A";
  bufSize: number | "N/A";
  output: number | "N/A";
  bootloader: number | "N/A";
  rc: number | "N/A";
  mode: string | "N/A";
};

type ImageType = 'bim' | 'mcuboot' | null;

type Image = {
  slot: number,
  hash: string,
  version: string,
  flags: string[]
}

export async function callDFUModuleFunction(functionName: string, ...args: any[]) {
  return new Promise((resolve, reject) => {
    if (Platform.OS === 'ios') {
      // Use callback pattern for iOS
      NativeModules.DFUModule[functionName](...args, (error: any, result: unknown) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    } else {
      // Use promise pattern for Android
      NativeModules.DFUModule[functionName](...args)
        .then(resolve)
        .catch(reject);
    }
  });
}

const ZephyrDFUModal: React.FC<Props> = ({ peripheralId }: any) => {

  let navigation = useNavigation<DeviceScreenNavigationProp>();
  const [selectedFW, setSelectedFW] = useState<FW>();
  const [status, setStatus] = useState<string>('Idle');
  const [updating, setUpdating] = useState<boolean>(false);
  const updatingRef = useRef<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [localFileError, setLocalFileError] = useState<'success' | 'error' | 'cancelled' | 'fs' | 'unknownImgType' | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<{ message: string, color: string } | null>(null);
  const [snackbarStatusVisible, setSnackbarStatusVisible] = useState(false);
  const [statusColor, setStatusColor] = useState('black')
  const [deviceDetails, setDeviceDetails] = useState<DeviceDetails>(
    {
      bufCount: "N/A",
      bufSize: "N/A",
      output: "N/A",
      bootloader: "N/A",
      rc: "N/A",
      mode: "N/A"
    })
  const [deviceImages, setDeviceImages] = useState([])

  const [eraseApplication, setEraseApplication] = useState(true)
  const [swapTime, setSwapTime] = useState<number>(10)
  const [numBuffers, setBufferNum] = useState<number>(4)
  const [memoryAlignment, setMemoryAlignment] = useState<number>(4)
  const [upgradeMode, setUpgradeMode] = useState('Confirm Only')
  const [isMemAlignDropdownFocused, setMemAlignDropdownFocused] = useState(false);
  const [isUpgradeModeDropdownFocused, setUpgradeModeDropdownFocused] = useState(false);

  const { DFUModule } = NativeModules;
  const dfuEmitter = new NativeEventEmitter(DFUModule);

  const MEM_ALIGN_OPTIONS = [
    { value: 0, label: 'Disabled' },
    { value: 2, label: '2-byte align' },
    { value: 4, label: '4-byte align' },
    { value: 8, label: '8-byte align' },
    { value: 16, label: '16-byte align' },
  ]

  const UPGRADE_MODE_OPTIONS = [
    { value: 'Test and Confirm', label: 'Test and Confirm' },
    { value: 'Test Only', label: 'Test Only' },
    { value: 'Confirm Only', label: 'Confirm Only' },
  ]

  useEffect(() => {
    setUpdating(updatingRef.current)
  }, [updatingRef.current]
  );

  useEffect(() => {

    // Monitor DFU progress
    dfuEmitter.addListener('DFUProgress', (data) => {
      console.log('progress changed', data)
      setProgress(data.percent / 100);
      if (data.percent / 100 < 1) {
        updatingRef.current = true
      }
      else {
        updatingRef.current = false
      }
    });

    dfuEmitter.addListener('DFUStateChanged', (data) => {
      console.log('DFUStateChanged', data)
      if (data.state === 'completed') {
        setStatus('Operation completed!');
        setProgress(1);
        callDFUModuleFunction('getDeviceImagesList')
        updatingRef.current = false

        setStatusColor('green')
      } else if (data.state === 'aborted') {
        setStatus('Update aborted!');
        setStatusColor('red')
        updatingRef.current = false
        setProgress(0);
      }
      else if (data.state == 'error') {
        if (updatingRef.current) {
          alert(data.error)
          setStatusColor('red')
          updatingRef.current = false
          setStatus(data.error);
          setProgress(0);
        }
      }
      else {
        setStatusColor('black')
        setStatus(data);
      }
    });

    dfuEmitter.addListener('DFUDeviceParams', (data: DeviceDetails) => {
      console.log('got DFUDeviceParams', data)
      if (data)
        setDeviceDetails((prev) => {
          return ({ ...prev, ...data })
        })
    });

    dfuEmitter.addListener('DFUDeviceImagesInfo', (data) => {
      console.log('got DFUDeviceImagesInfo', data)
      setDeviceImages(data.images)
    });

    dfuEmitter.addListener('DFUImagesUpdated', (response: { status: string, message: string }) => {
      console.log('DFUImagesUpdated', response)
      if (response.status == "success") {
        setStatusColor('green')
        setSnackbarMessage({ message: response.message, color: 'green' })
      }
      else {
        setStatusColor('red')
        setSnackbarMessage({ message: response.message, color: 'red' })

      }
      setSnackbarStatusVisible(true)
      setStatus(response.message)

      callDFUModuleFunction('getDeviceImagesList')
    });


    /* component mounting, disable lock screen sleep */
    IdleTimerManager.setIdleTimerDisabled(true, 'fw-update-screen');

    const initialize = async () => {
      try {
        await callDFUModuleFunction('dfuInit', peripheralId);
        await callDFUModuleFunction('readMcuMgrInfo')
        await callDFUModuleFunction('getDeviceImagesList')
      } catch (e) {
        console.log(e)
      }
    }

    initialize();

    return () => {
      /* component unmounting, enable lock screen sleep */
      IdleTimerManager.setIdleTimerDisabled(false, 'fw-update-screen');

      setStatusColor('black')

      dfuEmitter.removeAllListeners('DFUProgress')
      dfuEmitter.removeAllListeners('DFUStateChanged')
      dfuEmitter.removeAllListeners('DFUDeviceParams')
      dfuEmitter.removeAllListeners('DFUDeviceImagesInfo')
    }

  }, [])

  useEffect(() => {
    if (!localFileError) return

    setSnackbarStatusVisible(true)
    if (localFileError == 'error') {
      setSnackbarMessage({ message: 'Something went wrong while loading file!', color: 'red' });
    } else if (localFileError == 'success') {
      setSnackbarMessage({ message: 'File loaded successfuly!', color: 'green' });
    } else if (localFileError == 'cancelled') {
      setSnackbarMessage({ message: 'User cancelled picking!', color: 'red' });
    } else if (localFileError == 'fs') {
      setSnackbarMessage({ message: 'Error with parsing file!', color: 'red' });
    } else if (localFileError == 'unknownImgType') {
      setSnackbarMessage({ message: 'Unknown Image Type!', color: 'red' });
    } else {
      setSnackbarMessage({ message: '', color: 'black' });
    }
  }, [localFileError]);


  function uriToBlob(uri: string): Promise<Blob> {
    return new Promise((resolve, reject) => {

      const xhr = new XMLHttpRequest();

      xhr.onload = function () {
        resolve(xhr.response);
      };

      xhr.onerror = function () {
        reject(new Error('uriToBlob failed'));
      };
      xhr.responseType = 'blob';

      // Initialize the request. The third argument set to 'true' denotes that the request is asynchronous
      xhr.open('GET', uri, true);

      // Send the request. The 'null' argument means that no body content is given for the request
      xhr.send(null);
    });
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

  const pickFile = () => {
    try {
      DocumentPicker.pickSingle({
        mode: 'import',
        copyTo: 'cachesDirectory',
      })
        .then(async (pickedFile: { fileCopyUri: any; uri: RequestInfo; name: any; }) => {
          if (!pickedFile.fileCopyUri) throw Error('File URI error');
          setStatus('Idle')
          setStatusColor('black')
          setLocalFileError('success');
          // setStatus(`Selected: ${pickedFile.name}`);
          // setStatusColor('black')

          try {
            let convert;
            let binary;

            if (Platform.OS === 'android') {
              binary = await uriToBlob(pickedFile.uri);
            } else {
              //https://github.com/itinance/react-native-fs#readfilefilepath-string-encoding-string-promisestring
              let base64Data = await fs.readFile(decodeURIComponent(pickedFile.uri), 'base64');
              convert = await fetch(`data:application/octet-stream;base64,${base64Data}`);
              binary = await convert.blob();
            }

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

              let imageType = getImgType(binaryImage);

              if (imageType === null) {
                setLocalFileError('unknownImgType');
                setSelectedFW(undefined);
                setStatus("Invalid image")
                setStatusColor('red')
                return;
              }

              let uploadedImage = {
                hwType: 'N/A',
                imageType: imageType,
                label: pickedFile.name ?? 'Not specified',
                version: buildVersion,
                value: v4(),
                uri: pickedFile.fileCopyUri || pickedFile.uri,
                local: true,
                bytes: binaryImage,
              };

              setSelectedFW(uploadedImage);
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

  const closeSnackBar = () => setSnackbarStatusVisible(false);

  const startFwUpdate = async () => {
    if (!(selectedFW?.uri)) {
      setStatus('No file selected');
      return;
    }
    updatingRef.current = true
    setProgress(0);
    setStatus("Uploading");
    setStatusColor('black')

    try {
      console.log("Starting DFU")
      // Call dfu module
      await callDFUModuleFunction('startDfu', selectedFW?.uri, eraseApplication, swapTime, memoryAlignment, numBuffers, upgradeMode)
    } catch (err) {
      console.error("DFU error:", err);
      setStatus(`DFU failed: ${err}`);
      updatingRef.current = false
      setProgress(0);
    }
  };

  const cancel = () => {
    updatingRef.current = false
    setProgress(0);
    setStatus('Update cancelled');
    callDFUModuleFunction('cancelDfu')
  };

  const done = () => {
    navigation.replace('Scanner');
  };

  const resetToDefaultConfig = () => {
    setEraseApplication(true);
    setSwapTime(10);
    setMemoryAlignment(4)
    setUpgradeMode('Confirm Only')
    setBufferNum(4)
  }

  const eraseImage = (imgPosition: Number) => {
    callDFUModuleFunction('eraseImage', imgPosition)
  }

  const confirmImage = (imgHash: string, imgPosition: Number) => {
    callDFUModuleFunction('confirmImage', imgHash, imgPosition)
  }

  const testImage = (imgHash: string, imgPosition: Number) => {
    callDFUModuleFunction('testImage', imgHash, imgPosition)
  }

  const DisplayImage = ({ img, index }: { img: Image; index: number }) => {
    const [visible, setVisible] = useState(false);

    return (
      <View style={styles.imageContainer}>
        {/* Floating menu button */}
        <View style={styles.menuButtonContainer}>
          <Menu
            contentStyle={{ backgroundColor: 'white' }}
            visible={visible}
            onDismiss={() => setVisible(false)}
            anchor={
              <TouchableOpacity onPress={() => setVisible(true)} disabled={updating}>
                <MaterialCommunityIcons name="dots-vertical-circle-outline" size={25} color={Colors.blue} />
              </TouchableOpacity>
            }
          >
            <Menu.Item
              onPress={() => eraseImage(index)}
              title="Erase"
              disabled={img.flags.find((f) => f == 'Active') != undefined}
              leadingIcon={"delete-outline"}
            />
            <Divider />
            <Menu.Item
              onPress={() => confirmImage(img.hash, index)}
              title="Confirm"
              leadingIcon={"check-circle-outline"}
            />
            <Divider />
            <Menu.Item
              onPress={() => testImage(img.hash, index)}
              title="Test"
              leadingIcon={"flask-outline"}
            />
          </Menu>
        </View>

        {/* Main row content */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Icon name="insert-drive-file" size={24} color={Colors.blue} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.imageTitle}>
              Image {index} (Slot {img.slot})
            </Text>
            <Text style={styles.imageFlags}>
              {img.flags?.length ? img.flags.join(", ") : "None"}
            </Text>
          </View>
          <Text style={styles.versionText}>v{img.version}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <ScrollView>
        {/* Device status */}
        <View >
          <Text style={[styles.title]} >
            Current Device Status
          </Text>
          <View style={[styles.dataContainer]}>
            <Text style={{}}>
              <Text style={{ fontWeight: "bold" }} >Buffer size: </Text>{deviceDetails.bufSize != 'N/A' ? deviceDetails.bufSize + ' bytes' : 'N/A'}
            </Text>
            <Text style={{ marginTop: 5 }}>
              <Text style={{ fontWeight: "bold" }} >Buffer count: </Text>{deviceDetails.bufCount ?? 'N/A'}
            </Text>
            <Text style={{ marginTop: 5 }}>
              <Text style={{ fontWeight: "bold" }} >Bootloader name: </Text>{deviceDetails.bootloader}
            </Text>
            <Text style={{ marginTop: 5 }}>
              <Text style={{ fontWeight: "bold" }} >Bootloader mode: </Text>{deviceDetails.mode}
            </Text>
            {deviceImages?.length > 0 && (
              <View style={{ marginTop: 5 }}>
                <Text style={{ fontWeight: "bold" }}>Device Images:</Text>
                {deviceImages.map((img: any, index: number) => (
                  <DisplayImage key={index} img={img} index={index} />
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Image details */}
        <View >
          <Text style={[styles.title]}>
            Uploaded Image Details
          </Text>
          <View style={[styles.dataContainer]}>
            <Text style={{}}>
              <Text style={{ fontWeight: "bold" }} >Image Type: </Text> {selectedFW?.imageType ?? 'N/A'}
            </Text>
            <Text style={{ marginTop: 5 }}>
              <Text style={{ fontWeight: "bold" }} >Image Version: </Text>{selectedFW?.version ?? 'N/A'}
            </Text>
            <Text style={{ marginTop: 5 }}>
              <Text style={{ fontWeight: "bold" }} >Image Size: </Text> {selectedFW?.bytes ? selectedFW?.bytes.length + ' bytes' : 'N/A'}
            </Text>
            <Text style={{ marginTop: 5 }}>
              <Text style={{ fontWeight: "bold" }} >Image File Name: </Text> {selectedFW?.label ?? 'N/A'}
            </Text>
            <TouchableOpacity onPress={pickFile} style={[styles.button, { opacity: updating ? 0.3 : 1 }]} disabled={updating}>
              <Text style={[styles.buttonText]}>Upload File</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Config */}
        <View >
          <Text style={styles.title}>
            Configurations
          </Text>
          <View style={[styles.dataContainer]}>
            {/* Erase application settings */}
            <View style={{ marginBottom: 15, opacity: updating ? 0.3 : 1 }}>
              <CheckBox
                disabled={updating}
                checked={eraseApplication}
                iconType="material-community"
                checkedIcon="checkbox-outline"
                uncheckedIcon="checkbox-blank-outline"
                checkedColor={Colors.blue}
                uncheckedColor={Colors.darkGray}
                onPress={() => setEraseApplication(!eraseApplication)}
                title={"Erase application settings"}
                containerStyle={{ margin: 0, padding: 0, left: -10 }}
                textStyle={{ color: 'black', fontWeight: 'normal', fontSize: 16 }}
                center={false}
                right={false}
              />
            </View>
            {/* swap time */}
            <TextInput
              disabled={updating}
              mode='outlined'
              keyboardType='number-pad'
              returnKeyType="done"
              style={[styles.textInput]}
              label={'Estimated Swap Time (seconds)'}
              value={swapTime.toString()}
              onChangeText={(v) => {
                if (v) {
                  setSwapTime(parseInt(v))
                } else {
                  setSwapTime(0)
                }
              }}
              underlineColor="gray"
              activeOutlineColor={Colors.active}
            />
            {/* number of mcumgr buffers */}
            <TextInput
              mode='outlined'
              disabled={updating}
              keyboardType='number-pad'
              returnKeyType="done"
              style={[styles.textInput]}
              label={'Number of MCU Manager Buffers'}
              value={numBuffers.toString()}
              onChangeText={(v) => {
                if (v) {
                  setBufferNum(parseInt(v))
                } else {
                  setBufferNum(0)
                }
              }} underlineColor="gray"
              activeOutlineColor={Colors.active}
            />
            {/* memory alignment */}
            <View style={[styles.dropdownContainer, { marginBottom: 15 }]}>
              <Text allowFontScaling={false} style={[styles.label, isMemAlignDropdownFocused && { color: Colors.active }]}>
                Memory Alignment
              </Text>
              <Dropdown
                style={[styles.dropdown, isMemAlignDropdownFocused && { borderColor: Colors.active }, { opacity: updating ? 0.3 : 1 }]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                itemTextStyle={styles.item}
                data={MEM_ALIGN_OPTIONS}
                placeholder={!isMemAlignDropdownFocused ? 'Select memory alignment' : '...'}
                value={memoryAlignment}
                onChange={(v: any) => {
                  setMemoryAlignment(v.value)
                }}
                labelField="label"
                valueField="value"
                onFocus={() => setMemAlignDropdownFocused(true)}
                onBlur={() => setMemAlignDropdownFocused(false)}
                disable={updating}
              />
            </View>
            {/* Test Mode */}
            <View style={styles.dropdownContainer}>
              <Text allowFontScaling={false} style={[styles.label, isUpgradeModeDropdownFocused && { color: Colors.active }]}>
                Upgrade Mode
              </Text>
              <Dropdown
                style={[styles.dropdown, isUpgradeModeDropdownFocused && { borderColor: Colors.active }, { opacity: updating ? 0.3 : 1 }]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                itemTextStyle={styles.item}
                data={UPGRADE_MODE_OPTIONS}
                placeholder={!isUpgradeModeDropdownFocused ? 'Select upgrade mode' : '...'}
                value={upgradeMode}
                onChange={(v: any) => {
                  setUpgradeMode(v.value)
                }}
                labelField="label"
                valueField="value"
                onFocus={() => setUpgradeModeDropdownFocused(true)}
                onBlur={() => setUpgradeModeDropdownFocused(false)}
                disable={updating}
              />
            </View>

            <TouchableOpacity style={[styles.button, { opacity: updating ? 0.3 : 1 }]} onPress={resetToDefaultConfig} disabled={updating}>
              <Text style={[styles.buttonText]}>Reset to defaults</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status */}
        <View>
          <Text style={[styles.title]}>
            Status
          </Text>
          <View style={{ marginTop: 10 }}>
            <Text style={{ textAlign: 'center', color: statusColor }}>{status}</Text>
            <LinearProgress value={progress} color={Colors.blue} style={[styles.linearProgress]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              {updating && progress < 1 && (
                <>
                  <Text style={{ marginRight: 8 }}>
                    {Math.floor(progress * 100).toFixed(0)}%
                  </Text>
                  <ActivityIndicator size="small" color={Colors.blue} />
                </>
              )}

            </View>
          </View>
        </View>
        <View>
          {
            progress < 1 && (
              <View style={[styles.actionButtonsWrapper, styles.dataContainer]}>
                <TouchableOpacity
                  style={[styles.actionButton, { marginRight: 10, opacity: (!selectedFW || !updating) ? 0.3 : 1 }]}
                  onPress={cancel}
                  disabled={!selectedFW || !updating}>
                  <Text style={[styles.buttonText, { fontSize: 16, fontWeight: '500' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { opacity: (!selectedFW || updating) ? 0.3 : 1, marginLeft: 10 }
                  ]}
                  onPress={startFwUpdate}
                  disabled={!selectedFW}
                >
                  <Text style={[styles.buttonText, { fontSize: 16, fontWeight: '500' }]}>Upgrade</Text>
                </TouchableOpacity>
              </View>
            )
          }
          {
            progress == 1 && (
              <View
                style={[styles.actionButtonsWrapper, styles.dataContainer]}
              >
                <TouchableOpacity style={[styles.actionButton]} onPress={done}>
                  <Text style={[styles.buttonText, { fontSize: 16, fontWeight: '500' }]}>Done</Text>
                </TouchableOpacity>
              </View>
            )
          }
        </View>
      </ScrollView>
      <CustomSnackBar isVisible={snackbarStatusVisible} duration={1500} close={closeSnackBar} success={snackbarMessage?.color === 'green'} message={snackbarMessage?.message ?? 'no'}>
      </CustomSnackBar>
    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
  dialogTitle: { color: 'white', textAlign: 'center' },
  actionButton: {
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.blue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flex: 1,
  },
  actionButtonsWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 30,
  },
  dataContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20
  },
  linearProgress: {
    height: 10,
    width: '80%',
    alignSelf: 'center',
    marginVertical: 10,
    borderRadius: 5,
  },
  button: {
    marginTop: 20,
    width: "100%",
    alignItems: 'center',
    paddingVertical: 5,
    backgroundColor: 'white',
    borderWidth: 0.5,
    borderColor: Colors.blue,

  },
  title: {
    paddingLeft: 10,
    fontSize: 20,
    fontWeight: 'bold',
    backgroundColor: Colors.lightGray,
    paddingVertical: 15,
  },
  textInput: {
    borderColor: 'gray',
    borderRadius: 0,
    backgroundColor: 'white',
    marginBottom: 15,
    fontSize: 16,
    overflow: 'hidden',
    height: 40
  },
  label: {
    color: Colors.gray,
    position: 'absolute',
    backgroundColor: 'white',
    left: 0,
    top: -7,
    zIndex: 999,
    marginHorizontal: 15,
    paddingHorizontal: 3,
    fontSize: 12,
  },
  dropdownContainer: {
  },
  dropdown: {
    paddingHorizontal: 16,
    width: '100%',
    height: 40,
    borderColor: Colors.gray,
    borderWidth: 1,
    borderRadius: 4,
  },
  placeholderStyle: {
    fontSize: 14,
  },
  selectedTextStyle: {
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0.25,
  },
  item: {
    color: 'black',
    fontSize: 14,
  },
  imageContainer: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    marginVertical: 6,
    marginHorizontal: 4,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    position: 'relative'
  },
  imageTitle: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#333",
  },
  imageFlags: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
    flexShrink: 1, // prevents overflow

  },
  versionText: {
    fontWeight: "600",
    fontSize: 15,
  },
  buttonText: {
    color: Colors.blue
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    flex: 1,
    width: '100%'
  },
  menuButtonContainer: {
    position: "absolute",
    // borderWidth: 0.5,
    top: -10,
    right: -8,
    zIndex: 10, // ensures it floats above everything
  },
});

export default ZephyrDFUModal;