/** Keep the existing invitation wording while placing this standalone call to action after the declarations. */
export function splitPrayerCounselingInvitation(content: string): {
  message: string;
  invitation: string | null;
} {
  const match = /(?:^|\n)\s*Need\s+Prayer\s+or\s+Counsel(?:ing|ling)\s*\?/i.exec(content);
  if (!match) return { message: content, invitation: null };

  const message = content.slice(0, match.index).trimEnd();
  const invitation = content.slice(match.index + match[0].length).trim();
  // Only split a final, standalone invitation, never a teaching that happens to mention counseling.
  if (!message || !invitation || !/(prayer|counsel|sign in|email)/i.test(invitation)) {
    return { message: content, invitation: null };
  }
  return { message, invitation };
}
