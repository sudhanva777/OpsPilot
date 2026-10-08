import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Project } from './project.entity.js';
import { ProjectRole } from '../../common/types/enums.js';

/**
 * ProjectMember entity.
 *
 * Explicit join table for user ↔ project membership with a role.
 *
 * Authorization is always checked by querying this table for the
 * authenticated userId + projectId before returning any resource.
 *
 * Future roles (ADMIN, OPERATOR, VIEWER) can be added to the
 * ProjectRole enum without changing this entity's structure.
 */
@Entity('project_members')
@Index(['projectId', 'userId'], { unique: true })
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: ProjectRole,
    default: ProjectRole.MEMBER,
  })
  role: ProjectRole;

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt: Date;

  // Relations
  @ManyToOne(() => Project, (project) => project.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, (user) => user.projectMemberships, {
    eager: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
