export interface AuthUser {
  id: string;
  username: string;
  fullName?: string;
  phone?: string;
  emergencyContact?: string;
  role: 'user' | 'admin';
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface MapZone {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  reportCount: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface EmergencyData {
  latitude: number;
  longitude: number;
}
