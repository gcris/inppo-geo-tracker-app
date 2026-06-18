import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Schedule } from '../types';
import { globalStyles } from '../theme/styles';

interface ScheduleViewProps {
  schedule: Schedule | null;
}

export const ScheduleView = ({ schedule }: ScheduleViewProps) => {
  return (
    <ScrollView contentContainerStyle={globalStyles.dashboardContainer}>
      <View style={globalStyles.card}>
        <Text style={globalStyles.cardHeading}>ASSIGNED SECTOR MAP</Text>
        <View style={globalStyles.mapReplica}>
          <Text style={globalStyles.mapEmoji}>🗺️</Text>
          <Text style={globalStyles.mapTitle}>ACTIVE AREA SHIELD</Text>
          <Text style={globalStyles.mapSub}>
            {schedule?.sector || "Sector 4 (Intramuros & Ermita Foot Patrol district)"}
          </Text>
          <View style={globalStyles.mapLine} />
          <Text style={globalStyles.mapIndicator}>🎯 MAPPED BOUNDARIES: SECURE PATROL GRID ON DUTY</Text>
        </View>

        <View style={globalStyles.scheduleDetailBox}>
          <Text style={globalStyles.schedTitle}>POLICE FORCE SCHEDULE FILES</Text>
          <View style={globalStyles.schedRow}>
            <Text style={globalStyles.schedKey}>Assigned Date:</Text>
            <Text style={globalStyles.schedValue}>
              {schedule?.date || new Date().toISOString().split('T')[0]}
            </Text>
          </View>
          <View style={globalStyles.schedRow}>
            <Text style={globalStyles.schedKey}>Assigned Hours:</Text>
            <Text style={globalStyles.schedValue}>
              {schedule?.timeFrom || "08:00"} to {schedule?.timeTo || "17:00"} PHT
            </Text>
          </View>
          <View style={globalStyles.schedRow}>
            <Text style={globalStyles.schedKey}>Patrol Unit:</Text>
            <Text style={globalStyles.schedValue}>MANILA DISTRICT FOOT PATROL UNIT-4</Text>
          </View>
        </View>
        
        <View style={globalStyles.disclaimerContainer}>
          <Text style={globalStyles.disclaimerHead}>SECTOR COMPLIANCE REGULATIONS</Text>
          <Text style={globalStyles.disclaimerText}>
            Official duty protocols dictate officers must strictly cover at least 85% of mapped walking nodes during designated shift hours to maintain dynamic security ratings.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};
