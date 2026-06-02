package com.example.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "personnel")
data class PersonnelEntity(
    @PrimaryKey val id: String,
    val badgeNumber: String,
    val rank: String,
    val fullname: String,
    val unitId: String,
    val isApproved: Boolean,
    val role: String
)

@Entity(tableName = "unit")
data class UnitEntity(
    @PrimaryKey val id: String,
    val unitName: String
)

@Entity(tableName = "vehicles")
data class VehicleEntity(
    @PrimaryKey val id: String,
    val plateNumber: String,
    val createdAt: String,
    val personnelId: String,
    val unitId: String,
    val loadStatus: String,
    val lastLoadUpdate: String
)

@Entity(tableName = "vehicle_logs")
data class VehicleLogEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val vehicleId: String,
    val latitude: Double,
    val longitude: Double,
    val speed: Double,
    val networkSignal: Int, // 0 to 4 Signal strength
    val capturedAt: String, // ISO timestamp
    val isSynced: Boolean = false
)

@Entity(tableName = "schedule")
data class ScheduleEntity(
    @PrimaryKey val id: String,
    val date: String,
    val timeFrom: String,
    val timeTo: String,
    val sector: String,
    val unitId: String,
    val personnelId: String
)
