import { ArgsType, Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { PaginationArgs } from 'src/common/dtos/pagination.args';

@InputType()
export class NotificationTemplateFiltersInput {
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ArgsType()
export class NotificationTemplateFilterArgs extends PaginationArgs {
  @Field(() => String, { nullable: true, defaultValue: 'createdAt-desc' })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => NotificationTemplateFiltersInput, { nullable: true })
  @IsOptional()
  filters?: NotificationTemplateFiltersInput;
}
