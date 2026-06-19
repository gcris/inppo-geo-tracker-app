export interface Personnel {
  id: string;
  badgeNumber: string;
  rank: string;
  fullname: string;
  unitId: string;
  isApproved: boolean;
  role: string;
  email?: string;
}

export interface Unit {
  id: string;
  unitName: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  createdAt: string;
  personnelId: string;
  unitId: string;
  loadStatus: string;
  lastLoadUpdate: string;
}

export interface VehicleLog {
  id: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;
  networkSignal: number;
  capturedAt: string;
  isSynced?: boolean;
}

export interface Schedule {
  id: string;
  date: string;
  timeFrom: string;
  timeTo: string;
  sector: string;
  unitId: string;
  personnelId: string;
}
