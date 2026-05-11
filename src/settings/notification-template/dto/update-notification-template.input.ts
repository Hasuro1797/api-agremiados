import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsInt, IsNotEmpty } from 'class-validator';
import { CreateNotificationTemplateInput } from './create-notification-template.input';

@InputType()
export class UpdateNotificationTemplateInput extends PartialType(
  CreateNotificationTemplateInput,
) {
  @Field(() => Int)
  @IsNotEmpty()
  @IsInt()
  id!: number;
}
