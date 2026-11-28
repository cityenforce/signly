export interface User {
  _id: string;
  id?: string;
  username: string;
  email: string;
  name: string;
  officerNo?: string;
  role: 'admin' | 'leader' | 'officer';
  isActive: boolean;
  avatar?: string;
  avatarKey?: string;
  reportsCount?: number;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface Condition {
  rule: string;
  custom?: string;
  speed?: string;
  arrow: string;
  day: string;
  days?: string[];
  dayText?: string;
  time: string;
  timeText?: string;
  start?: string;
  end?: string;
}

export interface Sign {
  type: string;
  conds: Condition[];
}

export interface Report {
  _id?: string;
  ref: string;
  code: string;
  signCode?: string;
  created?: string;
  submitted: string;
  updated?: string | null;
  client: string;
  suburb: string;
  street: string;
  from?: string;
  to?: string;
  side?: string;
  address?: string;
  gps?: string;
  gpsCoords?: {
    lat: number;
    lng: number;
  };
  notes?: string;
  signs: Sign[];
  photoCount: number;
  photos?: string[];
  officer?: {
    userId?: string;
    name: string;
    no?: string;
  };
  areaCode?: string | null;
  isDemo?: boolean;
}

export interface Area {
  _id?: string;
  code: string;
  name: string;
  suburbs: string[];
  poly?: [number, number][] | null;
  reportsCount?: number;
  doneStreets?: number;
  totalStreets?: number;
  percentage?: number;
}

export interface Client {
  _id?: string;
  name: string;
  suburbs: string[];
  contactEmail?: string;
  reportsCount?: number;
}

export interface DashboardStats {
  totalReports: number;
  suburbsCovered: number;
  areasDefined: number;
  activeOfficers: number;
}

export interface BreakdownItem {
  name: string;
  count: number;
}

