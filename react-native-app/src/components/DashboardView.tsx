import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Switch,
  Clipboard,
  Alert
} from 'react-native';
import { Personnel, Vehicle, VehicleLog, Schedule } from '../types';
import { getStyles, getThemeColors } from '../theme/styles';
import { generateRandomSecret } from '../services/totp';

interface DashboardViewProps {
  personnel: Personnel | null;
  vehicle: Vehicle | null;
  schedule: Schedule | null;
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
  
  // Tactical Settings props passed directly down
  autoSync: boolean;
  onToggleAutoSync: () => void;
  is2FAEnabled: boolean;
  onEnable2FA: (secret: string, code: string) => Promise<boolean>;
  onDisable2FA: () => Promise<void>;
  
  isDarkTheme: boolean;
}

export const DashboardView = ({
  personnel,
  vehicle,
  schedule,
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
  
  autoSync,
  onToggleAutoSync,
  is2FAEnabled,
  onEnable2FA,
  onDisable2FA,
  
  isDarkTheme,
}: DashboardViewProps) => {
  const styles = getStyles(isDarkTheme);
  const colors = getThemeColors(isDarkTheme);

  // Switch between 'radar', 'schedule', and 'settings' inline tabs matching native Compose behavior
  const [activeTab, setActiveTab] = useState<'radar' | 'schedule' | 'settings'>('radar');

  // TOTP local setup states
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  // Map limits for tactical grid render, matching native Android
  const minLat = 14.585;
  const maxLat = 14.594;
  const minLng = 120.970;
  const maxLng = 120.977;

  const start2FASetup = () => {
    const freshSecret = generateRandomSecret();
    setMfaSecret(freshSecret);
    setMfaToken('');
    setIsSettingUp2FA(true);
  };

  const handleCopySecret = () => {
    Clipboard.setString(mfaSecret);
    Alert.alert("Secret Copied", "Your Two-Factor setup key has been saved to device clipboard.");
  };

  const handleEnable2FAConfirm = async () => {
    if (mfaToken.trim().length !== 6) {
      Alert.alert("Verify Error", "Please enter a valid 6-digit verification code.");
      return;
    }
    setMfaLoading(true);
    const success = await onEnable2FA(mfaSecret, mfaToken.trim());
    setMfaLoading(false);
    if (success) {
      setIsSettingUp2FA(false);
      setMfaToken('');
    }
  };

  const handleDisable2FAConfirm = () => {
    Alert.alert(
      "Disable MFA Protection?",
      "Warning: Disabling Two-Factor Authorization decreases account safety. PNP guidelines suggest maintaining active authenticator link locks.",
      [
        { text: "Confirm Disable", style: "destructive", onPress: onDisable2FA },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.dashboardContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* GPS Alert Ribbon */}
      {!isGpsEnabled && (
        <View style={styles.dangerAlertBar}>
          <Text style={styles.dangerAlertText}>
            ⚠️ PHONE'S INTERNAL GPS DISCONNECTED! ACTIVATE DEVICE LOCATION.
          </Text>
          <TouchableOpacity onPress={onOpenSettings}>
            <Text style={styles.dangerSettingsLink}>[ENABLE NOW]</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* OFFICER PROFILE CARD */}
      <View style={[styles.card, { paddingVertical: 12, paddingHorizontal: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 6,
            backgroundColor: isDarkTheme ? '#1E293B' : '#F1F5F9',
            borderWidth: 1,
            borderColor: colors.borderBlue,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 24 }}>👮</Text>
          </View>
          <View style={{ marginLeft: 14, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ 
                backgroundColor: isDarkTheme ? 'rgba(24ACC15,0.15)' : 'rgba(30,58,138,0.1)', 
                paddingHorizontal: 6, 
                paddingVertical: 2, 
                borderRadius: 4 
              }}>
                <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.accentAmber }}>
                  {personnel?.rank || 'PCpl'}
                </Text>
              </View>
              <Text style={{ fontSize: 10, fontFamily: 'monospace', color: colors.textSecondary, marginLeft: 8 }}>
                {personnel?.badgeNumber || 'PNP-XXXX'}
              </Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: 'extrabold', color: colors.blackText, marginTop: 1 }}>
              {personnel?.fullname || 'Gerry Cris Cariaga'}
            </Text>
            <Text style={{ fontSize: 9.5, color: colors.textSecondary, marginTop: 1 }}>
              Assigned Terminal Slot • {vehicle?.plateNumber || 'PNP-EP-391'}
            </Text>
          </View>
        </View>
      </View>

      {/* THREE TACTICAL INLINE NAVIGATION SELECTION TABS */}
      <View style={{ 
        flexDirection: 'row', 
        backgroundColor: colors.surfaceBlue, 
        borderRadius: 8, 
        borderWidth: 1, 
        borderColor: colors.borderBlue, 
        padding: 4, 
        marginBottom: 16 
      }}>
        <TouchableOpacity 
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 6,
            backgroundColor: activeTab === 'radar' ? colors.accentAmber : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => setActiveTab('radar')}
        >
          <Text style={{ 
            fontSize: 10, 
            fontWeight: '900', 
            letterSpacing: 0.5,
            color: activeTab === 'radar' ? (isDarkTheme ? '#0B121F' : '#FFFFFF') : colors.textSecondary 
          }}>
            LIVE RADAR
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 6,
            backgroundColor: activeTab === 'schedule' ? colors.accentAmber : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => setActiveTab('schedule')}
        >
          <Text style={{ 
            fontSize: 10, 
            fontWeight: '900', 
            letterSpacing: 0.5,
            color: activeTab === 'schedule' ? (isDarkTheme ? '#0B121F' : '#FFFFFF') : colors.textSecondary 
          }}>
            DUTY SECTOR
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 6,
            backgroundColor: activeTab === 'settings' ? colors.accentAmber : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={{ 
            fontSize: 10, 
            fontWeight: '900', 
            letterSpacing: 0.5,
            color: activeTab === 'settings' ? (isDarkTheme ? '#0B121F' : '#FFFFFF') : colors.textSecondary 
          }}>
            SECURITY HUB
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB VALUE 1: LIVE SHIFT RADAR SCREEN (MAP CANVAS, CONTROLS, LISTS) */}
      {activeTab === 'radar' && (
        <View style={{ width: '100%' }}>
          
          {/* CRITICAL SOS PANIC BUTTON */}
          <View style={styles.sosCard}>
            <View style={styles.sosHeaderRow}>
              <Text style={styles.sosPill}>🚨 CRITICAL EMERGENCY OVERRIDE</Text>
              <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '900' }}>HQ BACKLINK</Text>
            </View>
            <Text style={styles.sosWarningText}>PNP SOS PANIC TRIGGER</Text>
            <Text style={styles.sosDesc}>
              Tap immediately to broadcast real-time GPS coordinates and legal badge ID: {personnel?.rank} {personnel?.fullname} ({personnel?.badgeNumber}) back to PNP main command HQ dispatch.
            </Text>
            <TouchableOpacity 
              style={styles.sosTriggerButton} 
              onPress={onEmergencySOS}
              activeOpacity={0.8}
            >
              <Text style={styles.sosTriggerText}>SOS</Text>
              <Text style={styles.sosTriggerSubText}>PANIC LOCK</Text>
            </TouchableOpacity>
          </View>

          {/* ACTIVE FORCE PATROL SHIFT CONTROL CARD */}
          <View style={[styles.card, styles.shiftCard, isShiftActive && styles.shiftCardActive]}>
            <View style={styles.shiftHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isShiftActive ? '#10B981' : '#EF4444',
                  marginRight: 8,
                }} />
                <Text style={[styles.statusPill, isShiftActive && styles.statusPillActive]}>
                  {isShiftActive ? "ACTIVE FORCE SHIFT" : "PATROL SUSPENDED"}
                </Text>
              </View>
              <Text style={styles.gmtText}>Asia/Manila GMT+8</Text>
            </View>

            <Text style={styles.activeShiftLabel}>PATROL TRACKING STATUS</Text>
            <Text style={styles.policeDutyPlate}>
              {isShiftActive ? "RECORDING ACTIVE BEAT" : "TERMINAL OFF-DUTY"}
            </Text>
            <Text style={styles.shiftDisclaimer}>
              When active, location coordinates are streamed and cached locally inside SQLite even when screen is locked or app minimized.
            </Text>

            <TouchableOpacity 
              style={[
                styles.toggleShiftBtn, 
                isShiftActive ? styles.toggleShiftBtnStop : styles.toggleShiftBtnStart
              ]} 
              onPress={onToggleShift}
              activeOpacity={0.8}
            >
              <Text style={styles.toggleShiftBtnText}>
                {isShiftActive ? "⏹️ CEASE ACTIVE PATROL" : "🚀 INITIATE FORCE PATROL"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* GEOLOCATION ROUTE PLOTTER CANVAS */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>TACTICAL GRID MONITOR</Text>
            <View style={styles.mapReplica}>
              {/* Decorative grid coordinates lines */}
              <View style={styles.radarCrosshairHorizontal} />
              <View style={styles.radarCrosshairVertical} />
              <View style={styles.radarSweepCircle1} />
              <View style={styles.radarSweepCircle2} />
              <View style={styles.radarSweepCircle3} />

              {/* Coordinates details card on top of background radar */}
              <View style={{
                position: 'absolute',
                top: 8,
                left: 8,
                backgroundColor: isDarkTheme ? 'rgba(20,32,53,0.85)' : 'rgba(255,255,255,0.85)',
                padding: 6,
                borderRadius: 4,
                borderWidth: 0.5,
                borderColor: colors.borderBlue,
                zIndex: 20,
              }}>
                {logs.length > 0 ? (
                  <View>
                    <Text style={{ fontSize: 8, fontFamily: 'monospace', fontWeight: 'bold', color: colors.blackText }}>
                      LAT: {logs[0].latitude.toFixed(5)}
                    </Text>
                    <Text style={{ fontSize: 8, fontFamily: 'monospace', fontWeight: 'bold', color: colors.blackText }}>
                      LNG: {logs[0].longitude.toFixed(5)}
                    </Text>
                    <Text style={{ fontSize: 9, fontWeight: 'black', color: colors.accentAmber, marginTop: 2 }}>
                      PACING: {logs[0].speed === 999.0 ? "EMERGENCY" : `${(logs[0].speed * 3.6).toFixed(1)} km/h`}
                    </Text>
                  </View>
                ) : (
                  <View>
                    <Text style={{ fontSize: 8, fontFamily: 'monospace', color: colors.textSecondary }}>LAT: 14.59160</Text>
                    <Text style={{ fontSize: 8, fontFamily: 'monospace', color: colors.textSecondary }}>LNG: 120.97330</Text>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.textSecondary, marginTop: 2 }}>STANDBY • 0.0 km/h</Text>
                  </View>
                )}
              </View>

              {/* Dynamically plotting route nodes inside container dimensions */}
              <View style={styles.canvasContainer}>
                {logs.slice(0, 20).reverse().map((log, index, arr) => {
                  const isSos = log.speed === 999.0;
                  const isLast = index === arr.length - 1;
                  
                  // Coordinate percentage translator
                  const xRatio = (log.longitude - minLng) / (maxLng - minLng);
                  const yRatio = (log.latitude - minLat) / (maxLat - minLat);
                  
                  const offsetLeft = Math.max(5, Math.min(92, xRatio * 100));
                  const offsetTop = Math.max(5, Math.min(92, (1 - yRatio) * 100)); // invert Y

                  return (
                    <View 
                      key={log.id || index}
                      style={{
                        position: 'absolute',
                        left: `${offsetLeft}%`,
                        top: `${offsetTop}%`,
                        width: isSos ? 13 : (isLast ? 10 : 6),
                        height: isSos ? 13 : (isLast ? 10 : 6),
                        borderRadius: isSos ? 6.5 : (isLast ? 5 : 3),
                        backgroundColor: isSos ? '#EF4444' : (isLast ? colors.accentAmber : '#10B981'),
                        borderWidth: 1.5,
                        borderColor: '#FFFFFF',
                        transform: [{ translateX: -3 }, { translateY: -3 }],
                        zIndex: isLast ? 15 : 10,
                      }}
                    />
                  );
                })}
              </View>

              <View style={styles.mapLabelSurface}>
                <Text style={styles.mapLabelText}>SECTOR 4 TACTICAL MAP</Text>
              </View>

              {logs.length === 0 && (
                <View style={{ position: 'absolute', zIndex: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, marginBottom: 4 }}>🛰️</Text>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.blackText }}>STANDBY FOR TELEMETRY LOCKS</Text>
                  <Text style={{ fontSize: 8, color: colors.textSecondary, marginTop: 2, textAlign: 'center', width: 220 }}>
                    Start force shift to feed real-time coordinates to map grid.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* TELEMETRY MANUAL GATEWAY SYNC BAR */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>HQ TELEMETRY CLOUD GATEWAY</Text>
            <View style={styles.syncCountsRow}>
              <View style={styles.countWidget}>
                <Text style={styles.countVal}>{unsyncedCount}</Text>
                <Text style={styles.countTitle}>Pending logs</Text>
              </View>
              <View style={styles.countWidget}>
                <Text style={styles.countVal}>{logs.length}</Text>
                <Text style={styles.countTitle}>Total Captured</Text>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.primaryActionBtn]} 
                onPress={onSync}
                disabled={isSyncing}
                activeOpacity={0.8}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.actionBtnText}>☁️ GATEWAY SYNC</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.secActionBtn]} 
                onPress={onClearCache}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnText}>🗑️ CLEAR CACHE</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* TELEMETRY COORDINATES LOG STREAM FEED */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>POLICE COORDINATE FEED (REAL-TIME LIST)</Text>
            {logs.length === 0 ? (
              <Text style={styles.emptyTableText}>
                No path records active in database. Start shift patrol.
              </Text>
            ) : (
              logs.map((log, index) => {
                const isSos = log.speed === 999.0;
                const localTime = log.capturedAt.split('T')[1]?.substring(0, 8) || "00:00:00";
                return (
                  <View 
                    key={log.id || index}
                    style={[styles.logRow, isSos && styles.logRowSos, { paddingHorizontal: isSos ? 8 : 0, borderRadius: isSos ? 6 : 0 }]}
                  >
                    <View style={styles.logLeft}>
                      <Text style={styles.logTimeSymbol}>{isSos ? "🚨" : "📍"}</Text>
                      <View>
                        <Text style={[styles.logCoords, isSos && styles.logRowSosText]}>
                          {log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}
                        </Text>
                        <Text style={styles.logCapturedText}>
                          Manila Time: {localTime} • {log.isSynced ? 'SYNCED' : 'CACHED'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.logRight}>
                      <Text style={styles.logSignalText}>📶 {log.networkSignal}/4</Text>
                      <Text style={[styles.logSpeedText, isSos && styles.logRowSosText, { color: colors.blackText }]}>
                        {isSos ? "EMERGENCY" : `${(log.speed * 3.6).toFixed(1)} km/h`}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

        </View>
      )}

      {/* TAB VALUE 2: DUTY SECTOR DETAILS & FORCE NOTICES */}
      {activeTab === 'schedule' && (
        <View style={{ width: '100%' }}>
          
          <View style={styles.card}>
            <Text style={styles.cardHeading}>ASSIGNED SECTOR MAP</Text>
            <View style={styles.mapReplica}>
              <Text style={styles.mapEmoji}>🗺️</Text>
              <Text style={styles.mapTitle}>ACTIVE WORKPLACE BOUNDS</Text>
              <Text style={styles.mapSub}>
                {schedule?.sector || "Sector 4 (Intramuros & Ermita Foot Patrol Area)"}
              </Text>
              <View style={styles.mapLine} />
              <Text style={styles.mapIndicator}>🎯 STATE COMPLIANCE ALERTS ENABLED</Text>
            </View>

            <View style={styles.scheduleDetailBox}>
              <Text style={styles.schedTitle}>POLICE FORCE SCHEDULE DATABASE FILES</Text>
              
              <View style={styles.schedRow}>
                <Text style={styles.schedKey}>Scheduled Date:</Text>
                <Text style={styles.schedValue}>
                  {schedule?.date || new Date().toISOString().split('T')[0]}
                </Text>
              </View>
              
              <View style={styles.schedRow}>
                <Text style={styles.schedKey}>Operational Hours:</Text>
                <Text style={styles.schedValue}>
                  {schedule?.timeFrom || "08:00"} to {schedule?.timeTo || "17:00"} PHT
                </Text>
              </View>

              <View style={styles.schedRow}>
                <Text style={styles.schedKey}>Force Patrol Unit:</Text>
                <Text style={styles.schedValue}>Manila District Patrol Unit 4</Text>
              </View>

              <View style={styles.schedRow}>
                <Text style={styles.schedKey}>Assigned Officer Code:</Text>
                <Text style={[styles.schedValue, { fontSize: 9.5, fontFamily: 'monospace' }]}>
                  {personnel?.id?.substring(0, 18) || "N/A"}
                </Text>
              </View>
            </View>
          </View>

          {/* SECTOR ADVISORIES COMPLIANCE TEXT ROW FROM THEME INSTRUCTIONS */}
          <View style={[styles.card, { borderColor: colors.accentAmber + '40' }]}>
            <Text style={styles.cardHeading}>FORCE STANDING MANDATED INSTRUCTIONS</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 16 }}>
              • Foot patrol personnel are mandated to walk a minimum of 10,000 pacing cycles or 6 kilometers per 8-hour shift within their designated Intramuros boundaries.{"\n"}{"\n"}
              • Any geofence deviation beyond 50 meters of the sector outline will raise automated alarms on Supabase Row Level Security logs and push real-time telemetry markers back to Command HQs.{"\n"}{"\n"}
              • Signal coverage inside the Fort Santiago vaults and San Agustin cellars is flaky. The SQLite local buffer will hold location queues automatically until cellular coverage resumes.
            </Text>
          </View>

        </View>
      )}

      {/* TAB VALUE 3: FORCE TOOLS & SECURITY CONTROL SHIELD */}
      {activeTab === 'settings' && (
        <View style={{ width: '100%' }}>
          
          {/* GOOGLE AUTHENTICATOR MFA CARD */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>🛡️ GOOGLE AUTHENTICATOR (MFA SECURE SHIELD)</Text>
            
            {is2FAEnabled && !isSettingUp2FA ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkTheme ? '#1B2C24' : '#E6F4EA', padding: 12, borderRadius: 8, marginBottom: 14 }}>
                <Text style={{ fontSize: 28, marginRight: 12 }}>🛡️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#10B981' }}>MFA IDENTIFICATION ENFORCED</Text>
                  <Text style={{ fontSize: 9.5, color: colors.textSecondary }}>
                    Officer shield is protected by rotating Google TOTP tokens. Future identity joins will require authenticator synchronizations.
                  </Text>
                </View>
                <TouchableOpacity 
                  style={{ backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 }}
                  onPress={handleDisable2FAConfirm}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: 'bold' }}>DISABLE</Text>
                </TouchableOpacity>
              </View>
            ) : !isSettingUp2FA ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkTheme ? '#2d1b1b' : '#FEF2F2', padding: 12, borderRadius: 8, marginBottom: 14 }}>
                <Text style={{ fontSize: 28, marginRight: 12 }}>🔓</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#EF4444' }}>MFA PROTECTION SUSPENDED</Text>
                  <Text style={{ fontSize: 9.5, color: colors.textSecondary }}>
                    Identity linkage is relying on passwords only. Enable Google Authenticator keys to lock coordinate logs from administrative modifications.
                  </Text>
                </View>
                <TouchableOpacity 
                  style={{ backgroundColor: colors.accentAmber, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 }}
                  onPress={start2FASetup}
                >
                  <Text style={{ color: isDarkTheme ? '#0B121F' : '#FFFFFF', fontSize: 9, fontWeight: '900' }}>ACTIVATE</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* TWO FACTOR SETUP INLINE WORKFLOW */}
            {isSettingUp2FA && (
              <View style={{ borderTopWidth: 0.5, borderTopColor: colors.borderBlue, paddingTop: 14 }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: colors.accentAmber, marginBottom: 4 }}>STEP 1: CONFIGURE SYSTEM KEY</Text>
                <Text style={{ fontSize: 10.5, color: colors.textSecondary, marginBottom: 10 }}>
                  Open Google Authenticator on your smartphone, click "+", select "Enter setup key".
                </Text>

                <Text style={{ fontSize: 10, fontWeight: '900', color: colors.accentAmber, marginBottom: 4 }}>STEP 2: DETAILS INTEGRATIONS</Text>
                <View style={{ backgroundColor: isDarkTheme ? '#0F172A' : '#F8FAFC', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.borderBlue, marginBottom: 10 }}>
                  <Text style={{ fontSize: 9, color: colors.textSecondary }}>Account Reference:</Text>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.blackText, marginBottom: 6 }}>PNP Patroller ({personnel?.badgeNumber || '0000'})</Text>
                  <Text style={{ fontSize: 9, color: colors.textSecondary }}>Secret Private key:</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold', color: colors.accentAmber, letterSpacing: 1 }}>{mfaSecret}</Text>
                  
                  <TouchableOpacity 
                    style={{ backgroundColor: colors.borderBlue, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, marginTop: 8 }}
                    onPress={handleCopySecret}
                  >
                    <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: colors.blackText }}>📋 COPY KEY</Text>
                  </TouchableOpacity>
                </View>

                <Text style={{ fontSize: 10, fontWeight: '900', color: colors.accentAmber, marginBottom: 4 }}>STEP 3: SECURE TOKEN VERIFY</Text>
                <Text style={{ fontSize: 10.5, color: colors.textSecondary, marginBottom: 6 }}>
                  Enter the 6-digit rotation code displayed in Google Authenticator:
                </Text>

                <TextInput
                  style={[styles.input, { textAlign: 'center', fontSize: 18, letterSpacing: 4, paddingVertical: 8, marginBottom: 10 }]}
                  value={mfaToken}
                  onChangeText={(v) => setMfaToken(v.replace(/[^0-9]/g, ''))}
                  placeholder="000000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={6}
                />

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: '#10B981', paddingVertical: 10, borderRadius: 6, alignItems: 'center' }}
                    onPress={handleEnable2FAConfirm}
                    disabled={mfaLoading}
                  >
                    {mfaLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }}>VERIFY PROTOCOLS</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: colors.borderBlue, paddingVertical: 10, borderRadius: 6, alignItems: 'center' }}
                    onPress={() => setIsSettingUp2FA(false)}
                  >
                    <Text style={{ color: colors.blackText, fontSize: 11, fontWeight: 'bold' }}>CANCEL</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* SYSTEM AUTO SYNC OPTIONS AND TRASH TRIGGERS */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>COMMUNICATION PORT SETTINGS</Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.borderBlue }}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.blackText }}>AUTOMATIC HQ UPLINK CACHING</Text>
                <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                  When connection is active, auto-upload coordinate streams to Supabase servers every 60 seconds.
                </Text>
              </View>
              <Switch 
                value={autoSync}
                onValueChange={onToggleAutoSync}
                trackColor={{ false: '#767577', true: '#10B981' }}
                thumbColor={autoSync ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.blackText }}>FLUSH SYNCED ARCHIVES</Text>
                <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                  Remove all synced coordinates logs permanently from local Sqlite storage.
                </Text>
              </View>
              <TouchableOpacity 
                style={{ backgroundColor: '#EF4444', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 6 }}
                onPress={onClearCache}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>PURGE SYNCED</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      )}

      {/* LICENSE DISCLAIMERS */}
      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerHead}>TACTICAL TELEMETRY DIVISION GUIDELINES</Text>
        <Text style={styles.disclaimerText}>
          Personnel coordinates are secured with local AES database signatures. False updates, coordinates fabrication, or location spoofing acts carry immediately permanent police board dismissals.
        </Text>
      </View>
    </ScrollView>
  );
};
