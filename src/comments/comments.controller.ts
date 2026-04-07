import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { Role } from '../generated/prisma/enums';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Roles(Role.SUPERVISOR, Role.HEAD)
  @Post(':projectId')
  createComment(
    @Param('projectId') projectId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.commentsService.createComment(projectId, dto, user);
  }

  @Get(':projectId')
  listComments(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.commentsService.listComments(projectId, user);
  }
}
