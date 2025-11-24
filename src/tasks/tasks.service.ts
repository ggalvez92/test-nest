import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskFiltersDto } from './dto/task-filters.dto';
import { TaskStatsDto } from './dto/task-stats.dto';
import { PaginatedTasksDto } from './dto/paginated-tasks.dto';
import { Task, TaskStatus, Prisma } from '@prisma/client';

/**
 * TasksService - Handles task-related database operations
 */
@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private categoriesService: CategoriesService,
  ) {}

  /**
   * Find all tasks for a user with optional filters and pagination
   */
  async findAll(
    userId: string,
    filters?: TaskFiltersDto,
  ): Promise<PaginatedTasksDto> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const skip = (page - 1) * limit;

      // Build where clause dynamically
      const where: Prisma.TaskWhereInput = {
        userId,
        deletedAt: null, // Exclude soft-deleted tasks
      };

      // Apply filters
      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.priority) {
        where.priority = filters.priority;
      }

      if (filters?.categoryId) {
        where.categoryId = filters.categoryId;
      }

      // Date range filters
      if (filters?.startDate || filters?.endDate) {
        where.dueDate = {};
        if (filters.startDate) {
          where.dueDate.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.dueDate.lte = new Date(filters.endDate);
        }
      }

      // Search in title and description
      if (filters?.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Filter by tags
      if (filters?.tags) {
        const tagArray = filters.tags.split(',').map((tag) => tag.trim());
        where.tags = {
          hasSome: tagArray,
        };
      }

      // Execute queries in parallel
      const [tasks, total] = await Promise.all([
        this.prisma.task.findMany({
          where,
          include: {
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
          orderBy: {
            dueDate: 'asc',
          },
          skip,
          take: limit,
        }),
        this.prisma.task.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: tasks,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch tasks');
    }
  }

  /**
   * Find a single task by ID
   * Verifies ownership and that task is not soft-deleted
   */
  async findOne(id: string, userId: string): Promise<Task> {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });

      if (!task || task.deletedAt) {
        throw new NotFoundException('Task not found');
      }

      // Verify ownership
      if (task.userId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to access this task',
        );
      }

      return task;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch task');
    }
  }

  /**
   * Create a new task
   * Validates that category exists and belongs to user if categoryId is provided
   */
  async create(createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
    // Validate category if provided
    if (createTaskDto.categoryId) {
      await this.validateCategory(createTaskDto.categoryId, userId);
    }

    try {
      return await this.prisma.task.create({
        data: {
          title: createTaskDto.title,
          description: createTaskDto.description,
          status: createTaskDto.status || 'PENDIENTE',
          priority: createTaskDto.priority || 'MEDIA',
          dueDate: createTaskDto.dueDate
            ? new Date(createTaskDto.dueDate)
            : null,
          estimatedTime: createTaskDto.estimatedTime,
          actualTime: createTaskDto.actualTime,
          tags: createTaskDto.tags || [],
          userId,
          categoryId: createTaskDto.categoryId,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to create task');
    }
  }

  /**
   * Update a task
   * Verifies ownership and validates category if changed
   */
  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    userId: string,
  ): Promise<Task> {
    // Verify ownership first
    await this.findOne(id, userId);

    // Validate new category if provided
    if (updateTaskDto.categoryId) {
      await this.validateCategory(updateTaskDto.categoryId, userId);
    }

    try {
      return await this.prisma.task.update({
        where: { id },
        data: {
          title: updateTaskDto.title,
          description: updateTaskDto.description,
          status: updateTaskDto.status,
          priority: updateTaskDto.priority,
          dueDate: updateTaskDto.dueDate
            ? new Date(updateTaskDto.dueDate)
            : undefined,
          estimatedTime: updateTaskDto.estimatedTime,
          actualTime: updateTaskDto.actualTime,
          tags: updateTaskDto.tags,
          categoryId: updateTaskDto.categoryId,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to update task');
    }
  }

  /**
   * Update only the status of a task
   */
  async updateStatus(
    id: string,
    status: TaskStatus,
    userId: string,
  ): Promise<Task> {
    // Verify ownership first
    await this.findOne(id, userId);

    try {
      return await this.prisma.task.update({
        where: { id },
        data: { status },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to update task status');
    }
  }

  /**
   * Soft delete a task
   */
  async remove(id: string, userId: string): Promise<void> {
    // Verify ownership first
    await this.findOne(id, userId);

    try {
      await this.prisma.task.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete task');
    }
  }

  /**
   * Get task statistics for a user
   * Optionally filter by date range
   */
  async getTaskStats(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<TaskStatsDto> {
    try {
      const where: Prisma.TaskWhereInput = {
        userId,
        deletedAt: null,
      };

      // Apply date range filter
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = startDate;
        }
        if (endDate) {
          where.createdAt.lte = endDate;
        }
      }

      // Get all tasks for this user
      const tasks = await this.prisma.task.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const total = tasks.length;

      // Group by status
      const byStatus = {
        PENDIENTE: tasks.filter((t) => t.status === 'PENDIENTE').length,
        EN_PROGRESO: tasks.filter((t) => t.status === 'EN_PROGRESO').length,
        COMPLETADA: tasks.filter((t) => t.status === 'COMPLETADA').length,
        CANCELADA: tasks.filter((t) => t.status === 'CANCELADA').length,
      };

      // Group by priority
      const byPriority = {
        BAJA: tasks.filter((t) => t.priority === 'BAJA').length,
        MEDIA: tasks.filter((t) => t.priority === 'MEDIA').length,
        ALTA: tasks.filter((t) => t.priority === 'ALTA').length,
        URGENTE: tasks.filter((t) => t.priority === 'URGENTE').length,
      };

      // Group by category
      const categoryMap = new Map<
        string | null,
        { name: string | null; count: number }
      >();

      tasks.forEach((task) => {
        const key = task.categoryId;
        const existing = categoryMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          categoryMap.set(key, {
            name: task.category?.name || null,
            count: 1,
          });
        }
      });

      const byCategory = Array.from(categoryMap.entries()).map(
        ([categoryId, { name, count }]) => ({
          categoryId,
          categoryName: name,
          count,
        }),
      );

      // Calculate completion rate
      const completedTasks = byStatus.COMPLETADA;
      const completionRate = total > 0 ? (completedTasks / total) * 100 : 0;

      // Calculate average completion time (for completed tasks with actualTime)
      const completedTasksWithTime = tasks.filter(
        (t) => t.status === 'COMPLETADA' && t.actualTime !== null,
      );

      let averageCompletionTime: number | null = null;
      if (completedTasksWithTime.length > 0) {
        const totalMinutes = completedTasksWithTime.reduce(
          (sum, task) => sum + (task.actualTime || 0),
          0,
        );
        const avgMinutes = totalMinutes / completedTasksWithTime.length;
        // Convert minutes to days
        averageCompletionTime = avgMinutes / (60 * 24);
      }

      return {
        total,
        byStatus,
        byPriority,
        byCategory,
        completionRate: Math.round(completionRate * 100) / 100,
        averageCompletionTime,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get task statistics');
    }
  }

  /**
   * Validate that a category exists and belongs to the user
   */
  private async validateCategory(
    categoryId: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.categoriesService.findOne(categoryId, userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException('Category not found');
      }
      if (error instanceof ForbiddenException) {
        throw new BadRequestException(
          'Category does not belong to this user',
        );
      }
      throw error;
    }
  }
}
