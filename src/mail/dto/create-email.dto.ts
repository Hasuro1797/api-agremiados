import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateEmailDto {
  @IsArray({
    message: 'Invalid email to field',
  })
  @IsNotEmpty({
    message: 'Invalid email to field',
  })
  to: [string];

  @IsOptional()
  @IsString({
    message: 'Invalid email from field',
  })
  from?: string;

  @IsString({
    message: 'Invalid email subject field',
  })
  @IsNotEmpty({
    message: 'Invalid email subject field',
  })
  subject: string;

  @IsString({
    message: 'Invalid email template field',
  })
  @IsNotEmpty({
    message: 'Invalid email template field',
  })
  template: string;

  @IsObject({
    message: 'Invalid email context field',
  })
  context: Record<string, any>;
}
