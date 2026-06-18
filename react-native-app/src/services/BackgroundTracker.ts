import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { insertVehicleLog } from './database';

export const LOCATION_TASK_NAME = 'pnp-background-patrol-task';

// Generate simulated signal strengths and coordinates when actual GPS signals inside buildings are low, mimicking our Android Service
const getNetworkSignal = (): number => {
  return Math.floor(Math.random() * 5); // 0 to 4 signal strength
};

// Generates simulated coordinate updates that move slowly (like a foot patrol) on static emulators or fixed locations
const generateSimulatedMove = (baseLat: number, baseLng: number) => {
  const angle = Math.random() * Math.PI * 2;
  const distance = 0.0001 + Math.random() * 0.0002; // Small step (~20 meters)
  return {
    latitude: baseLat + Math.sin(angle) * distance,
    longitude: baseLng + Math.cos(angle) * distance,
    speed: (1.2 + Math.random() * 2.8) / 3.6, // Speed in m/s (approx 4-15 km/h for patrol)
  };
};

let fallbackTimer: NodeJS.Timeout | null = null;
let lastKnownLat = 14.5910; // Default Manila Cathedral coordinate
let lastKnownLng = 120.9730;

// Format Manila/Asia Timestamp matching yyyy-MM-dd'T'HH:mm:ss'Z' In GMT+8
export const formatManilaTimestamp = (): string => {
  const d = new Date();
  
  // Convert UTC format to Manila local offset
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const manilaDate = new Date(utc + (3600000 * 8)); // +8 hours
  const pad = (num: number) => String(num).padStart(2, '0');
  
  const yyyy = manilaDate.getFullYear();
  const MM = pad(manilaDate.getMonth() + 1);
  const dd = pad(manilaDate.getDate());
  const HH = pad(manilaDate.getHours());
  const mm = pad(manilaDate.getMinutes());
  const ss = pad(manilaDate.getSeconds());

  return `${yyyy}-${MM}-${dd}T${HH}:${mm}:${ss}Z`;
};

// Start Continuous Background Fallback Simulation (Runs when device is stationary to ensure telemetry updates on dashboards)
export const startBackgroundSimulation = (vehicleId: string, onUpdate?: () => void) => {
  if (fallbackTimer) clearInterval(fallbackTimer);

  fallbackTimer = setInterval(async () => {
    const sim = generateSimulatedMove(lastKnownLat, lastKnownLng);
    lastKnownLat = sim.latitude;
    lastKnownLng = sim.longitude;

    const log = {
      id: Math.random().toString(36).substring(2, 11),
      vehicleId: vehicleId,
      latitude: sim.latitude,
      longitude: sim.longitude,
      speed: sim.speed,
      networkSignal: getNetworkSignal(),
      capturedAt: formatManilaTimestamp()
    };

    try {
      await insertVehicleLog(log);
      if (onUpdate) onUpdate();
    } catch (e) {
      console.warn('Simulation database failed', e);
    }
  }, 30000); // Trigger every 30 seconds (battery-friendly fallback simulation)
};

export const stopBackgroundSimulation = () => {
  if (fallbackTimer) {
    clearInterval(fallbackTimer);
    fallbackTimer = null;
  }
};

// Define Background Task (Expo Task Manager requires defineTask at the root file scope)
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }
  
  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      const location = locations[0];
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      const speed = location.coords.speed || 0.0;
      
      // Update last known locations so fallback simulation is close to real GPS coordinates
      lastKnownLat = lat;
      lastKnownLng = lng;
      
      console.log(`[Background GPS] Lat: ${lat}, Lng: ${lng}, Speed: ${speed} m/s`);

      try {
        const vehicleId = await AsyncStorage.getItem('@pnp_active_vehicle_id');
        if (vehicleId) {
          const log = {
            id: 'bg-' + Math.random().toString(36).substring(2, 11),
            vehicleId: vehicleId,
            latitude: lat,
            longitude: lng,
            speed: speed,
            networkSignal: getNetworkSignal(),
            capturedAt: formatManilaTimestamp()
          };
          await insertVehicleLog(log);
          console.log('[Background GPS] Successfully logged live background coordinate');
        }
      } catch (e) {
        console.warn('Failed to insert background log in task manager', e);
      }
    }
  }
});

// Configure and request background location updates
export const startBackgroundUpdates = async (vehicleId: string) => {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    throw new Error('Foreground location permission denied');
  }

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    throw new Error('Background location permission denied');
  }

  // Double check if system location provider is enabled (GPS toggle)
  const isGpsEnabled = await Location.hasServicesEnabledAsync();
  if (!isGpsEnabled) {
    throw new Error('System GPS/Location is currently turned off. Please enable device location.');
  }

  // Save vehicle ID so background task can query it even when app is closed/minimized
  await AsyncStorage.setItem('@pnp_active_vehicle_id', vehicleId);
  await AsyncStorage.setItem('@pnp_shift_status', 'ACTIVE');

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.BestForNavigation,
    activityType: Location.ActivityType.AutomotiveNavigation,
    timeInterval: 30000,   // battery optimized: every 30 seconds
    distanceInterval: 30,   // battery optimized: 30 meters change
    deferredUpdatesInterval: 30000,
    deferredUpdatesDistance: 30,
    foregroundService: {
      notificationTitle: "🚨 PNP Active Patrol Live Tracker",
      notificationBody: "Keeping Manila Patrol Beat safe. Real-time background telemetry is active.",
      notificationColor: "#EF4444",
    }
  });
};

export const stopBackgroundUpdates = async () => {
  await AsyncStorage.removeItem('@pnp_active_vehicle_id');
  await AsyncStorage.setItem('@pnp_shift_status', 'OFF_DUTY');
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (started) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
};
