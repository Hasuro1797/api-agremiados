import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  validateSync,
} from 'class-validator';

export class EnvConfig {
  @IsEnum(['development', 'production', 'test'], {
    message: 'NODE_ENV debe ser development, production o test',
  })
  NODE_ENV!: string;

  @IsNumber({}, { message: 'PORT debe ser un número' })
  PORT!: number;

  // Database
  @IsString({ message: 'DATABASE_URL es requerido' })
  @IsNotEmpty({ message: 'DATABASE_URL no puede estar vacío' })
  DATABASE_URL!: string;

  @IsString({ message: 'JWT_SECRET es requerido' })
  @IsNotEmpty({ message: 'JWT_SECRET no puede estar vacío' })
  RT_JWT_SECRET!: string;

  @IsString({ message: 'JWT_SECRET es requerido' })
  @IsNotEmpty({ message: 'JWT_SECRET no puede estar vacío' })
  AT_JWT_SECRET!: string;

  @IsString({ message: 'MAIL_USER es requerido' })
  @IsNotEmpty({ message: 'MAIL_USER no puede estar vacío' })
  MAIL_USER!: string;

  @IsString({ message: 'MAIL_PASSWORD es requerido' })
  @IsNotEmpty({ message: 'MAIL_PASSWORD no puede estar vacío' })
  MAIL_PASSWORD!: string;

  @IsNumber({}, { message: 'CLOUDINARY_API_KEY debe ser un número' })
  CLOUDINARY_API_KEY!: number;

  @IsString({ message: 'CLOUDINARY_CLOUD_NAME es requerido' })
  @IsNotEmpty({ message: 'CLOUDINARY_CLOUD_NAME no puede estar vacío' })
  CLOUDINARY_CLOUD_NAME!: string;

  @IsString({ message: 'CLOUDINARY_API_SECRET es requerido' })
  @IsNotEmpty({ message: 'CLOUDINARY_API_SECRET no puede estar vacío' })
  CLOUDINARY_API_SECRET!: string;

  @IsString({ message: 'IZIPAY_MERCHANT_CODE es requerido' })
  @IsNotEmpty({ message: 'IZIPAY_MERCHANT_CODE no puede estar vacío' })
  IZIPAY_MERCHANT_CODE!: string;

  @IsString({ message: 'IZIPAY_PUBLIC_KEY es requerido' })
  @IsNotEmpty({ message: 'IZIPAY_PUBLIC_KEY no puede estar vacío' })
  IZIPAY_PUBLIC_KEY!: string;

  @IsString({ message: 'IZIPAY_KEY_HASH es requerido' })
  @IsNotEmpty({ message: 'IZIPAY_KEY_HASH no puede estar vacío' })
  IZIPAY_KEY_HASH!: string;

  @IsString({ message: 'FRONTEND_URL es requerido' })
  @IsNotEmpty({ message: 'FRONTEND_URL no puede estar vacío' })
  FRONTEND_URL!: string;

  @IsString({ message: 'ADMIN_URL es requerido' })
  @IsNotEmpty({ message: 'ADMIN_URL no puede estar vacío' })
  ADMIN_URL!: string;

  @IsString({ message: 'IZIPAY_URL es requerido' })
  @IsNotEmpty({ message: 'IZIPAY_URL no puede estar vacío' })
  IZIPAY_URL!: string;

  @IsString({ message: 'SUNAT_WSDL es requerido' })
  @IsNotEmpty({ message: 'SUNAT_WSDL no puede estar vacío' })
  SUNAT_WSDL!: string;
}

export function validate(config: Record<string, unknown>): EnvConfig {
  const validated = plainToInstance(EnvConfig, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((err) => Object.values(err.constraints ?? {}).join(', '))
      .join('\n');
    throw new Error(`❌ Variables de entorno inválidas:\n${messages}`);
  }

  return validated;
}
