import {embedUrl} from './videos.js';

export function renderPhat({videos, selectedId, sharedVideo, esc}) {
  const selected=videos.find(video=>video.id===selectedId)||(sharedVideo?.id===selectedId?sharedVideo:null)||videos[0];
  return selected?`<div class="video-only"><section class="video-stage ${selected.isShort?'is-short':'is-landscape'}" id="video-heading" tabindex="-1" aria-label="Video của Phát"><iframe class="youtube-player" src="${embedUrl(selected)}" title="${esc(selected.title)} — video YouTube" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></section></div>`:
    '<div class="card empty" id="video-heading" tabindex="-1"><p>Chưa có video.</p><button class="button primary" data-action="navigate" data-page="settings">Thêm video trong Cài đặt</button></div>';
}

export function renderVideoManager({videos, selectedId, esc, icon}) {
  const selected=videos.find(video=>video.id===selectedId)||videos[0];
  const count=videos.length;
  return `<section class="video-manager stack" aria-label="Quản lý video Tấn Phát">
        <section class="card video-library" aria-label="Danh sách video">
          <div class="row between"><h2>Video của mình</h2><span class="badge neutral">${count} video</span></div>
          ${count?`<div class="video-list">${videos.map(video=>`
            <div class="video-list-row ${video.id===selected?.id?'selected':''}">
              <button class="video-select" data-action="video-select" data-id="${video.id}" ${video.id===selected?.id?'aria-current="true"':''} aria-label="Xem ${esc(video.title)}">
                <span class="video-thumb"><img src="https://i.ytimg.com/vi/${video.id}/hqdefault.jpg" alt="" width="96" height="72" loading="lazy" decoding="async"><span>${icon('play')}</span></span>
                <span class="video-list-copy"><strong>${esc(video.title)}</strong><small>${video.id===selected?.id?'Đang chọn':video.isShort?'YouTube Shorts':'YouTube'}</small></span>
              </button>
              <button class="video-remove" data-action="video-remove" data-id="${video.id}" aria-label="Gỡ ${esc(video.title)} khỏi danh sách" title="Gỡ khỏi danh sách">${icon('close')}</button>
            </div>`).join('')}</div>`:'<p class="small muted video-list-empty">Danh sách đang trống. Một video mới đang chờ bạn thêm vào.</p>'}
        </section>
        <section class="card video-add-card">
          <div class="video-add-heading"><span class="icon-box">${icon('plus')}</span><div><h2>Thêm video</h2><p class="small muted">Một đường link, một kỷ niệm.</p></div></div>
          <form id="video-add-form" class="stack gap-sm">
            <label class="field" for="video-url">Link YouTube<input id="video-url" name="url" type="text" inputmode="url" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="2048" placeholder="https://youtube.com/shorts/…" required aria-describedby="video-link-help video-form-status"></label>
            <p id="video-link-help" class="small muted">Dùng link Shorts, youtube.com hoặc youtu.be.</p>
            <label class="field" for="video-title">Tên video <span class="field-optional">(không bắt buộc)</span><input id="video-title" name="title" type="text" maxlength="120" placeholder="Đặt tên cho thước phim này"></label>
            <p id="video-form-status" class="video-form-status" role="status" aria-live="polite"></p>
            <button type="submit" class="button primary wide">${icon('plus')}Thêm vào góc của Phát</button>
          </form>
          <p class="video-storage-note">Video thêm mới được lưu trên trình duyệt này. Dùng bản sao lưu trong Cài đặt để mang danh sách sang thiết bị khác.</p>
        </section>
      </section>`;
}
