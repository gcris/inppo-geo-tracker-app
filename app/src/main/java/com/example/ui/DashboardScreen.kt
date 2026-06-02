package com.example.ui

import androidx.compose.animation.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.VehicleLogEntity
import com.example.data.repository.TrackingRepository
import com.example.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    viewModel: MainViewModel,
    onEnableLocation: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val currentPersonnel by viewModel.currentPersonnel.collectAsState()
    val currentVehicle by viewModel.currentVehicle.collectAsState()
    val isShiftActive by viewModel.isShiftActive.collectAsState()
    val loggedPaths by viewModel.loggedPaths.collectAsState()
    val unsyncedCount by viewModel.unsyncedCount.collectAsState()
    val syncStatus by viewModel.syncStatus.collectAsState()
    val isLocationEnabled by viewModel.isLocationEnabled.collectAsState()

    val context = androidx.compose.ui.platform.LocalContext.current
    val lifecycleOwner = androidx.compose.ui.platform.LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) {
                viewModel.checkLocationEnabledState()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    var activeTab by remember { mutableStateOf("LIVE_TRACKER") } // TABS: "LIVE_TRACKER", "Schedules"

    val isSupabaseConfigured = remember {
        com.example.data.remote.SupabaseClient.isSupabaseConfigured()
    }

    val isDarkTheme by viewModel.isDarkTheme.collectAsState()

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 80.dp) // Leave area for bottom tabs
        ) {
            // 1. TOP BAR COMMAND INTERFACES TITLE
            TopCommandHeader(
                isSupabaseConfigured = isSupabaseConfigured,
                onLogout = { viewModel.logout() },
                isDarkTheme = isDarkTheme,
                onToggleTheme = { viewModel.toggleTheme() }
            )

            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Spacer
                item { Spacer(modifier = Modifier.height(4.dp)) }

                // 2. ACTIVE OFFICER PROFILE CARD
                item {
                    OfficerProfileCard(
                        rank = currentPersonnel?.rank ?: "PCpl",
                        fullname = currentPersonnel?.fullname ?: "Gerry Cris Cariaga",
                        badgeNumber = currentPersonnel?.badgeNumber ?: "PNP-4820-2026",
                        assignedPlate = currentVehicle?.plateNumber ?: "PNP-FOOT-4820"
                    )
                }

                // 3. TAB CONTROLLER SELECTOR
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.surface)
                            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
                            .padding(4.dp)
                    ) {
                        TabButton(
                            text = "LIVE SHIFT RADAR",
                            active = activeTab == "LIVE_TRACKER",
                            modifier = Modifier.weight(1f),
                            onClick = { activeTab = "LIVE_TRACKER" }
                        )
                        TabButton(
                            text = "DUTY SECTOR SCHEDULE",
                            active = activeTab == "Schedules",
                            modifier = Modifier.weight(1f),
                            onClick = { activeTab = "Schedules" }
                        )
                    }
                }

                if (activeTab == "LIVE_TRACKER") {
                    if (!isLocationEnabled) {
                        item {
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = PnpStatusError.copy(alpha = 0.15f)
                                ),
                                border = androidx.compose.foundation.BorderStroke(1.dp, PnpStatusError)
                            ) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Warning,
                                            contentDescription = "GPS Error",
                                            tint = PnpStatusError,
                                            modifier = Modifier.size(24.dp)
                                        )
                                        Text(
                                            text = "DEVICE GPS IS DISABLED",
                                            fontWeight = FontWeight.Bold,
                                            color = PnpStatusError,
                                            fontSize = 14.sp
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "Your phone's system location switch is turned off. To map coordinates, you must enable global GPS services.",
                                        color = MaterialTheme.colorScheme.onSurface,
                                        fontSize = 12.sp,
                                        textAlign = TextAlign.Center
                                    )
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Button(
                                        onClick = {
                                            onEnableLocation()
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = PnpStatusError)
                                    ) {
                                        Text("ENABLE SYSTEM LOCATION / GPS", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.White)
                                    }
                                }
                            }
                        }
                    }

                    // 4. SHIFT ACTIVATION CONTROL PAD
                    item {
                        ShiftControlCard(
                            isShiftActive = isShiftActive,
                            onToggleShift = {
                                if (isShiftActive) {
                                    viewModel.stopTrackingShift()
                                } else {
                                    viewModel.startTrackingShift()
                                }
                            }
                        )
                    }

                    // 5. OFFLINE SYNC ENGINE STATUS CARD
                    item {
                        SyncLocalEngineCard(
                            unsyncedCount = unsyncedCount,
                            syncStatus = syncStatus,
                            networkAvailable = viewModel.networkAvailable,
                            onForceSync = { viewModel.manualSync() }
                        )
                    }

                    // 6. HIGH-CONTRAST VECTOR TACTICAL MAP CANVASES CARD
                    item {
                        TacticalRouteCanvasCard(
                            isShiftActive = isShiftActive,
                            loggedPaths = loggedPaths
                        )
                    }

                    // 7. REAL-TIME SHIFT TELEMETRY FEED List header
                    item {
                        Text(
                            text = "REAL-TIME TELEMETRY BUFFER (${loggedPaths.size} active logs)",
                            style = MaterialTheme.typography.labelMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                letterSpacing = 1.sp
                            ),
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }

                    if (loggedPaths.isEmpty()) {
                        item {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.surface,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
                                    .padding(vertical = 4.dp)
                            ) {
                                Text(
                                    text = "No location logs cached in this physical window. Logs start populating immediately after Shift Start.",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(16.dp)
                                )
                            }
                        }
                    } else {
                        items(loggedPaths.take(5)) { log ->
                            CoordinateLogItemRow(log = log)
                        }
                    }

                } else {
                    // DUTY SECTOR TAB
                    item {
                        ScheduleDetailsCard(viewModel = viewModel)
                    }
                }

                item { Spacer(modifier = Modifier.height(16.dp)) }
            }
        }

        // 8. CUSTOM TACTICAL FLOATING FOOTER DETAILS WATERMARK
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(PnpNavySurface)
                .border(1.dp, PnpNavyBorder, RoundedCornerShape(0.dp))
                .padding(vertical = 12.dp, horizontal = 16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "MANILA FORCE BASE STATION SYSTEM",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = PnpStatusTextPrimary,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = "GPS Encrypted Tunnel • Supabase WebSockets Active",
                        fontSize = 9.sp,
                        color = PnpStatusActive
                    )
                }

                Surface(
                    color = PnpNavyDark,
                    shape = RoundedCornerShape(4.dp),
                    modifier = Modifier.border(0.5.dp, PnpGoldAccent, RoundedCornerShape(4.dp))
                ) {
                    Text(
                        text = "ZONE-SHIELD",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = PnpGoldAccent,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun TopCommandHeader(
    isSupabaseConfigured: Boolean,
    onLogout: () -> Unit,
    isDarkTheme: Boolean,
    onToggleTheme: () -> Unit
) {
    Surface(
        color = MaterialTheme.colorScheme.surface,
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 14.dp, horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Glowing status dot
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .background(
                            color = if (isSupabaseConfigured) PnpStatusActive else PnpGoldGold,
                            shape = RoundedCornerShape(50)
                        )
                )

                Spacer(modifier = Modifier.width(10.dp))

                Column {
                    Text(
                        text = if (isSupabaseConfigured) "SUPABASE CLOUD" else "SIMULATOR SYSTEM",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                        letterSpacing = 0.5.sp
                    )
                    Text(
                        text = if (isSupabaseConfigured) "RLS Policies Enforced" else "Offline Sandbox Emulator",
                        fontSize = 9.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                // Sleek, high-contrast theme selection toggle
                Text(
                    text = if (isDarkTheme) "☀️" else "🌙",
                    fontSize = 20.sp,
                    modifier = Modifier
                        .clickable { onToggleTheme() }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                        .testTag("theme_toggle_dashboard")
                )

                Spacer(modifier = Modifier.width(8.dp))

                IconButton(
                    onClick = onLogout,
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.ExitToApp,
                        contentDescription = "Sign Out Credentials",
                        tint = PnpStatusError
                    )
                }
            }
        }
    }
}

