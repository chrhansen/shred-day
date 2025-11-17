declare const __VITE_API_BASE_URL__: string | undefined;
declare const __VITE_IS_DEV__: boolean | undefined;

const LOCAL_DEV_URL = 'http://localhost:3000';

const resolveProcessEnv = () => {
  if (typeof process === 'undefined' || !process.env) return undefined;
  return process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || undefined;
};

const resolveIsDev = () => {
  if (typeof __VITE_IS_DEV__ !== 'undefined') return __VITE_IS_DEV__;
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV !== 'production';
  }
  return false;
};

const resolveDefinedBaseUrl = () => {
  if (typeof __VITE_API_BASE_URL__ !== 'undefined') return __VITE_API_BASE_URL__;
  return resolveProcessEnv();
};

// Determine API base URL based on environment
export const API_BASE_URL = resolveIsDev()
  ? LOCAL_DEV_URL
  : resolveDefinedBaseUrl() || '';
