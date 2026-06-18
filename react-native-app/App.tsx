import React, { useState } from 'react';
import { StatusBar, SafeAreaView, View, Text, TouchableOpacity } from 'react-native';

import { usePatrolState } from './src/hooks/usePatrolState';
import { globalStyles } from './src/theme/styles';
import { LoginView } from './src/components/LoginView';
import { DashboardView } from './src/components/DashboardView';
import { ScheduleView } from './src/components/ScheduleView';
import { SettingsView } from './src/components/SettingsView';
import { Navbar } from './src/components/Navbar';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'schedule' | 'settings'>('dashboard');
  
  const {
    personnel,
    vehicle,
    schedule,
    logs,
    unsyncedCount,
    isShiftActive,
    isGpsEnabled,
    gpsLoading,
    isSyncing,
    autoSync,
    login,
    logout,
    toggleShift,
    syncLogsWithRemote,
    flushSyncedCache,
    openSystemSettings,
    triggerEmergencySOS,
    toggleAutoSync,
    is2FAEnabled,
    enable2FA,
    disable2FA,
  } = usePatrolState();

  // If there's no authenticated officer, render target credentials lock view
  if (!personnel) {
    return (
      <SafeAreaView style={globalStyles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F1F5F9" />
        <LoginView
          isGpsEnabled={isGpsEnabled}
          gpsLoading={gpsLoading}
          onLogin={login}
          onOpenSettings={openSystemSettings}
        />
      </SafeAreaView>
    );
  }

  // Once credentials verification is complete, render active layout with Navbar
  return (
    <SafeAreaView style={globalStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F1F5F9" />
      
      <Navbar
        personnel={personnel}
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        onLogout={logout}
      />

      {isShiftActive && (
        <View style={globalStyles.patrolNotificationBar}>
          <View style={globalStyles.patrolNotificationInfo}>
            <Text style={globalStyles.patrolNotificationTitle}>
              🚨 ACTIVE BEAT PATROL ENGAGED
            </Text>
            <Text style={globalStyles.patrolNotificationSub}>
              Background GPS is enabled. Coordinates log securely even when closed.
            </Text>
          </View>
          <TouchableOpacity 
            style={globalStyles.patrolNotificationButtonSos}
            onPress={triggerEmergencySOS}
            activeOpacity={0.7}
          >
            <Text style={globalStyles.patrolNotificationButtonSosText}>SOS</Text>
          </TouchableOpacity>
        </View>
      )}

      {currentScreen === 'dashboard' && (
        <DashboardView
          personnel={personnel}
          vehicle={vehicle}
          isShiftActive={isShiftActive}
          isGpsEnabled={isGpsEnabled}
          unsyncedCount={unsyncedCount}
          logs={logs}
          isSyncing={isSyncing}
          onToggleShift={toggleShift}
          onSync={syncLogsWithRemote}
          onClearCache={flushSyncedCache}
          onOpenSettings={openSystemSettings}
          onEmergencySOS={triggerEmergencySOS}
        />
      )}
      {currentScreen === 'schedule' && (
        <ScheduleView schedule={schedule} />
      )}
      {currentScreen === 'settings' && (
        <SettingsView
          autoSync={autoSync}
          onToggleAutoSync={toggleAutoSync}
          unsyncedCount={unsyncedCount}
          onClearCache={flushSyncedCache}
          isShiftActive={isShiftActive}
          badge={personnel?.badgeNumber || '000000'}
          is2FAEnabled={is2FAEnabled}
          onEnable2FA={enable2FA}
          onDisable2FA={disable2FA}
        />
      )}
    </SafeAreaView>
  );
}
