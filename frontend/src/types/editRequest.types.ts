
export type EditRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface EditRequest {
  id: string;
  projectId: string;
  project?: { id: string; name: string };
  requestedBy: { id: string; name: string; email: string };
  reason: string;
  duration: string;
  comments?: string;
  status: EditRequestStatus;
  reviewedBy?: { id: string; name: string; email: string } | null;
  reviewerNotes?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEditRequestPayload {
  reason: string;
  duration: string;
  comments?: string;
}
