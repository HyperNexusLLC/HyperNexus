import { describe, expect, it, vi } from 'vitest';
import { renderToReadableStream, renderToStaticMarkup } from 'react-dom/server';

// Sections below the fold are lazy (next/dynamic); settled SSR needs the
// readable-stream renderer, which waits for dynamic chunks, unlike the
// synchronous renderToStaticMarkup used for the pure-markup cases.
// next/dynamic needs the Next runtime to resolve chunks; in vitest map it to
// React.lazy over the same loader so tests exercise the real section code.
vi.mock('next/dynamic', async () => {
	const React = await import('react');
	return {
		default: (loader: () => Promise<unknown>) => {
			const Lazy = React.lazy(async () => { const mod: any = await loader(); return { default: mod.default ?? mod }; });
			return function DynamicSection(props: Record<string, unknown>) {
				return React.createElement(React.Suspense, { fallback: null }, React.createElement(Lazy, props));
			};
		},
	};
});

async function renderSettledHtml(node: Parameters<typeof renderToReadableStream>[0]): Promise<string> {
	const stream = await renderToReadableStream(node);
	await stream.allReady;
	// Streamed SSR keeps <!-- --> text-node separators; static markup strips them.
	return (await new Response(stream as unknown as BodyInit).text()).replace(/<!--[\s\S]*?-->/g, "");
}

const invalidate = vi.fn(async () => undefined);

