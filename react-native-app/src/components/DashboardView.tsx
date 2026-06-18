import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Personnel, Vehicle, VehicleLog } from '../types';
import { globalStyles } from '../theme/styles';

interface DashboardViewProps {
  personnel: Personnel | null;
  vehicle: Vehicle | null;
  isShiftActive: boolean;
  isGpsEnabled: boolean;
  unsyncedCount: number;
  logs: VehicleLog[];
  isSyncing: boolean;
  onToggleShift: () => void;
  onSync: () => void;
  onClearCache: () => void;
  onOpenSettings: () => void;
  onEmergencySOS: () => void;
}

export const DashboardView = ({
  personnel,
  vehicle,
  isShiftActive,
  isGpsEnabled,
  unsyncedCount,
  logs,
  isSyncing,
  onToggleShift,
  onSync,
  onClearCache,
  onOpenSettings,
  onEmergencySOS,
}: DashboardViewProps) => {
  return (
    <ScrollView contentContainerStyle={globalStyles.dashboardContainer}>
      {/* GPS Warning Overlay */}
      {!isGpsEnabled && (
        <View style={globalStyles.dangerAlertBar}>
          <Text style={globalStyles.dangerAlertText}>
            ⚠️ YOUR PHONE'S GPS IS TURNED OFF! TURN ON TO START PATROLLING.
          </Text>
          <TouchableOpacity onPress={onOpenSettings}>
            <Text style={globalStyles.dangerSettingsLink}>[SYSTEM SETTINGS]</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* SOS EMERGENCY ACTION GATEWAY */}
      <View style={globalStyles.sosCard}>
        <View style={globalStyles.sosHeaderRow}>
          <Text style={globalStyles.sosPill}>🚨 CRITICAL EMERGENCY OVERRIDE</Text>
          <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: 'bold' }}>HQ BACKLINK</Text>
        </View>
        <Text style={globalStyles.sosWarningText}>PNP SOS PANIC TRIGGER</Text>
        <Text style={globalStyles.sosDesc}>
          Tap immediately to broadcast real-time GPS coordinates and legal badge ID: {personnel?.rank} {personnel?.fullname} ({personnel?.badgeNumber}) back to PNP main command HQ dispatch.
        </Text>
        <TouchableOpacity 
          style={globalStyles.sosTriggerButton} 
          onPress={onEmergencySOS}
          activeOpacity={0.7}
        >
          <Text style={globalStyles.sosTriggerText}>SOS</Text>
          <Text style={globalStyles.sosTriggerSubText}>TAP TO ALARM</Text>
        </TouchableOpacity>
      </View>

      {/* Shift Tracker Button */}
      <View style={[globalStyles.card, globalStyles.shiftCard, isShiftActive && globalStyles.shiftCardActive]}>
        <View style={globalStyles.shiftHeaderRow}>
          <Text style={globalStyles.statusPill}>
            {isShiftActive ? "🟢 ACTIVE SHIFT" : "🔴 OFF DUTY"}
          </Text>
          <Text style={globalStyles.gmtText}>PH AST (GMT+8)</Text>
        </View>

        <Text style={globalStyles.activeShiftLabel}>PATROL TRACKING STATE</Text>
        <Text style={globalStyles.policeDutyPlate}>
          PLATE: {vehicle?.plateNumber || `PNP-FOOT-${personnel?.badgeNumber?.substring(0, 4)}`}
        </Text>
        <Text style={globalStyles.shiftDisclaimer}>
          Uses continuous background tracking to push encrypted logs to HQ. Coordinates are recorded even when minimized.
        </Text>

        <TouchableOpacity 
          style={[
            globalStyles.toggleShiftBtn, 
            isShiftActive ? globalStyles.toggleShiftBtnStop : globalStyles.toggleShiftBtnStart
          ]} 
          onPress={onToggleShift}
        >
          <Text style={globalStyles.toggleShiftBtnText}>
            {isShiftActive ? "⏹️ CEASE ACTIVE PATROL" : "🚀 INITIATE FORCE PATROL"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sync Command Widget */}
      <View style={globalStyles.card}>
        <Text style={globalStyles.cardHeading}>HQ TELEMETRY CLOUD GATEWAY</Text>
        <View style={globalStyles.syncCountsRow}>
          <View style={globalStyles.countWidget}>
            <Text style={globalStyles.countVal}>{unsyncedCount}</Text>
            <Text style={globalStyles.countTitle}>Pending logs</Text>
          </View>
          <View style={globalStyles.countWidget}>
            <Text style={globalStyles.countVal}>{logs.length}</Text>
            <Text style={globalStyles.countTitle}>Total Captured</Text>
          </View>
        </View>

        <View style={globalStyles.actionsRow}>
          <TouchableOpacity 
            style={[globalStyles.actionBtn, globalStyles.primaryActionBtn]} 
            onPress={onSync}
            disabled={isSyncing}
          >
            <Text style={globalStyles.actionBtnText}>
              {isSyncing ? "UPLOADING..." : "☁️ GATEWAY SYNC"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[globalStyles.actionBtn, globalStyles.secActionBtn]} 
            onPress={onClearCache}
          >
            <Text style={globalStyles.actionBtnText}>🗑️ CLEAR CACHE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Telemetry Log Table */}
      <View style={globalStyles.card}>
        <Text style={globalStyles.cardHeading}>PATROL LOG FEED (REAL-TIME ASIA/MANILA)</Text>
        {logs.length === 0 ? (
          <Text style={globalStyles.emptyTableText}>
            No coordinates mapped yet on this shift. Start Patrol to request active GPS locations.
          </Text>
        ) : (
          logs.map((log: VehicleLog, idx: number) => {
            const isSos = log.speed === 999.0;
            const localTime = log.capturedAt.split('T')[1]?.substring(0, 8) || "00:00:00";
            return (
              <View key={log.id || idx} style={[globalStyles.logRow, isSos && globalStyles.logRowSos]}>
                <View style={globalStyles.logLeft}>
                  <Text style={globalStyles.logTimeSymbol}>{isSos ? "🚨" : "📍"}</Text>
                  <View>
                    <Text style={[globalStyles.logCoords, isSos && globalStyles.logRowSosText]}>
                      {log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}
                    </Text>
                    <Text style={globalStyles.logCapturedText}>
                      Manila time: {localTime} ({log.isSynced ? 'Synced' : 'Cached'})
                    </Text>
                  </View>
                </View>
                <View style={globalStyles.logRight}>
                  <Text style={globalStyles.logSignalText}>📶 {log.networkSignal}/4</Text>
                  <Text style={[globalStyles.logSpeedText, isSos && globalStyles.logRowSosText]}>
                    {isSos ? "EMERGENCY" : `${(log.speed * 3.6).toFixed(1)} km/h`}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};
