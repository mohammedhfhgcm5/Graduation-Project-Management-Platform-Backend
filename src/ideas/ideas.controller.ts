import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { Role } from '../generated/prisma/enums';
import {
  ClaimIdeaDto,
  CreateIdeaDto,
  ListIdeasDto,
  UpdateIdeaDto,
} from './dto/idea.dto';
import { IdeasService } from './ideas.service';

@Controller('ideas')
export class IdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  @Get()
  listIdeas(@Query() query: ListIdeasDto) {
    return this.ideasService.listIdeas(query);
  }

  @Get(':id')
  getIdea(@Param('id') ideaId: string) {
    return this.ideasService.getIdea(ideaId);
  }

  @Roles(Role.SUPERVISOR, Role.HEAD)
  @Post()
  createIdea(@Body() dto: CreateIdeaDto, @CurrentUser() user: AuthUser) {
    return this.ideasService.createIdea(dto, user);
  }

  @Roles(Role.SUPERVISOR, Role.HEAD)
  @Patch(':id')
  updateIdea(
    @Param('id') ideaId: string,
    @Body() dto: UpdateIdeaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ideasService.updateIdea(ideaId, dto, user);
  }

  @Roles(Role.STUDENT)
  @Post(':id/claim')
  claimIdea(
    @Param('id') ideaId: string,
    @Body() dto: ClaimIdeaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ideasService.claimIdea(ideaId, dto, user);
  }
}
