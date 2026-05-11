import { ObjectType, Field } from '@nestjs/graphql';
import { Meta } from 'src/common/entities/meta.entity';
import { NotificationTemplateEntity } from './notification-template.entity';

@ObjectType()
export class NotificationTemplatesEntity {
  @Field(() => [NotificationTemplateEntity])
  templates!: NotificationTemplateEntity[];

  @Field(() => Meta)
  meta!: Meta;
}
