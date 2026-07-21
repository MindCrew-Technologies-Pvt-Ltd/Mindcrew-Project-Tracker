import { Router, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { apiTokenAuth, apiTokenLimiter } from '../middleware/apiTokenAuth';
import { listProjectsForUser, logWorkForUser, myWeekForUser } from '../controllers/integrations.controller';
import logger from '../config/logger';

type AuthUser = { id: string; email: string; role?: string };

const fmtMinutes = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

/**
 * Builds a per-request MCP server bound to the authenticated user. Stateless
 * streamable-HTTP mode: every POST gets a fresh server+transport, which keeps
 * the endpoint horizontally scalable and session-free.
 */
function buildServer(user: AuthUser): McpServer {
  const server = new McpServer({ name: 'project-tracker', version: '1.0.0' });

  server.registerTool(
    'list_projects',
    {
      title: 'List projects',
      description: 'List the projects time can be logged to. The user\'s own projects (owned or team member) are marked with mine=true and should be preferred when matching.',
      inputSchema: {},
    },
    async () => {
      const projects = await listProjectsForUser(user);
      return { content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }] };
    },
  );

  server.registerTool(
    'log_work',
    {
      title: 'Log work to the timesheet',
      description:
        'Log time worked TODAY to a project in the company Project Tracker. This is the ONLY way time enters the timesheet — users cannot add or edit entries manually. ' +
        'When the user says "fill my timesheet", review everything worked on today across all projects/sessions, match each to a tracker project via list_projects, and log one entry per project. ' +
        'NEVER ask the user how many hours to log — estimate honestly from the actual work sessions you observed. ' +
        'Write a DETAILED bullet summary of concrete accomplishments (files/features/fixes), not vague phrases. ' +
        'Time can only be logged for the current day (days lock at 11:59 PM India time) — never attempt to backfill. ' +
        'Call get_my_week first to avoid double-logging work that is already recorded.',
      inputSchema: {
        project: z.string().describe('Project name (or id) as shown by list_projects'),
        hours: z.number().int().min(0).max(24).describe('Whole hours worked'),
        minutes: z.number().int().min(0).max(59).describe('Additional minutes worked'),
        summary: z.string().min(3).describe('Bullet summary of the work done, e.g. "- Fixed login bug\\n- Reviewed PR #42"'),
        billable: z.boolean().optional().describe('Whether the time is billable (default true)'),
      },
    },
    async (args: { project: string; hours: number; minutes: number; summary: string; billable?: boolean }) => {
      try {
        const { entry, todayTotalMinutes } = await logWorkForUser(user, args);
        return {
          content: [{
            type: 'text',
            text: `Logged ${fmtMinutes(entry.minutes)} to "${entry.project.name}" for today. Today's total is now ${fmtMinutes(todayTotalMinutes)}. The entry appears on the user's My Timesheet page.`,
          }],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Could not log work: ${err.message}` }], isError: true };
      }
    },
  );

  server.registerTool(
    'get_my_week',
    {
      title: 'Get my current week',
      description: 'The current week\'s logged time entries and totals for the connected user. Use it to avoid double-logging and to answer "what have I logged this week?".',
      inputSchema: {},
    },
    async () => {
      const week = await myWeekForUser(user);
      return { content: [{ type: 'text', text: JSON.stringify(week, null, 2) }] };
    },
  );

  return server;
}

async function handleMcpPost(req: Request, res: Response): Promise<void> {
  const user = req.user as AuthUser;
  const server = buildServer(user);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined }); // stateless
  res.on('close', () => { transport.close(); server.close(); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    logger.error('MCP request failed:', err);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
    }
  }
}

const mcpRouter = Router();
mcpRouter.use(apiTokenLimiter, apiTokenAuth);
mcpRouter.post('/', handleMcpPost);
// Stateless mode: no SSE stream or session to manage.
mcpRouter.get('/', (_req, res) => { res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed — POST only (stateless MCP)' }, id: null }); });
mcpRouter.delete('/', (_req, res) => { res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null }); });

export default mcpRouter;
