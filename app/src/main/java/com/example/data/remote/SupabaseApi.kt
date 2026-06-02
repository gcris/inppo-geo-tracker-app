package com.example.data.remote

import com.example.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

interface SupabaseApi {
    @POST("auth/v1/token")
    suspend fun loginWithEmailAndPassword(
        @Query("grant_type") grantType: String = "password",
        @Body request: LogInRequest,
        @Header("apikey") apiKey: String
    ): Response<LogInResponse>

    @GET("rest/v1/personnel")
    suspend fun getPersonnelById(
        @Query("id") idQuery: String,
        @Header("apikey") apiKey: String,
        @Header("Authorization") authHeader: String
    ): List<PersonnelDto>

    @POST("rest/v1/personnel")
    suspend fun upsertPersonnel(
        @Body personnel: List<PersonnelDto>,
        @Header("apikey") apiKey: String,
        @Header("Authorization") authHeader: String,
        @Header("Prefer") prefer: String = "resolution=merge-duplicates"
    ): Response<Unit>

    @GET("rest/v1/personnel")
    suspend fun getPersonnelByBadge(
        @Query("badge_number") badgeQuery: String,
        @Header("apikey") apiKey: String,
        @Header("Authorization") authHeader: String
    ): List<PersonnelDto>

    @GET("rest/v1/vehicles")
    suspend fun getVehiclesByPersonnel(
        @Query("personnel_id") personnelQuery: String,
        @Header("apikey") apiKey: String,
        @Header("Authorization") authHeader: String
    ): List<VehicleDto>

    @GET("rest/v1/schedule")
    suspend fun getScheduleByPersonnel(
        @Query("personnel_id") personnelQuery: String,
        @Header("apikey") apiKey: String,
        @Header("Authorization") authHeader: String
    ): List<ScheduleDto>

    @POST("rest/v1/vehicle_logs")
    suspend fun uploadLogs(
        @Body logs: List<VehicleLogDto>,
        @Header("apikey") apiKey: String,
        @Header("Authorization") authHeader: String,
        @Header("Prefer") prefer: String = "resolution=merge-duplicates"
    ): Response<Unit>
}

object SupabaseClient {
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val httpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .build()

    val api: SupabaseApi? by lazy {
        val url = BuildConfig.SUPABASE_URL
        if (url.isEmpty() || url.contains("placeholder-project")) {
            null // Fallback/Mock mode enabled
        } else {
            try {
                Retrofit.Builder()
                    .baseUrl(if (url.endsWith("/")) url else "$url/")
                    .client(httpClient)
                    .addConverterFactory(MoshiConverterFactory.create())
                    .build()
                    .create(SupabaseApi::class.java)
            } catch (e: Exception) {
                e.printStackTrace()
                null
            }
        }
    }

    fun isSupabaseConfigured(): Boolean {
        val url = BuildConfig.SUPABASE_URL
        val key = BuildConfig.SUPABASE_ANON_KEY
        return url.isNotEmpty() && !url.contains("placeholder-project") &&
                key.isNotEmpty() && !key.contains("placeholder-anon")
    }
}
