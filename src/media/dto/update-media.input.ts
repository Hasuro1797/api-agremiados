import { Field, InputType, Int } from '@nestjs/graphql';
import { IsOptional, IsPositive, IsString } from 'class-validator';

@InputType()
export class UpdateMediaInput {
  @Field(() => Int, { description: 'ID of the Media' })
  @IsPositive()
  id!: number;

  @Field(() => String, { nullable: true, description: 'Title of the Media' })
  @IsOptional()
  @IsString()
  title?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Alternative Text of the Media',
  })
  @IsOptional()
  @IsString()
  alt?: string;

  @Field(() => String, { nullable: true, description: 'Caption of the Media' })
  @IsOptional()
  @IsString()
  caption?: string;
}
