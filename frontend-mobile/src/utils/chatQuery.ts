/**
 * The recommendation API currently treats "workspace" as a literal venue
 * category, although the database uses categories such as cafe and hotel.
 * Keep the user's wording in the UI but send the backend its generic term.
 */
export function normalizeChatQueryForApi(message: string): string {
  const withoutRepeatedLocation = message.replace(
    /\b(?:a\s+|an\s+|the\s+)?workspaces?\s+near\s+(?:the\s+)?workspaces?\s+near\s+/giu,
    'a venue near ',
  );
  return withoutRepeatedLocation.replace(/\bworkspace(s)?\b/giu, (_match, plural: string | undefined) => plural ? 'venues' : 'venue');
}
