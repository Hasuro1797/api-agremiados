import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload-ts';
import { AdminOnly } from 'src/auth';
import { PaginationArgs } from 'src/common/dtos';
import { UpdateMediaInput } from './dto/update-media.input';
import { Media } from './entities/media.entity';
import { MediasResponse } from './entities/medias.entity';
import { MediaService } from './media.service';

@AdminOnly()
@Resolver(() => Media)
export class MediaResolver {
  constructor(private readonly mediaService: MediaService) {}

  @Mutation(() => [Media], {
    name: 'uploadMedia',
    description: 'Subir uno o varios archivos',
  })
  uploadMedia(
    @Args('files', { type: () => [GraphQLUpload], nullable: true })
    files: Promise<FileUpload>[],
  ) {
    return this.mediaService.uploadMedia(files);
  }

  @Query(() => MediasResponse, {
    name: 'findAllMedias',
    description: 'Obtener todos los medios',
  })
  async findAll(
    @Args() paginationArgs: PaginationArgs,
    @Args('orderBy', { type: () => String, nullable: true })
    orderBy: string = 'createdAt-DESC',
  ) {
    return await this.mediaService.findAll(
      paginationArgs.page,
      paginationArgs.pageSize,
      orderBy,
    );
  }

  @Query(() => Media, {
    name: 'findOneMedia',
    description: 'Obtener un medio por su ID',
  })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.mediaService.findOne(id);
  }

  @Mutation(() => Media, {
    name: 'updateMedia',
    description: 'Actualizar un medio existente',
  })
  updateMedia(
    @Args('updateMediaInput')
    updateMediaInput: UpdateMediaInput,
  ) {
    return this.mediaService.update(updateMediaInput.id, updateMediaInput);
  }

  @Mutation(() => Boolean, {
    name: 'removeMedia',
    description: 'Eliminar uno o varios medios',
  })
  removeMedia(@Args('ids', { type: () => [Int] }) ids: number[]) {
    return this.mediaService.destroyMedia(ids);
  }
}
