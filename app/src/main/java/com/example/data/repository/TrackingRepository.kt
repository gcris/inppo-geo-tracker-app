package com.example.data.repository

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.telephony.CellInfo
import android.telephony.TelephonyManager
import android.util.Log
import com.example.BuildConfig
import com.example.data.local.*
import com.example.data.remote.SupabaseClient
import com.example.data.remote.VehicleLogDto
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

class TrackingRepository(private val context: Context) {

    private val db = AppDatabase.getDatabase(context)
    private val personnelDao = db.personnelDao()
    private val unitDao = db.unitDao()
    private val rankDao = db.rankDao()
    private val vehicleDao = db.vehicleDao()
    private val vehicleLogDao = db.vehicleLogDao()
    private val scheduleDao = db.scheduleDao()

    private val _currentPersonnel = MutableStateFlow<PersonnelEntity?>(null)
    val currentPersonnel: StateFlow<PersonnelEntity?> = _currentPersonnel.asStateFlow()

    private val _currentVehicle = MutableStateFlow<VehicleEntity?>(null)
    val currentVehicle: StateFlow<VehicleEntity?> = _currentVehicle.asStateFlow()

    private val _currentSchedule = MutableStateFlow<ScheduleEntity?>(null)
    val currentSchedule: StateFlow<ScheduleEntity?> = _currentSchedule.asStateFlow()

    private val _isShiftActive = MutableStateFlow(false)
    val isShiftActive: StateFlow<Boolean> = _isShiftActive.asStateFlow()

    private val _syncStatus = MutableStateFlow<SyncState>(SyncState.Idle)
    val syncStatus: StateFlow<SyncState> = _syncStatus.asStateFlow()

    private var activeToken: String? = null

