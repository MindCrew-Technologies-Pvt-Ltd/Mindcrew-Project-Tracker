import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Tabs, Tab, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select, FormControl,
  InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, CircularProgress, Checkbox, ListItemText
} from '@mui/material';
import { Add as AddIcon, CheckCircle as CheckIcon, Cancel as CancelIcon, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import leavesService from '../../services/leavesService';
import { LeaveRequest, LeaveType, LeaveStatus } from '../../types/leave.types';
import dayjs from 'dayjs';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const getStatusColor = (status: LeaveStatus) => {
  switch (status) {
    case 'APPROVED': return 'success';
    case 'REJECTED': return 'error';
    default: return 'warning';
  }
};

const getTypeColor = (type: LeaveType) => {
  switch (type) {
    case 'FULL_DAY': return '#f44336'; // Red
    case 'HALF_DAY': return '#ffeb3b'; // Yellow
    case 'WFH': return '#4caf50'; // Green
    default: return '#ccc';
  }
};

export default function LeaveManagementPage() {
  const { user } = useAppSelector(state => state.auth);
  const isManager = user?.jobRoles?.includes('Manager') || user?.role === 'ADMIN';

  const [tabIndex, setTabIndex] = useState(0);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [teamRequests, setTeamRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [myManagers, setMyManagers] = useState<{ id: string, name: string, employeeId: string }[]>([]);
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  // Modal state
  const [openModal, setOpenModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'FULL_DAY' as LeaveType,
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    reason: '',
    notifyManagerIds: [] as string[]
  });

  // Week-based date restriction: minimum selectable date is the Monday of the current week
  const getMinDate = () => {
    const now = dayjs();
    const dayOfWeek = now.day(); // 0=Sun, 1=Mon, ..., 6=Sat
    // If today is Sunday (0), the current week started on the previous Monday
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return now.subtract(mondayOffset, 'day').format('YYYY-MM-DD');
  };
  const minSelectableDate = getMinDate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const myRes = await leavesService.getMyRequests();
      setMyRequests(myRes.data.data);

      const managersRes = await leavesService.getMyManagers();
      setMyManagers(managersRes.data.data);

      if (isManager) {
        const teamRes = await leavesService.getTeamRequests();
        setTeamRequests(teamRes.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isManager]);

  useAutoRefresh(fetchData);

  const handleSubmit = async () => {
    // Validate dates against week restriction
    if (formData.startDate < minSelectableDate) {
      alert(`Cannot select dates before ${dayjs(minSelectableDate).format('MMM D, YYYY')} (start of current week)`);
      return;
    }
    if (formData.endDate < formData.startDate) {
      alert('End date cannot be before start date');
      return;
    }
    try {
      await leavesService.createRequest({
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      });
      setOpenModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to submit request');
    }
  };

  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await leavesService.updateStatus(id, { status });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  // Stats calculation
  const approvedLeaves = myRequests.filter(r => r.status === 'APPROVED');
  const totalFull = approvedLeaves.filter(r => r.type === 'FULL_DAY').length;
  const totalHalf = approvedLeaves.filter(r => r.type === 'HALF_DAY').length;
  const totalWfh = approvedLeaves.filter(r => r.type === 'WFH').length;

  // Mini Calendar logic (currentMonth state based)
  const startOfMonth = currentMonth.startOf('month');
  const daysInMonth = currentMonth.daysInMonth();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => startOfMonth.add(i, 'day'));

  const getDayColor = (date: dayjs.Dayjs) => {
    const request = myRequests.find(r => 
      r.status === 'APPROVED' && 
      (date.isSame(r.startDate, 'day') || date.isSame(r.endDate, 'day') || (date.isAfter(r.startDate) && date.isBefore(r.endDate)))
    );
    if (request) return getTypeColor(request.type);
    return 'transparent';
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Leaves & WFH</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenModal(true)}>
          Request Leave
        </Button>
      </Box>

      {isManager && (
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 3 }}>
          <Tab label="My Leaves" />
          <Tab label="Team Requests" />
        </Tabs>
      )}

      <TabPanel value={tabIndex} index={0}>
        {/* Stats Grid */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Typography variant="subtitle1">Total Leaves</Typography>
              <Typography variant="h4" fontWeight="bold" sx={{ color: 'white' }}>{totalFull}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
              <Typography variant="subtitle1">Half Days</Typography>
              <Typography variant="h4" fontWeight="bold" sx={{ color: 'white' }}>{totalHalf}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
              <Typography variant="subtitle1">WFH Days</Typography>
              <Typography variant="h4" fontWeight="bold" sx={{ color: 'white' }}>{totalWfh}</Typography>
            </Paper>
          </Grid>
        </Grid>

        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Typography variant="h6" sx={{ mb: 2 }}>My Request History</Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Date Range</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {myRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell><Chip label={req.type.replace('_', ' ')} size="small" /></TableCell>
                      <TableCell>
                        {dayjs(req.startDate).format('MMM D, YYYY')} 
                        {req.startDate !== req.endDate && ` - ${dayjs(req.endDate).format('MMM D, YYYY')}`}
                      </TableCell>
                      <TableCell>{req.reason || '-'}</TableCell>
                      <TableCell><Chip label={req.status} color={getStatusColor(req.status)} size="small" /></TableCell>
                    </TableRow>
                  ))}
                  {myRequests.length === 0 && (
                    <TableRow><TableCell colSpan={4} align="center">No requests found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Calendar ({currentMonth.format('MMMM YYYY')})</Typography>
              <Box>
                <IconButton size="small" onClick={() => setCurrentMonth(prev => prev.subtract(1, 'month'))}>
                  <ChevronLeft />
                </IconButton>
                <IconButton size="small" onClick={() => setCurrentMonth(prev => prev.add(1, 'month'))}>
                  <ChevronRight />
                </IconButton>
              </Box>
            </Box>
            <Paper sx={{ p: 2 }}>
              <Grid container spacing={1}>
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <Grid item xs={1.7} key={`h-${i}`} sx={{ textAlign: 'center', fontWeight: 'bold' }}>{d}</Grid>
                ))}
                {/* Empty spaces for start of month */}
                {Array.from({ length: startOfMonth.day() }).map((_, i) => (
                  <Grid item xs={1.7} key={`e-${i}`} />
                ))}
                {calendarDays.map((date) => (
                  <Grid item xs={1.7} key={date.format('DD')}>
                    <Box sx={{
                      width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '50%', margin: 'auto',
                      bgcolor: getDayColor(date),
                      color: getDayColor(date) !== 'transparent' ? '#000' : 'inherit',
                      fontWeight: getDayColor(date) !== 'transparent' ? 'bold' : 'normal',
                      border: date.isSame(dayjs(), 'day') ? '2px solid #1976d2' : 'none'
                    }}>
                      {date.format('D')}
                    </Box>
                  </Grid>
                ))}
              </Grid>
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-around', fontSize: '0.8rem' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ w: 12, h: 12, bgcolor: getTypeColor('FULL_DAY'), borderRadius: '50%', width: 12, height: 12 }}/> Leave</Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ w: 12, h: 12, bgcolor: getTypeColor('HALF_DAY'), borderRadius: '50%', width: 12, height: 12 }}/> Half Day</Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ w: 12, h: 12, bgcolor: getTypeColor('WFH'), borderRadius: '50%', width: 12, height: 12 }}/> WFH</Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {isManager && (
        <TabPanel value={tabIndex} index={1}>
          <Typography variant="h6" sx={{ mb: 2 }}>Team Requests</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teamRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">{req.user?.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{req.user?.employeeId}</Typography>
                    </TableCell>
                    <TableCell><Chip label={req.type.replace('_', ' ')} size="small" /></TableCell>
                    <TableCell>
                      {dayjs(req.startDate).format('MMM D')} - {dayjs(req.endDate).format('MMM D, YYYY')}
                    </TableCell>
                    <TableCell>{req.reason || '-'}</TableCell>
                    <TableCell><Chip label={req.status} color={getStatusColor(req.status)} size="small" /></TableCell>
                    <TableCell align="right">
                      {req.status === 'PENDING' ? (
                        <>
                          <IconButton color="success" onClick={() => handleUpdateStatus(req.id, 'APPROVED')} title="Approve">
                            <CheckIcon />
                          </IconButton>
                          <IconButton color="error" onClick={() => handleUpdateStatus(req.id, 'REJECTED')} title="Reject">
                            <CancelIcon />
                          </IconButton>
                        </>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Reviewed by {req.reviewedBy?.name || 'Manager'}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {teamRequests.length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center">No pending team requests</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      )}

      {/* Request Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Leave / WFH</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Request Type</InputLabel>
              <Select
                value={formData.type}
                label="Request Type"
                onChange={(e) => setFormData({ ...formData, type: e.target.value as LeaveType })}
              >
                <MenuItem value="FULL_DAY">Full Day Leave</MenuItem>
                <MenuItem value="HALF_DAY">Half Day Leave</MenuItem>
                <MenuItem value="WFH">Work From Home</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: minSelectableDate }}
              value={formData.startDate}
              onChange={(e) => {
                const newStart = e.target.value;
                setFormData({ 
                  ...formData, 
                  startDate: newStart,
                  // Auto-adjust end date if it's before new start date
                  endDate: formData.endDate < newStart ? newStart : formData.endDate
                });
              }}
              helperText={`Earliest: ${dayjs(minSelectableDate).format('ddd, MMM D')}`}
            />
            <TextField
              label="End Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: formData.startDate }}
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
            <TextField
              label="Reason (Optional)"
              multiline
              rows={3}
              fullWidth
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Notify Managers</InputLabel>
              <Select
                multiple
                value={formData.notifyManagerIds}
                label="Notify Managers"
                onChange={(e) => {
                  const val = e.target.value as string[];
                  if (val.includes('ALL')) {
                    setFormData({ ...formData, notifyManagerIds: myManagers.map(m => m.employeeId) });
                  } else {
                    setFormData({ ...formData, notifyManagerIds: val });
                  }
                }}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const mgr = myManagers.find(m => m.employeeId === value);
                      return <Chip key={value} label={mgr?.name || value} size="small" />;
                    })}
                  </Box>
                )}
              >
                {myManagers.length > 0 && (
                  <MenuItem value="ALL">
                    <Checkbox checked={formData.notifyManagerIds.length === myManagers.length} />
                    <ListItemText primary="Select All" primaryTypographyProps={{ fontWeight: 'bold' }} />
                  </MenuItem>
                )}
                {myManagers.map((mgr) => (
                  <MenuItem key={mgr.id} value={mgr.employeeId}>
                    <Checkbox checked={formData.notifyManagerIds.indexOf(mgr.employeeId) > -1} />
                    <ListItemText primary={mgr.name} secondary={mgr.employeeId} />
                  </MenuItem>
                ))}
                {myManagers.length === 0 && (
                  <MenuItem disabled>No managers assigned</MenuItem>
                )}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>Submit Request</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
