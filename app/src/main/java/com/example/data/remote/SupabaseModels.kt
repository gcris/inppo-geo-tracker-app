package com.example.data.remote

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class PersonnelDto(
    @Json(name = "id") val id: String,
    @Json(name = "badge_number") val badgeNumber: String,
    @Json(name = "rank") val rank: String,
    @Json(name = "fullname") val fullName: String,
    @Json(name = "unit_id") val unitId: String,
    @Json(name = "is_approved") val isApproved: Boolean,
    @Json(name = "role") val role: String
)

@JsonClass(generateAdapter = true)
data class UnitDto(
    @Json(name = "id") val id: String,
    @Json(name = "unit_name") val unitName: String
)

@JsonClass(generateAdapter = true)
data class VehicleDto(
    @Json(name = "id") val id: String,
    @Json(name = "plate_number") val plateNumber: String,
    @Json(name = "created_at") val createdAt: String,
    @Json(name = "personnel_id") val personnelId: String,
    @Json(name = "unit_id") val unitId: String,
    @Json(name = "load_status") val loadStatus: String,
    @Json(name = "last_load_update") val lastLoadUpdate: String
)

@JsonClass(generateAdapter = true)
data class VehicleLogDto(
    @Json(name = "id") val id: String,
    @Json(name = "vehicle_id") val vehicleId: String,
    @Json(name = "latitude") val latitude: Double,
    @Json(name = "longitude") val longitude: Double,
    @Json(name = "speed") val speed: Double,
    @Json(name = "network_signal") val networkSignal: Int,
    @Json(name = "captured_at") val capturedAt: String
)

@JsonClass(generateAdapter = true)
data class ScheduleDto(
    @Json(name = "id") val id: String,
    @Json(name = "date") val date: String,
    @Json(name = "time_from") val timeFrom: String,
    @Json(name = "time_to") val timeTo: String,
    @Json(name = "sector") val sector: String,
    @Json(name = "unit_id") val unitId: String,
    @Json(name = "personnel_id") val personnelId: String
)

@JsonClass(generateAdapter = true)
data class LogInRequest(
    @Json(name = "email") val email: String,
    @Json(name = "password") val password: String
)

@JsonClass(generateAdapter = true)
data class LogInResponse(
    @Json(name = "access_token") val accessToken: String,
    @Json(name = "user") val user: AuthUserDto
)

@JsonClass(generateAdapter = true)
data class AuthUserDto(
    @Json(name = "id") val id: String,
    @Json(name = "email") val email: String?
)

