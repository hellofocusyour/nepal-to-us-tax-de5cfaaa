// Google Drive URL/ID parsing helpers.
// Supports:
//   https://drive.google.com/file/d/{id}/view[?...]
//   https://drive.google.com/file/d/{id}/preview
//   https://drive.google.com/file/d/{id}/edit
//   https://drive.google.com/open?id={id}
//   https://drive.google.com/uc?id={id}&export=download
//   bare file id (25-44 chars of [A-Za-z0-9_-])

const ID_REGEX = /^[A-Za-z0-9_-]{25,60}$/;

export function parseDriveFileId(input: string): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  if (ID_REGEX.test(raw)) return raw;

  // /file/d/{id}/...
  const m1 = raw.match(/\/file\/d\/([A-Za-z0-9_-]{25,})/);
  if (m1) return m1[1];

  // ?id={id} or &id={id}
  const m2 = raw.match(/[?&]id=([A-Za-z0-9_-]{25,})/);
  if (m2) return m2[1];

  // /d/{id}
  const m3 = raw.match(/\/d\/([A-Za-z0-9_-]{25,})/);
  if (m3) return m3[1];

  return null;
}

export function driveEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}
