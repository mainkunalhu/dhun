import { app } from 'electron';
import { createServer } from 'node:http';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import * as z from 'zod/v4';
import type { Job } from '../../shared/job';
import { LIBRARY_PROJECT_ID, type ProjectSettings } from '../../shared/project';
import { notifyJobsChanged, notifyProjectsChanged } from '../events';
import { exportTake } from '../jobs/export';
import type { DhunServices } from '../services';

const MCP_PORT = 3291;
const MCP_PATH = '/mcp';

function text(value: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text:
          typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

function fail(error: unknown) {
  return {
    isError: true as const,
    content: [
      {
        type: 'text' as const,
        text: error instanceof Error ? error.message : String(error),
      },
    ],
  };
}

function nextTakeName(jobs: Job[]): string {
  const used = new Set(
    jobs.map((job) => job.name.trim().toLowerCase()).filter(Boolean),
  );
  let number = jobs.length + 1;
  while (used.has(`take ${number}`)) number += 1;
  return `Take ${number}`;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('Canceled.'));
      return;
    }

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('Canceled.'));
    };

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

async function resolveProject(services: DhunServices, projectId?: string) {
  return services.store.get(projectId ?? LIBRARY_PROJECT_ID);
}

async function resolveVoice(
  services: DhunServices,
  project: Awaited<ReturnType<typeof resolveProject>>,
  input: {
    modelId?: string;
    voiceId?: string;
    language?: string;
    speed?: number;
  },
) {
  const summaries = await services.models.list();
  const installed = summaries.filter(
    (model) => model.installed && model.engineStatus === 'ready',
  );

  let model = installed.find((item) => item.id === input.modelId);

  if (input.modelId && !model) {
    const requested = summaries.find((item) => item.id === input.modelId);
    if (!requested) throw new Error(`Unknown model: ${input.modelId}`);
    throw new Error(
      `${requested.name} is not installed. Install it from the Models screen first.`,
    );
  }

  model =
    model ??
    installed.find((item) => item.id === project.settings.modelId) ??
    installed[0];

  if (!model) {
    throw new Error(
      'No installed model. Install one from the Models screen first.',
    );
  }

  if (model.engine === 'chatterbox') {
    throw new Error('Chatterbox voice cloning is not available yet.');
  }

  if (model.engine === 'maya2' && (input.speed ?? 1) !== 1) {
    throw new Error('Maya 2 Native only supports 1.0× speed.');
  }

  const requestedLanguage = input.language ?? project.settings.language;
  const language = model.languages.includes(requestedLanguage)
    ? requestedLanguage
    : (model.languages[0] ?? 'en');

  const languageVoices = model.voices.filter(
    (voice) => voice.language === language,
  );
  const voices = languageVoices.length > 0 ? languageVoices : model.voices;

  if (input.voiceId && !voices.some((voice) => voice.id === input.voiceId)) {
    throw new Error(
      `Voice ${input.voiceId} is not available for ${model.name} (${language}).`,
    );
  }

  const voice =
    voices.find((item) => item.id === input.voiceId) ??
    voices.find((item) => item.id === project.settings.voiceId) ??
    voices[0];

  if (!voice) {
    throw new Error(`${model.name} has no voices for ${language}.`);
  }

  return {
    model,
    voice,
    language,
    speed: input.speed ?? 1,
  };
}

