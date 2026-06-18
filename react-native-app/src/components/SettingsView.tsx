import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Switch, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert,
  Clipboard
} from 'react-native';
import { globalStyles } from '../theme/styles';
import { generateRandomSecret } from '../services/totp';

interface SettingsViewProps {
  autoSync: boolean;
  onToggleAutoSync: () => void;
  unsyncedCount: number;
  onClearCache: () => void;
  isShiftActive: boolean;
  
  // 2FA attributes
  badge: string;
  is2FAEnabled: boolean;
  onEnable2FA: (secret: string, code: string) => Promise<boolean>;
  onDisable2FA: () => Promise<void>;
}

export const SettingsView = ({
  autoSync,
  onToggleAutoSync,
  unsyncedCount,
  onClearCache,
  isShiftActive,
  badge,
  is2FAEnabled,
  onEnable2FA,
  onDisable2FA,
}: SettingsViewProps) => {
  const [isSettingUp, setIsSettingUp] = useState<boolean>(false);
  const [secretKey, setSecretKey] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const startSetup = () => {
    const freshSecret = generateRandomSecret();
    setSecretKey(freshSecret);
    setToken('');
    setIsSettingUp(true);
  };

  const handleCopyKey = () => {
    Clipboard.setString(secretKey);
    Alert.alert("Copied Key", "Google Authenticator secret has been copied to your device keyboard clipboard.");
  };

  const handleVerifyAndEnable = async () => {
    const cleanToken = token.trim();
    if (cleanToken.length !== 6) {
      Alert.alert("Code Error", "Please input the 6-digit number shown in Google Authenticator.");
      return;
    }
    setLoading(true);
    const success = await onEnable2FA(secretKey, cleanToken);
    setLoading(false);
    if (success) {
      setIsSettingUp(false);
      setToken('');
    }
  };

  const triggerDisableConfirm = () => {
    Alert.alert(
      "Disable MFA Security?",
      "WARNING: Removing Google Authenticator will decrease your account shield protection. PNP rules recommend keeping MFA active on telemetry databases.",
      [
        { text: "Confirm Disable 2FA", style: "destructive", onPress: onDisable2FA },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const formatSecret = (str: string) => {
    // Inserts space every 4 characters to make keys easy to copy and read
    return str.replace(/(.{4})/g, '$1 ').trim();
  };

  return (
    <ScrollView contentContainerStyle={globalStyles.dashboardContainer}>
      
      {/* 2FA SETUP SECTION */}
      <View style={globalStyles.card}>
        <Text style={globalStyles.cardHeading}>🛡️ GOOGLE AUTHENTICATOR (MFA)</Text>
        
        {is2FAEnabled && !isSettingUp ? (
          <View style={styles.activeMfaContainer}>
            <View style={styles.mfaShieldBoxActive}>
              <Text style={{ fontSize: 32 }}>🛡️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mfaActiveTitle}>SECURITY PROTOCOL ENFORCED</Text>
              <Text style={styles.mfaActiveDesc}>
                Account linked with standard Google Authenticator TOTP algorithms. Every future identity linkage handshake will require dynamic verification code rotation check.
              </Text>
            </View>
          </View>
        ) : !isSettingUp ? (
          <View style={styles.activeMfaContainer}>
            <View style={[styles.mfaShieldBoxActive, { backgroundColor: '#FEE2E2' }]}>
              <Text style={{ fontSize: 32 }}>🔓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mfaActiveTitle, { color: '#991B1B' }]}>MFA PROTECTION SUSPENDED</Text>
              <Text style={styles.mfaActiveDesc}>
                Your officer profile badge only is linked. It is highly recommended to enable Google Authenticator to secure telemetry trails from manipulation.
              </Text>
            </View>
          </View>
        ) : null}

        {/* SETUP FORM STEP BY STEP */}
        {isSettingUp ? (
          <View style={styles.setupSec}>
            <Text style={styles.setupLabel}>STEP 1: CONFIGURE AUTHENTICATOR APP</Text>
            <Text style={styles.setupPara}>
              Download and launch Google Authenticator on your smartphone device. Press the "+" icon and choose "Enter a setup key".
            </Text>

            <Text style={styles.setupLabel}>STEP 2: SCAN/ENTER SECURE ACCOUNT KEY</Text>
            <Text style={styles.setupPara}>
              Configure the credentials setup key on your mobile app using:
            </Text>

            <View style={styles.detailsBox}>
              <Text style={styles.detailsKey}>Account Name:</Text>
              <Text style={styles.detailsVal}>PNP Patroller ({badge})</Text>

              <Text style={styles.detailsKey}>Unique Secret Key:</Text>
              <View style={styles.secretCopyRow}>
                <Text style={styles.secretText}>{formatSecret(secretKey)}</Text>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopyKey}>
                  <Text style={styles.copyBtnText}>📋 COPY</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ARTISTIC PNP SCAN QR PLACEHOLDER */}
            <View style={styles.qrScannerHolder}>
              <View style={styles.qrInnerBlock}>
                <View style={[styles.qrSquareFinder, { top: 12, left: 12 }]} />
                <View style={[styles.qrSquareFinder, { top: 12, right: 12 }]} />
                <View style={[styles.qrSquareFinder, { bottom: 12, left: 12 }]} />
                <View style={styles.qrCenterShield}>
                  <Text style={styles.qrCenterText}>👮</Text>
                  <Text style={{ fontSize: 8, color: '#334155', fontWeight: 'bold', marginTop: 2 }}>GRID SCAN</Text>
                </View>
              </View>
              <Text style={styles.qrScannerTip}>
                Tip: You can manually copy the secret code sequence or scan the credentials to pair immediate dynamic rotation checks.
              </Text>
            </View>

            <Text style={styles.setupLabel}>STEP 3: ENTER ACTIVE SIX-DIGIT CODE</Text>
            <Text style={styles.setupPara}>
              Provide the current dynamically rolling verification code given by Google Authenticator to test integration:
            </Text>

            <TextInput
              style={styles.verifyInput}
              value={token}
              onChangeText={(v) => setToken(v.replace(/[^0-9]/g, '').substring(0, 6))}
              placeholder="000 000"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={6}
            />

            <View style={styles.setupButtonsRow}>
              <TouchableOpacity 
                style={[styles.setupActionBtn, { backgroundColor: '#16A34A' }]}
                onPress={handleVerifyAndEnable}
                disabled={loading}
              >
                <Text style={styles.setupActionText}>✔️ VERIFY & ENFORCE</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.setupActionBtn, { backgroundColor: '#64748B' }]}
                onPress={() => setIsSettingUp(false)}
              >
                <Text style={styles.setupActionText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ marginTop: 8 }}>
            {is2FAEnabled ? (
              <TouchableOpacity style={styles.disableMfaButton} onPress={triggerDisableConfirm}>
                <Text style={styles.disableMfaText}>⚠️ REMOVE GOOGLE AUTHENTICATOR</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.enableMfaButton} onPress={startSetup}>
                <Text style={styles.enableMfaText}>🔒 LINK GOOGLE AUTHENTICATOR</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* AUTO SYNC TELEMETRY */}
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

      {/* DATA UTILITY SYSTEM */}
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
  activeMfaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  mfaShieldBoxActive: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  mfaActiveTitle: {
    color: '#15803D',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  mfaActiveDesc: {
    color: '#475569',
    fontSize: 10.5,
    lineHeight: 14.5,
  },
  enableMfaButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enableMfaText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1,
  },
  disableMfaButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disableMfaText: {
    color: '#991B1B',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  setupSec: {
    paddingVertical: 8,
  },
  setupLabel: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 6,
  },
  setupPara: {
    color: '#475569',
    fontSize: 11.5,
    lineHeight: 16.5,
    marginBottom: 8,
  },
  detailsBox: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  detailsKey: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  detailsVal: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  secretCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  secretText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 1.2,
  },
  copyBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 10,
  },
  qrScannerHolder: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  qrInnerBlock: {
    width: 140,
    height: 140,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrSquareFinder: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderWidth: 4,
    borderColor: '#0F172A',
    backgroundColor: 'transparent',
  },
  qrCenterShield: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCenterText: {
    fontSize: 18,
  },
  qrScannerTip: {
    color: '#64748B',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 24,
    marginTop: 10,
  },
  verifyInput: {
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 16,
  },
  setupButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  setupActionBtn: {
    flex: 0.48,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupActionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
