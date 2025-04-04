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

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import useCachedResources from './src/hooks/useCachedResources';
import useColorScheme from './src/hooks/useColorScheme';
import Navigation from './src/navigation';
import { TerminalConfigProvider } from './src/context/TerminalOptionsContext';
import { ProfileListProvider } from './src/context/ProfileListContext';
import { CharacteristicViewProvider } from './src/context/CharactristicViewContext';
import { RepositoryDetailsProvider } from './src/context/FirmwareRepoContext';
import { SpecificScreenConfigProvider } from './src/context/SpecificScreenOptionsContext';
import { Provider as PaperProvider } from 'react-native-paper';
import { TutorialsProvider } from './src/context/TutorialContext';

export default function App() {
  const [isLoadingComplete] = useCachedResources();
  const colorScheme = useColorScheme();

  if (!isLoadingComplete) {
    return null;
  } else {
    return (
      <SafeAreaProvider>
        <PaperProvider>
          <CharacteristicViewProvider>
            <TerminalConfigProvider>
              <SpecificScreenConfigProvider>
                <RepositoryDetailsProvider>
                  <ProfileListProvider>
                    <TutorialsProvider>
                      <Navigation colorScheme={colorScheme} />
                      <StatusBar />
                    </TutorialsProvider>
                  </ProfileListProvider>
                </RepositoryDetailsProvider>
              </SpecificScreenConfigProvider>
            </TerminalConfigProvider>
          </CharacteristicViewProvider>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }
}
