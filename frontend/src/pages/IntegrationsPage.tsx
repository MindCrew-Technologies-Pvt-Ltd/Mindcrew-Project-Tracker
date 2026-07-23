import { useCallback, useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, IconButton, Tooltip, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar, CircularProgress,
  Tabs, Tab, List, ListItem, ListItemText,
} from '@mui/material';
import {
  ContentCopy as CopyIcon, DeleteOutline as RevokeIcon, Add as AddIcon,
  SmartToyOutlined as AiIcon, CheckCircleOutline as CheckIcon,
} from '@mui/icons-material';
import PageHeader from '../components/common/PageHeader';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import integrationsService, { ApiTokenInfo } from '../services/integrationsService';
import { formatDate, formatDateTime } from '../utils/formatters';

// The MCP endpoint lives on the backend host (VITE_API_URL minus the /api suffix).
const MCP_URL = `${(import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '')}/mcp`;

// Instruction-file rule for the "fill my timesheet" workflow (AI-only mode).
const FILL_RULE = `When I say "fill my timesheet": review everything I worked on TODAY across all projects and sessions, match each piece of work to a tracker project via the project-tracker MCP tool \`list_projects\`, and call \`log_work\` once per project. NEVER ask me how many hours to log — estimate honestly from the actual work you observed, even if I suggest a number. Write a DETAILED bullet summary of concrete accomplishments (files, features, fixes) with an approximate duration per bullet, e.g. "- Rebuilt dashboard filters (~1h 30m)" — bullets should roughly add up to the logged time. Mark work you were told about but did not observe, e.g. "(1h — as reported by me)". Call \`get_my_week\` first to avoid double-logging. Time must be logged the same day — days lock at 11:59 PM IST.`;

const CodeBlock = ({ code, onCopy }: { code: string; onCopy: () => void }) => (
  <Box sx={{ position: 'relative', bgcolor: '#0F1729', color: '#E2E8F0', borderRadius: '10px', p: 2, pr: 6, fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6 }}>
    {code}
    <Tooltip title="Copy" arrow>
      <IconButton size="small" onClick={onCopy} sx={{ position: 'absolute', top: 8, right: 8, color: '#94A3B8', '&:hover': { color: '#fff' } }}>
        <CopyIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  </Box>
);

