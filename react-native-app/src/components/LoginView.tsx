import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { globalStyles } from '../theme/styles';

interface LoginViewProps {
  isGpsEnabled: boolean;
  gpsLoading: boolean;
  onLogin: (badge: string, fullname: string, otpCode?: string) => Promise<boolean | 'NEED_2FA'>;
  onOpenSettings: () => void;
}

export const LoginView = ({ 
  isGpsEnabled, 
  gpsLoading, 
  onLogin, 
  onOpenSettings 
}: LoginViewProps) => {
  const [badge, setBadge] = useState('744874'); // Preloaded for Sgt. Cariaga
  const [fullname, setFullname] = useState('GERYCRIS S. CARIAGA');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const res = await onLogin(badge, fullname);
    setLoading(false);
    if (res === 'NEED_2FA') {
      setStep('otp');
    }
  };

  const handleVerifyOtp = async () => {
    const trimmedOtp = otp.trim();
    if (trimmedOtp.length !== 6) {
      Alert.alert("Code Format Error", "Please provide the 6-digit code shown in Google Authenticator.");
      return;
    }
    setLoading(true);
    await onLogin(badge, fullname, trimmedOtp);
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={globalStyles.scrollContent}>
      <View style={globalStyles.headerSpacer} />
      
      <View style={globalStyles.brandingBox}>
        <View style={globalStyles.badgeShieldIcon}>
          <Text style={globalStyles.badgeHeroText}>👮</Text>
        </View>
        <Text style={globalStyles.pnpTitle}>PHILIPPINE NATIONAL POLICE</Text>
        <Text style={globalStyles.pnpSubTitle}>GRID-WIDE PATROL TELEMETRY PLATFORM</Text>
      </View>

      {step === 'credentials' ? (
        <View style={globalStyles.formCard}>
          <Text style={globalStyles.cardHeader}>OFFICER IDENTITY LINK</Text>
          
          <Text style={globalStyles.inputLabel}>OFFICIAL PNP BADGE / PERSONNEL ID</Text>
          <TextInput
            style={globalStyles.input}
            value={badge}
            onChangeText={setBadge}
            placeholder="Enter 6-digit Badge"
            placeholderTextColor="#5A6E7F"
            keyboardType="number-pad"
          />

          <Text style={globalStyles.inputLabel}>FULL LEGAL NAME (FOR DEMO REGISTRY)</Text>
          <TextInput
            style={globalStyles.input}
            value={fullname}
            onChangeText={setFullname}
            placeholder="e.g. GERYCRIS S. CARIAGA"
            placeholderTextColor="#5A6E7F"
          />

          {!isGpsEnabled && (
            <View style={globalStyles.gpsErrorBox}>
              <Text style={globalStyles.gpsErrorTitle}>⚠️ SYSTEM GPS CONFLICT</Text>
              <Text style={globalStyles.gpsErrorMessage}>
                PNP Geo-Tracking requires high-accuracy system GPS services to be enabled globally. Please turn on Location/GPS below.
              </Text>
              <TouchableOpacity 
                style={globalStyles.gpsButtonSmall} 
                onPress={onOpenSettings} 
                disabled={gpsLoading}
              >
                <Text style={globalStyles.gpsButtonText}>
                  {gpsLoading ? "WAITING FOR GPS..." : "ACTIVATE HARDWARE GPS"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity 
            style={globalStyles.submitBtn} 
            onPress={handleSubmit} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={globalStyles.submitBtnText}>SECURE IDENTITY HANDSHAKE</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={globalStyles.formCard}>
          <Text style={globalStyles.cardHeader}>👮 MFA SECURE CHALLENGE</Text>
          
          <Text style={{
            color: '#1E3A8A',
            fontSize: 12,
            fontWeight: 'bold',
            textAlign: 'center',
            backgroundColor: '#DBEAFE',
            padding: 8,
            borderRadius: 6,
            marginTop: 12,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: '#BFDBFE',
          }}>
            🔐 GOOGLE AUTHENTICATOR OPTION IS ACTIVE
          </Text>

          <Text style={{
            color: '#475569',
            fontSize: 12,
            textAlign: 'center',
            lineHeight: 18,
            marginBottom: 16,
          }}>
            Your badge profile is protected with Two-Factor Identification. Enter the current 6-digit code from Google Authenticator to join active patrol shift status.
          </Text>

          <Text style={globalStyles.inputLabel}>SIX-DIGIT SECURITY TOKEN</Text>
          <TextInput
            style={[globalStyles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: 'bold' }]}
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, '').substring(0, 6))}
            placeholder="000 000"
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            maxLength={6}
          />

          <TouchableOpacity 
            style={[globalStyles.submitBtn, { backgroundColor: '#16A34A' }]} 
            onPress={handleVerifyOtp} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={globalStyles.submitBtnText}>VERIFY & ACCESS SYSTEMS</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ 
              alignItems: 'center', 
              paddingVertical: 12, 
              marginTop: 12,
              borderWidth: 1,
              borderColor: '#CBD5E1',
              borderRadius: 6,
            }} 
            onPress={() => {
              setOtp('');
              setStep('credentials');
            }}
          >
            <Text style={{ color: '#475569', fontSize: 13, fontWeight: 'bold' }}>
              ◀ GO BACK TO SHIELD ACCESS
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={globalStyles.disclaimerContainer}>
        <Text style={globalStyles.disclaimerHead}>LAW ENFORCEMENT REGULATIONS STATEMENT</Text>
        <Text style={globalStyles.disclaimerText}>
          All geographic locations and walking patterns mapped are signed with military-grade keys and logged locally inside SECURE SQLite database for auditing. False data submission is heavily penalized.
        </Text>
      </View>
    </ScrollView>
  );
};
