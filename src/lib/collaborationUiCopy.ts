/**
 * Short in-app explanations for collaboration UI. Copy only — permissions stay in server code.
 */
export const collaborationUiCopy = {
  ownerBlurb:
    'The owner controls who can access this item and can transfer ownership. Collaborators cannot change sharing.',
  editorSongBlurb:
    'Editor: can change song versions, lyrics, and details such as tags. Cannot add or remove people or transfer ownership.',
  editorSongbookBlurb:
    "Editor: can change this songbook's songs, order, versions, and output settings. Cannot add or remove people or transfer ownership.",
  adminCollabBlurb:
    'Admin (collaborator): same editing access as Editor in the app today.',
  songSharingModalIntro:
    'Collaborators can edit this song. To pick someone to add, open People and search by name or email.',
  songbookSharingBlurb:
    'Sharing works like songs: editors can work on the songbook; only the owner controls access.',
  findPeopleLinkText: 'Open People directory',
} as const;

export function collaboratorRoleLabel(role: 'EDITOR' | 'ADMIN'): string {
  return role === 'EDITOR' ? 'Editor' : 'Admin';
}
