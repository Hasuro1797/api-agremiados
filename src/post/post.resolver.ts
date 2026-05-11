import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload-ts';
import { Role, Status } from 'generated/prisma/enums';
import { AdminOnly, Roles } from 'src/auth';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayloadWithAccess } from 'src/auth/types/jwt-payload.type';
import { CreatePostInput } from './dto/create-post.input';
import { PostArgs, PostArgsForWebsite } from './dto/filters.arg';
import { UpdatePostInput } from './dto/update-post.input';
import { Post } from './entities/post.entity';
import { Posts } from './entities/posts.entity';
import { PostService } from './post.service';

@Resolver(() => Post)
export class PostResolver {
  constructor(private readonly postService: PostService) {}

  @AdminOnly()
  @Mutation(() => Post, { name: 'createPost' })
  createPost(
    @Args('createPostInput') createPostInput: CreatePostInput,
    @Args('coverImage', { type: () => GraphQLUpload, nullable: true })
    coverImage: Promise<FileUpload> | undefined,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.postService.create(createPostInput, coverImage, user.sub);
  }

  @AdminOnly()
  @Query(() => Posts, { name: 'findAllPosts' })
  findAll(@Args() postArgs: PostArgs) {
    return this.postService.findAll(
      postArgs.page,
      postArgs.pageSize,
      postArgs.orderBy,
      postArgs.search,
      postArgs.filters,
    );
  }

  @AdminOnly()
  @Query(() => Post, { name: 'findOnePost' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.postService.findOne(id);
  }

  @AdminOnly()
  @Mutation(() => Post, { name: 'updatePost' })
  updatePost(
    @Args('updatePostInput') updatePostInput: UpdatePostInput,
    @Args('coverImage', { type: () => GraphQLUpload, nullable: true })
    coverImage: Promise<FileUpload> | undefined,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.postService.update(updatePostInput, coverImage, user.sub);
  }

  @AdminOnly()
  @Mutation(() => Boolean, { name: 'removePost' })
  removePost(
    @Args('ids', { type: () => [Int] }) ids: number[],
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.postService.remove(ids, user.sub);
  }

  @AdminOnly()
  @Mutation(() => Boolean, { name: 'changeStatusPost' })
  changeStatusPost(
    @Args('ids', { type: () => [Int] }) ids: number[],
    @Args('status', { type: () => String }) status: Status,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.postService.changeStatusPost(ids, status, user.sub);
  }

  @Query(() => [Post], { name: 'findPostsFromBanner' })
  findPostsFromBanner(@Args('type', { type: () => String }) type: string) {
    return this.postService.getPostsFromBanner(type);
  }

  @Roles(Role.MEMBER, Role.SUPERADMIN)
  @Query(() => Post, { name: 'findOnePostForWebsite' })
  findOnePostForWebsite(@Args('id', { type: () => Int }) id: number) {
    return this.postService.findOnePublic(id);
  }

  @Roles(Role.MEMBER, Role.SUPERADMIN)
  @Query(() => Posts, { name: 'findPostsForWebsite' })
  findPostsForWebsite(
    @Args() { page, pageSize, sort, search, type }: PostArgsForWebsite,
  ) {
    return this.postService.getPostsForWebsite(
      page,
      pageSize,
      sort,
      search,
      type,
    );
  }
}
