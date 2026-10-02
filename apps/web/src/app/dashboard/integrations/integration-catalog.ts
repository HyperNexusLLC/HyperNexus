// Integration catalog utility functions
// Maps raw tRPC / kernel HTTP data into the shapes the Integrations Dashboard view renders.

export type StartupStatusSummary = Record<string, any>;

export interface IntegrationOverview {
  extensionClientCount: number;
  browserRuntimeReady: boolean;
  browserPageCount: number;
  syncedClientCount: number;
  installedHarnessCount: number;
  totalHarnessCount: number;
  executionPreferredShell: string | null;
  executionEnvironmentReady: boolean;
  verifiedExecutionToolCount: number;
  supportsPosixShell: boolean;
}

export interface BridgeClientRow {
  clientId: string;
  clientName: string;
  clientType: string;
  platform: string | null;
  version: string | null;
  lastSeenLabel: string;
  capabilities: string[];
  hookPhases: string[];
}

export interface ExternalClientRow {
  id: string;
  label: string;
  statusTone: 'success' | 'warning' | 'error' | 'neutral';
  statusLabel: string;
  resolvedPath: string;
  notes: string;
  detected: boolean;
  autoSyncSupported: boolean;
}

export interface InstallSurfaceRow {
  id: string;
  title: string;
  platforms: string;
  statusTone: 'success' | 'warning' | 'error' | 'neutral';
  statusLabel: string;
  repoPath: string;
  managementHref: string;
  managementLabel: string;
  buildHint: string;
  artifactStatus: { artifactPath: string | null; detail: string };
  artifactVersionLabel: string;
  artifactKindLabel: string;
  artifactFreshnessTone: 'success' | 'warning' | 'error' | 'neutral';
  artifactFreshnessLabel: string;
  artifactUpdatedLabel: string;
  artifactTimestampLabel: string;
  installHint: string;
  nextStepLabel: string;
  nextStepDetail: string;
  operatorActionLabel: string;
  operatorActionValue: string;
  operatorActionCopyLabel: string;
  operatorActionDetail: string;
  capabilities: string[];
}

// ── Overview ──

export function getIntegrationOverview(
  status: StartupStatusSummary | null,
  browser?: any,
  sync?: any,
  cli?: any,
): IntegrationOverview {
  const execEnv = status?.checks?.executionEnvironment ?? status?.executionEnvironment ?? {};
  const extBridge = status?.checks?.extensionBridge ?? status?.extensionBridge ?? {};
  const browserReady = browser?.ready ?? browser?.connected ?? false;
  const pageCount = browser?.pageCount ?? browser?.pages?.length ?? 0;

  // syncTargets can be an array or an object with a targets/clients key
  const syncList = Array.isArray(sync) ? sync : (sync?.targets ?? sync?.clients ?? []);
  const syncedCount = syncList.filter((t: any) => t?.detected || t?.exists || t?.synced).length;

  // cli detections can be an array or an object with harnesses
  const cliList = Array.isArray(cli) ? cli : (cli?.harnesses ?? cli?.detections ?? []);
  const totalHarnesses = cliList.length || cli?.harnessCount || cli?.totalHarnessCount || 0;
  const installedHarnesses = cliList.filter((h: any) => h?.installed || h?.detected).length
    || cli?.installedHarnessCount
    || 0;

  return {
    extensionClientCount: extBridge?.clientCount ?? extBridge?.connectedCount ?? 0,
    browserRuntimeReady: browserReady,
    browserPageCount: pageCount,
    syncedClientCount: syncedCount,
    installedHarnessCount: installedHarnesses,
    totalHarnessCount: totalHarnesses,
    executionPreferredShell: execEnv?.preferredShell ?? execEnv?.shell ?? null,
    executionEnvironmentReady: execEnv?.ready ?? false,
    verifiedExecutionToolCount: execEnv?.verifiedToolCount ?? execEnv?.harnessCount ?? 0,
    supportsPosixShell: execEnv?.supportsPosixShell ?? false,
  };
}

// ── Bridge clients ──

export function getBridgeClientEmptyStateMessage(overview?: any): string {
  const count = overview?.extensionClientCount ?? 0;
  if (count === 0) {
    return 'No bridge clients connected. Install the HyperNexus browser extension or VS Code extension to see live bridge clients here.';
  }
  return 'Bridge clients detected but none currently active.';
}

export function getBridgeClientStatDetail(client: any): string {
  if (!client) return 'No bridge data available';
  const count = client.extensionClientCount ?? client.clientCount ?? 0;
  if (count === 0) return 'No extensions connected';
  return `${count} client${count === 1 ? '' : 's'} connected`;
}

