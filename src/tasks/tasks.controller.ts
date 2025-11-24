import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskFiltersDto } from './dto/task-filters.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { PaginatedTasksDto } from './dto/paginated-tasks.dto';
import { TaskStatsDto } from './dto/task-stats.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import type { User } from '@prisma/client';

/**
 * TasksController - Handles task-related endpoints
 * All endpoints require JWT authentication
 */
@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /**
   * GET /tasks
   * Get all tasks for the authenticated user with optional filters
   */
  @Get()
  @ApiOperation({
    summary: 'Get all tasks with optional filters and pagination',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA'] })
  @ApiQuery({ name: 'priority', required: false, enum: ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'] })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'tags', required: false, type: String, description: 'Comma-separated tags' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully',
    type: PaginatedTasksDto,
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Complete documentation',
            description: 'Write API docs',
            status: 'PENDIENTE',
            priority: 'ALTA',
            dueDate: '2024-12-31T23:59:59.000Z',
            estimatedTime: 120,
            actualTime: null,
            tags: ['urgent', 'documentation'],
            userId: '550e8400-e29b-41d4-a716-446655440001',
            category: {
              id: '550e8400-e29b-41d4-a716-446655440002',
              name: 'Work',
              color: '#3B82F6',
            },
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        total: 100,
        page: 1,
        limit: 50,
        totalPages: 2,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @GetUser() user: User,
    @Query() filters: TaskFiltersDto,
  ): Promise<PaginatedTasksDto> {
    return this.tasksService.findAll(user.id, filters);
  }

  /**
   * GET /tasks/stats
   * Get task statistics for the authenticated user
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get task statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: TaskStatsDto,
    schema: {
      example: {
        total: 37,
        byStatus: {
          PENDIENTE: 10,
          EN_PROGRESO: 5,
          COMPLETADA: 20,
          CANCELADA: 2,
        },
        byPriority: {
          BAJA: 5,
          MEDIA: 15,
          ALTA: 10,
          URGENTE: 7,
        },
        byCategory: [
          {
            categoryId: '550e8400-e29b-41d4-a716-446655440000',
            categoryName: 'Work',
            count: 15,
          },
          {
            categoryId: null,
            categoryName: null,
            count: 5,
          },
        ],
        completionRate: 54.05,
        averageCompletionTime: 3.5,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStats(
    @GetUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<TaskStatsDto> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.tasksService.getTaskStats(user.id, start, end);
  }

  /**
   * GET /tasks/:id
   * Get a specific task by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiParam({
    name: 'id',
    description: 'Task UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Task retrieved successfully',
    type: TaskResponseDto,
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Complete documentation',
        description: 'Write API docs',
        status: 'PENDIENTE',
        priority: 'ALTA',
        dueDate: '2024-12-31T23:59:59.000Z',
        estimatedTime: 120,
        actualTime: null,
        tags: ['urgent', 'documentation'],
        userId: '550e8400-e29b-41d4-a716-446655440001',
        category: {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Work',
          color: '#3B82F6',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not your task' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findOne(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<TaskResponseDto> {
    return this.tasksService.findOne(id, user.id);
  }

  /**
   * POST /tasks
   * Create a new task
   */
  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    type: TaskResponseDto,
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Complete documentation',
        description: 'Write API docs',
        status: 'PENDIENTE',
        priority: 'MEDIA',
        dueDate: null,
        estimatedTime: null,
        actualTime: null,
        tags: [],
        userId: '550e8400-e29b-41d4-a716-446655440001',
        category: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input or category',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @GetUser() user: User,
  ): Promise<TaskResponseDto> {
    return this.tasksService.create(createTaskDto, user.id);
  }

  /**
   * PATCH /tasks/:id
   * Update an existing task
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiParam({
    name: 'id',
    description: 'Task UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input or category',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not your task' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @GetUser() user: User,
  ): Promise<TaskResponseDto> {
    return this.tasksService.update(id, updateTaskDto, user.id);
  }

  /**
   * PATCH /tasks/:id/status
   * Update only the status of a task
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update task status' })
  @ApiParam({
    name: 'id',
    description: 'Task UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Task status updated successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid status',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not your task' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateTaskStatusDto,
    @GetUser() user: User,
  ): Promise<TaskResponseDto> {
    return this.tasksService.updateStatus(
      id,
      updateStatusDto.status,
      user.id,
    );
  }

  /**
   * DELETE /tasks/:id
   * Soft delete a task
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task (soft delete)' })
  @ApiParam({
    name: 'id',
    description: 'Task UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 204,
    description: 'Task deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not your task' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async remove(@Param('id') id: string, @GetUser() user: User): Promise<void> {
    return this.tasksService.remove(id, user.id);
  }
}
