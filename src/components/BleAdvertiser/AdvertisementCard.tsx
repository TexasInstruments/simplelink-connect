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

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Switch } from '../Themed'

import { FontAwesome, FontAwesome5, FontAwesome6, MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { IAdvertisement } from '../../../types';

interface AdvertisementCardProps {
  advertisement: IAdvertisement;
  onToggle: (id: string) => void;
  onEdit: (advertisement: IAdvertisement) => void;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
}

const AdvertisementCard: React.FC<AdvertisementCardProps> = ({
  advertisement,
  onToggle,
  onEdit,
  onClone,
  onDelete,
}) => {
  // Blinking animation for active indicator
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (advertisement.isActive) {
      // Start blinking animation
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      blink.start();

      return () => {
        blink.stop();
        blinkAnim.setValue(1);
      };
    } else {
      blinkAnim.setValue(1);
    }
  }, [advertisement.isActive, blinkAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.mainRow}>
        {/* Left: Icon */}
        <View style={styles.iconContainer}>
          <FontAwesome6
            name="tower-broadcast"
            size={20}
          />
        </View>

        {/* Center: Content */}
        <View style={styles.contentContainer}>
          {/* Name */}
          <Text style={styles.name} numberOfLines={1}>
            {advertisement.name}
          </Text>

          {/* Local Name (if different) */}
          {advertisement.localName && advertisement.localName !== advertisement.name && (
            <Text style={styles.localName} numberOfLines={1}>
              {advertisement.localName}
            </Text>
          )}

          {/* Info Row */}
          <View style={styles.infoRow}>
            {/* Active Indicator with Blinking */}
            {advertisement.isActive && (
              <View style={styles.activeIndicator}>
                <Text style={styles.infoLabel}>Active</Text>
                <Animated.View style={{ opacity: blinkAnim }}>
                  <FontAwesome name="circle" size={6} color={Colors.buttonSliderOn} style={{ marginLeft: 4 }} />
                </Animated.View>
              </View>
            )}

            {/* Service UUIDs Count */}
            {advertisement.serviceUUIDs.length > 0 && (
              <View style={styles.infoItem}>
                <FontAwesome name="list" size={12} color={Colors.gray} />
                <Text style={styles.infoText}>
                  {advertisement.serviceUUIDs.length} Service{advertisement.serviceUUIDs.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}

            {/* Manufacturer Data */}
            {advertisement.manufacturerData && (
              <View style={styles.infoItem}>
                <FontAwesome name="industry" size={12} color={Colors.gray} />
                <Text style={styles.infoText}>MFG Data</Text>
              </View>
            )}

            {/* Settings */}
            {advertisement.connectable && (
              <View style={styles.infoItem}>
                <FontAwesome name="link" size={12} color={Colors.gray} />
                <Text style={styles.infoText}>
                  Connectable
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Right: Toggle Switch */}
        <View style={styles.toggleContainer}>
          <Switch
            value={advertisement.isActive}
            onValueChange={() => onToggle(advertisement.id)}
          />
        </View>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionRow}>
        <View style={{ display: 'flex', flexDirection: 'row' }}>
          <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(advertisement)}>
            <MaterialIcons name="edit" size={18} color={Colors.blue} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => onClone(advertisement.id)}>
            <MaterialIcons name="content-copy" size={18} color={Colors.blue} />
            <Text style={styles.actionText}>Clone</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.actionButton} onPress={() => onDelete(advertisement.id)}>
          <MaterialIcons name="delete-outline" size={18} color={Colors.red} />
          <Text style={[styles.actionText, { color: Colors.red }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderBottomWidth: 0,
    borderBottomColor: 'rgba(211,211,211,0.3)',
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    // Android shadow
    elevation: 4,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 2,
  },
  localName: {
    fontSize: 13,
    color: Colors.gray,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.buttonSliderOn,
    fontWeight: '600',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  infoText: {
    fontSize: 12,
    color: Colors.gray,
    marginLeft: 4,
  },
  toggleContainer: {
    marginLeft: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(211,211,211,0.3)',
    paddingTop: 10,
    marginTop: 5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    fontSize: 14,
    color: Colors.blue,
    fontWeight: "500",
    marginLeft: 6,
  },
});

export default AdvertisementCard;
