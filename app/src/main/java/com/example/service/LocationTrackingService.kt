package com.example.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.MainActivity
import com.example.PnpGeoTrackerApp
import com.example.data.repository.TrackingRepository
import com.google.android.gms.location.*
import kotlinx.coroutines.*
import java.util.Locale
import kotlin.math.cos
import kotlin.math.sin

class LocationTrackingService : Service() {

    private var serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)

    private lateinit var repository: TrackingRepository
    private var wakeLock: PowerManager.WakeLock? = null
    private var fusedLocationClient: FusedLocationProviderClient? = null
    private var locationCallback: LocationCallback? = null
    private var nativeLocationManager: android.location.LocationManager? = null
    private var nativeLocationListener: android.location.LocationListener? = null
    private var lastUpdatedTime = 0L

    // Intramuros Foot Patrol Route Coordinates Loop
    private val patrolRoute = listOf(
        Pair(14.5916, 120.9733), // Plaza Roma / Manila Cathedral
        Pair(14.5939, 120.9704), // Fort Santiago Gate
        Pair(14.5912, 120.9715), // Postigo Street Checkpoint
        Pair(14.5899, 120.9743), // Plaza de Santa Isabel
        Pair(14.5891, 120.9753), // San Agustin Church
        Pair(14.5862, 120.9746), // Manila High School Back Street
        Pair(14.5855, 120.9751), // Baluarte de San Diego
        Pair(14.5880, 120.9765), // Victoria Street / Letran area
        Pair(14.5910, 120.9760)  // Beaterio St Gate
    )
    private var currentRouteIndex = 0
    private var interpStep = 0.0
    private var lastLat = 14.5916
    private var lastLng = 120.9733

    companion object {
        const val ACTION_START = "com.example.service.LocationTrackingService.START"
        const val ACTION_STOP = "com.example.service.LocationTrackingService.STOP"
        private const val NOTIFICATION_CHANNEL_ID = "pnp_tracker_channel"
        private const val NOTIFICATION_ID = 4820
    }

    override fun onCreate() {
        super.onCreate()
        Log.d("LocationTrackingService", "Service Created")
        repository = (application as PnpGeoTrackerApp).trackingRepository
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        nativeLocationManager = getSystemService(Context.LOCATION_SERVICE) as? android.location.LocationManager
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                Log.d("LocationTrackingService", "Received ACTION_START")
                startTrackingService()
            }
            ACTION_STOP -> {
                Log.d("LocationTrackingService", "Received ACTION_STOP")
                stopTrackingService()
            }
        }
        return START_STICKY
    }

    private fun startTrackingService() {
        // Prevent registering multiple times if already running
        if (wakeLock != null && wakeLock!!.isHeld) return

        // 1. Acquire CPU WakeLock to bypass OS Doze Mode and deep sleep throttling
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PnpGeoTracker::TrackingWakeLock").apply {
            setReferenceCounted(false)
            acquire(30 * 60 * 1000L /* 30 minutes safe release limit or until stopped */)
        }

        // 2. Build the sticky notification
        val notification = buildForegroundNotification("Active Patrol Foot Duty", "GPS coordinates are being synced securely.")

        // 3. Start service with proper type location for modern Android versions (14+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        // 4. Register real GPS hardware updates to capture active telemetry immediately
        requestGpsLocationUpdates()
        // startTelemetrySimulation() // Disabled mock telemetry simulation to use only real GPS sensor hardware data as requested
    }

    private fun stopTrackingService() {
        Log.d("LocationTrackingService", "Stopping tracking service")
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
                wakeLock = null
            }
            locationCallback?.let {
                fusedLocationClient?.removeLocationUpdates(it)
                locationCallback = null
            }
            nativeLocationListener?.let {
                nativeLocationManager?.removeUpdates(it)
                nativeLocationListener = null
            }
            serviceJob.cancel()
            // Reset job
            serviceJob = SupervisorJob()
            serviceScope.coroutineContext[Job]?.cancelChildren()
        } catch (e: Exception) {
            Log.e("LocationTrackingService", "Error during release", e)
        }
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun requestGpsLocationUpdates() {
        // --- 1. Request via Google Play Services Fused Location Client ---
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 5000L).apply {
            setMinUpdateIntervalMillis(3000L)
        }.build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                for (loc in locationResult.locations) {
                    Log.d("LocationTrackingService", "FusedLocationProvider update: ${loc.latitude}, ${loc.longitude}")
                    processIncomingLocation(loc.latitude, loc.longitude, loc.speed)
                }
            }
        }

        try {
            fusedLocationClient?.requestLocationUpdates(
                locationRequest,
                locationCallback!!,
                mainLooper
            )
        } catch (unlikely: SecurityException) {
            Log.e("LocationTrackingService", "FusedLocation service permission missing", unlikely)
        }

        // --- 2. Fallback / Parallel request via System Native LocationManager ---
        // This acts as a robust failover on GMS-less phones, indoors, or if AppOps restricts GMS background activity.
        nativeLocationListener = object : android.location.LocationListener {
            override fun onLocationChanged(location: Location) {
                Log.d("LocationTrackingService", "Native LocationManager update: ${location.latitude}, ${location.longitude}")
                processIncomingLocation(location.latitude, location.longitude, location.speed)
            }
        }

        try {
            val isGpsEnabled = nativeLocationManager?.isProviderEnabled(android.location.LocationManager.GPS_PROVIDER) ?: false
            val isNetworkEnabled = nativeLocationManager?.isProviderEnabled(android.location.LocationManager.NETWORK_PROVIDER) ?: false

            if (isGpsEnabled) {
                nativeLocationManager?.requestLocationUpdates(
                    android.location.LocationManager.GPS_PROVIDER,
                    3000L, // minTime (3 seconds)
                    0f,    // minDistance (0 meters)
                    nativeLocationListener!!,
                    mainLooper
                )
                Log.d("LocationTrackingService", "Registered system native GPS location provider")
            }
            if (isNetworkEnabled) {
                nativeLocationManager?.requestLocationUpdates(
                    android.location.LocationManager.NETWORK_PROVIDER,
                    3000L,
                    0f,
                    nativeLocationListener!!,
                    mainLooper
                )
                Log.d("LocationTrackingService", "Registered system native NETWORK location provider")
            }
        } catch (e: SecurityException) {
            Log.e("LocationTrackingService", "Native location manager permission missing", e)
        } catch (e: Exception) {
            Log.e("LocationTrackingService", "Error starting native location service", e)
        }
    }

    private fun startTelemetrySimulation() {
        serviceScope.launch {
            while (isActive) {
                // Interval: every 5 seconds, check if active and record location log
                if (repository.isShiftActive.value) {
                    // Simulating the Manila Intramuros foot patrol walk (approx. 4.5 km/h walk speed)
                    val locPair = getNextSimulatedLocation()
                    processIncomingLocation(
                        latitude = locPair.first,
                        longitude = locPair.second,
                        speed = (3.5f + (0..20).random().toFloat() / 10.0f) // random speed 3.5 - 5.5 km/h
                    )
                }
                delay(5000L)
            }
        }
    }

    private fun processIncomingLocation(latitude: Double, longitude: Double, speed: Float) {
        val currentTime = System.currentTimeMillis()
        // Deduplicate updates that are too frequent (within 1 second) and exactly identical to avoid database/network bloat
        if (currentTime - lastUpdatedTime < 1000L && latitude == lastLat && longitude == lastLng) {
            return
        }
        lastUpdatedTime = currentTime
        lastLat = latitude
        lastLng = longitude

        serviceScope.launch {
            repository.cacheLocationLog(latitude, longitude, speed)
            // Dynamically refresh the notification to manifest active telemetry
            updateNotification(latitude, longitude)
        }
    }

    private fun getNextSimulatedLocation(): Pair<Double, Double> {
        // Move along Intramuros coordinates list
        val startLoc = patrolRoute[currentRouteIndex]
        val endLoc = patrolRoute[(currentRouteIndex + 1) % patrolRoute.size]

        interpStep += 0.05 // Interpolate step
        if (interpStep >= 1.0) {
            interpStep = 0.0
            currentRouteIndex = (currentRouteIndex + 1) % patrolRoute.size
        }

        val interpLat = startLoc.first + (endLoc.first - startLoc.first) * interpStep
        val interpLng = startLoc.second + (endLoc.second - startLoc.second) * interpStep

        // Add a small micro-jitter to simulate walking step-by-step inconsistencies on the street pavement
        val latJitter = ((0..100).random() - 50) * 0.00001
        val lngJitter = ((0..100).random() - 50) * 0.00001

        return Pair(interpLat + latJitter, interpLng + lngJitter)
    }

    private fun updateNotification(lat: Double, lng: Double) {
        val latStr = String.format(Locale.US, "%.5f", lat)
        val lngStr = String.format(Locale.US, "%.5f", lng)
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notification = buildForegroundNotification(
            title = "PNP Patrol Shift Tracker Active",
            content = "Duty Coordinates: $latStr, $lngStr"
        )
        manager.notify(NOTIFICATION_ID, notification)
    }

    private fun buildForegroundNotification(title: String, content: String): Notification {
        val mainIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            mainIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "PNP Tracking Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Running PNP Foreground Service Sticky Notifications"
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d("LocationTrackingService", "Service Destroyed")
        stopTrackingService()
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
}
