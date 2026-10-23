import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateStockMovimentoDto {
  @ApiProperty({ example: 2.5, description: "Quantidade a movimentar (aceita decimais)." })
  @IsNumber()
  @Min(0.001)
  quantidade: number;

  @ApiPropertyOptional({ example: "Reposicao de stock" })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  motivo?: string;
}
