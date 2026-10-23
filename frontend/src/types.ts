export type UserRole = 'ADMIN' | 'VETERINARIO' | 'TECNICO' | 'RECECIONISTA' | 'TUTOR';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
}

export interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  gender: 'M' | 'F';
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerAddress?: string;
  birthDate?: string;
  weight?: number | null;
  alergias?: string | null;
  alertasClinicos?: string | null;
}

export interface Appointment {
  id: string;
  petId: string;
  petName: string;
  date: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  type: string;
  professionalId?: string;
  professionalName?: string;
  professionalRole?: string;
}

export interface LabExam {
  id: string;
  petId: string;
  petName: string;
  type: string;
  status: 'PENDING' | 'REQUESTED' | 'SAMPLE_COLLECTED' | 'SAMPLE_REJECTED' | 'AWAITING_NEW_SAMPLE' | 'IN_ANALYSIS' | 'COMPLETED' | 'VALIDATED' | 'CANCELLED';
  requestDate: string;
  vetName: string;
  results?: any;
  createdAt?: any;
  priority?: string;
  ownerName?: string;
  clinicalContext?: string;
  raw?: any;
}

export interface Consultation {
  id: string;
  petId: string;
  date: string;
  observations: string;
  diagnosis: string;
  vetId: string;
}
