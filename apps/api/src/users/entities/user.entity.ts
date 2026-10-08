import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ProjectMember } from '../../projects/entities/project-member.entity.js';
import { Incident } from '../../incidents/entities/incident.entity.js';

/**
 * User entity.
 *
 * Security contract:
 * - passwordHash is NEVER returned in API responses (see UserResponseDto)
 * - email is normalized to lowercase before storage
 * - unique constraint on email enforced at DB level
 */
@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({
    type: 'timestamptz',
    name: 'last_login_at',
    nullable: true,
    default: null,
  })
  lastLoginAt: Date | null;

  // Relations
  @OneToMany(() => ProjectMember, (pm) => pm.user)
  projectMemberships: ProjectMember[];

  @OneToMany(() => Incident, (incident) => incident.createdBy)
  createdIncidents: Incident[];

  @OneToMany(() => Incident, (incident) => incident.assignedTo)
  assignedIncidents: Incident[];
}