export function getConnectedBridgeClientRows(status: any): BridgeClientRow[] {
  const bridge = status?.checks?.extensionBridge ?? status?.extensionBridge ?? {};
  const clients = bridge?.clients ?? bridge?.connectedClients ?? [];
  if (!Array.isArray(clients)) return [];

  return clients.map((c: any, i: number) => ({
    clientId: c?.id ?? c?.clientId ?? `bridge-${i}`,
    clientName: c?.name ?? c?.clientName ?? 'Unknown client',
    clientType: c?.type ?? c?.clientType ?? 'extension',
    platform: c?.platform ?? null,
    version: c?.version ?? null,
    lastSeenLabel: formatRelativeTime(c?.lastSeenAt ?? c?.lastSeen),
    capabilities: normalizeStringArray(c?.capabilities),
    hookPhases: normalizeStringArray(c?.hookPhases ?? c?.hooks),
  }));
}

// ── External clients (MCP sync targets) ──

export function getExternalClientRows(sync: any): ExternalClientRow[] {
  const list = Array.isArray(sync) ? sync : (sync?.targets ?? sync?.clients ?? []);
  if (!Array.isArray(list)) return [];

  return list.map((t: any, i: number) => {
    const detected = Boolean(t?.detected ?? t?.exists ?? t?.synced);
    return {
      id: t?.id ?? `sync-${i}`,
      label: t?.label ?? t?.name ?? 'Unknown client',
      statusTone: detected ? 'success' : 'neutral',
      statusLabel: detected ? 'Detected' : 'Not detected',
      resolvedPath: t?.path ?? t?.resolvedPath ?? 'Unknown',
      notes: t?.notes ?? t?.description ?? '',
      detected,
      autoSyncSupported: Boolean(t?.autoSyncSupported ?? t?.autoSync),
    };
  });
}

// ── Install surfaces ──

export function getInstallSurfaceRows(data: any): InstallSurfaceRow[] {
  const list = Array.isArray(data) ? data : (data?.surfaces ?? data?.artifacts ?? []);
  if (!Array.isArray(list)) return [];

  return list.map((a: any, i: number) => {
    const artifactPath = a?.artifactPath ?? a?.path ?? null;
    const hasArtifact = Boolean(artifactPath);
    return {
      id: a?.id ?? `surface-${i}`,
      title: a?.title ?? a?.name ?? 'Unknown surface',
      platforms: a?.platforms ?? a?.platform ?? 'cross-platform',
      statusTone: hasArtifact ? 'success' : 'warning',
      statusLabel: hasArtifact ? 'Installed' : 'Not installed',
      repoPath: a?.repoPath ?? a?.sourcePath ?? 'Unknown',
      managementHref: a?.managementHref ?? '#',
      managementLabel: a?.managementLabel ?? 'Manage',
      buildHint: a?.buildHint ?? 'No build hint available',
      artifactStatus: {
        artifactPath,
        detail: a?.artifactDetail ?? (hasArtifact ? 'Artifact found' : 'Run the build to generate the artifact'),
      },
      artifactVersionLabel: a?.version ?? 'unknown version',
      artifactKindLabel: a?.kind ?? a?.type ?? 'artifact',
      artifactFreshnessTone: hasArtifact ? 'success' : 'neutral',
      artifactFreshnessLabel: hasArtifact ? 'Up to date' : 'Stale',
      artifactUpdatedLabel: a?.updatedAt ? `Updated ${formatRelativeTime(a.updatedAt)}` : 'Unknown update time',
      artifactTimestampLabel: a?.timestamp ? new Date(a.timestamp).toLocaleString() : '',
      installHint: a?.installHint ?? 'See documentation for install steps',
      nextStepLabel: a?.nextStepLabel ?? hasArtifact ? 'Verify installation' : 'Build the artifact',
      nextStepDetail: a?.nextStepDetail ?? hasArtifact ? 'Check that the extension loads in your target environment' : 'Run the build script to generate the artifact',
      operatorActionLabel: a?.operatorActionLabel ?? 'Copy install command',
      operatorActionValue: a?.operatorActionValue ?? 'npm run build',
      operatorActionCopyLabel: a?.operatorActionCopyLabel ?? 'Copy',
      operatorActionDetail: a?.operatorActionDetail ?? 'Paste into your terminal',
      capabilities: normalizeStringArray(a?.capabilities),
    };
  });
}

// ── Status badges ──

export function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case 'success':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    case 'warning':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    case 'error':
      return 'border-red-500/30 bg-red-500/10 text-red-300';
    case 'neutral':
    default:
      return 'border-zinc-700 bg-zinc-900 text-zinc-300';
  }
}

// ── Helpers ──

function normalizeStringArray(value: any): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string');
  if (typeof value === 'string' && value) return [value];
  return [];
}

function formatRelativeTime(ts: any): string {
  if (!ts) return 'never';
  const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  if (isNaN(date.getTime())) return 'unknown';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