const IntegrationsPage = () => {
  const [tokens, setTokens] = useState<ApiTokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null); // shown once
  const [revoking, setRevoking] = useState<ApiTokenInfo | null>(null);
  const [toolTab, setToolTab] = useState(0);
  const [snack, setSnack] = useState<string | null>(null);

  const load = useCallback(() => {
    integrationsService.listTokens()
      .then((r) => setTokens(r.data?.data || []))
      .catch(() => setTokens([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const copy = (text: string, label = 'Copied') => {
    navigator.clipboard.writeText(text).then(() => setSnack(label)).catch(() => setSnack('Copy failed — select and copy manually'));
  };

  const handleCreate = async () => {
    if (tokenName.trim().length < 2) return;
    setCreating(true);
    try {
      const r = await integrationsService.createToken(tokenName.trim());
      setNewToken(r.data?.data?.token || null);
      setTokenName('');
      load();
    } catch (err: any) {
      setSnack(err.response?.data?.message || 'Could not create the token');
    }
    setCreating(false);
  };

  const handleRevoke = async () => {
    if (!revoking) return;
    try {
      await integrationsService.revokeToken(revoking.id);
      setSnack(`Token "${revoking.name}" revoked`);
      load();
    } catch (err: any) {
      setSnack(err.response?.data?.message || 'Revoke failed');
    }
    setRevoking(null);
  };

  const tokenPlaceholder = newToken || 'ptk_YOUR_TOKEN_HERE';
  const snippets = [
    {
      label: 'Claude Code',
      body: (
        <>
          <Typography variant="body2" mb={1}>
            Requires Claude Code on your machine — if <code>claude</code> is not found, install it first:{' '}
            <code>curl -fsSL https://claude.ai/install.sh | bash</code> (macOS/Linux) or{' '}
            <code>npm install -g @anthropic-ai/claude-code</code>, then restart the terminal.
          </Typography>
          <Typography variant="body2" mb={1}>Run this once in any terminal — your token is already inside the command:</Typography>
          <CodeBlock
            code={`claude mcp add project-tracker --scope user --transport http ${MCP_URL} --header "Authorization: Bearer ${tokenPlaceholder}"`}
            onCopy={() => copy(`claude mcp add project-tracker --scope user --transport http ${MCP_URL} --header "Authorization: Bearer ${tokenPlaceholder}"`)}
          />
        </>
      ),
    },
    {
      label: 'VS Code / Copilot',
      body: (
        <>
          <Typography variant="body2" mb={1}>
            For GitHub Copilot in VS Code: open the Command Palette → <strong>MCP: Add Server</strong> → HTTP, or create
            a <code>.vscode/mcp.json</code> file with this content. Then use Copilot in agent mode and say "fill my timesheet".
          </Typography>
          <CodeBlock
            code={`{\n  "servers": {\n    "project-tracker": {\n      "type": "http",\n      "url": "${MCP_URL}",\n      "headers": { "Authorization": "Bearer ${tokenPlaceholder}" }\n    }\n  }\n}`}
            onCopy={() => copy(`{\n  "servers": {\n    "project-tracker": {\n      "type": "http",\n      "url": "${MCP_URL}",\n      "headers": { "Authorization": "Bearer ${tokenPlaceholder}" }\n    }\n  }\n}`)}
          />
          <Typography variant="body2" mt={1} color="text.secondary">
            Using the Claude Code extension in VS Code instead? Follow the Claude Code tab. Cline/Continue? Follow the Cursor tab.
          </Typography>
        </>
      ),
    },
    {
      label: 'Cursor',
      body: (
        <>
          <Typography variant="body2" mb={1}>
            Add to Cursor's MCP settings (<code>.cursor/mcp.json</code> or Settings → MCP). Note the key is <code>"url"</code> — then fully restart Cursor:
          </Typography>
          <CodeBlock
            code={`{\n  "mcpServers": {\n    "project-tracker": {\n      "url": "${MCP_URL}",\n      "headers": { "Authorization": "Bearer ${tokenPlaceholder}" }\n    }\n  }\n}`}
            onCopy={() => copy(`{\n  "mcpServers": {\n    "project-tracker": {\n      "url": "${MCP_URL}",\n      "headers": { "Authorization": "Bearer ${tokenPlaceholder}" }\n    }\n  }\n}`)}
          />
        </>
      ),
    },
    {
      label: 'Windsurf / Antigravity',
      body: (
        <>
          <Typography variant="body2" mb={1}>
            Add to the MCP config (<code>mcp_config.json</code> / Installed MCP Servers → Open MCP Config). These editors use <code>"serverUrl"</code>, not url/httpUrl:
          </Typography>
          <CodeBlock
            code={`{\n  "mcpServers": {\n    "project-tracker": {\n      "serverUrl": "${MCP_URL}",\n      "headers": { "Authorization": "Bearer ${tokenPlaceholder}" }\n    }\n  }\n}`}
            onCopy={() => copy(`{\n  "mcpServers": {\n    "project-tracker": {\n      "serverUrl": "${MCP_URL}",\n      "headers": { "Authorization": "Bearer ${tokenPlaceholder}" }\n    }\n  }\n}`)}
          />
        </>
      ),
    },
    {
      label: 'Gemini CLI',
      body: (
        <>
          <Typography variant="body2" mb={1}>
            Add to <code>~/.gemini/settings.json</code>. Gemini CLI uses <code>"httpUrl"</code>:
          </Typography>
          <CodeBlock
            code={`{\n  "mcpServers": {\n    "project-tracker": {\n      "httpUrl": "${MCP_URL}",\n      "headers": { "Authorization": "Bearer ${tokenPlaceholder}" }\n    }\n  }\n}`}
            onCopy={() => copy(`{\n  "mcpServers": {\n    "project-tracker": {\n      "httpUrl": "${MCP_URL}",\n      "headers": { "Authorization": "Bearer ${tokenPlaceholder}" }\n    }\n  }\n}`)}
          />
        </>
      ),
    },
    {
      label: '"Fill my timesheet" rule',
      body: (
        <>
          <Typography variant="body2" mb={1}>
            Paste this into your assistant's instruction file (CLAUDE.md, .cursorrules, etc.). Then at the end of the day just say <em>"fill my timesheet"</em>:
          </Typography>
          <CodeBlock
            code={FILL_RULE}
            onCopy={() => copy(FILL_RULE)}
          />
        </>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="AI Integrations"
        subtitle="Connect Claude, Cursor, Antigravity or any MCP-capable AI tool — the work it logs lands straight in your timesheet"
      />

      {/* Tokens */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>Personal API tokens</Typography>
            <Box sx={{ flex: 1 }} />
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => { setCreateOpen(true); setNewToken(null); }} sx={{ textTransform: 'none' }}>
              Generate token
            </Button>
          </Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : tokens.length === 0 ? (
            <EmptyState icon={<AiIcon sx={{ fontSize: 56 }} />} title="No tokens yet" description="Generate a token, paste it into your AI tool's setup below, and your assistant can log work for you." />
          ) : (
            <List disablePadding>
              {tokens.map((t) => (
                <ListItem
                  key={t.id}
                  sx={{ border: '1px solid #E9EBF2', borderRadius: '10px', mb: 1, px: 2 }}
                  secondaryAction={
                    <Tooltip title="Revoke token" arrow>
                      <IconButton edge="end" size="small" sx={{ color: '#DC2626' }} onClick={() => setRevoking(t)}>
                        <RevokeIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.name}</Typography>
                        <Chip label={`${t.prefix}…`} size="small" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', height: 20 }} />
                      </Box>
                    }
                    secondary={`Created ${formatDate(t.createdAt)} · ${t.lastUsedAt ? `last used ${formatDateTime(t.lastUsedAt)}` : 'never used yet'}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Setup guides */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Connect your AI tool</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            One-time setup. Afterwards just tell your assistant <em>"fill my timesheet"</em> at the end of the day — it reviews what you worked on, matches it to tracker projects and logs the time with a detailed summary.
            {newToken ? ' Your new token is already filled into the snippets below.' : ' Generate a token above first — the snippets use a placeholder until you do.'}
          </Typography>
          <Tabs value={toolTab} onChange={(_, v) => setToolTab(v)} sx={{ mb: 2, borderBottom: '1px solid #E9EBF2' }} variant="scrollable" scrollButtons="auto">
            {snippets.map((s, i) => <Tab key={i} label={s.label} sx={{ textTransform: 'none', fontWeight: 600 }} />)}
          </Tabs>
          {snippets[toolTab].body}
          <Alert severity="info" sx={{ mt: 2 }}>
            The agent gets three abilities: list projects, log today's work (time + summary — shows with an <strong>AI</strong> badge in your timesheet), and read your current week. It can never see other people's data, approve timesheets, or change anything else.
          </Alert>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => { if (!creating) { setCreateOpen(false); setNewToken(null); } }} maxWidth="sm" fullWidth>
        <DialogTitle>{newToken ? 'Token created' : 'Generate API token'}</DialogTitle>
        <DialogContent>
          {!newToken ? (
            <>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Name it after where you'll use it — you can revoke it any time.
              </Typography>
              <TextField
                autoFocus fullWidth label="Token name" placeholder='e.g. "Claude Code on my laptop"'
                value={tokenName} onChange={(e) => setTokenName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              />
            </>
          ) : (
            <>
              <Alert severity="warning" icon={<CheckIcon />} sx={{ mb: 2 }}>
                Copy this token now — <strong>it will not be shown again.</strong>
              </Alert>
              <CodeBlock code={newToken} onCopy={() => copy(newToken, 'Token copied')} />
              <Typography variant="body2" color="text.secondary" mt={2}>
                Now open a setup tab below and paste the ready-made snippet into your AI tool.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          {!newToken ? (
            <>
              <Button onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
              <Button variant="contained" onClick={handleCreate} disabled={creating || tokenName.trim().length < 2}>
                {creating ? <CircularProgress size={20} color="inherit" /> : 'Generate'}
              </Button>
            </>
          ) : (
            <Button variant="contained" onClick={() => { setCreateOpen(false); }}>Done</Button>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!revoking}
        title="Revoke Token"
        message={`Revoke "${revoking?.name}"? Any AI tool using it will immediately lose access. This cannot be undone.`}
        confirmLabel="Revoke"
        onConfirm={handleRevoke}
        onCancel={() => setRevoking(null)}
      />

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setSnack(null)}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
};

export default IntegrationsPage;
