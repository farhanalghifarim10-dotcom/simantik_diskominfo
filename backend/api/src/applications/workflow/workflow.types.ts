import type { AppRole } from '../../auth/auth.types.js';

export type ApplicationStatus =
  | 'SUBMITTED'
  | 'VERIFICATION'
  | 'REVISION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED';

export type ApplicationStage =
  | 'ANALYSIS'
  | 'PLANNING'
  | 'DESIGN'
  | 'IMPLEMENTATION'
  | 'TESTING'
  | 'MAINTENANCE'
  | 'EVALUATION';

export interface TransitionRule {
  from: ApplicationStatus;
  to: ApplicationStatus;
  allowedRoles: AppRole[];
  requireNote: boolean;
  targetStage?: ApplicationStage;
  label: string;
  description: string;
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

export interface TransitionOption {
  to_status: ApplicationStatus;
  label: string;
  description: string;
  require_note: boolean;
  target_stage?: ApplicationStage;
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

export interface ExecuteTransitionDto {
  target_status: ApplicationStatus;
  note?: string;
}

export interface ExecuteStageTransitionDto {
  target_stage: ApplicationStage;
  note?: string;
}

export interface RequestRevisionDto {
  note: string;
}

export interface AddInternalNoteDto {
  message: string;
}
