import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, LinearProgress, Chip, Select, MenuItem, FormControl, InputLabel, Button } from '@mui/material';
import { CloudUpload as CloudUploadIcon, InsertDriveFile as InsertDriveFileIcon } from '@mui/icons-material';
import { DocumentCategory } from '../../types/document.types';
import { DOCUMENT_CATEGORY_LABELS } from '../../constants/status';

interface Props {
  onUpload: (file: File, category: DocumentCategory) => Promise<void>;
  uploading?: boolean;
  progress?: number;
}

const ACCEPTED = { 'application/pdf': ['.pdf'], 'application/msword': ['.doc'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'application/vnd.ms-excel': ['.xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'application/zip': ['.zip'] };

const DocumentUploader = ({ onUpload, uploading, progress }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>('OTHER');

  const onDrop = useCallback((accepted: File[]) => { if (accepted[0]) setFile(accepted[0]); }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: ACCEPTED, maxFiles: 1 });

  const handleUpload = async () => {
    if (!file) return;
    await onUpload(file, category);
    setFile(null);
  };

  return (
    <Box>
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer', mb: 2,
          bgcolor: isDragActive ? 'action.hover' : 'background.default',
          transition: 'all 0.2s',
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
        <Typography variant="body2">{isDragActive ? 'Drop file here' : 'Drag & drop or click to select'}</Typography>
        <Typography variant="caption" color="text.secondary">PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, ZIP</Typography>
      </Box>

      {file && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <InsertDriveFileIcon color="action" />
          <Typography variant="body2" sx={{ flex: 1 }}>{file.name}</Typography>
          <Chip label={Math.round(file.size / 1024) + ' KB'} size="small" />
        </Box>
      )}

      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Category</InputLabel>
        <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value as DocumentCategory)}>
          {(Object.keys(DOCUMENT_CATEGORY_LABELS) as DocumentCategory[]).map((k) => (
            <MenuItem key={k} value={k}>{DOCUMENT_CATEGORY_LABELS[k]}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {uploading && <LinearProgress variant="determinate" value={progress ?? 0} sx={{ mb: 1 }} />}

      <Button fullWidth variant="contained" onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? `Uploading ${progress ?? 0}%` : 'Upload Document'}
      </Button>
    </Box>
  );
};

export default DocumentUploader;
