import React, { useState } from 'react';
import { StatusBar, SafeAreaView, View, Text, TouchableOpacity } from 'react-native';

import { usePatrolState } from './src/hooks/usePatrolState';
import { getStyles, getThemeColors } from './src/theme/styles';
import { LoginView } from './src/components/LoginView';
import { DashboardView } from './src/components/DashboardView';
import { TopCommandHeader } from './src/components/TopCommandHeader';

export default function App() {
  // Police Dark Tactical Theme is active by default to replicate native Android exactly
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  
  const styles = getStyles(isDarkTheme);
  const colors = getThemeColors(isDarkTheme);
  
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

  const handleToggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  // If there's no authenticated officer, render target credentials login view
  if (!personnel) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgDark }]}>
        <StatusBar 
          barStyle={isDarkTheme ? "light-content" : "dark-content"} 
          backgroundColor={colors.bgDark} 
        />
        <LoginView
          isGpsEnabled={isGpsEnabled}
          gpsLoading={gpsLoading}
          onLogin={login}
          onOpenSettings={openSystemSettings}
          isDarkTheme={isDarkTheme}
          onToggleTheme={handleToggleTheme}
        />
      </SafeAreaView>
    );
  }

  // Once credentials verification is complete, render active tactical screen layout 
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgDark }]}>
      <StatusBar 
        barStyle={isDarkTheme ? "light-content" : "dark-content"} 
        backgroundColor={colors.bgDark} 
      />
      
      {/* Replicates TopCommandHeader inside native Compose */}
      <TopCommandHeader
        onLogout={logout}
        isDarkTheme={isDarkTheme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Persistent Red alert header active during shifts */}
      {isShiftActive && (
        <View style={styles.patrolNotificationBar}>
          <View style={styles.patrolNotificationInfo}>
            <Text style={styles.patrolNotificationTitle}>
              🚨 ACTIVE SHIFT PATROL ENGAGED
            </Text>
            <Text style={styles.patrolNotificationSub}>
              Background GPS active. Coordinates log to SQLite even when closed.
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.patrolNotificationButtonSos}
            onPress={triggerEmergencySOS}
            activeOpacity={0.7}
          >
            <Text style={styles.patrolNotificationButtonSosText}>SOS</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Single-view dashboard wrapper that embeds tactical features, schedules, and security tools */}
      <DashboardView
        personnel={personnel}
        vehicle={vehicle}
        schedule={schedule}
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
        
        autoSync={autoSync}
        onToggleAutoSync={toggleAutoSync}
        is2FAEnabled={is2FAEnabled}
        onEnable2FA={enable2FA}
        onDisable2FA={disable2FA}
        
        isDarkTheme={isDarkTheme}
      />
    </SafeAreaView>
  );
}
