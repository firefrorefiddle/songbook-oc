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
    'Admin matches Editor for now; we keep both roles so finer-grained permissions can land later without reassigning people.',
  songSharingModalIntro:
    'Collaborators can edit this song. To pick someone to add, open People and search by name or email.',
  songbookSharingModalIntro:
    'Collaborators can edit this songbook. To pick someone to add, open People and search by name or email.',
  songbookSharingBlurb:
    'Editors can edit; only the owner manages access. Owners use Sharing; anyone can open People to find users.',
  findPeopleLinkText: 'Open People directory',
} as const;

export function collaboratorRoleLabel(role: 'EDITOR' | 'ADMIN'): string {
  return role === 'EDITOR' ? 'Editor' : 'Admin';
}
