import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { UpdateStockItemDto } from './update-stock-item.dto';

export class UpdateStockItemBodyDto extends UpdateStockItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  id: number;
}
