import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Box, Grid, TextField, Button, MenuItem, Select, FormControl, InputLabel,
  Chip, Typography, Alert, CircularProgress, Card, CardContent,
  IconButton, Tooltip, Autocomplete, FormControlLabel, Checkbox,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon, ImageOutlined as ImageIcon, InsertPhoto as ExistingImageIcon } from '@mui/icons-material';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchProjectByIdThunk, updateProjectThunk } from '../../store/slices/projectsSlice';
import documentsService from '../../services/documentsService';
import { ProjectDocument } from '../../types/document.types';
import { projectSchema } from '../../utils/validators';
import { TECHNOLOGY_OPTIONS, TAG_OPTIONS } from '../../constants/status';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ROUTES } from '../../constants/routes';
import { CreateProjectPayload, ProjectStatus, ProjectPriority } from '../../types/project.types';

const ProjectEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { currentProject: project, loading, error } = useAppSelector((s) => s.projects);

  // Same editing model as the Create page: URL lists and the Ongoing flag live
  // in local state, everything else in react-hook-form.
  const [repoUrls, setRepoUrls] = useState<string[]>(['']);
  const [liveUrls, setLiveUrls] = useState<string[]>(['']);
  const [ongoing, setOngoing] = useState(false);
  // Logo/screenshot are mandatory: either an existing document or a new file.
  const [existingLogo, setExistingLogo] = useState<ProjectDocument | null>(null);
  const [existingScreenshot, setExistingScreenshot] = useState<ProjectDocument | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [imageErrors, setImageErrors] = useState<{ logo?: string; screenshot?: string }>({});
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<CreateProjectPayload>({
    resolver: yupResolver(projectSchema) as any,
    defaultValues: { technologies: [], tags: [] },
  });

  useEffect(() => { if (id) dispatch(fetchProjectByIdThunk(id)); }, [id, dispatch]);

  // Load the project's current logo/screenshot documents (newest of each category).
  useEffect(() => {
    if (!id) return;
    documentsService.getDocuments(id)
      .then(r => {
        const docs: ProjectDocument[] = r.data?.data || [];
        setExistingLogo(docs.find(d => d.category === 'LOGO') ?? null);
        setExistingScreenshot(docs.find(d => d.category === 'SCREENSHOTS' && d.fileType?.startsWith('image/')) ?? null);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        clientName: project.clientName,
        clientLocation: project.clientLocation || '',
        clientWhatsapp: project.clientWhatsapp || '',
        clientGmail: project.clientGmail || '',
        description: project.description,
        startDate: project.startDate?.slice(0, 10),
        endDate: project.endDate?.slice(0, 10),
        status: project.status,
        priority: project.priority,
        technologies: project.technologies,
        tags: project.tags,
      });
      setRepoUrls(project.repositoryUrls?.length ? project.repositoryUrls : ['']);
      setLiveUrls(project.liveUrls?.length ? project.liveUrls : ['']);
      setOngoing(!project.endDate);
    }
  }, [project, reset]);

  if (loading && !project) return <LoadingSpinner />;
  if (!project) return null;

  const updateUrl = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) =>
    setter(prev => prev.map((u, i) => (i === index ? value : u)));
  const addUrl = (setter: React.Dispatch<React.SetStateAction<string[]>>) => setter(prev => [...prev, '']);
  const removeUrl = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) =>
    setter(prev => prev.filter((_, i) => i !== index));

  const onSubmit = async (data: CreateProjectPayload) => {
    // Mandatory images: an existing document or a newly picked file must be present.
    const imgErrs: { logo?: string; screenshot?: string } = {};
    if (!existingLogo && !logoFile) imgErrs.logo = 'Project logo is required';
    if (!existingScreenshot && !screenshotFile) imgErrs.screenshot = 'Project screenshot is required';
    setImageErrors(imgErrs);
    if (imgErrs.logo || imgErrs.screenshot) return;

    const payload: CreateProjectPayload = {
      ...data,
      // '' clears the end date on the backend (Ongoing project)
      endDate: ongoing ? '' : data.endDate,
      ongoing,
      repositoryUrls: repoUrls.filter(u => u.trim()),
      liveUrls: liveUrls.filter(u => u.trim()),
    };
    const result = await dispatch(updateProjectThunk({ id: project.id, payload }));
    if (!updateProjectThunk.fulfilled.match(result)) return;

    // Upload replacements and best-effort remove the doc they replace.
    const makeForm = (file: File, category: string) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', category);
      return fd;
    };
    const jobs: Promise<unknown>[] = [];
    if (logoFile) {
      jobs.push(documentsService.uploadDocument(project.id, makeForm(logoFile, 'LOGO'))
        .then(() => { if (existingLogo) return documentsService.deleteDocument(project.id, existingLogo.id).catch(() => {}); return undefined; }));
    }
    if (screenshotFile) {
      jobs.push(documentsService.uploadDocument(project.id, makeForm(screenshotFile, 'SCREENSHOTS'))
        .then(() => { if (existingScreenshot) return documentsService.deleteDocument(project.id, existingScreenshot.id).catch(() => {}); return undefined; }));
    }
    if (jobs.length) {
      const results = await Promise.allSettled(jobs);
      if (results.some(r => r.status === 'rejected')) {
        setUploadWarning('Changes saved, but an image failed to upload. You can add it from the Documents tab.');
        setTimeout(() => navigate(ROUTES.PROJECT_DETAIL(project.id)), 2500);
        return;
      }
    }
    navigate(ROUTES.PROJECT_DETAIL(project.id));
  };

  const ImagePicker = ({ label, file, existing, onPick, error: pickError }: { label: string; file: File | null; existing: ProjectDocument | null; onPick: (f: File | null) => void; error?: string }) => (
    <Box>
      <Typography variant="body2" fontWeight={500} color="text.secondary" mb={1}>{label} *</Typography>
      {existing && !file && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <ExistingImageIcon color="action" fontSize="small" />
          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }} title={existing.fileName}>{existing.fileName}</Typography>
        </Box>
      )}
      <Button component="label" variant="outlined" startIcon={<ImageIcon />} sx={{ justifyContent: 'flex-start', width: '100%', textTransform: 'none', borderColor: pickError ? 'error.main' : undefined, color: pickError ? 'error.main' : undefined }}>
        {file ? file.name : existing ? 'Replace image...' : 'Choose image...'}
        <input type="file" hidden accept="image/*" onChange={e => { onPick(e.target.files?.[0] ?? null); e.target.value = ''; }} />
      </Button>
      {file && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Box component="img" src={URL.createObjectURL(file)} alt={label} sx={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }} />
          <Tooltip title="Remove">
            <IconButton size="small" onClick={() => onPick(null)}><CloseIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
      )}
      {pickError && <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>{pickError}</Typography>}
    </Box>
  );

  const renderUrlList = (label: string, urls: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => (
    <Box>
      <Typography variant="body2" fontWeight={500} color="text.secondary" mb={1}>{label}</Typography>
      {urls.map((url, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
          <TextField fullWidth size="small" placeholder="https://" value={url} onChange={e => updateUrl(setter, i, e.target.value)} />
          {urls.length > 1 && (
            <Tooltip title="Remove">
              <IconButton size="small" onClick={() => removeUrl(setter, i)} sx={{ flexShrink: 0 }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ))}
      <Button size="small" startIcon={<AddIcon />} onClick={() => addUrl(setter)} sx={{ mt: 0.5, color: 'text.secondary', fontWeight: 500 }}>
        Add more
      </Button>
    </Box>
  );

  return (
    <Box>
      <PageHeader
        title="Edit Project"
        breadcrumbs={[{ label: 'Projects', href: ROUTES.PROJECTS }, { label: project.name, href: ROUTES.PROJECT_DETAIL(project.id) }, { label: 'Edit' }]}
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {uploadWarning && <Alert severity="warning" sx={{ mb: 2 }}>{uploadWarning}</Alert>}
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>Project Information</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}><TextField label="Project Name" fullWidth error={!!errors.name} helperText={errors.name?.message} {...register('name')} /></Grid>
                  <Grid item xs={12}><TextField label="Description (optional)" fullWidth multiline rows={3} error={!!errors.description} helperText={errors.description?.message} {...register('description')} /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="Start Date" fullWidth type="date" InputLabelProps={{ shrink: true }} error={!!errors.startDate} helperText={errors.startDate?.message} {...register('startDate')} /></Grid>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <TextField label="End Date" fullWidth type="date" InputLabelProps={{ shrink: true }} disabled={ongoing} {...register('endDate')} />
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={ongoing}
                            onChange={e => setOngoing(e.target.checked)}
                            sx={{ color: 'text.secondary', '&.Mui-checked': { color: 'primary.main' } }}
                          />
                        }
                        label={<Typography variant="caption" color="text.secondary">Ongoing (no end date)</Typography>}
                        sx={{ mt: 0.5, ml: 0 }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth><InputLabel>Status</InputLabel>
                      <Controller name="status" control={control} render={({ field }) => (
                        <Select value={field.value || ''} onChange={field.onChange} onBlur={field.onBlur} label="Status">
                          {(['DRAFT','ACTIVE','ON_HOLD','COMPLETED','CANCELLED','ARCHIVED'] as ProjectStatus[]).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </Select>
                      )} />
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth><InputLabel>Priority</InputLabel>
                      <Controller name="priority" control={control} render={({ field }) => (
                        <Select value={field.value || ''} onChange={field.onChange} onBlur={field.onBlur} label="Priority">
                          {(['LOW','MEDIUM','HIGH','CRITICAL'] as ProjectPriority[]).map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                        </Select>
                      )} />
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Controller name="technologies" control={control} render={({ field }) => (
                      <Autocomplete
                        multiple freeSolo options={TECHNOLOGY_OPTIONS}
                        value={(field.value as string[]) || []}
                        onChange={(_, value) => field.onChange(value)}
                        renderTags={(value, getTagProps) => value.map((option, index) => <Chip label={option} size="small" {...getTagProps({ index })} key={option} />)}
                        renderInput={(params) => <TextField {...params} label="Technology Stack" placeholder="Select or type to add" error={!!errors.technologies} helperText={errors.technologies ? String(errors.technologies.message) : 'Press Enter to add custom technology'} />}
                      />
                    )} />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller name="tags" control={control} render={({ field }) => (
                      <Autocomplete
                        multiple freeSolo options={TAG_OPTIONS}
                        value={(field.value as string[]) || []}
                        onChange={(_, value) => field.onChange(value)}
                        renderTags={(value, getTagProps) => value.map((option, index) => <Chip label={option} size="small" {...getTagProps({ index })} key={option} />)}
                        renderInput={(params) => <TextField {...params} label="Tags" placeholder="Select or type to add" helperText="Press Enter to add custom tag" />}
                      />
                    )} />
                  </Grid>
                  <Grid item xs={12}>{renderUrlList('Repository URL', repoUrls, setRepoUrls)}</Grid>
                  <Grid item xs={12}>{renderUrlList('Live URL', liveUrls, setLiveUrls)}</Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>Project Images</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Both are required — they live in the project's Documents tab.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <ImagePicker label="Project Logo" file={logoFile} existing={existingLogo} onPick={(f) => { setLogoFile(f); setImageErrors(prev => ({ ...prev, logo: undefined })); }} error={imageErrors.logo} />
                  </Grid>
                  <Grid item xs={12}>
                    <ImagePicker label="Project Screenshot" file={screenshotFile} existing={existingScreenshot} onPick={(f) => { setScreenshotFile(f); setImageErrors(prev => ({ ...prev, screenshot: undefined })); }} error={imageErrors.screenshot} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>Client Information</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}><TextField label="Client Name" fullWidth error={!!errors.clientName} helperText={errors.clientName?.message} {...register('clientName')} /></Grid>
                  <Grid item xs={12}><TextField label="Client Location" fullWidth placeholder="e.g. Mumbai, India" {...register('clientLocation')} /></Grid>
                  <Grid item xs={12}><TextField label="Client WhatsApp" fullWidth placeholder="+91 98765 43210" {...register('clientWhatsapp')} /></Grid>
                  <Grid item xs={12}><TextField label="Client Gmail" fullWidth type="email" placeholder="client@gmail.com" error={!!errors.clientGmail} helperText={errors.clientGmail?.message} {...register('clientGmail')} /></Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={() => navigate(ROUTES.PROJECT_DETAIL(project.id))} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Save Changes'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ProjectEditPage;
