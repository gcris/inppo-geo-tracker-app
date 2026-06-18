import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Personnel } from '../types';
import { globalStyles } from '../theme/styles';

interface NavbarProps {
  personnel: Personnel | null;
  currentScreen: 'dashboard' | 'schedule' | 'settings';
  setCurrentScreen: (screen: 'dashboard' | 'schedule' | 'settings') => void;
  onLogout: () => void;
}

export const Navbar = ({ 
  personnel, 
  currentScreen, 
  setCurrentScreen, 
  onLogout 
}: NavbarProps) => {
  const triggerLogoutConfirm = () => {
    Alert.alert(
      "Lock Identity", 
      "Are you sure you want to release police officer identity session locks?", 
      [
        { text: "Confirm Logout", style: "destructive", onPress: onLogout },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  return (
    <View style={globalStyles.navbar}>
      <View style={globalStyles.navLeading}>
        <Text style={globalStyles.navShield}>🚔</Text>
        <View>
          <Text style={globalStyles.navTitle}>Manila Beat HQ</Text>
          <Text style={globalStyles.navSub}>
            {personnel?.rank} {personnel?.fullname}
          </Text>
        </View>
      </View>
      
      <View style={globalStyles.navTabs}>
        <TouchableOpacity 
          style={[globalStyles.tab, currentScreen === 'dashboard' && globalStyles.tabActive]}
          onPress={() => setCurrentScreen('dashboard')}
        >
          <Text style={[globalStyles.tabText, currentScreen === 'dashboard' && globalStyles.tabTextActive]}>
            Patrol
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[globalStyles.tab, currentScreen === 'schedule' && globalStyles.tabActive]}
          onPress={() => setCurrentScreen('schedule')}
        >
          <Text style={[globalStyles.tabText, currentScreen === 'schedule' && globalStyles.tabTextActive]}>
            Sector
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[globalStyles.tab, currentScreen === 'settings' && globalStyles.tabActive]}
          onPress={() => setCurrentScreen('settings')}
        >
          <Text style={[globalStyles.tabText, currentScreen === 'settings' && globalStyles.tabTextActive]}>
            Settings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={globalStyles.tabExit}
          onPress={triggerLogoutConfirm}
        >
          <Text style={globalStyles.tabExitText}>LOCK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
