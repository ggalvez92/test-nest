import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { CategoriesModule } from '../categories/categories.module';

/**
 * TasksModule - Handles task management operations
 */
@Module({
  imports: [CategoriesModule], // Import to access CategoriesService for validation
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
