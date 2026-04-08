const BACKEND_URL_ENV = 'BACKEND_URL';
const API_SUFFIX_PATTERN = /\/api\/?$/i;

function readBackendOrigin(): string {
  const rawValue = process.env.BACKEND_URL?.trim();

  if (!rawValue) {
    throw new Error(
      `${BACKEND_URL_ENV} is required and must point to the backend origin without /api`
    );
  }

  const normalizedValue = rawValue.replace(/\/+$/, '');

  if (API_SUFFIX_PATTERN.test(normalizedValue)) {
    throw new Error(
      `${BACKEND_URL_ENV} must not include /api; received "${rawValue}"`
    );
  }

  return normalizedValue;
}

export function getBackendOrigin(): string {
  return readBackendOrigin();
}

export function buildBackendApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${readBackendOrigin()}/api${normalizedPath}`;
}
