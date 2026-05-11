import { ArgsType, Field, InputType, Int } from '@nestjs/graphql';
import { IsArray, IsEnum, ValidateNested } from 'class-validator';
import { Status } from 'generated/prisma/enums';

@InputType()
export class StatusInput {
  @Field(() => Int, {
    description: 'Id of the activity',
  })
  id!: number;

  @Field(() => String, {
    description: 'New status of the activity',
  })
  @IsEnum(Status)
  status!: Status;
}

@ArgsType()
export class StatusListArgs {
  @Field(() => [StatusInput])
  @IsArray()
  @ValidateNested({ each: true })
  statusList!: StatusInput[];
}
