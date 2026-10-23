export type ClinicaInfo = {
  nome: string;
  morada: string;
  telefone: string;
  email: string;
  nif?: string;
};

const CLINICA_INFO_KEY = 'vetclinic-info';

export const DEFAULT_CLINICA_INFO: ClinicaInfo = {
  nome: 'VetClinic Pro',
  morada: '',
  telefone: '',
  email: '',
  nif: '',
};

export function getClinicaInfo(): ClinicaInfo {
  if (typeof window === 'undefined') return DEFAULT_CLINICA_INFO;

  try {
    const raw = window.localStorage.getItem(CLINICA_INFO_KEY);
    if (!raw) return DEFAULT_CLINICA_INFO;

    return {
      ...DEFAULT_CLINICA_INFO,
      ...(JSON.parse(raw) as Partial<ClinicaInfo>),
    };
  } catch {
    return DEFAULT_CLINICA_INFO;
  }
}

export function setClinicaInfo(data: ClinicaInfo): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    CLINICA_INFO_KEY,
    JSON.stringify({
      nome: data.nome.trim(),
      morada: data.morada.trim(),
      telefone: data.telefone.trim(),
      email: data.email.trim(),
      nif: data.nif?.trim() || '',
    }),
  );
}
