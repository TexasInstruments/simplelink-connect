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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { TutorialScreenNavigationProp } from '../../../../types';
import TutorialSlide from '../TutorialSlide';
import { Tutorial } from '../Tutorial';

interface Props { }

type TutorialSlide = {
  id: string;
  img: any;
};

const slides: TutorialSlide[] = [
  {
    id: 'slide_1',
    img: require('../../../assets/scannerTutorial/scan_1.png'),
  },
  {
    id: 'slide_2',
    img: require('../../../assets/scannerTutorial/scan_2.png'),
  },
  {
    id: 'slide_3',
    img: require('../../../assets/scannerTutorial/scan_3.png'),
  },
  {
    id: 'slide_4',
    img: require('../../../assets/scannerTutorial/services_4.png'),
  },
  {
    id: 'slide_5',
    img: require('../../../assets/scannerTutorial/services_5.png'),
  },
  {
    id: 'slide_6',
    img: require('../../../assets/scannerTutorial/FW_update_6.png'),
  },
  {
    id: 'slide_7',
    img: require('../../../assets/scannerTutorial/characteristic_7.png'),
  },
  {
    id: 'slide_8',
    img: require('../../../assets/scannerTutorial/characteristic_8.png'),
  },
  {
    id: 'slide_9',
    img: require('../../../assets/scannerTutorial/characteristic_9.png'),
  }
];

const ScannerTutorial: React.FC<Props> = () => {
  let navigation = useNavigation<TutorialScreenNavigationProp>();

  const skipTutorial = useCallback(async () => {
    await AsyncStorage.setItem('@scanner_tutorial', JSON.stringify(true));
    navigation.replace('Scanner');
  }, []);

  return (
    <Tutorial slides={slides} skipTutorial={skipTutorial} />
  );
};

export default ScannerTutorial;
