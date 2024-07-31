import { StyleSheet, TextInput, Pressable, Platform, SafeAreaView, KeyboardAvoidingView, ScrollView, useWindowDimensions } from 'react-native';
import Colors from '../constants/Colors';
import { useEffect, useState } from 'react';
import * as Keychain from 'react-native-keychain';
import { Dropdown } from 'react-native-element-dropdown';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FirmwareRepo, useFirmwareRepoContext } from '../context/FirmwareRepoContext';
import { View, Text, TouchableOpacity } from '../components/Themed';
import { ConfigRepositoryScreenProps } from '../../types';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Switch } from 'react-native-paper';


interface Props {
  isVisible: boolean,
  onClose: any,
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
interface Props extends ConfigRepositoryScreenProps { };

const ConfigRepositoryUrlScreen: React.FC<Props> = () => {
  const [repoOwner, setRepoOwner] = useState<string | null>('');
  const [repoName, setRepoName] = useState<string | null>('');
  const [accessToken, setAccessToken] = useState<string | null>('');
  const [repoVisibility, setRepoVisibility] = useState<string | null>('');
  const [useGitHubServer, setUseGitHubServer] = useState<boolean>(false);
  const [url, setUrl] = useState<string | null>('');

  const [buttonText, setButtonText] = useState(REQUEST.text);
  const [buttonColor, setButtonColor] = useState(REQUEST.color);

  const [errorMessage, setErrorMessage] = useState({ show: false, text: '' });
  const [connectionEstablished, setConnectionEstablished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const { currentRepoDetails, updateRepository } = useFirmwareRepoContext();
  let navigation = useNavigation();
  const { fontScale } = useWindowDimensions();

  const visibilityOptions = [
    { label: 'Public', value: 'public' },
    { label: 'Private', value: 'private' },
  ];

  useEffect(() => {
    // reset values
    initiateStates();
    setRepoOwner(currentRepoDetails.owner);
    setRepoName(currentRepoDetails.name);
    setRepoVisibility(currentRepoDetails.visibility);
    setAccessToken(currentRepoDetails.accessToken ? currentRepoDetails.accessToken : '');
    setUseGitHubServer(currentRepoDetails.useGitHub);
    setUrl(currentRepoDetails.url);
  }, [, currentRepoDetails.url]);

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

  const testRepoConnection = async (accessToken: string) => {
    try {
      const apiUrl = useGitHubServer ? `https://api.github.com/repos/${repoOwner}/${repoName}` : url;
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
      setErrorMessage({ show: true, text: error.toString() })
      return false;
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {

      let testConnection;

      if (!useGitHubServer || (useGitHubServer && repoVisibility == 'public' && accessToken)) {
        setAccessToken('')
        await Keychain.resetGenericPassword()
        console.log('Access token has been reset')
        testConnection = await testRepoConnection('');
      }
      else {
        testConnection = await testRepoConnection(accessToken);
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

  const isValid = () => {
    if (useGitHubServer && (!repoName || !repoOwner || !repoVisibility)) {
      return false;
    }
    else if (!useGitHubServer && (!url)) {
      return false;
    }
    else {
      return true;
    }
  }

  const handleSave = async () => {
    const newRepoDetails: FirmwareRepo = {
      url: useGitHubServer ? `https://github.com/${repoOwner}/${repoName}` : url,
      owner: repoOwner,
      accessToken: accessToken,
      visibility: repoVisibility,
      name: repoName,
      useGitHub: useGitHubServer
    }
    updateRepository(newRepoDetails);
    navigation.goBack()
  };

  return (
    <SafeAreaView style={{ backgroundColor: Colors.lightGray, flex: 1 }}>
      <KeyboardAvoidingView style={[styles.container]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{ backgroundColor: Colors.lightGray }}>
          <View style={styles.sectionHeader}>
            <Icon name="git-network" size={24} style={styles.icon} />
            <Text style={styles.sectionTitle} allowFontScaling adjustsFontSizeToFit numberOfLines={1}>Config OAD Repository</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>

          <View style={[styles.switchContainer]}>
            <Text style={[styles.title]}>Use GitHub server</Text>
            <Switch
              style={{ marginLeft: 15 }}
              color={Colors.active}
              value={useGitHubServer}
              onValueChange={(value) => {
                setUseGitHubServer(value);
                initiateStates();
              }}
            />
          </View>

          {useGitHubServer && (
            <>
              <Text style={[styles.title]} allowFontScaling adjustsFontSizeToFit numberOfLines={1}>Repository Owner</Text>
              <View style={[styles.optionBox]}>
                <TextInput
                  editable
                  style={[styles.textInput]}
                  placeholder="Enter Repository Owner"
                  value={repoOwner}
                  onChangeText={(owner) => { setRepoOwner(owner.trim()); initiateStates(); }}
                />
              </View>

              <Text style={[styles.title]} allowFontScaling adjustsFontSizeToFit numberOfLines={1}>Repository Name</Text>
              <View style={[styles.optionBox]}>
                <TextInput
                  editable
                  style={[styles.textInput]}
                  placeholder="Enter Repository Name"
                  value={repoName}
                  onChangeText={(name) => { setRepoName(name.trim()); initiateStates(); }}
                />
              </View>

              <Text style={[styles.title]} allowFontScaling adjustsFontSizeToFit numberOfLines={1}>Repository Visibility</Text>
              <View style={[styles.optionBox]}>
                <Dropdown
                  style={[styles.dropdown]}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  data={visibilityOptions}
                  placeholder='Repository Visibility'
                  value={repoVisibility}
                  onChange={(v: any) => {
                    setRepoVisibility(v.value);
                  }}
                  labelField="label"
                  valueField="value"
                />
              </View>

              {repoVisibility === 'private' && (
                <>
                  <Text style={[styles.title]} allowFontScaling adjustsFontSizeToFit numberOfLines={1}>Access Token</Text>
                  <View style={[styles.optionBox]}>
                    <View style={[styles.accessTokenContainer]}>
                      <TextInput
                        secureTextEntry={!showToken}
                        editable
                        style={[styles.textInput, { shadowOpacity: 0, elevation: 0 }]}
                        value={accessToken}
                        onChangeText={(token) => { setAccessToken(token); initiateStates(); }}
                      />
                      <MaterialCommunityIcons
                        style={styles.icon}
                        name={showToken ? 'eye-off' : 'eye'}
                        size={24}
                        color="gray"
                        onPress={() => setShowToken(!showToken)}
                      />
                    </View>
                  </View>
                </>
              )}
            </>
          )}

          {!useGitHubServer && (
            <>
              <Text style={[styles.title]} allowFontScaling adjustsFontSizeToFit numberOfLines={1}>Server URL</Text>
              <View style={[styles.optionBox]}>
                <TextInput
                  editable
                  style={[styles.textInput]}
                  placeholder="Enter Server URL"
                  value={url}
                  onChangeText={(url) => { setUrl(url.trim()); initiateStates(); }}
                />
              </View>
            </>
          )}
        </ScrollView>

        <View style={{ backgroundColor: Colors.lightGray }}>
          <Text style={[styles.title, { fontSize: 14 / fontScale, marginBottom: 5 },]}>Final URL:{' '}
            {
              useGitHubServer && (
                <Text style={[styles.sectionDescription]}>
                  https://github.com/{repoOwner ? repoOwner : '___'}/{repoName ? repoName : '___'}
                </Text>
              )
            }
            {
              !useGitHubServer && (
                <Text style={[styles.sectionDescription, { fontSize: 14 / fontScale }]}>
                  {url || ' ___'}
                </Text>
              )
            }
          </Text>
          <Pressable
            onPress={handleConnect}
            disabled={(useGitHubServer && (!repoOwner || !repoName || loading || !repoVisibility || (repoVisibility === 'private' && !accessToken)) || (!useGitHubServer && (!url || loading)))}
            style={[styles.button, {
              height: 40,
              backgroundColor: buttonColor,
              borderColor: buttonColor,
              opacity: (useGitHubServer && (!repoOwner || !repoName || loading || !repoVisibility || (repoVisibility === 'private' && !accessToken)) || (!useGitHubServer && (!url || loading))) ? 0.4 : 1,
            }]}
          >
            <Text style={[styles.text, { fontSize: 16 / fontScale }]}>{buttonText}</Text>
          </Pressable>
          <View style={{ minHeight: 37, backgroundColor: Colors.lightGray }}>
            {errorMessage.show && (
              <Text numberOfLines={2} style={{ color: Colors.primary, fontSize: 14 / fontScale, flex: 1 }}>
                {errorMessage.text}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: 'row', backgroundColor: Colors.lightGray, justifyContent: 'space-evenly', marginBottom: Platform.OS === 'ios' ? 60 : 0 }}>
            <TouchableOpacity style={styles.buttonWrapper} onPress={() => navigation.goBack()}>
              <Text style={{ color: Colors.blue, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.buttonWrapper, { opacity: !isValid() ? 0.6 : 1 }]}
              onPress={handleSave}
              disabled={!isValid()}
            >
              <Text style={{ color: Colors.blue, fontSize: 16 }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 5,
    flex: 1,
  },
  sectionDescription: {
    color: Colors.gray,
    fontWeight: 'normal',
  },
  optionBox: {
    backgroundColor: Colors.lightGray,
    height: 50,
    marginTop: 5,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
  },
  accessTokenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: 'gray',
    borderRadius: 10,
    height: 50,
    elevation: 2,
    shadowOpacity: 0.5,
    shadowRadius: 0,
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowOffset: {
      height: 1,
      width: 0,
    },
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 32,
    borderWidth: 0.5,
    borderRadius: 10,
  },
  text: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: 'bold',
    letterSpacing: 0.25,
    color: 'white',
  },
  textInput: {
    borderColor: 'gray',
    borderRadius: 10,
    padding: 8,
    flex: 1,
    backgroundColor: 'white',
    fontSize: 14,
    elevation: 2,
    shadowOpacity: 0.5,
    shadowRadius: 0,
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowOffset: {
      height: 1,
      width: 0,
    },
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'space-between',
    backgroundColor: Colors.lightGray,
  },
  dropdown: {
    alignContent: 'center',
    alignSelf: 'center',
    width: '100%',
    color: 'black',
    borderRadius: 10,
    padding: 8,
    flex: 1,
    backgroundColor: 'white',
    fontSize: 14,
    elevation: 2,
    shadowOpacity: 0.5,
    shadowRadius: 0,
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowOffset: {
      height: 1,
      width: 0,
    },
  },
  placeholderStyle: {
    color: Colors.lightGray,
    fontSize: 14,
  },
  selectedTextStyle: {
    fontSize: 14,
    color: 'black',
  },
  buttonWrapper: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.lightGray,
    justifyContent: 'space-between',
    width: '100%',
    alignContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
});

export default ConfigRepositoryUrlScreen;
