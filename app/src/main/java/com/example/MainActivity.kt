package com.example

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ui.DashboardScreen
import com.example.ui.LoginScreen
import com.example.ui.RegisterScreen
import com.example.ui.ViewMode
import com.example.ui.MainViewModel
import com.example.ui.theme.MyApplicationTheme
import com.google.android.gms.common.api.ResolvableApiException
import com.google.android.gms.location.*

class MainActivity : ComponentActivity() {

    private lateinit var mainViewModel: MainViewModel

    private val checkSettingsLauncher = registerForActivityResult(
        ActivityResultContracts.StartIntentSenderForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            Log.d("MainActivity", "User enabled location settings from resolution dialog.")
            if (::mainViewModel.isInitialized) {
                mainViewModel.checkLocationEnabledState()
            }
        } else {
            Log.d("MainActivity", "User declined to enable location settings.")
        }
    }

    private val permissionResultLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false
        val notifGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions[Manifest.permission.POST_NOTIFICATIONS] ?: false
        } else {
            true
        }

        Log.d("MainActivity", "Permissions updated: Fine=$fineGranted, Coarse=$coarseGranted, Notification=$notifGranted")
        if (fineGranted || coarseGranted) {
            checkAndRequestLocationSettings()
        }
    }

    fun checkAndRequestLocationSettings() {
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 5000L).build()
        val builder = LocationSettingsRequest.Builder()
            .addLocationRequest(locationRequest)
            .setAlwaysShow(true)

        val client = LocationServices.getSettingsClient(this)
        val task = client.checkLocationSettings(builder.build())

        task.addOnSuccessListener {
            Log.d("MainActivity", "System location settings are already satisfied and high accuracy GPS is enabled.")
            if (::mainViewModel.isInitialized) {
                mainViewModel.checkLocationEnabledState()
            }
        }

        task.addOnFailureListener { exception ->
            if (exception is ResolvableApiException) {
                try {
                    val intentSenderRequest = IntentSenderRequest.Builder(exception.resolution.intentSender).build()
                    checkSettingsLauncher.launch(intentSenderRequest)
                } catch (sendEx: Exception) {
                    Log.e("MainActivity", "Failed to launch settings resolution", sendEx)
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Proactively request fine/coarse GPS location updates and push notification permissions on startup
        requestOperationalPermissions()

        setContent {
            val vm: MainViewModel = viewModel()
            this.mainViewModel = vm
            val isDarkTheme by vm.isDarkTheme.collectAsState()

            MyApplicationTheme(darkTheme = isDarkTheme) {
                val currentPersonnel by vm.currentPersonnel.collectAsState()
                val viewMode by vm.viewMode.collectAsState()

                Scaffold(
                    modifier = Modifier.fillMaxSize()
                ) { innerPadding ->
                    if (currentPersonnel == null) {
                        if (viewMode == ViewMode.LOGIN) {
                            LoginScreen(
                                viewModel = vm,
                                onEnableLocation = { checkAndRequestLocationSettings() },
                                onRequestPermissions = { requestOperationalPermissions() },
                                modifier = Modifier.padding(innerPadding)
                            )
                        } else {
                            RegisterScreen(
                                viewModel = vm,
                                onBackToLogin = { vm.navigateToLogin() },
                                modifier = Modifier.padding(innerPadding)
                            )
                        }
                    } else {
                        DashboardScreen(
                            viewModel = vm,
                            onEnableLocation = { checkAndRequestLocationSettings() },
                            onRequestPermissions = { requestOperationalPermissions() },
                            modifier = Modifier.padding(innerPadding)
                        )
                    }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (::mainViewModel.isInitialized) {
            mainViewModel.checkLocationEnabledState()
        }
    }

    private fun requestOperationalPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val missing = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missing.isNotEmpty()) {
            permissionResultLauncher.launch(missing.toTypedArray())
        }
    }
}

