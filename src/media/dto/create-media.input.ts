import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional } from 'class-validator';

@InputType()
export class CreateMediaInput {
  @Field(() => String, { description: 'Title of the file' })
  @IsString()
  title!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  alt?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  caption?: string;
}
