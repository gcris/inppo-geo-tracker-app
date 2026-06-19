package com.example.ui

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    viewModel: MainViewModel,
    onBackToLogin: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isDarkTheme by viewModel.isDarkTheme.collectAsState()
    val ranks by viewModel.ranksState.collectAsState()
    val units by viewModel.unitsState.collectAsState()
    val registerState by viewModel.registerState.collectAsState()

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var badgeNumber by remember { mutableStateOf("") }
    var rankId by remember { mutableStateOf("") }
    var fullname by remember { mutableStateOf("") }
    var unitId by remember { mutableStateOf("") }
    var designation by remember { mutableStateOf("") }
    var phoneNumber by remember { mutableStateOf("") }
    var viberNumber by remember { mutableStateOf("") }

    var passwordVisible by remember { mutableStateOf(false) }
    var rankMenuExpanded by remember { mutableStateOf(false) }
    var unitMenuExpanded by remember { mutableStateOf(false) }

    var errorMessage by remember { mutableStateOf<String?>(null) }

    val keyboardController = LocalSoftwareKeyboardController.current

    // Set default select values when database loads
    LaunchedEffect(ranks) {
        if (ranks.isNotEmpty() && rankId.isEmpty()) {
            rankId = ranks.first().id
        }
    }
    LaunchedEffect(units) {
        if (units.isNotEmpty() && unitId.isEmpty()) {
            unitId = units.first().id
        }
    }

    val backgroundColors = if (isDarkTheme) {
        listOf(PnpNavyDark, Color(0xFF070B14))
    } else {
        listOf(MaterialTheme.colorScheme.background, Color(0xFFCBD5E1))
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("PNP PERSONNEL REGISTER", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)) },
                navigationIcon = {
                    IconButton(onClick = onBackToLogin) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = if (isDarkTheme) Color(0xFF0F172A) else Color.White,
                    titleContentColor = if (isDarkTheme) PnpGoldAccent else PnpNavyPrimary,
                    navigationIconContentColor = if (isDarkTheme) PnpGoldAccent else PnpNavyPrimary
                )
            )
        },
        containerColor = Color.Transparent
    ) { innerPadding ->
        Box(
            modifier = modifier
                .fillMaxSize()
                .background(Brush.verticalGradient(colors = backgroundColors))
                .padding(innerPadding)
        ) {
            if (registerState is RegisterUiState.Success) {
                // Success Dashboard Confirmation View
                val successMsg = (registerState as RegisterUiState.Success).message
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f)
                        ),
                        shape = RoundedCornerShape(20.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .widthIn(max = 480.dp)
                            .border(1.5.dp, Color(0xFF10B981), RoundedCornerShape(20.dp)),
                        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("📋", fontSize = 50.sp)
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "PROFILE REGISTRATION SUBMITTED",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF10B981)
                                ),
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            HorizontalDivider(color = Color(0xFF10B981), thickness = 2.dp, modifier = Modifier.width(40.dp))
                            Spacer(modifier = Modifier.height(16.dp))

                            Text(
                                text = successMsg,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface,
                                textAlign = TextAlign.Center,
                                lineHeight = 20.sp
                            )

                            Spacer(modifier = Modifier.height(20.dp))

                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = if (isDarkTheme) Color(0xFF1E293B) else Color(0xFFF1F5F9),
                                border = androidx.compose.foundation.BorderStroke(0.5.dp, if (isDarkTheme) Color(0xFF334155) else Color(0xFFE2E8F0)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(
                                        "VERIFICATION SPECIFICATIONS:",
                                        style = MaterialTheme.typography.labelSmall.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = if (isDarkTheme) Color(0xFF94A3B8) else Color(0xFF475569)
                                        )
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                        Text("Badge Number:", fontSize = 11.sp, color = Color.Gray)
                                        Text(badgeNumber, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                        Text("Officer Rank:", fontSize = 11.sp, color = Color.Gray)
                                        val rName = ranks.find { it.id == rankId }?.rankName ?: "Default"
                                        Text(rName, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                        Text("District Unit:", fontSize = 11.sp, color = Color.Gray)
                                        val uName = units.find { it.id == unitId }?.unitName ?: "Default"
                                        Text(uName, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                        Text("Officer Email:", fontSize = 11.sp, color = Color.Gray)
                                        Text(email, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                                    }
                                    Spacer(modifier = Modifier.height(8.dp))
                                    HorizontalDivider()
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                        Text("Status State:", fontSize = 11.sp, color = Color.Gray)
                                        Text("PENDING REVIEW", fontSize = 11.sp, color = Color(0xFFF59E0B), fontWeight = FontWeight.Bold)
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(24.dp))

                            Button(
                                onClick = {
                                    viewModel.resetRegisterState()
                                    onBackToLogin()
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = if (isDarkTheme) Color(0xFF1E3A8A) else PnpNavyPrimary)
                            ) {
                                Text("RETURN TO OFFICER LOG IN", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            } else {
                // Form input
                val scrollState = rememberScrollState()
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(scrollState)
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "👮",
                        fontSize = 32.sp,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                    Text(
                        "PNP PERSONNEL REGISTER",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = if (isDarkTheme) PnpGoldAccent else PnpNavyPrimary,
                            letterSpacing = 0.5.sp
                        ),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                    Text(
                        "Register your official tactical credentials to the district tracking database.",
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                            textAlign = TextAlign.Center
                        ),
                        modifier = Modifier.padding(top = 4.dp, bottom = 16.dp),
                        lineHeight = 16.sp
                    )

                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f)
                        ),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .widthIn(max = 480.dp)
                            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp))
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.Start
                        ) {
                            var showErr = errorMessage
                            if (registerState is RegisterUiState.Error) {
                                showErr = (registerState as RegisterUiState.Error).message
                            }

                            if (showErr != null) {
                                Card(
                                    colors = CardDefaults.cardColors(
                                        containerColor = PnpStatusError.copy(alpha = 0.15f)
                                    ),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, PnpStatusError),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 16.dp)
                                ) {
                                    Text(
                                        text = showErr,
                                        color = PnpStatusError,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        textAlign = TextAlign.Center,
                                        modifier = Modifier.padding(12.dp)
                                    )
                                }
                            }

                            // --- SECTION 1: ACCESS DETAILS ---
                            Text(
                                "Step 1: Account Access details",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = Color(0xFF3B82F6),
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp
                                ),
                                modifier = Modifier.padding(bottom = 12.dp)
                            )

                            OutlinedTextField(
                                value = email,
                                onValueChange = { email = it },
                                label = { Text("OFFICIAL EMAIL ADDRESS") },
                                placeholder = { Text("e.g. name@pnp.gov.ph") },
                                singleLine = true,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 14.dp)
                            )

                            OutlinedTextField(
                                value = password,
                                onValueChange = { password = it },
                                label = { Text("SET COMBAT SECTOR PASSWORD") },
                                placeholder = { Text("At least 6 characters") },
                                singleLine = true,
                                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                trailingIcon = {
                                    Text(
                                        text = if (passwordVisible) "HIDE" else "SHOW",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier
                                            .padding(end = 8.dp)
                                            .clickable { passwordVisible = !passwordVisible }
                                    )
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 20.dp)
                            )

                            // --- SECTION 2: IDENTITY ---
                            HorizontalDivider(modifier = Modifier.padding(bottom = 12.dp))
                            Text(
                                "Step 2: PNP Identity verification",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = Color(0xFF3B82F6),
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp
                                ),
                                modifier = Modifier.padding(bottom = 12.dp)
                            )

                            OutlinedTextField(
                                value = badgeNumber,
                                onValueChange = { badgeNumber = it },
                                label = { Text("OFFICIAL BADGE NUMBER") },
                                placeholder = { Text("e.g. PNP-4820-2026") },
                                singleLine = true,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 14.dp)
                            )

                            // Rank selection Trigger
                            Box(modifier = Modifier.fillMaxWidth().padding(bottom = 14.dp)) {
                                val activeRankName = ranks.find { it.id == rankId }?.rankName ?: "Select Rank"
                                OutlinedTextField(
                                    value = activeRankName,
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text("PERSONNEL RANK") },
                                    trailingIcon = {
                                        Icon(
                                            Icons.Filled.ArrowDropDown,
                                            contentDescription = "Dropdown",
                                            modifier = Modifier.clickable { rankMenuExpanded = !rankMenuExpanded }
                                        )
                                    },
                                    modifier = Modifier.fillMaxWidth().clickable { rankMenuExpanded = !rankMenuExpanded }
                                )
                                DropdownMenu(
                                    expanded = rankMenuExpanded,
                                    onDismissRequest = { rankMenuExpanded = false },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    ranks.forEach { r ->
                                        DropdownMenuItem(
                                            text = { Text(r.rankName) },
                                            onClick = {
                                                rankId = r.id
                                                rankMenuExpanded = false
                                            }
                                        )
                                    }
                                }
                            }

                            OutlinedTextField(
                                value = fullname,
                                onValueChange = { fullname = it },
                                label = { Text("FULL REGISTERED NAME") },
                                placeholder = { Text("First Middle Last") },
                                singleLine = true,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 14.dp)
                            )

                            // Unit selection Trigger
                            Box(modifier = Modifier.fillMaxWidth().padding(bottom = 14.dp)) {
                                val activeUnitName = units.find { it.id == unitId }?.unitName ?: "Select Unit"
                                OutlinedTextField(
                                    value = activeUnitName,
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text("ASSIGNED UNIT DISTRICT") },
                                    trailingIcon = {
                                        Icon(
                                            Icons.Filled.ArrowDropDown,
                                            contentDescription = "Dropdown",
                                            modifier = Modifier.clickable { unitMenuExpanded = !unitMenuExpanded }
                                        )
                                    },
                                    modifier = Modifier.fillMaxWidth().clickable { unitMenuExpanded = !unitMenuExpanded }
                                )
                                DropdownMenu(
                                    expanded = unitMenuExpanded,
                                    onDismissRequest = { unitMenuExpanded = false },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    units.forEach { u ->
                                        DropdownMenuItem(
                                            text = { Text(u.unitName) },
                                            onClick = {
                                                unitId = u.id
                                                unitMenuExpanded = false
                                            }
                                        )
                                    }
                                }
                            }

                            OutlinedTextField(
                                value = designation,
                                onValueChange = { designation = it },
                                label = { Text("TACTICAL DESIGNATION OR POSITION") },
                                placeholder = { Text("e.g. Patrol Officer") },
                                singleLine = true,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 14.dp)
                            )

                            // --- SECTION 3: COMMUNICATIONS ---
                            HorizontalDivider(modifier = Modifier.padding(bottom = 12.dp))
                            Text(
                                "Step 3: Secure communications",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = Color(0xFF3B82F6),
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp
                                ),
                                modifier = Modifier.padding(bottom = 12.dp)
                            )

                            OutlinedTextField(
                                value = phoneNumber,
                                onValueChange = { phoneNumber = it },
                                label = { Text("MOBILE PHONE NUMBER") },
                                placeholder = { Text("e.g. +639123456789") },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 14.dp)
                            )

                            OutlinedTextField(
                                value = viberNumber,
                                onValueChange = { viberNumber = it },
                                label = { Text("VIBER ACCOUNT PHONE NUMBER") },
                                placeholder = { Text("Viber contact matching phone") },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 24.dp)
                            )

                            // Submit register click
                            Button(
                                onClick = {
                                    errorMessage = null
                                    keyboardController?.hide()
                                    when {
                                        email.trim().isEmpty() || !email.trim().contains("@") -> {
                                            errorMessage = "Please enter a valid official email address."
                                        }
                                        password.trim().length < 6 -> {
                                            errorMessage = "Please set a secure password of at least 6 characters."
                                        }
                                        badgeNumber.trim().isEmpty() -> {
                                            errorMessage = "Please enter your official badge identifier."
                                        }
                                        fullname.trim().isEmpty() -> {
                                            errorMessage = "Please provide your complete full name matching your PNP ID."
                                        }
                                        designation.trim().isEmpty() -> {
                                            errorMessage = "Please specify your role/designation (e.g. Patrol Officer)."
                                        }
                                        phoneNumber.trim().isEmpty() -> {
                                            errorMessage = "Please enter your mobile phone number."
                                        }
                                        viberNumber.trim().isEmpty() -> {
                                            errorMessage = "Please enter your Viber contact number."
                                        }
                                        else -> {
                                            viewModel.registerUser(
                                                email = email,
                                                badgeNumber = badgeNumber,
                                                rankId = rankId,
                                                fullname = fullname,
                                                unitId = unitId,
                                                designation = designation,
                                                phoneNumber = phoneNumber,
                                                viberNumber = viberNumber,
                                                passwordInput = password
                                            )
                                        }
                                    }
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF10B981),
                                    contentColor = Color.White
                                )
                            ) {
                                if (registerState is RegisterUiState.Loading) {
                                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                                } else {
                                    Text("Register & Request Profile Approval", fontWeight = FontWeight.Bold)
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedButton(
                                onClick = onBackToLogin,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("CANCEL & RETURN TO LOG IN", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}
