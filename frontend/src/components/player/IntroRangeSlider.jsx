import { useEffect, useMemo, useRef, useState } from 'react';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function snap(n, step) {
  if (!step || step <= 0) return n;
  return Math.round(n / step) * step;
}

export function formatTime(seconds) {
  const s = Number(seconds);
  if (!isFinite(s) || s < 0) return '00:00';
  const total = Math.floor(s);
  const m = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/**
 * Thanh cuộn 2 đầu: rail ngang + hai tay nắm đặt đoạn intro (skip).
 * Kéo tay nắm hoặc vùng xanh để chỉnh; click rail để tua preview (onSeek).
 */
export default function IntroRangeSlider({
  durationSeconds,
  startSeconds,
  endSeconds,
  onChange,
  stepSeconds = 0.5,
  minGapSeconds = 1,
  onSeek,
  /** Gắn sát dưới video (bo góc dưới, không viền trên) */
  attachedBelowVideo = false,
  showTimeRow = false,
}) {
  const duration = Number(durationSeconds);
  const trackRef = useRef(null);
  const dragRef = useRef({ mode: null, startClientX: 0, startA: 0, startB: 0 });
  const [dragMode, setDragMode] = useState(null);
  const seekRaf = useRef(null);

  const a = useMemo(() => clamp(Number(startSeconds) || 0, 0, isFinite(duration) && duration > 0 ? duration : 0), [startSeconds, duration]);
  const b = useMemo(() => clamp(Number(endSeconds) || 0, 0, isFinite(duration) && duration > 0 ? duration : 0), [endSeconds, duration]);

  const safeDuration = isFinite(duration) && duration > 0 ? duration : 0;
  const start = Math.min(a, b);
  const end = Math.max(a, b);

  const startPct = safeDuration > 0 ? (start / safeDuration) * 100 : 0;
  const endPct = safeDuration > 0 ? (end / safeDuration) * 100 : 0;

  const scheduleSeek = (t) => {
    if (typeof onSeek !== 'function' || !isFinite(t)) return;
    if (seekRaf.current != null) cancelAnimationFrame(seekRaf.current);
    seekRaf.current = requestAnimationFrame(() => {
      seekRaf.current = null;
      onSeek(t);
    });
  };

  const apply = (nextStart, nextEnd) => {
    if (!safeDuration || !onChange) return;
    const gap = Math.max(0, Number(minGapSeconds) || 0);
    let s = clamp(snap(nextStart, stepSeconds), 0, safeDuration);
    let e = clamp(snap(nextEnd, stepSeconds), 0, safeDuration);
    if (e - s < gap) {
      if (dragRef.current.mode === 'start') s = clamp(e - gap, 0, safeDuration);
      else if (dragRef.current.mode === 'end') e = clamp(s + gap, 0, safeDuration);
      else e = clamp(s + gap, 0, safeDuration);
    }
    onChange({ startSeconds: s, endSeconds: e });

    const mode = dragRef.current.mode;
    if (typeof onSeek === 'function' && mode) {
      if (mode === 'start') scheduleSeek(s);
      else if (mode === 'end') scheduleSeek(e);
      else if (mode === 'range') scheduleSeek(s);
    }
  };

  const getTimeFromClientX = (clientX) => {
    const el = trackRef.current;
    if (!el || !safeDuration) return 0;
    const rect = el.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const pct = rect.width > 0 ? x / rect.width : 0;
    return pct * safeDuration;
  };

  const onPointerMove = (e) => {
    if (!dragRef.current.mode) return;
    if (!safeDuration) return;
    e.preventDefault();
    const mode = dragRef.current.mode;
    if (mode === 'start') {
      apply(getTimeFromClientX(e.clientX), dragRef.current.startB);
    } else if (mode === 'end') {
      apply(dragRef.current.startA, getTimeFromClientX(e.clientX));
    } else if (mode === 'range') {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dx = e.clientX - dragRef.current.startClientX;
      const dt = rect.width > 0 ? (dx / rect.width) * safeDuration : 0;
      const len = dragRef.current.startB - dragRef.current.startA;
      let s = dragRef.current.startA + dt;
      s = clamp(s, 0, safeDuration - len);
      apply(s, s + len);
    }
  };

  const endDrag = () => {
    if (!dragRef.current.mode) return;
    dragRef.current.mode = null;
    setDragMode(null);
    try {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    } catch {
      // ignore
    }
  };

  const startDrag = (mode, e) => {
    if (!safeDuration) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      mode,
      startClientX: e.clientX,
      startA: start,
      startB: end,
    };
    setDragMode(mode);
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  };

  useEffect(() => () => {
    endDrag();
    if (seekRaf.current != null) cancelAnimationFrame(seekRaf.current);
  }, []);

  const timeHint = `${formatTime(start)} → ${formatTime(end)} · intro ${formatTime(Math.max(0, end - start))}`;

  const padX = 14;
  const railH = 8;
  const handleW = 12;
  const handleH = 26;

  return (
    <div style={{ width: '100%' }}>
      {showTimeRow && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, color: '#aaa', marginBottom: 8 }}>
          <span>
            Start: <strong style={{ color: '#fff' }}>{formatTime(start)}</strong>
          </span>
          <span>
            End: <strong style={{ color: '#fff' }}>{formatTime(end)}</strong>
          </span>
          <span>
            Intro: <strong style={{ color: '#46d369' }}>{formatTime(Math.max(0, end - start))}</strong>
          </span>
        </div>
      )}

      <div
        ref={trackRef}
        role="slider"
        aria-label={timeHint}
        title={timeHint}
        onClick={(e) => {
          if (!onSeek || !safeDuration) return;
          if (e.target.closest('[data-intro-thumb]')) return;
          if (e.target.closest('[data-intro-range]')) return;
          const t = snap(getTimeFromClientX(e.clientX), stepSeconds);
          onSeek(t);
        }}
        style={{
          position: 'relative',
          height: showTimeRow ? 48 : 40,
          borderRadius: attachedBelowVideo ? '0 0 8px 8px' : 10,
          background: attachedBelowVideo ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.35)',
          border: attachedBelowVideo ? 'none' : '1px solid rgba(255,255,255,0.12)',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        {/* Rail (thanh cuộn) — toàn bộ chiều dài = thời lượng */}
        <div
          style={{
            position: 'absolute',
            left: padX,
            right: padX,
            top: '50%',
            transform: 'translateY(-50%)',
            height: railH,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.08)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.35)',
            pointerEvents: 'none',
          }}
        />

        {/* Đoạn intro giữa hai đầu */}
        <div
          style={{
            position: 'absolute',
            left: `calc(${padX}px + (100% - ${padX * 2}px) * ${startPct / 100})`,
            width: `calc((100% - ${padX * 2}px) * ${Math.max(0, endPct - startPct) / 100})`,
            top: '50%',
            transform: 'translateY(-50%)',
            height: railH,
            borderRadius: 999,
            background: dragMode === 'range' ? 'rgba(70,211,105,0.55)' : 'rgba(70,211,105,0.4)',
            pointerEvents: 'none',
          }}
        />

        {/* Vùng kéo cả đoạn intro (trên segment xanh) */}
        <div
          data-intro-range
          onPointerDown={(e) => startDrag('range', e)}
          style={{
            position: 'absolute',
            left: `calc(${padX}px + (100% - ${padX * 2}px) * ${startPct / 100})`,
            width: `calc((100% - ${padX * 2}px) * ${Math.max(0, endPct - startPct) / 100})`,
            top: '50%',
            transform: 'translateY(-50%)',
            height: 28,
            borderRadius: 6,
            cursor: 'grab',
            pointerEvents: 'auto',
            background: 'transparent',
          }}
          title="Kéo để dịch cả đoạn intro"
        />

        {/* Tay nắm trái / phải — kiểu nút thanh cuộn */}
        <div
          data-intro-thumb
          onPointerDown={(e) => startDrag('start', e)}
          style={{
            position: 'absolute',
            left: `calc(${padX}px + (100% - ${padX * 2}px) * ${startPct / 100} - ${handleW / 2}px)`,
            top: '50%',
            transform: 'translateY(-50%)',
            width: handleW,
            height: handleH,
            borderRadius: 6,
            background: 'linear-gradient(180deg, #f5f5f5 0%, #c8c8c8 100%)',
            border: '1px solid rgba(0,0,0,0.35)',
            boxShadow: dragMode === 'start' ? '0 0 0 3px rgba(229,9,20,0.35), 0 2px 6px rgba(0,0,0,0.4)' : '0 2px 6px rgba(0,0,0,0.45)',
            cursor: 'ew-resize',
            zIndex: 2,
          }}
          title="Đầu intro — kéo"
        />

        <div
          data-intro-thumb
          onPointerDown={(e) => startDrag('end', e)}
          style={{
            position: 'absolute',
            left: `calc(${padX}px + (100% - ${padX * 2}px) * ${endPct / 100} - ${handleW / 2}px)`,
            top: '50%',
            transform: 'translateY(-50%)',
            width: handleW,
            height: handleH,
            borderRadius: 6,
            background: 'linear-gradient(180deg, #f5f5f5 0%, #c8c8c8 100%)',
            border: '1px solid rgba(0,0,0,0.35)',
            boxShadow: dragMode === 'end' ? '0 0 0 3px rgba(229,9,20,0.35), 0 2px 6px rgba(0,0,0,0.4)' : '0 2px 6px rgba(0,0,0,0.45)',
            cursor: 'ew-resize',
            zIndex: 2,
          }}
          title="Cuối intro — kéo"
        />
      </div>
    </div>
  );
}
