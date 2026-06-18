import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator 
} from 'react-native';
import { globalStyles } from '../theme/styles';

interface LoginViewProps {
  isGpsEnabled: boolean;
  gpsLoading: boolean;
  onLogin: (badge: string, fullname: string) => Promise<boolean>;
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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await onLogin(badge, fullname);
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
            <ActivityIndicator color="#0B1325" />
          ) : (
            <Text style={globalStyles.submitBtnText}>SECURE IDENTITY HANDSHAKE</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={globalStyles.disclaimerContainer}>
        <Text style={globalStyles.disclaimerHead}>LAW ENFORCEMENT REGULATIONS STATEMENT</Text>
        <Text style={globalStyles.disclaimerText}>
          All geographic locations and walking patterns mapped are signed with military-grade keys and logged locally inside SECURE SQLite database for auditing. False data submission is heavily penalized.
        </Text>
      </View>
    </ScrollView>
  );
};
