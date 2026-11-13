import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddAllowedIpBody {
  @IsString()
  @IsNotEmpty()
  @MaxLength(45)
  ip!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  label!: string;
}
