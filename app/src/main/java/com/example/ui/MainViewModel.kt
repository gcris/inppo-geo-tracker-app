package com.example.ui

import android.app.Application
import android.content.Context
import android.content.Intent
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.PnpGeoTrackerApp
import com.example.data.local.PersonnelEntity
import com.example.data.local.ScheduleEntity
import com.example.data.local.VehicleEntity
import com.example.data.local.VehicleLogEntity
import com.example.data.repository.LoginResult
import com.example.data.repository.TrackingRepository
import com.example.service.LocationTrackingService
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

sealed interface LoginUiState {
    object Idle : LoginUiState
    object Loading : LoginUiState
    data class Success(val personnel: PersonnelEntity) : LoginUiState
    data class PendingApproval(val personnel: PersonnelEntity) : LoginUiState
    object NotFound : LoginUiState
    data class Error(val message: String) : LoginUiState
}

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val repository: TrackingRepository = (application as PnpGeoTrackerApp).trackingRepository

    val currentPersonnel: StateFlow<PersonnelEntity?> = repository.currentPersonnel
    val currentVehicle: StateFlow<VehicleEntity?> = repository.currentVehicle
    val currentSchedule: StateFlow<ScheduleEntity?> = repository.currentSchedule
    val isShiftActive: StateFlow<Boolean> = repository.isShiftActive
    val syncStatus: StateFlow<TrackingRepository.SyncState> = repository.syncStatus

    private val _isDarkTheme = MutableStateFlow(true) // Dynamic Light/Dark selection (defaulting to PNP dark theme)
    val isDarkTheme: StateFlow<Boolean> = _isDarkTheme.asStateFlow()

    fun toggleTheme() {
        _isDarkTheme.value = !_isDarkTheme.value
    }

    private val _loginState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val loginState: StateFlow<LoginUiState> = _loginState.asStateFlow()

    // Real-time telemetry data
    val loggedPaths: StateFlow<List<VehicleLogEntity>> = repository.logsFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val unsyncedCount: StateFlow<Int> = repository.unsyncedCountFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val networkAvailable: Boolean
        get() = repository.isNetworkAvailable()

    fun login(badgeNumber: String) {
        if (badgeNumber.trim().isEmpty()) {
            _loginState.value = LoginUiState.Error("Please enter your PNP badge number.")
            return
        }

        viewModelScope.launch {
            _loginState.value = LoginUiState.Loading
            when (val result = repository.loginWithBadge(badgeNumber.trim())) {
                is LoginResult.Success -> {
                    _loginState.value = LoginUiState.Success(result.personnel)
                }
                is LoginResult.PendingApproval -> {
                    _loginState.value = LoginUiState.PendingApproval(result.personnel)
                }
                is LoginResult.NotFound -> {
                    _loginState.value = LoginUiState.NotFound
                }
                is LoginResult.Error -> {
                    _loginState.value = LoginUiState.Error(result.message)
                }
            }
        }
    }

    fun loginWithEmailAndPassword(email: String, password: String) {
        if (email.trim().isEmpty()) {
            _loginState.value = LoginUiState.Error("Please enter your email address.")
            return
        }
        if (password.trim().isEmpty()) {
            _loginState.value = LoginUiState.Error("Please enter your password.")
            return
        }

        viewModelScope.launch {
            _loginState.value = LoginUiState.Loading
            when (val result = repository.loginWithEmailAndPassword(email.trim(), password.trim())) {
                is LoginResult.Success -> {
                    _loginState.value = LoginUiState.Success(result.personnel)
                }
                is LoginResult.PendingApproval -> {
                    _loginState.value = LoginUiState.PendingApproval(result.personnel)
                }
                is LoginResult.NotFound -> {
                    _loginState.value = LoginUiState.NotFound
                }
                is LoginResult.Error -> {
                    _loginState.value = LoginUiState.Error(result.message)
                }
            }
        }
    }

    fun resetLoginState() {
        _loginState.value = LoginUiState.Idle
    }

    fun startTrackingShift() {
        viewModelScope.launch {
            repository.startShift()
            val context = getApplication<Application>().applicationContext
            val intent = Intent(context, LocationTrackingService::class.java).apply {
                action = LocationTrackingService.ACTION_START
            }
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }

    fun stopTrackingShift() {
        viewModelScope.launch {
            repository.stopShift()
            val context = getApplication<Application>().applicationContext
            val intent = Intent(context, LocationTrackingService::class.java).apply {
                action = LocationTrackingService.ACTION_STOP
            }
            context.stopService(intent)
        }
    }

    fun manualSync() {
        viewModelScope.launch {
            repository.syncCachedLogs()
        }
    }

    fun logout() {
        stopTrackingShift()
        repository.logout()
        _loginState.value = LoginUiState.Idle
    }
}
