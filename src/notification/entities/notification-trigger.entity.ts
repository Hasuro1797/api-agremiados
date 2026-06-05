import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { NotificationChannel } from 'generated/prisma/enums';

registerEnumType(NotificationChannel, {
  name: 'NotificationChannel',
  description: 'Canal de notificación',
});

/**
 * Definición de un trigger del catálogo de notificaciones. El front la usa para
 * pintar la pantalla de preferencias (agrupando por `category`, mostrando los
 * `isCritical` como bloqueados en ON) y para documentar las variables.
 */
@ObjectType()
export class NotificationTriggerEntity {
  @Field(() => String, { description: 'triggerKey / code del template' })
  key!: string;

  @Field(() => String)
  label!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String, { description: 'Agrupación para la UI' })
  category!: string;

  @Field(() => String, { description: 'MEMBER o ADMIN' })
  audience!: string;

  @Field(() => Boolean, {
    description: 'Si true, no se puede silenciar (ignora preferencias)',
  })
  isCritical!: boolean;

  @Field(() => [NotificationChannel], {
    description: 'Canales por defecto',
  })
  defaultChannels!: NotificationChannel[];

  @Field(() => [String], {
    description: 'Variables disponibles en el template',
  })
  variables!: string[];

  @Field(() => String, {
    nullable: true,
    description: 'Patrón de ruta a la que navega el click; null = solo aviso',
  })
  linkPattern?: string;
}
