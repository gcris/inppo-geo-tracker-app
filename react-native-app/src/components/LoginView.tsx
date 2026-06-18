import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Clipboard
} from 'react-native';
import { getStyles, getThemeColors } from '../theme/styles';

interface LoginViewProps {
  isGpsEnabled: boolean;
  gpsLoading: boolean;
  onLogin: (email: string, password: string, otpCode?: string) => Promise<boolean | 'NEED_2FA' | 'PENDING_APPROVAL' | 'NOT_FOUND' | string>;
  onOpenSettings: () => void;
  isDarkTheme: boolean;
}

export const LoginView = ({ 
  isGpsEnabled, 
  gpsLoading, 
  onLogin, 
  onOpenSettings,
  isDarkTheme
}: LoginViewProps) => {
  const styles = getStyles(isDarkTheme);
  const colors = getThemeColors(isDarkTheme);

  // Default preloaded credentials for Sgt. Cariaga matching the native app
  const [email, setEmail] = useState('officer.gerry@pnp.gov.ph');
  const [password, setPassword] = useState('password123');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [otp, setOtp] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingState, setPendingState] = useState(false);
  const [notFoundState, setNotFoundState] = useState(false);

  const handleSubmit = async () => {
    setLoading(false);
    setErrorMessage(null);
    setPendingState(false);
    setNotFoundState(false);

    if (!email.trim()) {
      setErrorMessage("Please enter your official email address or credentials.");
      return;
    }
    if (!password.trim()) {
      setErrorMessage("Please enter your database secret password.");
      return;
    }

    setLoading(true);
    const res = await onLogin(email, password);
    setLoading(false);

    if (res === 'NEED_2FA') {
      setStep('otp');
    } else if (typeof res === 'string' && res.startsWith('NEED_2FA_SECRET:')) {
      const secretKey = res.split(':')[1];
      setMfaSecret(secretKey);
      setStep('otp');
    } else if (res === 'PENDING_APPROVAL') {
      setPendingState(true);
    } else if (res === 'NOT_FOUND') {
      setNotFoundState(true);
    } else if (typeof res === 'string') {
      setErrorMessage(res);
    }
  };

  const handleVerifyOtp = async () => {
    const trimmedOtp = otp.trim();
    if (trimmedOtp.length !== 6) {
      Alert.alert("Code Format Error", "Please provide the active 6-digit security token shown in Google Authenticator.");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    const res = await onLogin(email, password, trimmedOtp);
    setLoading(false);

    if (res === true) {
      // Login successful!
    } else if (typeof res === 'string') {
      setErrorMessage(res);
      setStep('credentials');
      setOtp('');
    } else {
      setErrorMessage("2FA Validation failing. Please verify your authenticator clocks.");
      setStep('credentials');
      setOtp('');
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerSpacer} />
      
      {/* Dynamic Radar Sweeps behind the badge inside branding, mirroring Compose radar crosshairs */}
      <View style={styles.brandingBox}>
        <View style={styles.badgeShieldIcon}>
          <Text style={styles.badgeHeroText}>👮</Text>
        </View>
        <Text style={styles.pnpTitle}>PHILIPPINE NATIONAL POLICE</Text>
        <Text style={styles.pnpSubTitle}>GRID-WIDE PATROL TELEMETRY PLATFORM</Text>
      </View>

      {/* Dynamic feedback banners precisely mirroring native Android app */}
      {pendingState && (
        <View style={[styles.gpsErrorBox, { borderColor: '#EF4444', backgroundColor: isDarkTheme ? '#3A1416' : '#FEF2F2', marginBottom: 16 }]}>
          <Text style={[styles.gpsErrorTitle, { color: '#EF4444' }]}>⚠️ MEMBERSHIP RESTRICTED</Text>
          <Text style={[styles.gpsErrorMessage, { color: isDarkTheme ? '#FCA5A5' : '#991B1B' }]}>
            Your shield credentials (Pat. Cardo Dalisay) are in administrative queue pending commander authorization. Live telemetry locks are active.
          </Text>
        </View>
      )}

      {notFoundState && (
        <View style={[styles.gpsErrorBox, { borderColor: '#F59E0B', backgroundColor: isDarkTheme ? '#2C1E14' : '#FFFBEB', marginBottom: 16 }]}>
          <Text style={[styles.gpsErrorTitle, { color: '#D97706' }]}>⚠️ UNRECOGNIZED SHIELD IDENTITY</Text>
          <Text style={[styles.gpsErrorMessage, { color: isDarkTheme ? '#FDE68A' : '#92400E' }]}>
            The entered email or badge credentials are not linked in the active directory. Please verify with the base dispatch roster.
          </Text>
        </View>
      )}

      {errorMessage && (
        <View style={[styles.gpsErrorBox, { borderColor: '#EF4444', backgroundColor: isDarkTheme ? '#3A1416' : '#FEF2F2', marginBottom: 16 }]}>
          <Text style={[styles.gpsErrorTitle, { color: '#EF4444' }]}>⚠️ IDENTITY LINK CONFLICT</Text>
          <Text style={[styles.gpsErrorMessage, { color: isDarkTheme ? '#FCA5A5' : '#991B1B' }]}>
            {errorMessage}
          </Text>
        </View>
      )}

      {step === 'credentials' ? (
        <View style={styles.formCard}>
          <Text style={styles.cardHeader}>OFFICER IDENTITY LINK</Text>
          
          <Text style={styles.inputLabel}>OFFICIAL MAIL ADDRESS / ASSIGNED EMAIL</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setErrorMessage(null);
              setPendingState(false);
              setNotFoundState(false);
            }}
            placeholder="e.g. officer.gerry@pnp.gov.ph"
            placeholderTextColor={isDarkTheme ? '#64748B' : '#94A3B8'}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.inputLabel}>OFFICER ACCESS KEY / SECURE PASSWORD</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { paddingRight: 60 }]}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setErrorMessage(null);
                setPendingState(false);
                setNotFoundState(false);
              }}
              placeholder="••••••••"
              placeholderTextColor={isDarkTheme ? '#64748B' : '#94A3B8'}
              secureTextEntry={!passwordVisible}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity 
              style={styles.inputPasswordToggle}
              onPress={() => setPasswordVisible(!passwordVisible)}
              activeOpacity={0.7}
            >
              <Text style={styles.inputPasswordToggleText}>
                {passwordVisible ? "HIDE" : "SHOW"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Render demo account helpers exactly matching Compose layout triggers */}
          <View style={{ marginTop: 16, borderTopWidth: 0.5, borderTopColor: colors.borderBlue, paddingTop: 12 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accentAmber, marginBottom: 6 }}>SIMULATION PROFILES (ROSTER VERIFIED):</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <TouchableOpacity 
                style={{ backgroundColor: colors.borderBlue, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 }}
                onPress={() => {
                  setEmail('officer.gerry@pnp.gov.ph');
                  setPassword('password123');
                  setPendingState(false);
                  setNotFoundState(false);
                  setErrorMessage(null);
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.blackText }}>PCpl Cariaga (Active)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ backgroundColor: colors.borderBlue, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 }}
                onPress={() => {
                  setEmail('commander.magalong@pnp.gov.ph');
                  setPassword('magalong7700');
                  setPendingState(false);
                  setNotFoundState(false);
                  setErrorMessage(null);
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.blackText }}>PMSg Magalong (Active)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ backgroundColor: colors.borderBlue, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 }}
                onPress={() => {
                  setEmail('patrol.dalisay@pnp.gov.ph');
                  setPassword('dalisay1402');
                  setPendingState(false);
                  setNotFoundState(false);
                  setErrorMessage(null);
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.blackText }}>Pat. Dalisay (Pending)</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!isGpsEnabled && (
            <View style={styles.gpsErrorBox}>
              <Text style={styles.gpsErrorTitle}>⚠️ SYSTEM GPS CONFLICT</Text>
              <Text style={styles.gpsErrorMessage}>
                PNP Geo-Tracking requires high-accuracy system GPS services to be enabled globally. Please turn on Location/GPS below.
              </Text>
              <TouchableOpacity 
                style={styles.gpsButtonSmall} 
                onPress={onOpenSettings} 
                disabled={gpsLoading}
              >
                <Text style={styles.gpsButtonText}>
                  {gpsLoading ? "WAITING FOR GPS..." : "ACTIVATE HARDWARE GPS"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity 
            style={styles.submitBtn} 
            onPress={handleSubmit} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={isDarkTheme ? '#0B121F' : '#FFFFFF'} />
            ) : (
              <Text style={styles.submitBtnText}>SECURE IDENTITY HANDSHAKE</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.formCard}>
          <Text style={styles.cardHeader}>👮 MFA SECURE CHALLENGE</Text>
          
          <Text style={{
            color: '#1E3A8A',
            fontSize: 12,
            fontWeight: 'bold',
            textAlign: 'center',
            backgroundColor: '#DBEAFE',
            padding: 10,
            borderRadius: 6,
            marginTop: 12,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#BFDBFE',
          }}>
            🔐 GOOGLE AUTHENTICATOR IS ACTIVE
          </Text>
 
          <Text style={{
            color: colors.textSecondary,
            fontSize: 12,
            textAlign: 'center',
            lineHeight: 18,
            marginBottom: 16,
          }}>
            Your badge profile is protected with Two-Factor Identification. Enter the current 6-digit code from Google Authenticator to join active patrol shift status.
          </Text>

          {mfaSecret ? (
            <View style={{
              backgroundColor: isDarkTheme ? '#142035' : '#FFFFFF',
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.borderBlue || '#3B82F6',
              marginBottom: 16,
              alignItems: 'center'
            }}>
              <Text style={{ color: colors.accentAmber, fontSize: 10, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 }}>
                GOOGLE AUTHENTICATOR SETUP KEY
              </Text>
              <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 1 }}>
                {mfaSecret}
              </Text>
              <TouchableOpacity 
                style={{
                  backgroundColor: isDarkTheme ? '#1E293B' : '#E2E8F0',
                  paddingVertical: 5,
                  paddingHorizontal: 12,
                  borderRadius: 4,
                  marginTop: 8,
                  borderColor: colors.borderBlue,
                  borderWidth: 1
                }}
                onPress={() => {
                  Clipboard.setString(mfaSecret);
                  Alert.alert("Secret Copied", "Google Authenticator secret copied to device clipboard. Standard key input type inside your device Authenticator app.");
                }}
              >
                <Text style={{ color: colors.textPrimary, fontSize: 10, fontWeight: 'bold' }}>
                  📋 COPY SETUP KEY
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={styles.inputLabel}>SIX-DIGIT SECURITY TOKEN</Text>
          <TextInput
            style={[styles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: 'bold' }]}
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, '').substring(0, 6))}
            placeholder="000 000"
            placeholderTextColor={isDarkTheme ? '#64748B' : '#94A3B8'}
            keyboardType="number-pad"
            maxLength={6}
          />

          <TouchableOpacity 
            style={[styles.submitBtn, { backgroundColor: '#10B981' }]} 
            onPress={handleVerifyOtp} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[styles.submitBtnText, { color: '#FFFFFF' }]}>VERIFY & ACCESS SYSTEMS</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ 
              alignItems: 'center', 
              paddingVertical: 12, 
              marginTop: 12,
              borderWidth: 1,
              borderColor: colors.borderBlue,
              borderRadius: 6,
            }} 
            onPress={() => {
              setOtp('');
              setStep('credentials');
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: 'bold' }}>
              ◀ GO BACK TO SHIELD HEADER
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerHead}>LAW ENFORCEMENT REGULATIONS STATEMENT</Text>
        <Text style={styles.disclaimerText}>
          All geographic locations and walking patterns mapped are signed with military-grade keys and logged locally inside SECURE SQLite database for auditing. False data submission is heavily penalized.
        </Text>
      </View>
    </ScrollView>
  );
};
