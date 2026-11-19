/** Only YouTube IDs reach an embed URL; pasted URLs never become iframe sources. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']);
const SHORT_HOSTS = new Set(['youtu.be', 'www.youtu.be']);
const EMBED_HOSTS = new Set(['youtube-nocookie.com', 'www.youtube-nocookie.com']);
const MAX_VIDEOS = 100;

function validId(value) {
  return typeof value === 'string' && value.length === 11 && VIDEO_ID.test(value);
}

function cleanTitle(value) {
  return typeof value === 'string' && value.trim()
    ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Video của Phát'
    : 'Video của Phát';
}

export function defaultVideos() {
  return [{ id: 'MKsNBLssYyM', title: 'Video của Phát', isShort: false }];
}

export function parseYouTubeUrl(input) {
  if (typeof input !== 'string' || input.length > 2048) return null;
  let url;
  try { url = new URL(input.trim()); } catch { return null; }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  let id, isShort = false;
  if (SHORT_HOSTS.has(host)) {
    id = path.match(/^\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (/^\/watch\/?$/.test(path)) {
      const ids = url.searchParams.getAll('v');
      if (ids.length !== 1) return null;
      id = ids[0];
    } else {
      const match = path.match(/^\/(shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/);
      id = match?.[2];
      isShort = match?.[1] === 'shorts';
    }
  } else if (EMBED_HOSTS.has(host)) {
    id = path.match(/^\/embed\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
  }
  return validId(id) ? { id, isShort } : null;
}

export function sanitizeVideos(value) {
  if (!Array.isArray(value)) return defaultVideos();
  const videos = [], seen = new Set();
  // Imported backups have a size limit; also bound the work done for this field.
  for (const item of value.slice(0, MAX_VIDEOS)) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || !validId(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    videos.push({ id: item.id, title: cleanTitle(item.title), isShort: item.isShort === true });
  }
  return videos;
}

/** Update the retired default in saved libraries without restoring removed videos. */
export function restoreVideos(value) {
  const videos = sanitizeVideos(value);
  const replacement = defaultVideos()[0];
  const alreadyPresent = videos.some(video => video.id === replacement.id);
  return videos.flatMap(video => video.id !== '73qQ6nag6F8'
    ? [video]
    : alreadyPresent ? [] : [{ ...replacement }]);
}

export function addVideo(videos, input, title = '') {
  const parsed = parseYouTubeUrl(input);
  if (!parsed) return null;
  const clean = sanitizeVideos(videos);
  const existing = clean.find(video => video.id === parsed.id);
  if (existing) return { videos: clean, video: existing, added: false };
  if (clean.length >= MAX_VIDEOS) return null;
  const video = { ...parsed, title: cleanTitle(title) };
  return { videos: [...clean, video], video, added: true };
}

export function embedUrl(video) {
  return validId(video?.id) ? `https://www.youtube-nocookie.com/embed/${video.id}?rel=0&playsinline=1&hl=vi` : '';
}

export function watchUrl(video) {
  if (!validId(video?.id)) return '';
  return video.isShort === true ? `https://www.youtube.com/shorts/${video.id}` : `https://www.youtube.com/watch?v=${video.id}`;
}
