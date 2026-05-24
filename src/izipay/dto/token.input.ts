import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { RequestSource } from 'src/common/enums';

@InputType()
export class TokenInputDto {
  @IsNotEmpty({ message: 'requestSource is required' })
  @IsString({ message: 'requestSource must be a string' })
  @IsEnum(RequestSource, {
    message:
      'requestSource must be a valid request source: ECOMMERCE, REFUND, RECURRENCE',
  })
  @Field(() => String)
  requestSource: string;

  @IsNotEmpty({ message: 'transactionId is required' })
  @IsString({ message: 'transactionId must be a string' })
  @Field(() => String)
  transactionId: string;

  @IsNotEmpty({ message: 'orderNumber is required' })
  @IsString({ message: 'orderNumber must be a string' })
  @Field(() => String)
  orderNumber: string;

  @IsNotEmpty({ message: 'amount is required' })
  @IsString({ message: 'amount must be a string' })
  @Field(() => String)
  amount: string;
}
