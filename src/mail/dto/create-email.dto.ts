import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export interface MailAttachment {
  filename: string;
  content: Buffer | string; // Buffer o string base64
  encoding?: 'base64';
  contentType?: string;
}

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

  @IsOptional()
  attachments?: MailAttachment[];
}
