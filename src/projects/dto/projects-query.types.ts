export interface ProjectsQuery {
  page?: number;
  limit?: number;
  status?: ProjectStatus;
  search?: string;
}

export type ProjectStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED';
