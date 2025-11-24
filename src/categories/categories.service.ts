import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from '@prisma/client';

/**
 * CategoriesService - Handles category-related database operations
 */
@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all categories for a user (excluding soft-deleted)
   */
  async findAll(userId: string): Promise<Category[]> {
    try {
      return await this.prisma.category.findMany({
        where: {
          userId,
          deletedAt: null, // Exclude soft-deleted categories
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch categories');
    }
  }

  /**
   * Get a single category by ID
   * Verifies ownership and that category is not soft-deleted
   */
  async findOne(id: string, userId: string): Promise<Category> {
    try {
      const category = await this.prisma.category.findUnique({
        where: { id },
      });

      if (!category || category.deletedAt) {
        throw new NotFoundException('Category not found');
      }

      // Verify ownership
      if (category.userId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to access this category',
        );
      }

      return category;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch category');
    }
  }

  /**
   * Create a new category for a user
   */
  async create(
    createCategoryDto: CreateCategoryDto,
    userId: string,
  ): Promise<Category> {
    try {
      return await this.prisma.category.create({
        data: {
          name: createCategoryDto.name,
          color: createCategoryDto.color,
          description: createCategoryDto.description,
          userId,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to create category');
    }
  }

  /**
   * Update a category
   * Verifies ownership before updating
   */
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    userId: string,
  ): Promise<Category> {
    // First verify ownership
    await this.findOne(id, userId);

    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          name: updateCategoryDto.name,
          color: updateCategoryDto.color,
          description: updateCategoryDto.description,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to update category');
    }
  }

  /**
   * Soft delete a category
   * Verifies ownership before deleting
   * Sets deletedAt timestamp instead of hard delete
   */
  async remove(id: string, userId: string): Promise<void> {
    // First verify ownership
    await this.findOne(id, userId);

    try {
      await this.prisma.category.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete category');
    }
  }

  /**
   * Create default categories for a newly registered user
   * Called automatically during user registration
   */
  async createDefaultCategories(userId: string): Promise<Category[]> {
    const defaultCategories = [
      { name: 'Personal', color: '#3B82F6', description: 'Tareas personales' },
      { name: 'Trabajo', color: '#10B981', description: 'Tareas de trabajo' },
      {
        name: 'Salud',
        color: '#EF4444',
        description: 'Salud y ejercicio',
      },
      { name: 'Hogar', color: '#F59E0B', description: 'Tareas del hogar' },
      {
        name: 'Estudio',
        color: '#8B5CF6',
        description: 'Estudio y aprendizaje',
      },
    ];

    try {
      // Create all default categories in a transaction
      const categories = await this.prisma.$transaction(
        defaultCategories.map((category) =>
          this.prisma.category.create({
            data: {
              ...category,
              userId,
            },
          }),
        ),
      );

      return categories;
    } catch (error) {
      // Don't throw error if default categories fail to create
      // Just log it and continue (user can create categories manually)
      console.error('Failed to create default categories:', error);
      return [];
    }
  }
}