@Composable
fun TabButton(
    text: String,
    active: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Box(
        modifier = modifier
            .padding(2.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(if (active) MaterialTheme.colorScheme.primary else Color.Transparent)
            .clickable { onClick() }
            .padding(vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = if (active) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            letterSpacing = 0.5.sp
        )
    }
}

@Composable
fun OfficerProfileCard(
    rank: String,
    fullname: String,
    badgeNumber: String,
    assignedPlate: String
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = MaterialTheme.colorScheme.background,
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier
                    .size(54.dp)
                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp))
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.fillMaxSize()
                ) {
                    Icon(
                        imageVector = Icons.Default.AccountBox,
                        contentDescription = "Officer icon",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(30.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = rank,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = badgeNumber,
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.62f),
                        fontFamily = FontFamily.Monospace
                    )
                }

                Text(
                    text = fullname,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(top = 2.dp)
                )

                Text(
                    text = "Tracked Terminal Device: Slot • $assignedPlate",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.62f),
                    modifier = Modifier.padding(top = 1.dp)
                )
            }
        }
    }
}

@Composable
fun ShiftControlCard(
    isShiftActive: Boolean,
    onToggleShift: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (isShiftActive) PnpStatusActive.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surface
        ),
        modifier = Modifier
            .fillMaxWidth()
            .border(
                width = 1.dp,
                color = if (isShiftActive) PnpStatusActive else MaterialTheme.colorScheme.outline,
                shape = RoundedCornerShape(12.dp)
            )
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "BACKGROUND TRACKING STATUS",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = if (isShiftActive) "RECORDING IN BACKGROUND" else "SHIFT SUSPENDED (OFFLINE)",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isShiftActive) PnpStatusActive else PnpStatusError,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }

                Icon(
                    imageVector = if (isShiftActive) Icons.Default.PlayArrow else Icons.Default.Info,
                    contentDescription = "Status detail",
                    tint = if (isShiftActive) PnpStatusActive else PnpStatusError,
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            Text(
                text = if (isShiftActive) {
                    "Android Foreground Service is locks active. Screens can be turned off or other apps used. Coordinates log continuously under automatic Doze Mode bypass."
                } else {
                    "No coordinates will be captured or locked. Toggle start to launch persistent sticky notifications service required by COG regulations."
                },
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                lineHeight = 14.sp,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = onToggleShift,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isShiftActive) PnpStatusError else PnpStatusActive,
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .testTag(if (isShiftActive) "stop_shift_button" else "start_shift_button")
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = if (isShiftActive) Icons.Default.Refresh else Icons.Default.PlayArrow,
                        contentDescription = null
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isShiftActive) "END FOOT PATROL SHIFT" else "START FOOT PATROL SHIFT",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}

