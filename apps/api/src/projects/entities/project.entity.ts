

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';


import { User } from '../../users/entities/user.entity.js';
import { ProjectMember } from './project-member.entity.js';
import { Incident } from '../../incidents/entities/incident.entity.js';

/**
 * Project entity.
 *
 * A project represents an application or system being operated through
 * OpsPilot (e.g., "E-Commerce Production", "Payment Platform").
 *
 * Authorization: Access is always verified via ProjectMember before returning
 * any project data. Do not return this entity based on ID alone.
 */
@Entity('projects')
@Index(['slug'], { unique: true })
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { eager: false, nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: Relation<User>;

  @Column({ type: 'uuid', name: 'created_by_id' })
  createdById: string;

  @OneToMany(() => ProjectMember, (pm) => pm.project, { cascade: true })
  members: Relation<ProjectMember[]>;

  @OneToMany(() => Incident, (incident) => incident.project)
  incidents: Relation<Incident[]>;
}
