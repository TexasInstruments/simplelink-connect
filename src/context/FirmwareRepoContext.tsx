import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

export interface FirmwareRepo {
  url: string | null,
  owner: string | null,
  accessToken: any,
  visibility: string | null,
  name: string,
  useGitHub: boolean,
}

interface FirmwareRepoContextProps {
  currentRepoDetails: FirmwareRepo,
  updateRepository: (c: FirmwareRepo) => Promise<void>
}

const initialState: FirmwareRepo = {
  url: '',
  owner: '',
  accessToken: '',
  visibility: 'public',
  name: '',
  useGitHub: true,
}

const RepositoryDetailsContext = createContext<FirmwareRepoContextProps | undefined>(undefined);

export const RepositoryDetailsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [repoDetails, setRepoDetails] = useState<FirmwareRepo>(initialState);

  const getAccessToken = async () => {
    try {
      const credentials = await Keychain.getGenericPassword();
      return credentials ? credentials.password : null;
    }
    catch (error) {
      console.log('no access token')
      return null;
    }

  };

  useEffect(() => {
    const initiate = async () => {

      let repo: FirmwareRepo = {
        url: '',
        owner: '',
        accessToken: '',
        visibility: '',
        name: '',
        useGitHub: true
      }

      // initate  with local storage values if exists.
      let useGitHubParam = await AsyncStorage.getItem('@use_github');
      useGitHubParam = JSON.parse(useGitHubParam);
      if (useGitHubParam !== 'false') {
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

        // repo.url = savedURL;
        repo.owner = owner;
        repo.accessToken = visibility === 'private' ? getAccessToken() : ''
        repo.visibility = visibility;
        repo.name = name;
        repo.useGitHub = true;
      }

      else {
        let savedURL = await AsyncStorage.getItem('@server_url');
        repo.url = savedURL;
        repo.useGitHub = false;
      }


      console.log('Initial Repo:', repo);
      setRepoDetails(repo);
    };

    initiate();

  }, []);

  const updateFirmwareRepoDetails = async (repo: FirmwareRepo) => {
    if (repo.useGitHub) {
      let accessToken = '';
      if (repo.accessToken) {
        if (repo.visibility === 'private') {
          await Keychain.setGenericPassword('access_token', repo.accessToken);
          console.log('Access token deleted successfully');
          accessToken = repo.accessToken
        }
        else {
          // Delete access token from local storage if new repository is public.
          await Keychain.resetGenericPassword()
          accessToken = ''
        }
      }

      await AsyncStorage.setItem('@repo_owner', repo.owner);
      await AsyncStorage.setItem('@repo_name', repo.name);
      await AsyncStorage.setItem('@visibility', repo.visibility);
      await AsyncStorage.setItem('@use_github', JSON.stringify(true));
      console.log('updated repo', repo)

      setRepoDetails(
        {
          accessToken: accessToken,
          name: repo.name,
          owner: repo.owner,
          visibility: repo.visibility,
          useGitHub: true,
          url: ''
        })

    }
    else {

      await AsyncStorage.setItem('@server_url', repo.url);
      // await AsyncStorage.setItem('@repo_owner', '');
      // await AsyncStorage.setItem('@repo_name', '');
      await AsyncStorage.setItem('@use_github', JSON.stringify(false));
      console.log('updated repo', repo)
      setRepoDetails(repo);

    }

  }

  return (
    <RepositoryDetailsContext.Provider value={{ currentRepoDetails: repoDetails, updateRepository: updateFirmwareRepoDetails }}>
      {children}
    </RepositoryDetailsContext.Provider>
  );
};

export const useFirmwareRepoContext = () => {
  const context = useContext(RepositoryDetailsContext);
  if (!context) {
    throw new Error('useFirmwareRepoContext must be used within a TerminalConfigProvider');
  }
  return context;
};
