import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

function assignRef(targetRef, value) {
  if (!targetRef) return;
  if (typeof targetRef === 'function') {
    targetRef(value);
  } else {
    targetRef.current = value;
  }
}

function isHlsSource(src) {
  return typeof src === 'string' && src.toLowerCase().includes('.m3u8');
}

function toTokenizedPlaylistUrl(src) {
  if (!isHlsSource(src)) return src;
  const marker = '/hls/';
  const idx = src.indexOf(marker);
  if (idx < 0) return src;

  const after = src.substring(idx + marker.length);
  const slash = after.indexOf('/');
  if (slash < 0) return src;
  const stream = after.substring(0, slash);
  const base = src.substring(0, idx);
  return `${base}/api/v1/streaming/playlist/${stream}`;
}

function isCocCocDownloadClick(event) {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  for (const node of path) {
    if (!node || typeof node !== 'object') continue;
    if ('id' in node && node.id === 'download-btn') return true;
    if ('getAttribute' in node && typeof node.getAttribute === 'function') {
      const id = node.getAttribute('id');
      if (id === 'download-btn') return true;
    }
  }

  const target = event.target;
  if (target && typeof target.closest === 'function') {
    return !!target.closest('#download-btn');
  }
  return false;
}

export default function HlsPlayer({
  src,
  token,
  videoRef,
  onContextMenu,
  controls = true,
  className,
  style,
  ...videoProps
}) {
  const localRef = useRef(null);
  const lastBlockedAtRef = useRef(0);

  useEffect(() => {
    const onKeyDown = (e) => {
      const key = String(e.key || '').toLowerCase();
      const blockF12 = key === 'f12';
      const blockCtrlShift = e.ctrlKey && e.shiftKey && (key === 'i' || key === 'j');
      const blockCtrlU = e.ctrlKey && key === 'u';

      if (blockF12 || blockCtrlShift || blockCtrlU) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onClickCapture = (e) => {
      if (!isCocCocDownloadClick(e)) return;

      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }

      const now = Date.now();
      if (now - lastBlockedAtRef.current > 1500) {
        lastBlockedAtRef.current = now;
        window.alert('Tính năng tải xuống đã bị chặn trên trang xem video.');
      }
    };

    window.addEventListener('click', onClickCapture, true);
    return () => window.removeEventListener('click', onClickCapture, true);
  }, []);

  useEffect(() => {
    const video = localRef.current;
    if (!video) return undefined;

    assignRef(videoRef, video);

    let hls;
    const source = typeof src === 'string' ? src.trim() : '';

    if (!source) {
      video.removeAttribute('src');
      video.load();
      return undefined;
    }

    if (isHlsSource(source)) {
      if (Hls.isSupported()) {
        const playlistUrl = toTokenizedPlaylistUrl(source);
        hls = new Hls();
        hls.loadSource(playlistUrl);
        hls.attachMedia(video);
      } else {
        video.src = source;
      }
    } else {
      video.src = source;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src, token, videoRef]);

  return (
    <video
      ref={localRef}
      controls={controls}
      controlsList="nodownload"
      className={className}
      style={{
        ...(style || {}),
        userSelect: 'none',
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (onContextMenu) onContextMenu(e);
      }}
      {...videoProps}
    />
  );
}
