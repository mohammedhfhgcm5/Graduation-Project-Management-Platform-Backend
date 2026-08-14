export interface ProjectsQuery {
  page?: number;
  limit?: number;
  status?: ProjectStatus;
  search?: string;
  archived?: boolean;
}

export type ProjectStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_PROGRESS'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED';
