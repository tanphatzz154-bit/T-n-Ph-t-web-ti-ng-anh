import test from 'node:test';
import assert from 'node:assert/strict';
import { parseYouTubeUrl, defaultVideos, sanitizeVideos, addVideo, embedUrl, watchUrl } from '../docs/videos.js';

const id = 'MKsNBLssYyM';

test('accepts common YouTube share formats without carrying query parameters into embeds', () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${id}&si=tracking`,
    `http://m.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?si=tracking`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
    `https://www.youtube.com/live/${id}/`,
  ]) assert.deepEqual(parseYouTubeUrl(url), { id, isShort: false });
  assert.deepEqual(parseYouTubeUrl(` https://youtube.com/shorts/${id}?feature=share `), { id, isShort: true });
  assert.equal(embedUrl({ id }), `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&hl=vi`);
  assert.equal(watchUrl({ id, isShort: true }), `https://www.youtube.com/shorts/${id}`);
  assert.equal(watchUrl({ id, isShort: false }), `https://www.youtube.com/watch?v=${id}`);
});

test('rejects spoofed hosts, non-web schemes, credentials, ambiguous IDs and malformed paths', () => {
  for (const url of [
    `https://youtube.com.evil.example/watch?v=${id}`,
    `https://evil.example/youtube.com/watch?v=${id}`,
    `https://youtube.com@evil.example/watch?v=${id}`,
    `https://evil.example@youtube.com/watch?v=${id}`,
    `https://www.youtube.com:8443/watch?v=${id}`,
    `https://youtube.com./watch?v=${id}`,
    `javascript:alert('${id}')`,
    `ftp://youtube.com/watch?v=${id}`,
    `https://www.youtube.com/watch?v=${id}&v=abcdefghijk`,
    `https://www.youtube.com/watch?v=${id}extra`,
    `https://www.youtube.com/watch?v=${id}%0A`,
    'https://www.youtube.com/watch?v=short',
    `https://www.youtube.com/shorts/${id}/extra`,
    `https://www.youtube.com/channel/${id}`,
    `https://www.youtube-nocookie.com/watch?v=${id}`,
    `https://youtu.be/${id}/extra`,
    '<iframe src="https://youtube.com"></iframe>',
    '', null, {}, 'x'.repeat(2049),
  ]) assert.equal(parseYouTubeUrl(url), null, String(url));
  assert.equal(embedUrl({ id: 'javascript:alert(1)' }), '');
  assert.equal(embedUrl({ id: id + '\n' }), '');
  assert.equal(watchUrl({ id: id + '?autoplay=1' }), '');
});

test('library cleaning preserves empty libraries, bounds data, deduplicates and strips unknown fields', () => {
  assert.deepEqual(sanitizeVideos(undefined), defaultVideos());
  assert.deepEqual(sanitizeVideos({}), defaultVideos());
  assert.deepEqual(sanitizeVideos([]), []);
  const clean = sanitizeVideos([
    { id, title: '  Video\n  của mình  ', isShort: true, iframe: '<script>' },
    { id, title: 'duplicate', isShort: false },
    { id: 'abcdefghijk', title: 'x'.repeat(140), isShort: 'true' },
    { id: 'bad', title: 'bad' },
    null, [],
    { id: 'ABCDEFGHIJK', title: '\u0000', isShort: false },
  ]);
  assert.deepEqual(clean[0], { id, title: 'Video của mình', isShort: true });
  assert.equal(clean.length, 3);
  assert.equal(clean[1].title.length, 120);
  assert.equal(clean[1].isShort, false);
  assert.equal(clean[2].title, 'Video của Phát');
  const many = Array.from({ length: 101 }, (_, n) => ({ id: String(n).padStart(11, '0'), title: 'Video', isShort: false }));
  assert.equal(sanitizeVideos(many).length, 100);
  const seed = defaultVideos(); seed[0].title = 'changed'; seed.push({});
  assert.equal(defaultVideos()[0].title, 'Video của Phát');
  assert.equal(defaultVideos().length, 1);
});

test('adding validates before mutation and retains duplicate identity and original orientation', () => {
  const videos = defaultVideos();
  const duplicate = addVideo(videos, `https://youtu.be/${id}`, 'Different title');
  assert.equal(duplicate.added, false);
  assert.deepEqual(duplicate.video, videos[0]);
  assert.equal(duplicate.videos.length, 1);
  const added = addVideo(videos, 'https://youtube.com/watch?v=abcdefghijk', ' My video ');
  assert.equal(added.added, true);
  assert.deepEqual(added.video, { id: 'abcdefghijk', isShort: false, title: 'My video' });
  assert.equal(added.videos.length, 2);
  assert.equal(videos.length, 1);
  assert.equal(addVideo(videos, 'https://not-youtube.example/watch?v=abcdefghijk'), null);
  const full = Array.from({ length: 100 }, (_, n) => ({ id: String(n).padStart(11, '0'), title: 'Video', isShort: false }));
  assert.equal(addVideo(full, `https://youtu.be/${id}`), null);
  assert.equal(addVideo(full, 'https://youtu.be/00000000000').added, false);
});
