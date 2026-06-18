import React from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { globalStyles } from '../theme/styles';

interface SettingsViewProps {
  autoSync: boolean;
  onToggleAutoSync: () => void;
  unsyncedCount: number;
  onClearCache: () => void;
  isShiftActive: boolean;
}

export const SettingsView = ({
  autoSync,
  onToggleAutoSync,
  unsyncedCount,
  onClearCache,
  isShiftActive,
}: SettingsViewProps) => {
  return (
    <ScrollView contentContainerStyle={globalStyles.dashboardContainer}>
      <View style={globalStyles.card}>
        <Text style={globalStyles.cardHeading}>HQ TELEMETRY SETTINGS</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingTitle}>Automatic Syncing</Text>
            <Text style={styles.settingDesc}>
              Periodically stream your active telemetry coordinates back to the PNP main HQ command database while patrolling.
            </Text>
          </View>
          <Switch
            trackColor={{ false: '#CBD5E1', true: '#22C55E' }}
            thumbColor={autoSync ? '#FFFFFF' : '#F1F5F9'}
            ios_backgroundColor="#CBD5E1"
            onValueChange={onToggleAutoSync}
            value={autoSync}
            style={styles.settingSwitch}
          />
        </View>

        <View style={globalStyles.disclaimerContainer}>
          <Text style={globalStyles.disclaimerHead}>BATTERY & DATA SAVINGS</Text>
          <Text style={globalStyles.disclaimerText}>
            {autoSync 
              ? "⚡ STATUS: Active sync is enabled. The application will regularly connect to cellular/satellite networks to telemetry live positionings. This may slightly increase battery consumption."
              : "🔋 STATUS: Local storage queue active. Telemetry points are safely stored inside local SQLite memory and will only be uploaded to servers when you manually press the GATEWAY SYNC button. (Saves up to 40% battery)."
            }
          </Text>
        </View>
      </View>

      <View style={globalStyles.card}>
        <Text style={globalStyles.cardHeading}>LOCAL DATA UTILITIES</Text>
        
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Queue Status:</Text>
          <Text style={styles.metaValue}>
            {unsyncedCount > 0 ? `${unsyncedCount} logs pending manual gateway upload` : "All local points synced"}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Patrolling State:</Text>
          <Text style={[styles.metaValue, { color: isShiftActive ? '#22C55E' : '#64748B' }]}>
            {isShiftActive ? "Active / Tracking Position" : "Inactive / Idle"}
          </Text>
        </View>

        <TouchableOpacity 
          style={[globalStyles.actionBtn, globalStyles.secActionBtn, { marginTop: 16 }]}
          onPress={onClearCache}
        >
          <Text style={globalStyles.actionBtnText}>🧹 PURGE SYNCED LOCAL MEMORY</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 16,
  },
  settingLeft: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 4,
  },
  settingDesc: {
    color: '#475569',
    fontSize: 11.5,
    lineHeight: 16,
  },
  settingSwitch: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  metaLabel: {
    color: '#64748B',
    fontSize: 12,
  },
  metaValue: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
