import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class CreateVoterDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  election_id: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  user_id: string;
}