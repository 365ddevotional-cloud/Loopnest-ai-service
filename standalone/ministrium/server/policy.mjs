export function isChurchApi(path) {
  return /^\/api\/(?:churches(?:\/|$)|church-invite\/|public\/churches\/|user\/profile(?:\/|$))/.test(path);
}

export function isWorkspaceApi(path) {
  return /^\/api\/workspaces(?:\/|$)/.test(path);
}

export function isBlockedFinance(path, method = 'GET') {
  return path === '/api/church-giving-webhook'
    || /\/giving\/(?:create-session|confirm)(?:\/|$)/.test(path)
    || /\/payout-config(?:\/|$)/.test(path)
    || (/\/giving\/settings$/.test(path) && method !== 'GET');
}

export function runtimeMode(env) {
  if (!env.MINISTRIUM_DATABASE_URL) return 'preview';
  if (env.MINISTRIUM_DATABASE_CONFIRMED !== 'standalone') {
    throw new Error('Confirm the separate Ministrium database before enabling persistence.');
  }
  if (!env.MINISTRIUM_FIREBASE_PROJECT_ID) throw new Error('MINISTRIUM_FIREBASE_PROJECT_ID is required for workspace authentication.');
  if (env.DATABASE_URL && env.DATABASE_URL === env.MINISTRIUM_DATABASE_URL) {
    throw new Error('Do not reuse the parent DATABASE_URL for Ministrium.');
  }
  return 'workspace';
}
