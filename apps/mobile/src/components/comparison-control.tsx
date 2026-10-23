import { useEffect, useRef, useState, type PointerEvent } from "react";
import { comparisonIntro, comparisonPosition } from "../utils/comparison-position";

export function ComparisonControl({ imageDataUrl, active }: { imageDataUrl: string; active: boolean }) {
  const [position, setPosition] = useState(50);
  const animation = useRef<number | null>(null);
  const introduced = useRef<string | null>(null);
  const pointer = useRef<number | null>(null);

  function stopAnimation() {
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    animation.current = null;
  }

  useEffect(() => {
    if (!active || introduced.current === imageDataUrl) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      introduced.current = imageDataUrl;
      return;
    }
    let start: number | undefined;
    function tick(now: number) {
      introduced.current = imageDataUrl;
      start ??= now;
      const progress = Math.min(1, (now - start) / 1500);
      setPosition(comparisonIntro(progress));
      animation.current = progress < 1 ? requestAnimationFrame(tick) : null;
    }
    animation.current = requestAnimationFrame(tick);
    return stopAnimation;
  }, [active, imageDataUrl]);

  function move(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    setPosition(comparisonPosition(event.clientX, bounds.left, bounds.width));
  }

  return <div className="comparison-layer" hidden={!active}>
    <img className="before" src={imageDataUrl} alt="Original photo" draggable={false} style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }} />
    <div className="divider" style={{ left: `${position}%` }} />
    <div className="compare-labels"><span>Before</span><span>After</span></div>
    <div className="comparison" role="slider" tabIndex={active ? 0 : -1}
      aria-label="Before and after comparison" aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={Math.round(position)} aria-valuetext={`${Math.round(position)}% original photo`}
      onPointerDown={event => {
        if (event.button !== 0 || pointer.current !== null) return;
        event.preventDefault();
        stopAnimation();
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.focus();
        move(event);
      }}
      onPointerMove={event => { if (pointer.current === event.pointerId) move(event); }}
      onPointerUp={event => {
        if (pointer.current !== event.pointerId) return;
        move(event);
        pointer.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { pointer.current = null; }}
      onLostPointerCapture={() => { pointer.current = null; }}
      onKeyDown={event => {
        const steps: Record<string, number> = { ArrowLeft: -2, ArrowDown: -2, ArrowRight: 2, ArrowUp: 2, PageDown: -10, PageUp: 10 };
        if (!(event.key in steps) && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        stopAnimation();
        setPosition(value => event.key === "Home" ? 0 : event.key === "End" ? 100 : Math.max(0, Math.min(100, value + steps[event.key]!)));
      }} />
  </div>;
}
