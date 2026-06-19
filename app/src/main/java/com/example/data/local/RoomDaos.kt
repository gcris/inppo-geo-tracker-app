package com.example.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface PersonnelDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPersonnel(personnel: PersonnelEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(personnel: List<PersonnelEntity>)

    @Query("SELECT * FROM personnel WHERE id = :id")
    suspend fun getPersonnel(id: String): PersonnelEntity?

    @Query("SELECT * FROM personnel WHERE (badgeNumber = :badgeNumber OR rank_id = :badgeNumber) LIMIT 1")
    suspend fun getPersonnelByBadge(badgeNumber: String): PersonnelEntity?

    @Query("SELECT * FROM personnel WHERE email = :email LIMIT 1")
    suspend fun getPersonnelByEmail(email: String): PersonnelEntity?

    @Query("""
        SELECT * FROM personnel 
        WHERE (UPPER(badgeNumber) = UPPER(:badgeNumber)) 
          AND (LOWER(rank) = LOWER(:rankId) OR LOWER(rank_id) = LOWER(:rankId)) 
          AND (LOWER(unitId) = LOWER(:unitId) OR LOWER(unit_id) = LOWER(:unitId)) 
          AND LOWER(designation) = LOWER(:designation) 
        LIMIT 1
    """)
    suspend fun findCandidatePersonnel(badgeNumber: String, rankId: String, unitId: String, designation: String): PersonnelEntity?

    @Query("SELECT * FROM personnel")
    fun getAllPersonnelFlow(): Flow<List<PersonnelEntity>>
}

@Dao
interface RankDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRank(rank: RankEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(ranks: List<RankEntity>)

    @Query("SELECT * FROM rank ORDER BY rankName ASC")
    suspend fun getAllRanks(): List<RankEntity>
}

@Dao
interface UnitDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUnit(unit: UnitEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(units: List<UnitEntity>)

    @Query("SELECT * FROM unit WHERE id = :id")
    suspend fun getUnit(id: String): UnitEntity?

    @Query("SELECT * FROM unit")
    suspend fun getAllUnits(): List<UnitEntity>
}

@Dao
interface VehicleDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertVehicle(vehicle: VehicleEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(vehicles: List<VehicleEntity>)

    @Query("SELECT * FROM vehicles WHERE personnelId = :personnelId LIMIT 1")
    suspend fun getVehicleByPersonnel(personnelId: String): VehicleEntity?

    @Query("SELECT * FROM vehicles WHERE id = :id")
    suspend fun getVehicle(id: String): VehicleEntity?
}

@Dao
interface VehicleLogDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLog(log: VehicleLogEntity)

    @Query("SELECT * FROM vehicle_logs WHERE isSynced = 0 ORDER BY capturedAt ASC")
    suspend fun getUnsyncedLogs(): List<VehicleLogEntity>

    @Query("UPDATE vehicle_logs SET vehicleId = :vehicleId WHERE isSynced = 0")
    suspend fun updateUnsyncedVehicleId(vehicleId: String)

    @Query("UPDATE vehicle_logs SET isSynced = 1 WHERE id IN (:logIds)")
    suspend fun markAsSynced(logIds: List<String>)

    @Query("SELECT * FROM vehicle_logs ORDER BY capturedAt DESC LIMIT 100")
    fun getLogsFlow(): Flow<List<VehicleLogEntity>>

    @Query("SELECT COUNT(*) FROM vehicle_logs WHERE isSynced = 0")
    fun getUnsyncedLogsCountFlow(): Flow<Int>

    @Query("DELETE FROM vehicle_logs WHERE isSynced = 1")
    suspend fun deleteSyncedLogs()
}

@Dao
interface ScheduleDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSchedule(schedule: ScheduleEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(schedules: List<ScheduleEntity>)

    @Query("SELECT * FROM schedule WHERE personnelId = :personnelId LIMIT 1")
    suspend fun getScheduleByPersonnel(personnelId: String): ScheduleEntity?

    @Query("SELECT * FROM schedule")
    fun getSchedulesFlow(): Flow<List<ScheduleEntity>>
}