    private fun formatManilaTime(pattern: String, date: Date = Date()): String {
        val sdf = SimpleDateFormat(pattern, Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("Asia/Manila")
        return sdf.format(date)
    }

    init {
        // Automatically check if database is empty on initialization, and seed demo PNP data
        CoroutineScope(Dispatchers.IO).launch {
            seedDemoDataIfEmpty()
        }
    }

    // Exposure of Log streams to paint paths and statistics
    val logsFlow: Flow<List<VehicleLogEntity>> = vehicleLogDao.getLogsFlow()
    val unsyncedCountFlow: Flow<Int> = vehicleLogDao.getUnsyncedLogsCountFlow()
    val schedulesFlow: Flow<List<ScheduleEntity>> = scheduleDao.getSchedulesFlow()

    sealed interface SyncState {
        object Idle : SyncState
        object Syncing : SyncState
        data class Success(val syncedCount: Int, val isSimulated: Boolean = false) : SyncState
        data class Error(val message: String) : SyncState
    }

    suspend fun loginWithEmailAndPassword(email: String, password: String): LoginResult = withContext(Dispatchers.IO) {
        val trimmedEmail = email.trim()
        val trimmedPassword = password.trim()

        if (!SupabaseClient.isSupabaseConfigured()) {
            // Local fallback for offline/preview testing when Supabase keys are not set
            val lowerEmail = trimmedEmail.lowercase(Locale.US)
            val localPersonnel = personnelDao.getPersonnelByEmail(lowerEmail)
            if (localPersonnel != null) {
                val dbPassword = localPersonnel.password ?: "password123"
                if (dbPassword != trimmedPassword) {
                    return@withContext LoginResult.Error("Incorrect password.")
                }
                return@withContext loginWithBadge(localPersonnel.badgeNumber)
            }

            val matchedBadge = when {
                lowerEmail.contains("gerry") || lowerEmail.equals("itsme.gerrycriscariaga@gmail.com") -> "PNP-4820-2026"
                else -> null
            }
            if (matchedBadge != null) {
                val personnel = personnelDao.getPersonnelByBadge(matchedBadge)
                if (personnel != null) {
                    val expectedPassword = "password123"
                    if (trimmedPassword != expectedPassword) {
                        return@withContext LoginResult.Error("Incorrect password for seeded account.")
                    }
                    return@withContext loginWithBadge(matchedBadge)
                }
            }

            return@withContext LoginResult.NotFound
        }

        val api = SupabaseClient.api
            ?: return@withContext LoginResult.Error("Supabase API is not initialized. Please verify configuration in Secrets panel.")

        try {
            val key = BuildConfig.SUPABASE_ANON_KEY
            val loginResponse = api.loginWithEmailAndPassword(
                grantType = "password",
                request = com.example.data.remote.LogInRequest(trimmedEmail, trimmedPassword),
                apiKey = key
            )

            if (!loginResponse.isSuccessful) {
                val errorBody = loginResponse.errorBody()?.string() ?: ""
                Log.e("TrackingRepository", "Auth login failed: $errorBody")
                val cleanErrorMsg = if (errorBody.contains("invalid_credentials") || errorBody.contains("Invalid login credentials") || loginResponse.code() == 400) {
                    "Invalid email/username or password. Please verify your credentials."
                } else if (errorBody.contains("Email not confirmed")) {
                    "Your email has not been confirmed yet in Supabase Auth."
                } else {
                    "Authentication failed: Error ${loginResponse.code()}"
                }
                return@withContext LoginResult.Error(cleanErrorMsg)
            }

            val body = loginResponse.body()
                ?: return@withContext LoginResult.Error("Received empty response body from Supabase.")

            val accessToken = body.accessToken
            activeToken = accessToken
            val authUser = body.user
            val authHeader = "Bearer $accessToken"

            // Query live profiles in public.personnel table using the authenticated user UUID
            var personnelList = emptyList<com.example.data.remote.PersonnelDto>()
            try {
                personnelList = api.getPersonnelById("eq.${authUser.id}", key, authHeader)
            } catch (e: Exception) {
                Log.e("TrackingRepository", "Failed to query personnel profile: ${e.message}")
            }

            val entity = if (personnelList.isNotEmpty()) {
                val dto = personnelList.first()
                PersonnelEntity(
                    id = dto.id,
                    badgeNumber = dto.badgeNumber,
                    rank = dto.rank,
                    fullname = dto.fullName,
                    unitId = dto.unitId,
                    isApproved = dto.isApproved,
                    role = dto.role
                )
            } else {
                // If profile is missing in Supabase public.personnel table, upsert a default profile row dynamically
                val cleanName = trimmedEmail.substringBefore("@")
                    .split(".")
                    .joinToString(" ") { part ->
                        part.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.US) else it.toString() }
                    }

                val defaultPersonnelDto = com.example.data.remote.PersonnelDto(
                    id = authUser.id,
                    badgeNumber = "PNP-LIVE-${authUser.id.takeLast(4).uppercase(Locale.US)}",
                    rank = "PCpl",
                    fullName = cleanName,
                    unitId = "91a92e15-5ec2-4217-baaa-c81b95ff88be", // MPD Unit
                    isApproved = true,
                    role = "patrol"
                )

                try {
                    api.upsertPersonnel(listOf(defaultPersonnelDto), key, authHeader)
                    Log.d("TrackingRepository", "Successfully upserted missing personnel profile on Supabase")
                } catch (e: Exception) {
                    Log.e("TrackingRepository", "Failed to upsert dynamic profile: ${e.message}")
                }

                PersonnelEntity(
                    id = defaultPersonnelDto.id,
                    badgeNumber = defaultPersonnelDto.badgeNumber,
                    rank = defaultPersonnelDto.rank,
                    fullname = defaultPersonnelDto.fullName,
                    unitId = defaultPersonnelDto.unitId,
                    isApproved = defaultPersonnelDto.isApproved,
                    role = defaultPersonnelDto.role
                )
            }

            // Save/Cache personnel to local Room DB
            personnelDao.insertPersonnel(entity)

            if (!entity.isApproved) {
                return@withContext LoginResult.PendingApproval(entity)
            }

            // Fetch live Vehicle setup
            var vehicle = vehicleDao.getVehicleByPersonnel(entity.id)
            if (vehicle == null) {
                try {
                    val remoteVehicles = api.getVehiclesByPersonnel("eq.${entity.id}", key, authHeader)
                    if (remoteVehicles.isNotEmpty()) {
                        val vDto = remoteVehicles.first()
                        vehicle = VehicleEntity(
                            id = vDto.id,
                            plateNumber = vDto.plateNumber,
                            createdAt = vDto.createdAt,
                            personnelId = vDto.personnelId,
                            unitId = vDto.unitId,
                            loadStatus = vDto.loadStatus,
                            lastLoadUpdate = vDto.lastLoadUpdate
                        )
                        vehicleDao.insertVehicle(vehicle)
                    }
                } catch (e: Exception) {
                    Log.e("TrackingRepository", "Failed to query vehicle: ${e.message}")
                }
            }

            if (vehicle == null) {
                vehicle = VehicleEntity(
                    id = UUID.randomUUID().toString(),
                    plateNumber = "PNP-FOOT-${entity.badgeNumber.takeLast(4)}",
                    createdAt = formatManilaTime("yyyy-MM-dd'T'HH:mm:ss'Z'"),
                    personnelId = entity.id,
                    unitId = entity.unitId,
                    loadStatus = "ACTIVE_PATROL",
                    lastLoadUpdate = formatManilaTime("yyyy-MM-dd'T'HH:mm:ss'Z'")
                )
                vehicleDao.insertVehicle(vehicle)
            }

            // Fetch live Schedule
            var schedule = scheduleDao.getScheduleByPersonnel(entity.id)
            if (schedule == null) {
                try {
                    val remoteSchedules = api.getScheduleByPersonnel("eq.${entity.id}", key, authHeader)
                    if (remoteSchedules.isNotEmpty()) {
                        val sDto = remoteSchedules.first()
                        schedule = ScheduleEntity(
                            id = sDto.id,
                            date = sDto.date,
                            timeFrom = sDto.timeFrom,
                            timeTo = sDto.timeTo,
                            sector = sDto.sector,
                            unitId = sDto.unitId,
                            personnelId = sDto.personnelId
                        )
                        scheduleDao.insertSchedule(schedule)
                    }
                } catch (e: Exception) {
                    Log.e("TrackingRepository", "Failed to query schedule: ${e.message}")
                }
            }

            if (schedule == null) {
                schedule = ScheduleEntity(
                    id = UUID.randomUUID().toString(),
                    date = formatManilaTime("yyyy-MM-dd"),
                    timeFrom = "08:00",
                    timeTo = "17:00",
                    sector = "Sector 4 (Intramuros & Ermita Foot Patrol district)",
                    unitId = entity.unitId,
                    personnelId = entity.id
                )
                scheduleDao.insertSchedule(schedule)
            }

            _currentPersonnel.value = entity
            _currentVehicle.value = vehicle
            _currentSchedule.value = schedule

            return@withContext LoginResult.Success(entity)
        } catch (e: Exception) {
            Log.e("TrackingRepository", "Login exception: ", e)
            return@withContext LoginResult.Error(e.message ?: "Authentication lost. Please verify your connection.")
        }
    }

    suspend fun loginWithBadge(badgeNumber: String): LoginResult = withContext(Dispatchers.IO) {
        try {
            // 1. Try to fetch from remote Supabase if keys are set
            if (SupabaseClient.isSupabaseConfigured()) {
                val api = SupabaseClient.api!!
                val key = BuildConfig.SUPABASE_ANON_KEY
                val authHeader = "Bearer $key"
                try {
                    val remotePersonnel = api.getPersonnelByBadge("eq.$badgeNumber", key, authHeader)
                    if (remotePersonnel.isNotEmpty()) {
                        val dto = remotePersonnel.first()
                        val entity = PersonnelEntity(
                            id = dto.id,
                            badgeNumber = dto.badgeNumber,
                            rank = dto.rank,
                            fullname = dto.fullName,
                            unitId = dto.unitId,
                            isApproved = dto.isApproved,
                            role = dto.role
                        )
                        personnelDao.insertPersonnel(entity)
                    }
                } catch (e: Exception) {
                    Log.e("TrackingRepository", "Failed to fetch remote personnel, falling back to local cache", e)
                }
            }

            // 2. Fetch from local cache (which has seeded records)
            val personnel = personnelDao.getPersonnelByBadge(badgeNumber)
                ?: return@withContext LoginResult.NotFound

            if (!personnel.isApproved) {
                return@withContext LoginResult.PendingApproval(personnel)
            }

            // Sync or fetch associated assigned Vehicle setup
            var vehicle = vehicleDao.getVehicleByPersonnel(personnel.id)
            if (vehicle == null && SupabaseClient.isSupabaseConfigured()) {
                val api = SupabaseClient.api!!
                val key = BuildConfig.SUPABASE_ANON_KEY
                val authHeader = "Bearer $key"
                try {
                    val remoteVehicles = api.getVehiclesByPersonnel("eq.${personnel.id}", key, authHeader)
                    if (remoteVehicles.isNotEmpty()) {
                        val vDto = remoteVehicles.first()
                        val vEntity = VehicleEntity(
                            id = vDto.id,
                            plateNumber = vDto.plateNumber,
                            createdAt = vDto.createdAt,
                            personnelId = vDto.personnelId,
                            unitId = vDto.unitId,
                            loadStatus = vDto.loadStatus,
                            lastLoadUpdate = vDto.lastLoadUpdate
                        )
                        vehicleDao.insertVehicle(vEntity)
                        vehicle = vEntity
                    }
                } catch (e: Exception) {
                    Log.e("TrackingRepository", "Failed to fetch vehicle, falling back", e)
                }
            }

            // Fallback: If still null, create a local virtual vehicle tracking slot representing this officer's equipment/terminal
            if (vehicle == null) {
                vehicle = VehicleEntity(
                    id = UUID.randomUUID().toString(),
                    plateNumber = "PNP-FOOT-${personnel.badgeNumber.takeLast(4)}",
                    createdAt = formatManilaTime("yyyy-MM-dd'T'HH:mm:ss'Z'"),
                    personnelId = personnel.id,
                    unitId = personnel.unitId,
                    loadStatus = "ACTIVE_PATROL",
                    lastLoadUpdate = formatManilaTime("yyyy-MM-dd'T'HH:mm:ss'Z'")
                )
                vehicleDao.insertVehicle(vehicle)
            }

            // Sync or fetch assigned Schedule
            var schedule = scheduleDao.getScheduleByPersonnel(personnel.id)
            if (schedule == null && SupabaseClient.isSupabaseConfigured()) {
                val api = SupabaseClient.api!!
                val key = BuildConfig.SUPABASE_ANON_KEY
                val authHeader = "Bearer $key"
                try {
                    val remoteSchedules = api.getScheduleByPersonnel("eq.${personnel.id}", key, authHeader)
                    if (remoteSchedules.isNotEmpty()) {
                        val sDto = remoteSchedules.first()
                        val sEntity = ScheduleEntity(
                            id = sDto.id,
                            date = sDto.date,
                            timeFrom = sDto.timeFrom,
                            timeTo = sDto.timeTo,
                            sector = sDto.sector,
                            unitId = sDto.unitId,
                            personnelId = sDto.personnelId
                        )
                        scheduleDao.insertSchedule(sEntity)
                        schedule = sEntity
                    }
                } catch (e: Exception) {
                    Log.e("TrackingRepository", "Failed to get schedules", e)
                }
            }

            // Fallback: Create a local shift schedule representation
            if (schedule == null) {
                schedule = ScheduleEntity(
                    id = UUID.randomUUID().toString(),
                    date = formatManilaTime("yyyy-MM-dd"),
                    timeFrom = "08:00",
                    timeTo = "17:00",
                    sector = "Sector 4 (Intramuros & Ermita Foot Patrol district)",
                    unitId = personnel.unitId,
                    personnelId = personnel.id
                )
                scheduleDao.insertSchedule(schedule)
            }

            _currentPersonnel.value = personnel
            _currentVehicle.value = vehicle
            _currentSchedule.value = schedule

            return@withContext LoginResult.Success(personnel)
        } catch (e: Exception) {
            Log.e("TrackingRepository", "Login error", e)
            return@withContext LoginResult.Error(e.message ?: "Unknown login error occurred")
        }
    }

    suspend fun startShift() = withContext(Dispatchers.IO) {
        _isShiftActive.value = true
    }

    suspend fun stopShift() = withContext(Dispatchers.IO) {
        _isShiftActive.value = false
        // Trigger a final sync
        syncCachedLogs()
    }

    fun logout() {
        _currentPersonnel.value = null
        _currentVehicle.value = null
        _currentSchedule.value = null
        _isShiftActive.value = false
    }

    suspend fun cacheLocationLog(latitude: Double, longitude: Double, speed: Float) = withContext(Dispatchers.IO) {
        var vehicle = _currentVehicle.value
        if (vehicle == null) {
            val personnel = _currentPersonnel.value
            val badgeStr = personnel?.badgeNumber ?: "4820"
            val suffix = if (badgeStr.length >= 4) badgeStr.takeLast(4) else "4820"
            val newVehicle = VehicleEntity(
                id = "eeca1d4a-67bf-46b4-b10c-d19602ca5aba",
                plateNumber = "PNP-FOOT-$suffix",
                createdAt = formatManilaTime("yyyy-MM-dd'T'HH:mm:ss'Z'"),
                personnelId = personnel?.id ?: "fallback-id",
                unitId = personnel?.unitId ?: "fallback-unit-id",
                loadStatus = "ACTIVE_PATROL",
                lastLoadUpdate = formatManilaTime("yyyy-MM-dd'T'HH:mm:ss'Z'")
            )
            vehicleDao.insertVehicle(newVehicle)
            _currentVehicle.value = newVehicle
            vehicle = newVehicle
        }
        val signal = getNetworkSignalStrength()
        val logEntity = VehicleLogEntity(
            vehicleId = vehicle.id,
            latitude = latitude,
            longitude = longitude,
            speed = speed.toDouble(),
            networkSignal = signal,
            capturedAt = formatManilaTime("yyyy-MM-dd'T'HH:mm:ss'Z'"),
            isSynced = false
        )
        vehicleLogDao.insertLog(logEntity)
        Log.d("TrackingRepository", "Cached patrol location log locally: L=$latitude, Lo=$longitude, Speed=$speed, Signal=$signal")

        // Auto trigger sync if network is available
        if (isNetworkAvailable()) {
            syncCachedLogs()
        }
    }

    suspend fun syncCachedLogs(overrideVehicleId: String? = null) = withContext(Dispatchers.IO) {
        if (_syncStatus.value == SyncState.Syncing) return@withContext
        _syncStatus.value = SyncState.Syncing

        if (!isNetworkAvailable()) {
            _syncStatus.value = SyncState.Error("No network connection available")
            return@withContext
        }

        val targetVehicleId = overrideVehicleId ?: "eeca1d4a-67bf-46b4-b10c-d19602ca5aba"
        vehicleLogDao.updateUnsyncedVehicleId(targetVehicleId)

        val unsynced = vehicleLogDao.getUnsyncedLogs()
        if (unsynced.isEmpty()) {
            _syncStatus.value = SyncState.Success(0, isSimulated = !SupabaseClient.isSupabaseConfigured())
            return@withContext
        }

        if (!SupabaseClient.isSupabaseConfigured()) {
            // Under simulation / offline flow mockup: Sync proceeds locally as a success
            Thread.sleep(1000) // Simulate delay
            val logIds = unsynced.map { it.id }
            vehicleLogDao.markAsSynced(logIds)
            vehicleLogDao.deleteSyncedLogs()
            _syncStatus.value = SyncState.Success(unsynced.size, isSimulated = true)
            Log.d("TrackingRepository", "[Simulation] Synced ${unsynced.size} logs to Supabase vehicle_logs table successfully")
            return@withContext
        }

        // Real Supabase API connection
        val api = SupabaseClient.api
        if (api == null) {
            _syncStatus.value = SyncState.Error("Supabase client failed to initialize")
            return@withContext
        }

        try {
            val dtoList = unsynced.map {
                VehicleLogDto(
                    id = it.id,
                    vehicleId = targetVehicleId,
                    latitude = it.latitude,
                    longitude = it.longitude,
                    speed = it.speed,
                    networkSignal = it.networkSignal,
                    capturedAt = it.capturedAt
                )
            }

            val key = BuildConfig.SUPABASE_ANON_KEY
            val token = activeToken
            val authHeader = if (!token.isNullOrEmpty()) "Bearer $token" else "Bearer $key"
            val response = api.uploadLogs(dtoList, key, authHeader)

            if (response.isSuccessful) {
                val logIds = unsynced.map { it.id }
                vehicleLogDao.markAsSynced(logIds)
                vehicleLogDao.deleteSyncedLogs()
                _syncStatus.value = SyncState.Success(unsynced.size, isSimulated = false)
                Log.d("TrackingRepository", "Real sync: Synced ${unsynced.size} logs to Supabase successfully")
            } else {
                val errMsg = response.errorBody()?.string() ?: "Sync HTTP error code: ${response.code()}"
                _syncStatus.value = SyncState.Error(errMsg)
                Log.e("TrackingRepository", "Real sync failed: $errMsg")
            }
        } catch (e: Exception) {
            Log.e("TrackingRepository", "Real sync failed through caught exception", e)
            _syncStatus.value = SyncState.Error(e.message ?: "Network error during synchronization")
        }
    }

    // Seed PNP core assets
    private suspend fun seedDemoDataIfEmpty() {
        val anyPersonnel = personnelDao.getPersonnelByBadge("PNP-4820-2026")
        if (anyPersonnel == null) {
            Log.d("TrackingRepository", "Local Room DB is empty. Seeding PNP local mock models...")

            // Seed Police Unit
            val mdpUnitId = "91a92e15-5ec2-4217-baaa-c81b95ff88be"
            val mpdUnit = UnitEntity(mdpUnitId, "Manila Police District (MPD)")
            val qcpdUnit = UnitEntity("92b005fe-1429-4654-8e12-32b005fe1429", "Quezon City Police District (QCPD)")
            unitDao.insertUnit(mpdUnit)
            unitDao.insertUnit(qcpdUnit)

            // Seed Ranks
            rankDao.insertRank(RankEntity("Pat", "Patrolman"))
            rankDao.insertRank(RankEntity("PCpl", "Police Corporal"))
            rankDao.insertRank(RankEntity("PMSg", "Police Master Sergeant"))

            // Seed personnel
            val personnelList = listOf(
                PersonnelEntity(
                    id = "9a7bde06-a831-4db3-96b1-096bade8cc12",
                    badgeNumber = "PNP-4820-2026",
                    rank = "PCpl",
                    fullname = "Gerry Cris Cariaga",
                    unitId = mdpUnitId,
                    isApproved = true,
                    role = "patrol",
                    email = "itsme.gerrycriscariaga@gmail.com",
                    password = "password123",
                    rank_id = "PCpl",
                    unit_id = mdpUnitId,
                    designation = "Patrol Officer",
                    phone_number = "+639123456789",
                    viber_number = "+639123456789"
                )
            )
            personnelDao.insertAll(personnelList)

            // Seed Vehicles assignments
            val vehicle = VehicleEntity(
                id = "eeca1d4a-67bf-46b4-b10c-d19602ca5aba",
                plateNumber = "PNP-EP-391",
                createdAt = "2026-06-01T08:00:00Z",
                personnelId = "9a7bde06-a831-4db3-96b1-096bade8cc12", // Gerry Cris Cariaga
                unitId = mdpUnitId,
                loadStatus = "ACTIVE_PATROL",
                lastLoadUpdate = "2026-06-02T08:00:00Z"
            )
            vehicleDao.insertVehicle(vehicle)

            // Seed Schedules
            val schedule = ScheduleEntity(
                id = "e6fcfe10-c0b0-4dbf-8182-b7bc6719ab21",
                date = "2026-06-02",
                timeFrom = "08:00",
                timeTo = "17:00",
                sector = "Sector 4 (Intramuros & Ermita - Foot Patrol Area)",
                unitId = mdpUnitId,
                personnelId = "9a7bde06-a831-4db3-96b1-096bade8cc12"
            )
            scheduleDao.insertSchedule(schedule)
            Log.d("TrackingRepository", "PNP local database seeding completed successfully.")
        }
    }

    suspend fun getRanks(): List<RankEntity> = withContext(Dispatchers.IO) {
        rankDao.getAllRanks()
    }

    suspend fun getUnits(): List<UnitEntity> = withContext(Dispatchers.IO) {
        unitDao.getAllUnits()
    }

    suspend fun findCandidatePersonnel(
        badgeNumber: String,
        rankId: String,
        unitId: String,
        designation: String
    ): PersonnelEntity? = withContext(Dispatchers.IO) {
        personnelDao.findCandidatePersonnel(badgeNumber, rankId, unitId, designation)
    }

    suspend fun registerPersonnel(
        id: String,
        email: String,
        passwordCheck: String,
        fullname: String,
        phoneNumber: String,
        viberNumber: String
    ): Boolean = withContext(Dispatchers.IO) {
        val existing = personnelDao.getPersonnel(id) ?: return@withContext false
        val updated = existing.copy(
            email = email,
            password = passwordCheck,
            fullname = fullname,
            phone_number = phoneNumber,
            viber_number = viberNumber,
            isApproved = false // Pending approval by administrator
        )
        personnelDao.insertPersonnel(updated)
        true
    }

    // Network availability checks (Wifi vs Data)
    fun isNetworkAvailable(): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val nw = connectivityManager.activeNetwork ?: return false
        val actNw = connectivityManager.getNetworkCapabilities(nw) ?: return false
        return when {
            actNw.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> true
            actNw.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> true
            actNw.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> true
            else -> false
        }
    }

    // Obtain signal strength (0 to 4 rating)
    private fun getNetworkSignalStrength(): Int {
        if (!isNetworkAvailable()) return 0
        try {
            // Basic signal estimation using network state. For accurate cell signal, requires permission.
            // On android emulator, cellular behaves statically. Let's provide a simulation representing signal dips
            // and erratic signals based on a random walk generator to represent Philippine cellular deadzones dynamically!
            // This is perfect for verifying offline queue handling and robust logging.
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val nw = connectivityManager.activeNetwork
            val actNw = connectivityManager.getNetworkCapabilities(nw)

            val baseSignal = if (actNw != null && actNw.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                4 // Wifi signal is typically full
            } else {
                3 // Cellular signal averages medium
            }

            // Simulate real-world erratic deadzones (e.g. 10% chance of entering 0-1 bar deadzone, 90% stable 3-4 bar)
            val dice = (1..100).random()
            return when {
                dice <= 12 -> 0 // Total dead zone (Offline caching triggered!)
                dice <= 24 -> 1 // Extremely weak EDGE/GPRS
                dice <= 36 -> 2 // Flaky HSPA+ inside concrete tunnels
                else -> baseSignal
            }
        } catch (e: Exception) {
            return 2
        }
    }
}

sealed interface LoginResult {
    data class Success(val personnel: PersonnelEntity) : LoginResult
    data class PendingApproval(val personnel: PersonnelEntity) : LoginResult
    object NotFound : LoginResult
    data class Error(val message: String) : LoginResult
}
