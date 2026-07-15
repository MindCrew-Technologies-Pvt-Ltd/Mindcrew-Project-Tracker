
export type EditRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';

export interface EditRequest {
  id: string;
  projectId: string;
  project?: { id: string; name: string };
  requestedBy: { id: string; name: string; email: string };
  reason: string;
  /** Legacy — approved access no longer expires; kept for old records. */
  duration?: string | null;
  comments?: string;
  status: EditRequestStatus;
  reviewedBy?: { id: string; name: string; email: string } | null;
  reviewerNotes?: string;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEditRequestPayload {
  reason: string;
  comments?: string;
}
