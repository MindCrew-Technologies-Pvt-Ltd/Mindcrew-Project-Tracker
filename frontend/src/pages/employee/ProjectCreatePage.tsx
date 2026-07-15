import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Box, Grid, TextField, Button, MenuItem, Select, FormControl, InputLabel,
  FormHelperText, Chip, Typography, Alert, CircularProgress, Card, CardContent,
  IconButton, Tooltip, Autocomplete, FormControlLabel, Checkbox,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon, ImageOutlined as ImageIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { createProjectThunk } from '../../store/slices/projectsSlice';
import documentsService from '../../services/documentsService';
import { projectSchema } from '../../utils/validators';
import { TECHNOLOGY_OPTIONS, TAG_OPTIONS } from '../../constants/status';
import PageHeader from '../../components/common/PageHeader';
import { ROUTES } from '../../constants/routes';
import { CreateProjectPayload, ProjectStatus, ProjectPriority } from '../../types/project.types';

const ProjectCreatePage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((s) => s.projects);

  const [repoUrls, setRepoUrls] = useState<string[]>(['']);
  const [liveUrls, setLiveUrls] = useState<string[]>(['']);
  const [ongoing, setOngoing] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [imageErrors, setImageErrors] = useState<{ logo?: string; screenshot?: string }>({});
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);

  const { register, handleSubmit, control, formState: { errors } } = useForm<CreateProjectPayload>({
    resolver: yupResolver(projectSchema) as any,
    defaultValues: { status: 'ACTIVE', priority: 'MEDIUM', technologies: [], tags: [] },
  });

  const addUrl = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    setter(prev => [...prev, '']);

  const removeUrl = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) =>
    setter(prev => prev.filter((_, i) => i !== index));

  const updateUrl = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string,
  ) => setter(prev => prev.map((u, i) => (i === index ? value : u)));

  const onSubmit = async (data: CreateProjectPayload) => {
    // Logo and screenshot are mandatory (they land in the Documents tab).
    const imgErrs: { logo?: string; screenshot?: string } = {};
    if (!logoFile) imgErrs.logo = 'Project logo is required';
    if (!screenshotFile) imgErrs.screenshot = 'Project screenshot is required';
    setImageErrors(imgErrs);
    if (imgErrs.logo || imgErrs.screenshot) return;

    const payload: CreateProjectPayload = {
      ...data,
      endDate: ongoing ? undefined : data.endDate,
      ongoing,
      repositoryUrls: repoUrls.filter(u => u.trim()),
      liveUrls: liveUrls.filter(u => u.trim()),
    };
    const result = await dispatch(createProjectThunk(payload));
    if (createProjectThunk.fulfilled.match(result)) {
      const projectId = result.payload.id;
      // Attach logo + screenshot as project documents so they show in the Documents tab.
      const makeForm = (file: File, category: string) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('category', category);
        return fd;
      };
      const uploads = await Promise.allSettled([
        documentsService.uploadDocument(projectId, makeForm(logoFile!, 'LOGO')),
        documentsService.uploadDocument(projectId, makeForm(screenshotFile!, 'SCREENSHOTS')),
      ]);
      if (uploads.some(u => u.status === 'rejected')) {
        setUploadWarning('The project was created, but one of the images failed to upload. You can add it from the Documents tab.');
        setTimeout(() => navigate(ROUTES.PROJECT_DETAIL(projectId)), 2500);
        return;
      }
      navigate(ROUTES.PROJECT_DETAIL(projectId));
    }
  };

  const ImagePicker = ({ label, file, onPick, error: pickError }: { label: string; file: File | null; onPick: (f: File | null) => void; error?: string }) => (
    <Box>
      <Typography variant="body2" fontWeight={500} color="text.secondary" mb={1}>{label} *</Typography>
      <Button component="label" variant="outlined" startIcon={<ImageIcon />} sx={{ justifyContent: 'flex-start', width: '100%', textTransform: 'none', borderColor: pickError ? 'error.main' : undefined, color: pickError ? 'error.main' : undefined }}>
        {file ? file.name : 'Choose image...'}
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
      {pickError && <FormHelperText error>{pickError}</FormHelperText>}
    </Box>
  );

  const UrlList = ({
    label,
    urls,
    setter,
  }: {
    label: string;
    urls: string[];
    setter: React.Dispatch<React.SetStateAction<string[]>>;
  }) => (
    <Box>
      <Typography variant="body2" fontWeight={500} color="text.secondary" mb={1}>
        {label}
      </Typography>
      {urls.map((url, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="https://"
            value={url}
            onChange={e => updateUrl(setter, i, e.target.value)}
          />
          {urls.length > 1 && (
            <Tooltip title="Remove">
              <IconButton size="small" onClick={() => removeUrl(setter, i)} sx={{ flexShrink: 0 }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ))}
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() => addUrl(setter)}
        sx={{ mt: 0.5, color: 'text.secondary', fontWeight: 500 }}
      >
        Add more
      </Button>
    </Box>
  );

  return (
    <Box>
      <PageHeader
        title="Create Project"
        breadcrumbs={[{ label: 'Projects', href: ROUTES.PROJECTS }, { label: 'New Project' }]}
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
                  <Grid item xs={12}>
                    <TextField label="Project Name" fullWidth error={!!errors.name} helperText={errors.name?.message} {...register('name')} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Description (optional)" fullWidth multiline rows={3} {...register('description')} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Start Date" fullWidth type="date" InputLabelProps={{ shrink: true }} error={!!errors.startDate} helperText={errors.startDate?.message} {...register('startDate')} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <TextField
                        label="End Date"
                        fullWidth
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        disabled={ongoing}
                        {...register('endDate')}
                        inputProps={{ value: ongoing ? '' : undefined }}
                      />
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
                    <FormControl fullWidth error={!!errors.status}>
                      <InputLabel>Status</InputLabel>
                      <Controller name="status" control={control} render={({ field }) => (
                        <Select {...field} label="Status">
                          {(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as ProjectStatus[]).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </Select>
                      )} />
                      {errors.status && <FormHelperText>{errors.status.message}</FormHelperText>}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Priority</InputLabel>
                      <Controller name="priority" control={control} render={({ field }) => (
                        <Select {...field} label="Priority">
                          {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as ProjectPriority[]).map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                        </Select>
                      )} />
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name="technologies"
                      control={control}
                      render={({ field }) => (
                        <Autocomplete
                          multiple
                          freeSolo
                          options={TECHNOLOGY_OPTIONS}
                          value={field.value as string[]}
                          onChange={(_, value) => field.onChange(value)}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip label={option} size="small" {...getTagProps({ index })} key={option} />
                            ))
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Technology Stack"
                              placeholder="Select or type to add"
                              error={!!errors.technologies}
                              helperText={errors.technologies ? String(errors.technologies.message) : 'Press Enter to add custom technology'}
                            />
                          )}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name="tags"
                      control={control}
                      render={({ field }) => (
                        <Autocomplete
                          multiple
                          freeSolo
                          options={TAG_OPTIONS}
                          value={(field.value as string[]) || []}
                          onChange={(_, value) => field.onChange(value)}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip label={option} size="small" {...getTagProps({ index })} key={option} />
                            ))
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Tags"
                              placeholder="Select or type to add"
                              helperText="Press Enter to add custom tag"
                            />
                          )}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <UrlList label="Repository URL" urls={repoUrls} setter={setRepoUrls} />
                  </Grid>

                  <Grid item xs={12}>
                    <UrlList label="Live URL" urls={liveUrls} setter={setLiveUrls} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>Project Images</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Both are required — they are saved to the project's Documents tab.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <ImagePicker label="Project Logo" file={logoFile} onPick={(f) => { setLogoFile(f); setImageErrors(prev => ({ ...prev, logo: undefined })); }} error={imageErrors.logo} />
                  </Grid>
                  <Grid item xs={12}>
                    <ImagePicker label="Project Screenshot" file={screenshotFile} onPick={(f) => { setScreenshotFile(f); setImageErrors(prev => ({ ...prev, screenshot: undefined })); }} error={imageErrors.screenshot} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>Client Information</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Client Name"
                      fullWidth
                      error={!!errors.clientName}
                      helperText={errors.clientName?.message}
                      {...register('clientName')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Client Location"
                      fullWidth
                      placeholder="e.g. Mumbai, India"
                      {...register('clientLocation')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Client WhatsApp"
                      fullWidth
                      placeholder="+91 98765 43210"
                      {...register('clientWhatsapp')}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Client Gmail"
                      fullWidth
                      type="email"
                      placeholder="client@gmail.com"
                      error={!!errors.clientGmail}
                      helperText={errors.clientGmail?.message}
                      {...register('clientGmail')}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={() => navigate(ROUTES.PROJECTS)} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Create Project'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ProjectCreatePage;
