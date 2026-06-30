import { Box, List, ListItem, ListItemAvatar, ListItemText, Avatar, Chip, Typography } from '@mui/material';
import { Project } from '../../../../types/project.types';
import EmptyState from '../../../../components/common/EmptyState';

interface Props { project: Project; }

const TeamMembersTab = ({ project }: Props) => {
  const allMembers = [
    ...(project.owner ? [{ ...project.owner, isOwner: true }] : []),
    ...(project.teamMembers || []).filter(m => m.id !== project.owner?.id).map(m => ({ ...m, isOwner: false })),
  ];

  if (allMembers.length === 0) return <EmptyState title="No team members" />;

  return (
    <Box>
      <List>
        {allMembers.map(m => (
          <ListItem key={m.id}>
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: 'primary.main' }}>{m.name?.charAt(0).toUpperCase()}</Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography variant="body1">{m.name}</Typography>{m.isOwner && <Chip label="Owner" size="small" color="primary" />}</Box>}
              secondary={<>{m.email}<br />{m.department} · {m.designation}</>}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default TeamMembersTab;
