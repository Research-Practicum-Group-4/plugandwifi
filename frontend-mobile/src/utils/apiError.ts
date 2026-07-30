import { ApiError } from '../services/api';

type Translate = (key: string) => string;

type ErrorMessageOverrides = {
  unauthorized?: string;
  conflict?: string;
  validation?: string;
};

export function getApiErrorDetail(error: unknown): string {
  return error instanceof ApiError ? error.detail : '';
}

export function localizedApiError(
  error: unknown,
  t: Translate,
  fallbackKey: string,
  overrides: ErrorMessageOverrides = {},
): string {
  if (error instanceof ApiError) {
    if (error.kind === 'timeout') return t('common.requestTimeout');
    if (error.status === 401) return t(overrides.unauthorized ?? 'common.sessionExpired');
    if (error.status === 409 && overrides.conflict) return t(overrides.conflict);
    if (error.status === 422 && overrides.validation) return t(overrides.validation);
    if (error.status >= 500) return t('common.serverError');
    return t(fallbackKey);
  }
  if (error instanceof TypeError) return t('common.networkError');
  return t(fallbackKey);
}
