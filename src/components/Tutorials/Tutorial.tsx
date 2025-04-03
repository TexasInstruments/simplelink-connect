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

import { useCallback, useRef, useState } from 'react';
import { Animated, ViewToken } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity, Text, View } from '../Themed';
import Colors from '../../constants/Colors';
import Paginator from './Paginator';
import TutorialSlide from './TutorialSlide';

interface Props {
    slides: TutorialSlide[];
    skipTutorial: () => void;
}

type TutorialSlide = {
    id: string;
    img: any;
};

export const Tutorial: React.FC<Props> = ({ slides, skipTutorial }) => {
    const [currentIndex, setCurrentIndex] = useState<number | null>(0);

    let sliderRef = useRef<FlatList<TutorialSlide> | null>(null);
    let scrollX = useRef(new Animated.Value(0)).current;

    const viewableItemsChanged = useRef(
        ({ viewableItems }: { viewableItems: ViewToken[]; changed: ViewToken[] }) => {
            setCurrentIndex(viewableItems[0].index);
        }
    ).current;


    const goToNextSlide = useCallback(() => {
        if (currentIndex! >= 0 && currentIndex! < slides.length - 1) {
            sliderRef.current?.scrollToIndex({
                animated: true,
                index: currentIndex! + 1,
            });
            setCurrentIndex(currentIndex! + 1)
        } else {
            skipTutorial();
        }
    }, [currentIndex]);

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flex: 3 }}>
                <FlatList
                    ref={sliderRef}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                        useNativeDriver: false,
                    })}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    data={slides}
                    onViewableItemsChanged={viewableItemsChanged}
                    renderItem={({ item }) => <TutorialSlide {...item} />}
                    keyExtractor={(item) => item.id}
                />
            </View>
            <View
                style={{
                    flexDirection: 'column',
                    justifyContent: 'center',
                    paddingHorizontal: 20,
                }}
            >
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                    }}
                >
                    <TouchableOpacity onPress={goToNextSlide}>
                        <Text style={{ fontSize: 20, paddingLeft: 20, color: Colors.blue }}>Next</Text>
                    </TouchableOpacity>
                    <Paginator items={slides} scrollX={scrollX} />

                    <TouchableOpacity onPress={skipTutorial}>
                        <Text style={{ fontSize: 20, paddingRight: 20, color: Colors.blue }}>Skip</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};
