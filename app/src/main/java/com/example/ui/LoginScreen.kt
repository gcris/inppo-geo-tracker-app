package com.example.ui

import androidx.compose.animation.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.Email
import androidx.compose.material3.*
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    viewModel: MainViewModel,
    onEnableLocation: () -> Unit = {},
    onRequestPermissions: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val loginState by viewModel.loginState.collectAsState()
    val isDarkTheme by viewModel.isDarkTheme.collectAsState()
    val isLocationEnabled by viewModel.isLocationEnabled.collectAsState()
    val isPermissionGranted by viewModel.isPermissionGranted.collectAsState()
    var emailInput by remember { mutableStateOf("itsme.gerrycriscariaga@gmail.com") }
    var passwordInput by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    val keyboardController = LocalSoftwareKeyboardController.current

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

    val backgroundColors = if (isDarkTheme) {
        listOf(PnpNavyDark, Color(0xFF070B14))
    } else {
        listOf(MaterialTheme.colorScheme.background, Color(0xFFCBD5E1))
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(colors = backgroundColors))
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        // Theme switcher at the top end
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(8.dp)
                .size(48.dp)
                .clickable { viewModel.toggleTheme() }
                .background(
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.85f),
                    shape = RoundedCornerShape(24.dp)
                )
                .border(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.outline,
                    shape = RoundedCornerShape(24.dp)
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = if (isDarkTheme) "☀️" else "🌙",
                fontSize = 18.sp
            )
        }

        // Aesthetic Radar Grid Lines printed in background
        Canvas(modifier = Modifier.fillMaxSize()) {
            val center = Offset(size.width / 2f, size.height / 3f)
            val strokeColor = if (isDarkTheme) PnpNavySurface else Color(0xFF94A3B8)
            drawCircle(
                color = strokeColor.copy(alpha = 0.4f),
                radius = 300f,
                center = center,
                style = Stroke(width = 1.5f)
            )
            drawCircle(
                color = strokeColor.copy(alpha = 0.3f),
                radius = 600f,
                center = center,
                style = Stroke(width = 1.2f)
            )
            drawCircle(
                color = strokeColor.copy(alpha = 0.15f),
                radius = 900f,
                center = center,
                style = Stroke(width = 1f)
            )

            // crosshairs
            drawLine(
                color = strokeColor.copy(alpha = 0.2f),
                start = Offset(0f, center.y),
                end = Offset(size.width, center.y),
                strokeWidth = 1f
            )
            drawLine(
                color = strokeColor.copy(alpha = 0.2f),
                start = Offset(center.x, 0f),
                end = Offset(center.x, size.height),
                strokeWidth = 1f
            )
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 480.dp)
        ) {
            if (!isPermissionGranted) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
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
                                contentDescription = "Permission Error",
                                tint = PnpStatusError,
                                modifier = Modifier.size(24.dp)
                            )
                            Text(
                                text = "LOCATION PERMISSIONS REQUIRED",
                                fontWeight = FontWeight.Bold,
                                color = PnpStatusError,
                                fontSize = 14.sp
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "PNP Geo-Tracking requires active location permissions to map patrol coordinates safely. Please grant access below.",
                            color = MaterialTheme.colorScheme.onSurface,
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            onClick = {
                                onRequestPermissions()
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = PnpStatusError)
                        ) {
                            Text("GRANT LOCATION PERMISSIONS", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.White)
                        }
                    }
                }
            } else if (!isLocationEnabled) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
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
                            text = "PNP Geo-Tracking requires high-accuracy system GPS services to be enabled globally. Please turn on Location/GPS below.",
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
                            Text("ENABLE DEVICE LOCATION", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.White)
                        }
                    }
                }
            }

            // PNP Gold Emblem representation (Canvas)
            PnpBadgeVector(modifier = Modifier.size(110.dp))

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "PHILIPPINE NATIONAL POLICE",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp,
                    color = if (isDarkTheme) PnpGoldAccent else PnpNavyPrimary
                ),
                textAlign = TextAlign.Center
            )

            Text(
                text = "Geo Tracker • Foot Patrol Management",
                style = MaterialTheme.typography.bodySmall.copy(
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    letterSpacing = 0.5.sp
                ),
                modifier = Modifier.padding(top = 4.dp),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(32.dp))

            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f)
                ),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp))
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "SECURE OFFICER SIGN IN",
                        style = MaterialTheme.typography.labelLarge.copy(
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                            letterSpacing = 1.sp
                        )
                    )

                    Text(
                        text = "Access live databases via official Supabase email Authentication credentials.",
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                            textAlign = TextAlign.Center
                        ),
                        modifier = Modifier.padding(vertical = 12.dp)
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = emailInput,
                        onValueChange = { emailInput = it },
                        label = { Text("Email Address") },
                        placeholder = { Text("officer@pnp.gov.ph") },
                        singleLine = true,
                        leadingIcon = {
                            Icon(Icons.Default.Email, contentDescription = "EmailIcon", tint = if (isDarkTheme) PnpGoldAccent else PnpNavyPrimary)
                        },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Next
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = MaterialTheme.colorScheme.onSurface,
                            unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                            focusedBorderColor = if (isDarkTheme) PnpGoldAccent else PnpNavyPrimary,
                            unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                            focusedLabelColor = if (isDarkTheme) PnpGoldAccent else PnpNavyPrimary,
                            unfocusedLabelColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            focusedContainerColor = MaterialTheme.colorScheme.background.copy(alpha = 0.3f),
                            unfocusedContainerColor = MaterialTheme.colorScheme.background.copy(alpha = 0.3f)
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("email_input")
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = passwordInput,
                        onValueChange = { passwordInput = it },
                        label = { Text("Secret Password") },
                        singleLine = true,
                        leadingIcon = {
                            Icon(Icons.Default.Lock, contentDescription = "LockIcon", tint = if (isDarkTheme) PnpGoldAccent else PnpNavyPrimary)
                        },
                        trailingIcon = {
                            Text(
                                text = if (passwordVisible) "HIDE" else "SHOW",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isDarkTheme) PnpGoldAccent else PnpNavyPrimary,
                                modifier = Modifier
                                    .padding(end = 8.dp)
                                    .clickable { passwordVisible = !passwordVisible }
                            )
                        },
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = {
                                keyboardController?.hide()
                                viewModel.loginWithEmailAndPassword(emailInput, passwordInput)
                            }
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = MaterialTheme.colorScheme.onSurface,
                            unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                            focusedBorderColor = if (isDarkTheme) PnpGoldAccent else PnpNavyPrimary,
                            unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                            focusedLabelColor = if (isDarkTheme) PnpGoldAccent else PnpNavyPrimary,
                            unfocusedLabelColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            focusedContainerColor = MaterialTheme.colorScheme.background.copy(alpha = 0.3f),
                            unfocusedContainerColor = MaterialTheme.colorScheme.background.copy(alpha = 0.3f)
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("password_input")
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = {
                            keyboardController?.hide()
                            viewModel.loginWithEmailAndPassword(emailInput, passwordInput)
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isDarkTheme) PnpGoldAccent else PnpNavyPrimary,
                            contentColor = if (isDarkTheme) PnpNavyDark else Color.White
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                            .testTag("signin_button")
                    ) {
                        Text(
                            text = "Sign In & Establish Duty",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp
                            )
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Handling the UI feedback state depending on login state
            AnimatedVisibility(
                visible = loginState !is LoginUiState.Idle,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
                        .padding(2.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        when (val state = loginState) {
                            is LoginUiState.Loading -> {
                                CircularProgressIndicator(
                                    color = if (isDarkTheme) PnpGoldAccent else PnpNavyPrimary,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Establishing Supabase session & syncing...",
                                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface)
                                )
                            }
                            is LoginUiState.PendingApproval -> {
                                Icon(Icons.Default.Lock, contentDescription = "Locked", tint = if (isDarkTheme) PnpGoldAccent else PnpNavyPrimary, modifier = Modifier.size(32.dp))
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "MEMBERSHIP RESTRICTED",
                                    fontWeight = FontWeight.Bold,
                                    color = if (isDarkTheme) PnpGoldAccent else PnpNavyPrimary,
                                    fontSize = 14.sp
                                )
                                Text(
                                    text = "Badge [${state.personnel.badgeNumber}] found for Officer \"${state.personnel.fullname}\". However, status is marked as PENDING APPROVAL. Please trigger unit supervisor approval in Supabase panel to enable shifts.",
                                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f), textAlign = TextAlign.Center),
                                    modifier = Modifier.padding(top = 4.dp),
                                    fontSize = 12.sp
                                )
                            }
                            is LoginUiState.NotFound -> {
                                Icon(Icons.Default.Warning, contentDescription = "Not Found", tint = PnpStatusError, modifier = Modifier.size(32.dp))
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "CREDENTIALS NOT MATCHED",
                                    fontWeight = FontWeight.Bold,
                                    color = PnpStatusError,
                                    fontSize = 14.sp
                                )
                                Text(
                                    text = "Entered credentials are not matched in database. For fast demo testing, try signing in with dynamic email/pass.",
                                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f), textAlign = TextAlign.Center),
                                    modifier = Modifier.padding(top = 4.dp),
                                    fontSize = 12.sp
                                )
                            }
                            is LoginUiState.Error -> {
                                Icon(Icons.Default.Warning, contentDescription = "Error", tint = PnpStatusError, modifier = Modifier.size(32.dp))
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "CONNECTION ERROR",
                                    fontWeight = FontWeight.Bold,
                                    color = PnpStatusError,
                                    fontSize = 14.sp
                                )
                                Text(
                                    text = state.message,
                                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f), textAlign = TextAlign.Center),
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                            }
                            else -> {}
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PnpBadgeVector(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val width = size.width
        val height = size.height
        val cx = width / 2f
        val cy = height / 2f

        // Draw Gold Shield Star shape
        val path = androidx.compose.ui.graphics.Path().apply {
            moveTo(cx, cy - (height * 0.45f))
            lineTo(cx + (width * 0.35f), cy - (height * 0.2f))
            lineTo(cx + (width * 0.38f), cy + (height * 0.15f))
            cubicTo(
                cx + (width * 0.3f), cy + (height * 0.38f),
                cx, cy + (height * 0.48f),
                cx, cy + (height * 0.48f)
            )
            cubicTo(
                cx, cy + (height * 0.48f),
                cx - (width * 0.3f), cy + (height * 0.38f),
                cx - (width * 0.38f), cy + (height * 0.15f)
            )
            lineTo(cx - (width * 0.35f), cy - (height * 0.2f))
            close()
        }

        // Fill badge shield
        drawPath(
            path = path,
            color = PnpNavyPrimary
        )

        // Draw golden outline
        drawPath(
            path = path,
            color = PnpGoldAccent,
            style = Stroke(width = 4.dp.toPx())
        )

        // Draw inner star
        val starPath = androidx.compose.ui.graphics.Path().apply {
            moveTo(cx, cy - (height * 0.22f))
            lineTo(cx + (width * 0.07f), cy - (height * 0.05f))
            lineTo(cx + (width * 0.23f), cy - (height * 0.05f))
            lineTo(cx + (width * 0.1f), cy + (height * 0.05f))
            lineTo(cx + (width * 0.15f), cy + (height * 0.22f))
            lineTo(cx, cy + (height * 0.12f))
            lineTo(cx - (width * 0.15f), cy + (height * 0.22f))
            lineTo(cx - (width * 0.1f), cy + (height * 0.05f))
            lineTo(cx - (width * 0.23f), cy - (height * 0.05f))
            lineTo(cx - (width * 0.07f), cy - (height * 0.05f))
            close()
        }

        drawPath(
            path = starPath,
            color = PnpGoldAccent
        )

        // Draw a neat central core
        drawCircle(
            color = PnpNavyDark,
            radius = width * 0.06f,
            center = Offset(cx, cy + 2.dp.toPx())
        )

        drawCircle(
            color = PnpStatusActive,
            radius = width * 0.02f,
            center = Offset(cx, cy + 2.dp.toPx())
        )
    }
}