vi.mock('../../utils/trpc', () => {
  const createUseQuery = <T,>(data: T) => () => ({ data });
  const createUseMutation = () => () => ({ mutate: vi.fn() });
  // Generic fallback for procedures without fixture data below.
  const fallbackProc: unknown = new Proxy(function () {}, {
    get: (_target, prop) => {
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'useQuery') return createUseQuery(undefined);
      if (prop === 'useMutation') return createUseMutation();
      return fallbackProc;
    },
    apply: () => fallbackProc,
  });
  const withFallback = (obj: Record<string, unknown>): Record<string, unknown> =>
    new Proxy(obj, {
      get: (target, prop) => {
        if (typeof prop === 'symbol') return undefined;
        const val = prop in target ? (target as Record<string, unknown>)[prop as string] : fallbackProc;
        return val && typeof val === 'object' ? withFallback(val as Record<string, unknown>) : val;
      },
    });

  return {
    trpc: withFallback({
      useUtils: () => ({
        startupStatus: { invalidate },
        mcp: {
          getStatus: { invalidate },
          listServers: { invalidate },
          traffic: { invalidate },
        },
        billing: {
          getProviderQuotas: { invalidate },
          getFallbackChain: { invalidate },
        },
        session: {
          list: { invalidate },
        },
      }),
      mcp: {
        getStatus: {
          useQuery: createUseQuery({ initialized: true, serverCount: 2, toolCount: 9, connectedCount: 1 }),
        },
        listServers: {
          useQuery: createUseQuery([
            {
              name: 'github',
              status: 'connected',
              toolCount: 9,
              config: { command: 'node', args: ['github.js'], env: ['GITHUB_TOKEN'] },
            },
          ]),
        },
        traffic: {
          useQuery: createUseQuery([
            {
              server: 'github',
              method: 'tools/call',
              toolName: 'create_issue',
              paramsSummary: 'title=Bug',
              latencyMs: 21,
              success: true,
              timestamp: 1_700_000_000_000,
            },
          ]),
        },
      },
      startupStatus: {
        useQuery: createUseQuery({
          status: 'running',
          ready: true,
          uptime: 123,
          checks: {
            mcpAggregator: {
              ready: true,
              liveReady: true,
              residentReady: true,
              serverCount: 2,
              connectedCount: 1,
              residentConnectedCount: 0,
              initialization: {
                inProgress: false,
                initialized: true,
                connectedClientCount: 1,
                configuredServerCount: 2,
              },
              persistedServerCount: 2,
              persistedToolCount: 9,
              configuredServerCount: 2,
              advertisedServerCount: 2,
              advertisedToolCount: 9,
              advertisedAlwaysOnServerCount: 0,
              advertisedAlwaysOnToolCount: 0,
              inventoryReady: true,
            },
            configSync: {
              ready: true,
              status: {
                inProgress: false,
                lastServerCount: 2,
                lastToolCount: 9,
              },
            },
            memory: {
              ready: true,
              initialized: true,
              agentMemory: true,
            },
            browser: {
              ready: true,
              active: false,
              pageCount: 0,
            },
            sessionSupervisor: {
              ready: true,
              sessionCount: 1,
              restore: {
                restoredSessionCount: 1,
                autoResumeCount: 0,
              },
            },
            extensionBridge: {
              ready: true,
              acceptingConnections: true,
              clientCount: 1,
              hasConnectedClients: true,
            },
            executionEnvironment: {
              ready: true,
              preferredShellId: 'pwsh',
              preferredShellLabel: 'PowerShell 7',
              shellCount: 2,
              verifiedShellCount: 2,
              toolCount: 5,
              verifiedToolCount: 5,
              harnessCount: 2,
              verifiedHarnessCount: 2,
              supportsPowerShell: true,
              supportsPosixShell: true,
              notes: ['Prefer PowerShell 7.'],
            },
          },
        }),
      },
      billing: {
        getProviderQuotas: {
          useQuery: createUseQuery([
            {
              provider: 'anthropic',
              name: 'Anthropic',
              configured: true,
              authenticated: true,
              authMethod: 'api_key',
              tier: 'pro',
              limit: 1000,
              used: 200,
              remaining: 800,
              availability: 'healthy',
            },
          ]),
        },
        getFallbackChain: {
          useQuery: createUseQuery({
            chain: [
              {
                priority: 1,
                provider: 'anthropic',
                model: 'claude-3-7-sonnet',
                reason: 'configured',
              },
            ],
          }),
        },
        getCorporateSettings: { useQuery: createUseQuery(null) },
        getCostHistory: { useQuery: createUseQuery([]) },
        getModelPricing: { useQuery: createUseQuery([]) },
        getStatus: { useQuery: createUseQuery(null) },
        getTaskRoutingRules: { useQuery: createUseQuery([]) },
        setCorporateSettings: { useMutation: createUseMutation() },
        setRoutingStrategy: { useMutation: createUseMutation() },
        setTaskRoutingRule: { useMutation: createUseMutation() },
        stripeSubscribe: { useMutation: createUseMutation() },
      },
      session: {
        list: {
          useQuery: createUseQuery([
            {
              id: 'session-healthy',
              name: 'Healthy workspace',
              cliType: 'aider',
              workingDirectory: 'c:/repo',
              autoRestart: true,
              status: 'running',
              restartCount: 1,
              maxRestartAttempts: 5,
              lastActivityAt: 1_700_000_030_000,
              logs: [
                { timestamp: 1_700_000_030_000, stream: 'stdout', message: 'Ready for instructions' },
              ],
            },
            {
              id: 'session-error',
              name: 'Crashed workspace',
              cliType: 'claude-code',
              workingDirectory: 'c:/repo-crashed',
              autoRestart: false,
              status: 'error',
              restartCount: 5,
              maxRestartAttempts: 5,
              lastActivityAt: 1_700_000_000_000,
              lastError: 'Process exited with code 137',
              logs: [
                { timestamp: 1_700_000_000_000, stream: 'stderr', message: 'Process exited with code 137' },
              ],
            },
          ]),
        },
        start: { useMutation: createUseMutation() },
        stop: { useMutation: createUseMutation() },
        restart: { useMutation: createUseMutation() },
      },
      healer: {
        getHistory: { useQuery: createUseQuery([]) },
        vaultRecordCount: { useQuery: createUseQuery(0) },
        vaultRecords: { useQuery: createUseQuery([]) },
      },
      tools: {
        list: { useQuery: createUseQuery([]) },
      },
      executeTool: { useMutation: createUseMutation() },
      autonomy: {
        getLevel: { useQuery: createUseQuery(null) },
      },
      commands: {
        list: { useQuery: createUseQuery([]) },
        execute: { useMutation: createUseMutation() },
      },
      research: {
        conduct: { useMutation: createUseMutation() },
        ingestionQueue: { useQuery: createUseQuery([]) },
        retryAllFailed: { useMutation: createUseMutation() },
        retryFailed: { useMutation: createUseMutation() },
      },
      skills: {
        list: { useQuery: createUseQuery([]) },
      },
      workflow: {
        list: { useQuery: createUseQuery([]) },
        getGraph: { useQuery: createUseQuery(null) },
        listExecutions: { useQuery: createUseQuery([]) },
        start: { useMutation: createUseMutation() },
        resume: { useMutation: createUseMutation() },
        pause: { useMutation: createUseMutation() },
      },
      mcpServers: {
        list: { useQuery: createUseQuery([]) },
        registrySnapshot: { useQuery: createUseQuery(null) },
        create: { useMutation: createUseMutation() },
        syncTargets: { useQuery: createUseQuery([]) },
      },
      settings: {
        get: { useQuery: createUseQuery(null) },
        update: { useMutation: createUseMutation() },
        testConnection: { useMutation: createUseMutation() },
        updateProviderKey: { useMutation: createUseMutation() },
      },
      browser: {
        status: { useQuery: createUseQuery(null) },
      },
      memory: {
        relationsAdd: { useMutation: createUseMutation() },
      },
      git: {
        getLog: { useQuery: createUseQuery([]) },
        getStatus: { useQuery: createUseQuery(null) },
      },
    }),
  };
});

