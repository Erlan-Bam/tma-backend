import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class LinkZephyrAccountDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class SetChildUserIdDto {
  @IsString()
  @IsNotEmpty()
  childUserId!: string;
}
