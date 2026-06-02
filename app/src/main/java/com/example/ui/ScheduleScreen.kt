package com.example.ui

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*

@Composable
fun ScheduleDetailsCard(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    val currentSchedule by viewModel.currentSchedule.collectAsState()
    val currentPersonnel by viewModel.currentPersonnel.collectAsState()

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // ASSIGNED DUTY SECTOR
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(imageVector = Icons.Default.DateRange, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Text(
                        text = "ASSIGNED SHIFT DETAILS",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                        letterSpacing = 1.sp
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                ScheduleFieldRow(label = "Scheduled Date", value = currentSchedule?.date ?: "2026-06-02 (Today)")
                ScheduleFieldRow(label = "Duty Hours", value = "${currentSchedule?.timeFrom ?: "08:00"} - ${currentSchedule?.timeTo ?: "17:00"}")
                ScheduleFieldRow(label = "Operational Sector", value = currentSchedule?.sector ?: "Sector 4 (Intramuros District)")
                ScheduleFieldRow(label = "Assigned Personnel Code", value = currentPersonnel?.id?.take(18) ?: "N/A")
            }
        }

        // SECTOR ADVISORIES
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier
                .fillMaxWidth()
                .border(width = 1.dp, color = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f), shape = RoundedCornerShape(12.dp))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(imageVector = Icons.Default.Info, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Text(
                        text = "FORCE MANILA MOBILE STANDING INSTRUCTIONS",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                        letterSpacing = 0.5.sp
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "• Foot patrol personnel are mandated to walk a minimum of 10,000 pacing cycles or 6 kilometers per 8-hour shift within their designated Intramuros boundaries.\n\n" +
                            "• Any geofence deviation beyond 50 meters of the sector outline will raise automated alarms on Supabase Row Level Security logs and push real-time telemetry markers back to Command HQs.\n\n" +
                            "• Signal coverage inside the Fort Santiago vaults and San Agustin cellars is flaky. The SQLite local buffer will hold location queues automatically until cellular coverage resumes.",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f),
                    lineHeight = 16.sp
                )
            }
        }
    }
}

@Composable
fun ScheduleFieldRow(label: String, value: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Text(text = label, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f))
        Text(
            text = value,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(top = 1.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        HorizontalDivider(color = MaterialTheme.colorScheme.outline, thickness = 0.5.dp)
    }
}
