import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class CreateVotesDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  election_id: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  candidate_id: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  user_id: string;
}