package com.example

import android.app.Application
import com.example.data.repository.TrackingRepository

class PnpGeoTrackerApp : Application() {
    lateinit var trackingRepository: TrackingRepository
        private set

    override fun onCreate() {
        super.onCreate()
        trackingRepository = TrackingRepository(this)
    }
}
