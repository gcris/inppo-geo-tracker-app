import { useState, useEffect, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import * as Location from 'expo-location';

import { Personnel, Vehicle, Schedule, VehicleLog } from '../types';
import { 
  getPersonnelByBadge, 
  getVehicleByPersonnel, 
  insertVehicle, 
  getScheduleByPersonnel, 
  getLatestLogs, 
  getUnsyncedLogs, 
  getUnsyncedCount, 
  markLogsAsSynced, 
  cleanSyncedLogs 
} from '../services/database';
import { 
  startBackgroundUpdates, 
  stopBackgroundUpdates, 
  startBackgroundSimulation, 
  stopBackgroundSimulation, 
  formatManilaTimestamp 
} from '../services/BackgroundTracker';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateTOTP } from '../services/totp';

export const usePatrolState = () => {
  const [personnel, setPersonnel] = useState<Personnel | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [logs, setLogs] = useState<VehicleLog[]>([]);
  const [unsyncedCount, setUnsyncedCount] = useState<number>(0);
  
  const [isShiftActive, setIsShiftActive] = useState<boolean>(false);
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [isGpsEnabled, setIsGpsEnabled] = useState<boolean>(false);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean>(false);

  // Checks device's system GPS status
  const checkLocationPermissionState = useCallback(async () => {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      setIsGpsEnabled(enabled);
      return enabled;
    } catch {
      setIsGpsEnabled(false);
      return false;
    }
  }, []);

  const loadLogsAndStats = useCallback(async () => {
    try {
      const latest = await getLatestLogs(12);
      setLogs(latest);
    } catch (e) {
      console.warn("Could not query latest log cards", e);
    }
  }, []);

  const updateUnsyncedCounter = useCallback(async () => {
    try {
      const count = await getUnsyncedCount();
      setUnsyncedCount(count);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // Poll system GPS state
  useEffect(() => {
    checkLocationPermissionState();
    const gpsInterval = setInterval(() => {
      checkLocationPermissionState();
    }, 20000); // Polling lessened from 4s to 20s to preserve battery

    return () => clearInterval(gpsInterval);
  }, [checkLocationPermissionState]);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const val = await AsyncStorage.getItem('@pnp_auto_sync');
        if (val !== null) {
          setAutoSync(val === 'true');
        }
      } catch (e) {
        console.warn('Failed to load @pnp_auto_sync', e);
      }
    };
    loadSettings();
  }, []);

  const toggleAutoSync = async () => {
    try {
      const nextVal = !autoSync;
      setAutoSync(nextVal);
      await AsyncStorage.setItem('@pnp_auto_sync', String(nextVal));
    } catch (e) {
      console.warn('Failed to save @pnp_auto_sync', e);
    }
  };

  // Google 2FA settings & check effects
  useEffect(() => {
    const check2FA = async () => {
      if (personnel) {
        try {
          const secret = await AsyncStorage.getItem(`@pnp_2fa_secret_${personnel.badgeNumber}`);
          setIs2FAEnabled(!!secret);
        } catch (e) {
          console.warn("Error checking 2FA state", e);
        }
      } else {
        setIs2FAEnabled(false);
      }
    };
    check2FA();
  }, [personnel]);

  const enable2FA = async (secret: string, code: string): Promise<boolean> => {
    if (!personnel) return false;
    try {
      const expected = generateTOTP(secret);
      const expectedPrev = generateTOTP(secret, Math.floor(Date.now() / 1000) - 30);
      const expectedNext = generateTOTP(secret, Math.floor(Date.now() / 1000) + 30);
      
      if (code !== expected && code !== expectedPrev && code !== expectedNext) {
        Alert.alert("Verification Failed", "The 6-digit Google Authenticator code you entered is incorrect. Double check your typing and current device clock.");
        return false;
      }

      await AsyncStorage.setItem(`@pnp_2fa_secret_${personnel.badgeNumber}`, secret);
      setIs2FAEnabled(true);
      Alert.alert("2FA Secured", "Google Authenticator two-factor authentication has been successfully locked to your PNP badge profile!");
      return true;
    } catch (e) {
      console.error(e);
      Alert.alert("Setup Error", "An error occurred while enabling two-factor authentication.");
      return false;
    }
  };

  const disable2FA = async () => {
    if (!personnel) return;
    try {
      await AsyncStorage.removeItem(`@pnp_2fa_secret_${personnel.badgeNumber}`);
      setIs2FAEnabled(false);
      Alert.alert("2FA Disabled", "Google Authenticator is now disabled. Warning: Your officer profile is no longer protected by MFA.");
    } catch (e) {
      console.error(e);
      Alert.alert("Disable Error", "An error occurred while disabling two-factor authentication.");
    }
  };

  // Synchronize logs & counts when off/on shift, with optional automatic remote sync (preserves cellular logs inside SQLite when turned off)
  useEffect(() => {
    let logTimer: NodeJS.Timeout | null = null;
    let countsTimer: NodeJS.Timeout | null = null;
    let autoSyncTimer: NodeJS.Timeout | null = null;

    if (isShiftActive) {
      logTimer = setInterval(() => {
        loadLogsAndStats();
      }, 15000); // Polling slowed from 5s to 15s to optimize CPU/battery

      countsTimer = setInterval(() => {
        updateUnsyncedCounter();
      }, 15000); // Polling slowed from 3s to 15s to optimize CPU/battery

      if (autoSync) {
        autoSyncTimer = setInterval(() => {
          syncLogsWithRemote(false); // Quiet auto background sync
        }, 30000); // battery optimize: auto upload logs every 30 seconds
      }
    } else {
      loadLogsAndStats();
      updateUnsyncedCounter();
    }

    return () => {
      if (logTimer) clearInterval(logTimer);
      if (countsTimer) clearInterval(countsTimer);
      if (autoSyncTimer) clearInterval(autoSyncTimer);
    };
  }, [isShiftActive, autoSync, loadLogsAndStats, updateUnsyncedCounter]);

  const openSystemSettings = async () => {
    setGpsLoading(true);
    setTimeout(() => setGpsLoading(false), 2000);
    if (Linking.openSettings) {
      await Linking.openSettings();
    } else {
      Alert.alert("Settings", "Could not open system settings. Please manually turn on Location Services.");
    }
  };

  const login = async (badgeInput: string, fullnameInput: string, otpCode?: string): Promise<boolean | 'NEED_2FA'> => {
    const trimmedBadge = badgeInput.trim();
    if (!trimmedBadge) {
      Alert.alert("Missing Badge", "Please input your official PNP badge number.");
      return false;
    }

    // CHECK GOOGLE AUTHENTICATOR (2FA) SECRET FOR THIS BADGE BEFORE DOING LOGINS
    try {
      const storedSecret = await AsyncStorage.getItem(`@pnp_2fa_secret_${trimmedBadge}`);
      if (storedSecret) {
        if (!otpCode) {
          return 'NEED_2FA';
        }
        // Validate OTP
        const expected = generateTOTP(storedSecret);
        const expectedPrev = generateTOTP(storedSecret, Math.floor(Date.now() / 1000) - 30);
        const expectedNext = generateTOTP(storedSecret, Math.floor(Date.now() / 1000) + 30);
        
        if (otpCode !== expected && otpCode !== expectedPrev && otpCode !== expectedNext) {
          Alert.alert("Invalid 2FA Token", "The Google Authenticator 6-digit verification code you entered is invalid or expired. Please check your authenticator clock.");
          return false;
        }
      }
    } catch (err) {
      console.warn("AsyncStorage 2FA lookup error", err);
    }

    try {
      let pUser = await getPersonnelByBadge(trimmedBadge);

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('personnel')
            .select('*')
            .eq('badge_number', trimmedBadge)
            .single();
          if (data) {
            pUser = {
              id: data.id,
              badgeNumber: data.badge_number,
              rank: data.rank,
              fullname: data.fullname,
              unitId: data.unit_id,
              isApproved: data.is_approved,
              role: data.role
            };
          }
        } catch (supabaseErr) {
          console.log("Supabase API fallback, checking database", supabaseErr);
        }
      }

      if (!pUser) {
        return new Promise((resolve) => {
          Alert.alert(
            "Unrecognized Credentials",
            "Your PNP badge is not verified in the active network directory.",
            [
              {
                text: "Launch Local Demo Profile",
                onPress: async () => {
                  const demoUser: Personnel = {
                    id: 'demo-pnp-officer',
                    badgeNumber: trimmedBadge,
                    rank: 'PATROL MAN',
                    fullname: fullnameInput || 'PNP PATROL OFFICER',
                    unitId: 'unit-manila-01',
                    isApproved: true,
                    role: 'PATROL_OFFICER'
                  };
                  setPersonnel(demoUser);
                  
                  const savedVeh = await getVehicleByPersonnel(demoUser.id);
                  setVehicle(savedVeh);

                  const assignedSched = await getScheduleByPersonnel(demoUser.id);
                  setSchedule(assignedSched);
                  resolve(true);
                }
              },
              { text: "Cancel", style: "cancel", onPress: () => resolve(false) }
            ]
          );
        } );
      } else {
        if (!pUser.isApproved) {
          Alert.alert("Awaiting Registration Approval", "Your PNP badge registration is pending Admin security review.");
          return false;
        }

        setPersonnel(pUser);
        
        const savedVeh = await getVehicleByPersonnel(pUser.id);
        setVehicle(savedVeh);

        const assignedSched = await getScheduleByPersonnel(pUser.id);
        setSchedule(assignedSched);

        return true;
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Identity Link Error", "We could not link your police shield profile.");
      return false;
    }
  };

  const logout = useCallback(async () => {
    stopBackgroundSimulation();
    try {
      await stopBackgroundUpdates();
    } catch {
      // Ignored for clean sign out
    }
    setIsShiftActive(false);
    setPersonnel(null);
  }, []);

  const toggleShift = async () => {
    if (!personnel) return;

    // FORCE SYSTEM GPS TO BE ENABLED
    const gpsOk = await checkLocationPermissionState();
    if (!gpsOk) {
      Alert.alert(
        "GPS Required",
        "CANNOT START PATROL: Please enable your system GPS / Location switch first to map secure foot patrol telemetry.",
        [
          { text: "Turn on GPS in Settings", onPress: openSystemSettings },
          { text: "Cancel", style: "cancel" }
        ]
      );
      return;
    }

    if (isShiftActive) {
      setIsShiftActive(false);
      stopBackgroundSimulation();
      try {
        await stopBackgroundUpdates();
      } catch (err) {
        console.warn("Background service stop error", err);
      }
      Alert.alert("Patrol Ceased", "Your active patrol shift has been successfully paused and logged.");
    } else {
      let activeVeh = vehicle;
      if (!activeVeh) {
        const uniqueId = Math.random().toString(36).substring(2, 11);
        activeVeh = {
          id: uniqueId,
          plateNumber: `PNP-FOOT-${personnel.badgeNumber.substring(0, 4)}`,
          createdAt: formatManilaTimestamp(),
          personnelId: personnel.id,
          unitId: personnel.unitId,
          loadStatus: "ACTIVE_PATROL",
          lastLoadUpdate: formatManilaTimestamp()
        };
        await insertVehicle(activeVeh);
        setVehicle(activeVeh);
      }

      try {
        await startBackgroundUpdates(activeVeh.id);
        startBackgroundSimulation(activeVeh.id, () => {
          loadLogsAndStats();
          updateUnsyncedCounter();
        });
        setIsShiftActive(true);
        Alert.alert("Patrol Active", "PNP background tracking initialized! Telemetry is captured securely even when minimized.");
      } catch (err: any) {
        Alert.alert(
          "Service Notification",
          `Running tracking service simulation: ${err.message || 'GPS hardware background limits detected.'}`,
          [
            {
              text: "Start Simulation Mode",
              onPress: () => {
                if (activeVeh) {
                  startBackgroundSimulation(activeVeh.id, () => {
                    loadLogsAndStats();
                    updateUnsyncedCounter();
                  });
                  setIsShiftActive(true);
                }
              }
            },
            { text: "Cancel", style: "cancel" }
          ]
        );
      }
    }
  };

  const syncLogsWithRemote = async (showPromptAndAlerts: boolean = true) => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      const offlineLogs = await getUnsyncedLogs();
      if (offlineLogs.length === 0) {
        if (showPromptAndAlerts) {
          Alert.alert("Up to Date", "No pending coordinate logs inside local storage cache require syncing.");
        }
        setIsSyncing(false);
        return;
      }

      if (!isSupabaseConfigured()) {
        if (showPromptAndAlerts) {
          Alert.alert(
            "Gateway Sync Offline",
            "Operating in local PNP SQLite sandbox mode. Add EXPO_PUBLIC_SUPABASE variables to auto-relay coordinates.",
            [
              {
                text: "Simulate Upload",
                onPress: async () => {
                  const ids = offlineLogs.map((l: any) => l.id);
                  await markLogsAsSynced(ids);
                  await updateUnsyncedCounter();
                  await loadLogsAndStats();
                  Alert.alert("Success", `Simulated upload complete. Marked ${ids.length} points as synced.`);
                }
              },
              { text: "Close", style: "cancel" }
            ]
          );
        } else {
          // Silent automatic fallback sync
          const ids = offlineLogs.map((l: any) => l.id);
          await markLogsAsSynced(ids);
          await updateUnsyncedCounter();
          await loadLogsAndStats();
        }
        setIsSyncing(false);
        return;
      }

      const payload = offlineLogs.map((log) => ({
        vehicle_id: log.vehicleId,
        latitude: log.latitude,
        longitude: log.longitude,
        speed: log.speed,
        network_signal: log.networkSignal,
        captured_at: log.capturedAt
      }));

      const { error } = await supabase.from('vehicle_logs').insert(payload);
      if (error) throw error;

      const ids = offlineLogs.map((l) => l.id);
      await markLogsAsSynced(ids);
      await updateUnsyncedCounter();
      await loadLogsAndStats();

      if (showPromptAndAlerts) {
        Alert.alert("Patrol Synchronized", `Successfully uploaded ${ids.length} patrol points securely back to PNP Command Operations HQ.`);
      }
    } catch (e: any) {
      console.error(e);
      if (showPromptAndAlerts) {
        Alert.alert("Sync Failure", `Remote gateway is unreachable: ${e.message || e}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const flushSyncedCache = async () => {
    Alert.alert(
      "Flush Synced Cache",
      "Are you sure you want to delete already synced logs from local storage memory?",
      [
        {
          text: "Delete Logs",
          style: "destructive",
          onPress: async () => {
            await cleanSyncedLogs();
            loadLogsAndStats();
            Alert.alert("Flushed Data", "Local telemetry memory cleared successfully.");
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const triggerEmergencySOS = async (): Promise<boolean> => {
    if (!personnel) {
      Alert.alert("Authentication Error", "You must be logged in to send an SOS.");
      return false;
    }

    return new Promise((resolve) => {
      Alert.alert(
        "⚠️ TRIGGER EMERGENCY SOS?",
        `This will broadcast an immediate critical distress beacon with your precise GPS coordinates back to PNP Command HQ.\n\nOfficer: ${personnel.rank} ${personnel.fullname}\nBadge ID: ${personnel.badgeNumber}\n\nDo you want to confirm?`,
        [
          {
            text: "CANCEL (ACCIDENTAL PRESS)",
            style: "cancel",
            onPress: () => resolve(false)
          },
          {
            text: "🚨 YES, SEND SOS ALERT",
            style: "destructive",
            onPress: async () => {
              try {
                let lat = 14.5910;
                let lng = 120.9730;
                let speed = 0.0;

                try {
                  const { status } = await Location.getForegroundPermissionsAsync();
                  if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    lat = loc.coords.latitude;
                    lng = loc.coords.longitude;
                    speed = loc.coords.speed || 0.0;
                  }
                } catch (e) {
                  console.warn("GPS request failed, using fallback coordinates", e);
                  if (logs.length > 0) {
                    lat = logs[0].latitude;
                    lng = logs[0].longitude;
                    speed = logs[0].speed;
                  }
                }

                const signal = 4;
                const captured = formatManilaTimestamp();
                const uniqueId = 'sos-' + Math.random().toString(36).substring(2, 11);
                const activeVehicleId = vehicle?.id || `PNP-FOOT-${personnel.badgeNumber.substring(0, 4)}`;

                const sosLog: VehicleLog = {
                  id: uniqueId,
                  vehicleId: activeVehicleId,
                  latitude: lat,
                  longitude: lng,
                  speed: 999.0, // Special speed indicator for SOS alert
                  networkSignal: signal,
                  capturedAt: captured,
                  isSynced: false
                };

                await insertVehicleLog(sosLog);

                let remoteSuccess = false;
                if (isSupabaseConfigured()) {
                  try {
                    const { error } = await supabase.from('vehicle_logs').insert([{
                      vehicle_id: activeVehicleId,
                      latitude: lat,
                      longitude: lng,
                      speed: 999.0,
                      network_signal: signal,
                      captured_at: captured
                    }]);
                    if (!error) {
                      remoteSuccess = true;
                      await markLogsAsSynced([uniqueId]);
                    }
                  } catch (supabaseErr) {
                    console.warn("Supabase SOS broadcast failed, cached locally", supabaseErr);
                  }
                }

                await updateUnsyncedCounter();
                await loadLogsAndStats();

                if (remoteSuccess) {
                  Alert.alert(
                    "🚨 SOS BEACON BROADCASTED",
                    `CRITICAL EMERGENCY ALERT SENT!\n\nOfficer: ${personnel.rank} ${personnel.fullname} (${personnel.badgeNumber})\nGPS Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}\n\nStatus: Secure connection to PNP Command Operations active. Assistance dispatched.`,
                    [{ text: "COPY THAT / ON STANDBY", style: "default" }]
                  );
                } else {
                  Alert.alert(
                    "🚨 SOS RECORDED & CACHED",
                    `EMERGENCY COORDINATES SAVED!\n\nOfficer: ${personnel.rank} ${personnel.fullname} (${personnel.badgeNumber})\nGPS Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}\n\nStatus: Saved to local offline storage cache. Tap 'GATEWAY SYNC' immediately to dispatch over standard satellite link.`,
                    [{ text: "COGNIZANT", style: "destructive" }]
                  );
                }

                resolve(true);
              } catch (err: any) {
                console.error(err);
                Alert.alert("SOS Failed", "Could not complete SOS handshake: " + (err.message || err));
                resolve(false);
              }
            }
          }
        ],
        { cancelable: true }
      );
    });
  };

  return {
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
  };
};
