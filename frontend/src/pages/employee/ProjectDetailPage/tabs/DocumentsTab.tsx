import { useEffect, useState } from 'react';
import { Box, List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction, IconButton, Chip, Typography, Divider, Alert } from '@mui/material';
import { InsertDriveFile as InsertDriveFileIcon, Download as DownloadIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAppDispatch } from '../../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../../hooks/useAppSelector';
import { fetchDocumentsThunk, uploadDocumentThunk, deleteDocumentThunk, clearDocumentsError } from '../../../../store/slices/documentsSlice';
import documentsService from '../../../../services/documentsService';
import { downloadBlob } from '../../../../utils/exportHelpers';
import DocumentUploader from '../../../../components/common/DocumentUploader';
import EmptyState from '../../../../components/common/EmptyState';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';
import ConfirmDialog from '../../../../components/common/ConfirmDialog';
import { Project } from '../../../../types/project.types';
import { DocumentCategory } from '../../../../types/document.types';
import { DOCUMENT_CATEGORY_LABELS } from '../../../../constants/status';
import { formatDate } from '../../../../utils/formatters';

interface Props { project: Project; canEdit: boolean; }

const DocumentsTab = ({ project, canEdit }: Props) => {
  const dispatch = useAppDispatch();
  const { documents, uploadProgress, loading, error } = useAppSelector((s) => s.documents);
  const docs = documents[project.id] || [];
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { dispatch(fetchDocumentsThunk(project.id)); }, [project.id, dispatch]);

  const handleUpload = async (file: File, category: DocumentCategory) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    await dispatch(uploadDocumentThunk({ projectId: project.id, formData, onProgress: () => {} }));
    setUploading(false);
  };

  const handleDownload = async (docId: string, fileName: string) => {
    try {
      const res = await documentsService.downloadDocument(docId);
      downloadBlob(res.data, fileName);
    } catch {
      // interceptor surfaces auth errors; nothing extra to do here
    }
  };

  const handleDelete = async () => {
    if (deleteId) { await dispatch(deleteDocumentThunk({ projectId: project.id, docId: deleteId })); setDeleteId(null); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearDocumentsError())}>{error}</Alert>}
      {canEdit && <Box sx={{ mb: 3, maxWidth: 480 }}><DocumentUploader onUpload={handleUpload} uploading={uploading} progress={Object.values(uploadProgress)[0]} /></Box>}
      {docs.length === 0 ? (
        <EmptyState title="No documents yet" description="Upload project documents to keep everything in one place." />
      ) : (
        <List>
          {docs.map((doc, i) => (
            <Box key={doc.id}>
              {i > 0 && <Divider />}
              <ListItem>
                <ListItemIcon><InsertDriveFileIcon color="action" /></ListItemIcon>
                <ListItemText
                  primary={doc.fileName}
                  secondary={<><Chip label={DOCUMENT_CATEGORY_LABELS[doc.category]} size="small" sx={{ mr: 1 }} /><Typography variant="caption" color="text.secondary">by {doc.uploadedBy?.name} · {formatDate(doc.createdAt)}</Typography></>}
                />
                <ListItemSecondaryAction>
                  <IconButton aria-label="Download document" onClick={() => handleDownload(doc.id, doc.fileName)}><DownloadIcon /></IconButton>
                  {canEdit && <IconButton onClick={() => setDeleteId(doc.id)} color="error"><DeleteIcon /></IconButton>}
                </ListItemSecondaryAction>
              </ListItem>
            </Box>
          ))}
        </List>
      )}
      <ConfirmDialog open={!!deleteId} title="Delete Document" message="Are you sure you want to delete this document?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </Box>
  );
};

export default DocumentsTab;
