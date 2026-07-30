import { normalizeChatQueryForApi } from '../src/utils/chatQuery';

describe('normalizeChatQueryForApi', () => {
  it('avoids sending workspace as a literal venue category', () => {
    expect(normalizeChatQueryForApi('Recommend a workspace near Central Park.'))
      .toBe('Recommend a venue near Central Park.');
    expect(normalizeChatQueryForApi('Find quiet workspaces with Wi-Fi.'))
      .toBe('Find quiet venues with Wi-Fi.');
  });

  it('collapses a repeated location phrase before sending it to the API', () => {
    expect(normalizeChatQueryForApi('Can you recommend a workspace near the workspace near Central Park?'))
      .toBe('Can you recommend a venue near Central Park?');
  });

  it('does not alter unrelated queries', () => {
    expect(normalizeChatQueryForApi('Do you have any Blue Bottle venues?'))
      .toBe('Do you have any Blue Bottle venues?');
  });
});