function createMcpServer(services: DhunServices): McpServer {
  const server = new McpServer(
    { name: 'dhun', version: app.getVersion() },
    {
      instructions:
        'Dhun is a local voiceover studio. Use list_models to find installed models and list_voices for their voices. generate_voiceover returns a job immediately; call wait_for_take to wait for it. Omit projectId to use the Library for unassigned takes. Renders run one at a time. Destructive tools require confirm: true. The Dhun desktop app must stay open.',
    },
  );

  server.registerTool(
    'list_projects',
    {
      title: 'List projects',
      description:
        'List Dhun projects and the Library. Each project has a stable id, name, script and voice settings.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const projects = await services.store.list();
        return text({
          projects,
          library: { id: LIBRARY_PROJECT_ID, name: 'Library' },
        });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'get_project',
    {
      title: 'Get a project',
      description:
        'Read one project, including its full script and voice settings.',
      inputSchema: { projectId: z.string().min(1) },
      annotations: { readOnlyHint: true },
    },
    async ({ projectId }) => {
      try {
        return text(await services.store.get(projectId));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'list_takes',
    {
      title: 'List takes',
      description:
        'List every take in a project, newest first, with status, progress, duration and audio path.',
      inputSchema: { projectId: z.string().min(1) },
      annotations: { readOnlyHint: true },
    },
    async ({ projectId }) => {
      try {
        return text(await services.store.listJobs(projectId));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'get_take',
    {
      title: 'Get a take',
      description:
        'Read one take, including its current render status, progress and output path.',
      inputSchema: {
        projectId: z.string().min(1),
        jobId: z.string().min(1),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ projectId, jobId }) => {
      try {
        return text(await services.store.getJob(projectId, jobId));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'list_models',
    {
      title: 'List models',
      description:
        'List the built-in model catalog with installed, cached and download state. Use the model id in generate_voiceover.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        return text(await services.models.list());
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'list_voices',
    {
      title: 'List voices',
      description:
        'List the voices and languages for one model. Use a voice id in generate_voiceover.',
      inputSchema: { modelId: z.string().min(1) },
      annotations: { readOnlyHint: true },
    },
    async ({ modelId }) => {
      try {
        const model = await services.models.get(modelId);
        if (!model) throw new Error(`Unknown model: ${modelId}`);
        return text({
          id: model.id,
          name: model.name,
          languages: model.languages,
          voices: model.voices,
        });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'get_engine_status',
    {
      title: 'Get engine status',
      description:
        'Read the render queue state and the number of installed models.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const models = await services.models.list();
        return text({
          queue: services.queue.status(),
          installedModels: models
            .filter((model) => model.installed)
            .map((model) => model.id),
          rendersRoot: services.rendersRoot,
        });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'create_project',
    {
      title: 'Create a project',
      description:
        'Create a project folder for a script and its takes. Returns the new project id.',
      inputSchema: { name: z.string().min(1).max(80) },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ name }) => {
      try {
        const project = await services.store.create(name);
        notifyProjectsChanged();
        return text(project);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'set_project_script',
    {
      title: 'Set project script',
      description:
        'Replace the saved script for a project. This does not generate audio.',
      inputSchema: {
        projectId: z.string().min(1),
        script: z.string(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ projectId, script }) => {
      try {
        const project = await services.store.saveScript(projectId, script);
        notifyProjectsChanged();
        return text(project);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'update_project_settings',
    {
      title: 'Update project settings',
      description:
        'Update the default model, voice, language or speed for a project.',
      inputSchema: {
        projectId: z.string().min(1),
        modelId: z.string().nullable().optional(),
        voiceId: z.string().nullable().optional(),
        language: z.string().optional(),
        speed: z.number().min(0.5).max(2).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ projectId, ...patch }) => {
      try {
        const project = await services.store.get(projectId);
        const settings: ProjectSettings = {
          ...project.settings,
          ...Object.fromEntries(
            Object.entries(patch).filter(([, value]) => value !== undefined),
          ),
        };
        const next = await services.store.saveSettings(projectId, settings);
        notifyProjectsChanged();
        return text(next);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'generate_voiceover',
    {
      title: 'Generate a voiceover',
      description:
        'Queue a take and return immediately. Omit projectId for the Library. Omit script to use the project script. Omit modelId, voiceId or language to use the project defaults. Call wait_for_take afterwards.',
      inputSchema: {
        projectId: z.string().optional(),
        name: z.string().max(80).optional(),
        script: z.string().optional(),
        modelId: z.string().optional(),
        voiceId: z.string().optional(),
        language: z.string().optional(),
        speed: z.number().min(0.5).max(2).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (input) => {
      try {
        const project = await resolveProject(services, input.projectId);
        const script = (input.script ?? project.script).trim();
        if (!script) {
          throw new Error('The script is empty.');
        }

        const { model, voice, language, speed } = await resolveVoice(
          services,
          project,
          input,
        );
        const jobs = await services.store.listJobs(project.id);
        const job = await services.store.createJob(project.id, {
          name: input.name?.trim() || nextTakeName(jobs),
          modelId: model.id,
          voiceId: voice.id,
          language,
          speed,
          script,
        });

        services.queue.enqueue(project.id, job.id);
        notifyJobsChanged(project.id);

        return text({
          projectId: project.id,
          projectName: project.name,
          library: project.id === LIBRARY_PROJECT_ID,
          job,
          next: `Call wait_for_take with projectId "${project.id}" and jobId "${job.id}".`,
        });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'wait_for_take',
    {
      title: 'Wait for a take',
      description:
        'Wait until a take is done, failed or canceled. Returns timedOut: true if the timeout expires.',
      inputSchema: {
        projectId: z.string().min(1),
        jobId: z.string().min(1),
        timeoutSeconds: z.number().min(1).max(900).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ projectId, jobId, timeoutSeconds }, extra) => {
      try {
        const timeout = (timeoutSeconds ?? 180) * 1000;
        const started = Date.now();

        while (true) {
          const job = await services.store.getJob(projectId, jobId);
          if (
            job.status === 'done' ||
            job.status === 'failed' ||
            job.status === 'canceled'
          ) {
            return text({ timedOut: false, job });
          }
          if (Date.now() - started >= timeout) {
            return text({ timedOut: true, job });
          }
          await sleep(500, extra.signal);
        }
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'cancel_take',
    {
      title: 'Cancel a take',
      description: 'Cancel a queued or running take.',
      inputSchema: {
        projectId: z.string().min(1),
        jobId: z.string().min(1),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ projectId, jobId }) => {
      try {
        const job = await services.store.cancelJob(projectId, jobId);
        services.queue.cancel(jobId);
        notifyJobsChanged(projectId);
        return text(job);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'retry_take',
    {
      title: 'Retry a take',
      description: 'Queue a failed or canceled take again.',
      inputSchema: {
        projectId: z.string().min(1),
        jobId: z.string().min(1),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ projectId, jobId }) => {
      try {
        const job = await services.store.getJob(projectId, jobId);
        if (job.status !== 'failed' && job.status !== 'canceled')
          return text(job);

        const next = await services.store.updateJob(projectId, jobId, {
          status: 'queued',
          progress: 0,
          error: null,
          outputPath: null,
          durationMs: null,
        });
        services.queue.enqueue(projectId, jobId);
        notifyJobsChanged(projectId);
        return text(next);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'rename_take',
    {
      title: 'Rename a take',
      description: 'Give a take a new name.',
      inputSchema: {
        projectId: z.string().min(1),
        jobId: z.string().min(1),
        name: z.string().min(1).max(80),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ projectId, jobId, name }) => {
      try {
        const job = await services.store.renameJob(projectId, jobId, name);
        notifyJobsChanged(projectId);
        return text(job);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'move_take',
    {
      title: 'Move a take',
      description:
        'Move a take to another project or to the Library without re-rendering.',
      inputSchema: {
        fromProjectId: z.string().min(1),
        toProjectId: z.string().min(1),
        jobId: z.string().min(1),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ fromProjectId, toProjectId, jobId }) => {
      try {
        const job = await services.store.moveJob(
          fromProjectId,
          toProjectId,
          jobId,
        );
        notifyJobsChanged(fromProjectId);
        notifyJobsChanged(toProjectId);
        return text(job);
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'delete_take',
    {
      title: 'Delete a take',
      description:
        'Delete a take and its WAV. Requires confirm: true because it cannot be undone.',
      inputSchema: {
        projectId: z.string().min(1),
        jobId: z.string().min(1),
        confirm: z.boolean().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ projectId, jobId, confirm }) => {
      try {
        if (confirm !== true) {
          throw new Error('Pass confirm: true to delete this take.');
        }
        await services.store.removeJob(projectId, jobId);
        notifyJobsChanged(projectId);
        return text({ deleted: true, projectId, jobId });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'export_take',
    {
      title: 'Export a take',
      description:
        'Copy a finished take to the OS Downloads folder and return the file path.',
      inputSchema: {
        projectId: z.string().min(1),
        jobId: z.string().min(1),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ projectId, jobId }) => {
      try {
        const target = await exportTake(services.store, projectId, jobId);
        return text({ path: target });
      } catch (error) {
        return fail(error);
      }
    },
  );

  return server;
}

function allowedHost(header: string | undefined): boolean {
  const raw = (header ?? '').toLowerCase();
  const host = raw.startsWith('[')
    ? raw.slice(1, raw.indexOf(']'))
    : raw.split(':')[0];
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '[::1]'
  );
}

export function startMcpServer(services: DhunServices): { close: () => void } {
  const httpServer = createServer(async (req, res) => {
    if (!allowedHost(req.headers.host)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (pathname !== MCP_PATH) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405, { Allow: 'POST', 'Content-Type': 'text/plain' });
      res.end('Method not allowed');
      return;
    }

    const server = createMcpServer(services);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error('[mcp] Request failed.', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null,
          }),
        );
      } else {
        res.destroy();
      }
    }
  });

  httpServer.on('error', (error) => {
    console.error('[mcp] Server error.', error);
  });

  httpServer.listen(MCP_PORT, '127.0.0.1', () => {
    const url = `http://localhost:${MCP_PORT}${MCP_PATH}`;
    console.log(`[mcp] Dhun MCP server listening at ${url}`);
    void writeFile(
      path.join(services.userData, 'mcp.json'),
      `${JSON.stringify({ name: 'dhun', url }, null, 2)}\n`,
      { mode: 0o600 },
    );
  });

  return {
    close: () => {
      httpServer.close();
    },
  };
}
