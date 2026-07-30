import { ApiError } from '../src/services/api';
import { getApiErrorDetail, localizedApiError } from '../src/utils/apiError';

const t = (key: string) => `translated:${key}`;

describe('localizedApiError', () => {
  it('maps timeout and network failures without exposing raw messages', () => {
    expect(localizedApiError(new ApiError(0, 'raw timeout', 'timeout'), t, 'fallback'))
      .toBe('translated:common.requestTimeout');
    expect(localizedApiError(new TypeError('Network request failed'), t, 'fallback'))
      .toBe('translated:common.networkError');
  });

  it('uses endpoint-specific mappings for authentication and conflicts', () => {
    expect(localizedApiError(new ApiError(401, 'Incorrect password'), t, 'fallback', {
      unauthorized: 'account.invalidCredentials',
    })).toBe('translated:account.invalidCredentials');
    expect(localizedApiError(new ApiError(409, 'Already exists'), t, 'fallback', {
      conflict: 'account.emailAlreadyRegistered',
    })).toBe('translated:account.emailAlreadyRegistered');
  });

  it('falls back to localized copy for other backend details', () => {
    expect(localizedApiError(new ApiError(400, 'English backend detail'), t, 'account.registrationFailedMessage'))
      .toBe('translated:account.registrationFailedMessage');
  });

  it('keeps backend detail available only for internal status recognition', () => {
    const error = new ApiError(409, 'Only completed bookings can be reviewed');
    expect(getApiErrorDetail(error)).toBe('Only completed bookings can be reviewed');
  });
});