@Composable
fun SyncLocalEngineCard(
    unsyncedCount: Int,
    syncStatus: TrackingRepository.SyncState,
    networkAvailable: Boolean,
    onForceSync: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "OFFLINE SQLITE CACHE QUEUE",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        letterSpacing = 1.sp
                    )

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(top = 2.dp)
                    ) {
                        Surface(
                            color = if (unsyncedCount > 0) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else PnpStatusActive.copy(alpha = 0.15f),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "$unsyncedCount Logs Buffered",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (unsyncedCount > 0) MaterialTheme.colorScheme.primary else PnpStatusActive,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(8.dp))

                        Text(
                            text = if (networkAvailable) "Network Signal OK" else "Deadzones / Signals Flaky",
                            fontSize = 11.sp,
                            color = if (networkAvailable) PnpStatusActive else PnpStatusError
                        )
                    }
                }

                // Custom Signal Bars representation
                Row(modifier = Modifier.padding(horizontal = 4.dp)) {
                    val strength = if (!networkAvailable) 0 else (1..4).random()
                    for (i in 1..4) {
                        Box(
                            modifier = Modifier
                                .padding(horizontal = 1.5.dp)
                                .width(3.dp)
                                .height((4 * i).dp)
                                .background(
                                    color = if (i <= strength) PnpStatusActive else MaterialTheme.colorScheme.outline
                                )
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Sync State Details description text
            val infoText = when (syncStatus) {
                is TrackingRepository.SyncState.Idle -> "Standing by. Buffering captures logs to local cache of device and uploads automatically on active cellular signal."
                is TrackingRepository.SyncState.Syncing -> "Establishing cryptographic link... POSTing logs list schema securely down Supabase vehicle_logs REST endpoint."
                is TrackingRepository.SyncState.Success -> "Synchronization successfully completed: uploaded ${syncStatus.syncedCount} log rows safely to cloud schema."
                is TrackingRepository.SyncState.Error -> "Sync deferred: ${syncStatus.message}. Logs held in SQLite backup and will retry shortly."
            }

            Text(
                text = infoText,
                fontSize = 11.sp,
                color = when (syncStatus) {
                    is TrackingRepository.SyncState.Error -> PnpStatusError
                    is TrackingRepository.SyncState.Success -> PnpStatusActive
                    is TrackingRepository.SyncState.Syncing -> MaterialTheme.colorScheme.primary
                    else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                },
                lineHeight = 14.sp
            )

            if (unsyncedCount > 0) {
                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = onForceSync,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.background,
                        contentColor = MaterialTheme.colorScheme.primary
                    ),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                        .testTag("force_sync_button")
                ) {
                    Icon(imageVector = Icons.Default.Send, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = "FORCE MANUALLY SYNC CACHE", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun TacticalRouteCanvasCard(
    isShiftActive: Boolean,
    loggedPaths: List<VehicleLogEntity>
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "TACTICAL GRID MONITOR",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                letterSpacing = 1.sp
            )

            Box(
                modifier = Modifier
                    .padding(top = 10.dp)
                    .fillMaxWidth()
                    .height(180.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.background)
                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp))
            ) {
                // Custom Canvas drawing high-contrast dynamic radar map tracking visual
                val gridLineColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)
                val primaryColor = MaterialTheme.colorScheme.primary
                val secondaryColor = MaterialTheme.colorScheme.secondary
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val w = size.width
                    val h = size.height

                    // Grid lines background
                    val gridDist = 30.dp.toPx()
                    var x = 0f
                    while (x < w) {
                        drawLine(
                            color = gridLineColor,
                            start = Offset(x, 0f),
                            end = Offset(x, h),
                            strokeWidth = 0.5.dp.toPx()
                        )
                        x += gridDist
                    }
                    var y = 0f
                    while (y < h) {
                        drawLine(
                            color = gridLineColor,
                            start = Offset(0f, y),
                            end = Offset(w, y),
                            strokeWidth = 0.5.dp.toPx()
                        )
                        y += gridDist
                    }

                    // Manila Intramuros decorative sector layout map lines
                    // Fort Santiago Sector lines
                    drawCircle(
                        color = primaryColor.copy(alpha = 0.08f),
                        radius = 120.dp.toPx(),
                        center = Offset(w * 0.3f, h * 0.4f)
                    )

                    // Draw sector text
                    // If paths exist, draw the connected route trail
                    if (loggedPaths.isEmpty()) {
                        // Drawing search sweeps
                        val sweepRad = w * 0.25f
                        drawCircle(
                            color = primaryColor.copy(alpha = 0.2f),
                            radius = sweepRad,
                            center = Offset(w / 2f, h / 2f),
                            style = Stroke(
                                width = 1.5.dp.toPx(),
                                pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f))
                            )
                        )
                    } else {
                        // Map coordinates dynamically to fits bounds of canvas
                        val path = androidx.compose.ui.graphics.Path()
                        val points = loggedPaths.take(20).reversed()

                        if (points.isNotEmpty()) {
                            // Find bounds
                            val minLat = 14.585
                            val maxLat = 14.594
                            val minLng = 120.970
                            val maxLng = 120.977

                            for (i in points.indices) {
                                val pt = points[i]
                                // Percentage map
                                val px = ((pt.longitude - minLng) / (maxLng - minLng)) * w
                                val py = h - ((pt.latitude - minLat) / (maxLat - minLat)) * h // invert Y for screen space

                                val fx = px.toFloat().coerceIn(10f, w - 10f)
                                val fy = py.toFloat().coerceIn(10f, h - 10f)

                                if (i == 0) {
                                    path.moveTo(fx, fy)
                                } else {
                                    path.lineTo(fx, fy)
                                }

                                // Raw dots
                                drawCircle(
                                    color = if (i == points.size - 1) primaryColor else secondaryColor,
                                    radius = if (i == points.size - 1) 6.dp.toPx() else 3.dp.toPx(),
                                    center = Offset(fx, fy)
                                )
                            }

                            drawPath(
                                path = path,
                                color = primaryColor,
                                style = Stroke(
                                    width = 2.dp.toPx()
                                )
                            )
                        }
                    }
                }

                // GPS Coordinate Overlays
                Column(
                    modifier = Modifier
                        .padding(8.dp)
                        .align(Alignment.TopStart)
                        .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.85f))
                        .padding(6.dp)
                        .border(0.5.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(4.dp))
                ) {
                    val lastPt = loggedPaths.firstOrNull()
                    val latStr = lastPt?.let { String.format(Locale.US, "%.5f", it.latitude) } ?: "14.59160"
                    val lngStr = lastPt?.let { String.format(Locale.US, "%.5f", it.longitude) } ?: "120.97330"
                    val speedStr = lastPt?.let { String.format(Locale.US, "%.1f km/h", it.speed * 3.6) } ?: "3.4 km/h"

                    Text(
                        text = "LAT: $latStr",
                        color = MaterialTheme.colorScheme.onSurface,
                        fontSize = 9.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "LNG: $lngStr",
                        color = MaterialTheme.colorScheme.onSurface,
                        fontSize = 9.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "PACING: $speedStr",
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Compass Rose Overlay
                Surface(
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.85f),
                    shape = RoundedCornerShape(4.dp),
                    modifier = Modifier
                        .padding(8.dp)
                        .align(Alignment.BottomEnd)
                        .border(0.5.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(4.dp))
                ) {
                    Text(
                        text = "SECTOR 4 INTRAMUROS MAP",
                        fontSize = 8.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun CoordinateLogItemRow(log: VehicleLogEntity) {
    Surface(
        color = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier
            .fillMaxWidth()
            .border(0.5.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp))
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = "Coordinates",
                    tint = if (log.isSynced) PnpStatusActive else MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    val latStr = String.format(Locale.US, "%.5f", log.latitude)
                    val lngStr = String.format(Locale.US, "%.5f", log.longitude)
                    Text(
                        text = "$latStr, $lngStr",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontFamily = FontFamily.Monospace
                    )
                    Text(
                        text = "SPEED: ${String.format(Locale.US, "%.1f", log.speed * 3.6)} km/h • Captured: ${formatTimestamp(log.capturedAt)}",
                        fontSize = 10.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.62f)
                    )
                }
            }

            Surface(
                color = if (log.isSynced) PnpStatusActive.copy(alpha = 0.15f) else MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                shape = RoundedCornerShape(4.dp)
            ) {
                Text(
                    text = if (log.isSynced) "SYNCED" else "PENDING",
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (log.isSynced) PnpStatusActive else MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }
    }
}

private fun formatTimestamp(isoTime: String): String {
    return try {
        // Simple extract of time portion
        val inFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
        val date = inFormat.parse(isoTime) ?: return isoTime
        val outFormat = SimpleDateFormat("HH:mm:ss", Locale.US)
        outFormat.format(date)
    } catch (e: Exception) {
         if (isoTime.length > 18) isoTime.substring(11, 19) else isoTime
    }
}
