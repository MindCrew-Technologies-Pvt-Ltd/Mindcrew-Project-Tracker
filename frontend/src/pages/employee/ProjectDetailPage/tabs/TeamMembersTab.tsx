import { useEffect, useState } from 'react';
import {
  Box, List, ListItem, ListItemAvatar, ListItemText, ListItemSecondaryAction, Avatar, Chip, Typography,
  Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, TextField, Alert,
} from '@mui/material';
import { PersonAdd as PersonAddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import projectsService from '../../../../services/projectsService';
import { Project } from '../../../../types/project.types';
import EmptyState from '../../../../components/common/EmptyState';

interface Props { project: Project; canEdit: boolean; onChanged: () => void; }

interface UserOption { id: string; name: string; email: string; }

const TeamMembersTab = ({ project, canEdit, onChanged }: Props) => {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selected, setSelected] = useState<UserOption | null>(null);
  const [role, setRole] = useState('Member');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && users.length === 0) {
      projectsService.getAssignableUsers().then((r) => setUsers(r.data.data)).catch(() => {});
    }
  }, [open, users.length]);

  const members = (project.teamMembers || []).map((m: any) => ({
    memberId: m.id,
    userId: m.user?.id ?? m.userId,
    name: m.user?.name ?? m.name,
    email: m.user?.email ?? m.email,
    role: m.role ?? 'Member',
  }));

  // Users not already the owner or an existing member
  const takenIds = new Set([project.owner?.id, ...members.map((m) => m.userId)].filter(Boolean));
  const options = users.filter((u) => !takenIds.has(u.id));

  const handleAdd = async () => {
    if (!selected) return;
    setSaving(true); setError(null);
    try {
      await projectsService.addTeamMember(project.id, selected.id, role.trim() || 'Member');
      setOpen(false); setSelected(null); setRole('Member');
      onChanged();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to add member');
    } finally { setSaving(false); }
  };

  const handleRemove = async (userId: string) => {
    try { await projectsService.removeTeamMember(project.id, userId); onChanged(); } catch { /* ignore */ }
  };

  return (
    <Box>
      {canEdit && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setOpen(true)}>Add Member</Button>
        </Box>
      )}

      <List>
        {project.owner && (
          <ListItem>
            <ListItemAvatar><Avatar sx={{ bgcolor: 'primary.main' }}>{project.owner.name?.charAt(0).toUpperCase()}</Avatar></ListItemAvatar>
            <ListItemText
              primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography variant="body1">{project.owner.name}</Typography><Chip label="Owner" size="small" color="primary" /></Box>}
              secondary={project.owner.email}
            />
          </ListItem>
        )}
        {members.map((m) => (
          <ListItem key={m.memberId}>
            <ListItemAvatar><Avatar>{m.name?.charAt(0).toUpperCase()}</Avatar></ListItemAvatar>
            <ListItemText
              primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography variant="body1">{m.name}</Typography><Chip label={m.role} size="small" sx={{ bgcolor: '#EAF1F8', color: '#0A2947' }} /></Box>}
              secondary={m.email}
            />
            {canEdit && (
              <ListItemSecondaryAction>
                <IconButton edge="end" color="error" onClick={() => handleRemove(m.userId)}><DeleteIcon /></IconButton>
              </ListItemSecondaryAction>
            )}
          </ListItem>
        ))}
      </List>

      {!project.owner && members.length === 0 && <EmptyState title="No team members" />}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Team Member</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Autocomplete
            options={options}
            getOptionLabel={(o) => `${o.name} (${o.email})`}
            value={selected}
            onChange={(_, v) => setSelected(v)}
            renderInput={(params) => <TextField {...params} label="Select user" margin="normal" autoFocus />}
          />
          <TextField
            label="Role in project" fullWidth margin="normal" value={role} onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Developer, Designer, QA" helperText="Their role on this project"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={!selected || saving}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamMembersTab;