vi.mock('../../../../../packages/ui/src/utils/trpc', () => {
  const createUseQuery = <T,>(data: T) => () => ({ data });
  const createUseMutation = () => () => ({ mutate: vi.fn() });
  const proc: unknown = new Proxy(function () {}, {
    get: (_target, prop) => {
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'useQuery') return createUseQuery(undefined);
      if (prop === 'useMutation') return createUseMutation();
      return proc;
    },
    apply: () => proc,
  });
  return { trpc: proc };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
}));

import { DashboardHomeClient, sortSessions } from './DashboardHomeClient';

describe('DashboardHomeClient', () => {
  it('sorts sessions so operators see attention-needed work first', () => {
    expect(
      sortSessions([
        {
          id: 'running',
          name: 'Healthy workspace',
          cliType: 'aider',
          workingDirectory: 'c:/repo',
          status: 'running',
          restartCount: 0,
          maxRestartAttempts: 5,
          lastActivityAt: 30,
          logs: [],
        },
        {
          id: 'error',
          name: 'Crashed workspace',
          cliType: 'claude-code',
          workingDirectory: 'c:/repo-crashed',
          status: 'error',
          restartCount: 3,
          maxRestartAttempts: 5,
          lastActivityAt: 10,
          logs: [],
        },
        {
          id: 'restarting',
          name: 'Queued restart workspace',
          cliType: 'opencode',
          workingDirectory: 'c:/repo-restarting',
          status: 'restarting',
          restartCount: 1,
          maxRestartAttempts: 5,
          lastActivityAt: 20,
          logs: [],
        },
      ]).map((session) => session.id),
    ).toEqual(['error', 'restarting', 'running']);
  });

  it('renders live dashboard panels from tRPC hook data', async () => {
    const html = await renderSettledHtml(<DashboardHomeClient />);

    expect(html).toContain('TORMENTNEXUS');
    expect(html).toContain('Mission Control');
    expect(html).toContain('Cognitive Memory Engines');
    expect(html).toContain('Native Go MCP Orchestration');
    expect(html).toContain('Go Kernel: Initialized');
    expect(html).toContain('Startup Check: Ready');
    expect(html).toContain('#health-metrics');
    expect(html).toContain('#security-audit');
  });
});
