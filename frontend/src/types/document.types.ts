import { User } from './user.types';

export type DocumentCategory = 'PROPOSAL' | 'SRS' | 'DESIGN' | 'LOGO' | 'MEETING_NOTES' | 'CONTRACT' | 'DELIVERY_FILES' | 'SCREENSHOTS' | 'OTHER';

export interface ProjectDocument {
  id: string;
  projectId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  category: DocumentCategory;
  uploadedBy: User;
  createdAt: string;
}
