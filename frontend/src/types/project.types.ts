export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ProjectOwner {
  id: string;
  name: string;
  email: string;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  clientLocation?: string;
  clientWhatsapp?: string;
  clientGmail?: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  technologies: string[];
  tags: string[];
  startDate: string;
  endDate?: string;
  deadline?: string;
  budget?: number;
  ownerId?: string;
  owner?: ProjectOwner;
  teamMembers: any[];
  repositoryUrls?: string[];
  liveUrls?: string[];
  createdAt: string;
  updatedAt: string;
  _count?: Record<string, number>;
}

export interface CreateProjectPayload {
  name: string;
  clientName: string;
  clientLocation?: string;
  clientWhatsapp?: string;
  clientGmail?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  ongoing?: boolean;
  status: ProjectStatus;
  priority: ProjectPriority;
  technologies: string[];
  tags: string[];
  repositoryUrls?: string[];
  liveUrls?: string[];
  teamMemberIds?: string[];
}

export interface ProjectFilters {
  search?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  technology?: string;
  tags?: string;
  page?: number;
  pageSize?: number;
  /** 'mine' narrows to projects the user owns or is a team member of; omit for all projects. */
  scope?: 'mine';
}
