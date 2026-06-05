import { Field, Int, ObjectType } from '@nestjs/graphql';

/** Resumen del envío de un comunicado manual. */
@ObjectType()
export class AnnouncementResultEntity {
  @Field(() => Int, { description: 'Total de destinatarios resueltos' })
  recipients!: number;

  @Field(() => Int, { description: 'Notificaciones in-app creadas' })
  inApp!: number;

  @Field(() => Int, {
    description: 'Correos encolados para envío en segundo plano',
  })
  emailQueued!: number;
}
