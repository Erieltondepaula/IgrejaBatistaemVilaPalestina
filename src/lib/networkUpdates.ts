export type NetworkUpdateConfig = {
  role: 'principal' | 'secundaria' | 'configurar-depois';
  machineIp: string;
  port: string;
  sourceUrl: string;
};

export type ReleaseManifest = {
  version: string;
  publishedAt?: string;
  fileCount?: number;
  description?: string;
  files: Array<{ path: string; sha256: string }>;
};

const NETWORK_CONFIG_KEY = 'dashboard-network-config-v1';
const DEFAULT_NETWORK_CONFIG: NetworkUpdateConfig = {
  role: 'configurar-depois',
  machineIp: '192.168.100.3',
  port: '8081',
  sourceUrl: 'http://192.168.100.3:8081/latest.json',
};

export function readNetworkUpdateConfig(): NetworkUpdateConfig {
  const stored = window.localStorage.getItem(NETWORK_CONFIG_KEY);
  if (!stored) return DEFAULT_NETWORK_CONFIG;

  try {
    const value = JSON.parse(stored) as Partial<NetworkUpdateConfig>;
    return {
      ...DEFAULT_NETWORK_CONFIG,
      ...value,
      sourceUrl: value.sourceUrl?.trim()
        || `http://${value.machineIp || DEFAULT_NETWORK_CONFIG.machineIp}:${value.port || DEFAULT_NETWORK_CONFIG.port}/latest.json`,
    };
  } catch (error) {
    console.error('Configuração de rede inválida no armazenamento local:', error);
    throw new Error('Corrija a configuração de rede antes de verificar atualizações.');
  }
}

export function getManifestUrl(config: NetworkUpdateConfig): string {
  const defaultUrl = `http://${config.machineIp}:${config.port || '8081'}/latest.json`;
  const configuredUrl = config.sourceUrl.trim() || defaultUrl;

  if (
    config.role === 'principal'
    && window.location.port === (config.port || '8081')
    && configuredUrl === defaultUrl
  ) {
    return new URL('/latest.json', window.location.origin).toString();
  }
  return configuredUrl;
}

export function isReleaseManifest(value: unknown): value is ReleaseManifest {
  if (!value || typeof value !== 'object') return false;
  const manifest = value as { version?: unknown; files?: unknown };
  return typeof manifest.version === 'string'
    && /^\d+(?:\.\d+)*$/.test(manifest.version)
    && Array.isArray(manifest.files)
    && manifest.files.every((file) =>
      !!file
      && typeof file === 'object'
      && typeof (file as { path?: unknown }).path === 'string'
      && typeof (file as { sha256?: unknown }).sha256 === 'string'
    );
}

export async function fetchReleaseManifest(url: string, timeoutMs = 4000): Promise<ReleaseManifest> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.text();

    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      if (body.trimStart().startsWith('<')) {
        throw new Error('O endereço respondeu uma página HTML, não o manifesto JSON.');
      }
      throw new Error('O servidor respondeu um JSON inválido para o manifesto de atualização.');
    }

    if (!isReleaseManifest(payload)) {
      throw new Error('O servidor respondeu um manifesto de atualização inválido.');
    }
    return payload;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function compareVersions(left: string, right: string): number {
  const parse = (version: string) => version.split('.').map((part) => {
    const numericPart = Number.parseInt(part, 10);
    return Number.isFinite(numericPart) ? numericPart : 0;
  });
  const leftParts = parse(left);
  const rightParts = parse(right);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}
