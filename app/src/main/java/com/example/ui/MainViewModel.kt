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
import com.example.data.local.RankEntity
import com.example.data.local.UnitEntity
import com.example.data.repository.LoginResult
import com.example.data.repository.TrackingRepository
import com.example.service.LocationTrackingService
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

enum class ViewMode {
    LOGIN, REGISTER
}

sealed interface LoginUiState {
    object Idle : LoginUiState
    object Loading : LoginUiState
    data class Success(val personnel: PersonnelEntity) : LoginUiState
    data class PendingApproval(val personnel: PersonnelEntity) : LoginUiState
    object NotFound : LoginUiState
    data class Error(val message: String) : LoginUiState
}

sealed interface RegisterUiState {
    object Idle : RegisterUiState
    object Loading : RegisterUiState
    data class Success(val message: String) : RegisterUiState
    data class Error(val message: String) : RegisterUiState
}

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val repository: TrackingRepository = (application as PnpGeoTrackerApp).trackingRepository

    val currentPersonnel: StateFlow<PersonnelEntity?> = repository.currentPersonnel
    val currentVehicle: StateFlow<VehicleEntity?> = repository.currentVehicle
    val currentSchedule: StateFlow<ScheduleEntity?> = repository.currentSchedule
    val isShiftActive: StateFlow<Boolean> = repository.isShiftActive
    val syncStatus: StateFlow<TrackingRepository.SyncState> = repository.syncStatus

    private val _viewMode = MutableStateFlow(ViewMode.LOGIN)
    val viewMode: StateFlow<ViewMode> = _viewMode.asStateFlow()

    fun navigateToRegister() {
        _viewMode.value = ViewMode.REGISTER
    }

    fun navigateToLogin() {
        _viewMode.value = ViewMode.LOGIN
    }

    private val _isDarkTheme = MutableStateFlow(true) // Dynamic Light/Dark selection (defaulting to PNP dark theme)
    val isDarkTheme: StateFlow<Boolean> = _isDarkTheme.asStateFlow()

    private val _isLocationEnabled = MutableStateFlow(true)
    val isLocationEnabled: StateFlow<Boolean> = _isLocationEnabled.asStateFlow()

    private val _isPermissionGranted = MutableStateFlow(true)
    val isPermissionGranted: StateFlow<Boolean> = _isPermissionGranted.asStateFlow()

    private val _ranksState = MutableStateFlow<List<RankEntity>>(emptyList())
    val ranksState: StateFlow<List<RankEntity>> = _ranksState.asStateFlow()

    private val _unitsState = MutableStateFlow<List<UnitEntity>>(emptyList())
    val unitsState: StateFlow<List<UnitEntity>> = _unitsState.asStateFlow()

    private val _registerState = MutableStateFlow<RegisterUiState>(RegisterUiState.Idle)
    val registerState: StateFlow<RegisterUiState> = _registerState.asStateFlow()

    init {
        checkLocationEnabledState()
        loadRegistrationMetadata()
    }

    fun loadRegistrationMetadata() {
        viewModelScope.launch {
            _ranksState.value = repository.getRanks()
            _unitsState.value = repository.getUnits()
        }
    }

    fun checkLocationEnabledState() {
        val context = getApplication<Application>().applicationContext
        val fineLocationGranted = androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED
        val coarseLocationGranted = androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_COARSE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED
        _isPermissionGranted.value = fineLocationGranted || coarseLocationGranted

        val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? android.location.LocationManager
        val isGpsEnabled = locationManager?.isProviderEnabled(android.location.LocationManager.GPS_PROVIDER) ?: false
        val isNetworkEnabled = locationManager?.isProviderEnabled(android.location.LocationManager.NETWORK_PROVIDER) ?: false
        _isLocationEnabled.value = isGpsEnabled || isNetworkEnabled
    }

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
            repository.syncCachedLogs(overrideVehicleId = "eeca1d4a-67bf-46b4-b10c-d19602ca5aba")
        }
    }

    fun registerUser(
        email: String,
        badgeNumber: String,
        rankId: String,
        fullname: String,
        unitId: String,
        designation: String,
        phoneNumber: String,
        viberNumber: String,
        passwordInput: String
    ) {
        viewModelScope.launch {
            _registerState.value = RegisterUiState.Loading
            try {
                val candidate = repository.findCandidatePersonnel(
                    badgeNumber = badgeNumber.trim(),
                    rankId = rankId.trim(),
                    unitId = unitId.trim(),
                    designation = designation.trim()
                )
                if (candidate == null) {
                    _registerState.value = RegisterUiState.Error(
                        "No matching personnel record found with the provided Identification metadata (Badge Number, Rank, Unit, and Designation combination). Registration is denied."
                    )
                    return@launch
                }

                val success = repository.registerPersonnel(
                    id = candidate.id,
                    email = email.trim(),
                    passwordCheck = passwordInput.trim(),
                    fullname = fullname.trim(),
                    phoneNumber = phoneNumber.trim(),
                    viberNumber = viberNumber.trim()
                )

                if (success) {
                    _registerState.value = RegisterUiState.Success(
                        "Registration successful! Your profile has been submitted for administrative verification and approval."
                    )
                } else {
                    _registerState.value = RegisterUiState.Error("Failed to register profile. Record update could not be executed.")
                }
            } catch (e: Exception) {
                _registerState.value = RegisterUiState.Error(e.message ?: "An unexpected database error occurred during registration.")
            }
        }
    }

    fun resetRegisterState() {
        _registerState.value = RegisterUiState.Idle
    }

    fun logout() {
        stopTrackingShift()
        repository.logout()
        _loginState.value = LoginUiState.Idle
    }
}
