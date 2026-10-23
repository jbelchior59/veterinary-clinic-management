export declare class TratamentoHistoricoDto {
    id: number;
    descricao: string;
    medicacao: string | null;
    createdAt: Date;
}
export declare class ConsultaHistoricoDto {
    id: number;
    data: Date;
    observacoes: string;
    diagnostico: string;
    tratamentos: TratamentoHistoricoDto[];
    createdAt: Date;
}
export declare class MarcacaoHistoricoDto {
    id: number;
    data: Date;
    motivo: string | null;
    estado: string;
    createdAt: Date;
}
export declare class HistoricoAnimalDto {
    animalId: number;
    nome: string;
    especie: string;
    dono?: { id: number; nome: string; email: string; telefone?: string | null };
    totalConsultas: number;
    totalTratamentos: number;
    marcacoes: MarcacaoHistoricoDto[];
    consultas: ConsultaHistoricoDto[];
}
