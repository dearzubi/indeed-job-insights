export interface JobLocation {
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  fullAddress: string | null;
  countryCode: string | null;
}

export interface EmployerResponsive {
  headline: string;
  description: string;
  averageResponseInDays: number | null;
  responseRate: number | null;
}

export interface JobDescriptionData {
  fullText: string;
  postedAge: string | null;
  postedToday: boolean;
  location: JobLocation | null;
  organicApplyStarts: number | null;
  mustHaveSkills: string[];
  employerResponsive: EmployerResponsive | null;
}

export interface HiringInsights {
  age: string | null;
  postedToday: boolean;
  employerResponsive: EmployerResponsive | null;
}

interface JobDescriptionSuccess {
  ok: true;
  data: JobDescriptionData;
}
interface JobDescriptionError {
  ok: false;
  error: Error;
}

export type JobDescriptionResponse = JobDescriptionSuccess | JobDescriptionError;
