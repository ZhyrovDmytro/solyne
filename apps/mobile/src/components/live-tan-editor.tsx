'use dom';

import { useEffect, useRef, useState, type PointerEvent, type CSSProperties } from "react";
import { ComparisonControl } from "./comparison-control";
import { photoTransform } from "../utils/photo-transform";
import { detectSkin } from "../image-engine/skin-detector";
import { paintMaskStroke, resizeMask, type Point } from "../image-engine/skin-mask";
import { preparePreview, renderPixels, type PreviewData } from "../image-engine/tan-renderer";

interface LiveTanEditorProps {
  dom?: import("expo/dom").DOMProps;
  imageDataUrl: string;
  adjusting: boolean;
  topInset?: number;
  bottomInset?: number;
  onAdjustingChange: (adjusting: boolean) => Promise<void>;
  onError: (message: string) => Promise<void>;
  onExport: (dataUrl: string, intensity: number, segmentationMs: number) => Promise<void>;
  onReady: (segmentationMs: number) => Promise<void>;
}

type Brush = "add" | "remove";
const INITIAL_INTENSITY = 0.5;
const MAX_PREVIEW_EDGE = 1_024;

function draw(canvas: HTMLCanvasElement, preview: PreviewData, intensity: number, overlay: boolean): void {
  canvas.getContext("2d")?.putImageData(new ImageData(renderPixels(preview, intensity, overlay), preview.width, preview.height), 0, 0);
}

export default function LiveTanEditor({ imageDataUrl, adjusting, topInset = 0, bottomInset = 0, onAdjustingChange, onError, onExport, onReady }: LiveTanEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<PreviewData | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const automaticMaskRef = useRef<Uint8Array | null>(null);
  const historyRef = useRef<Uint8Array[]>([]);
  const strokeRef = useRef<{ pointerId: number; point: Point } | null>(null);
  const segmentationMsRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const exportLock = useRef(false);
  const controlsRef = useRef<HTMLElement>(null);
  const [panelHeight, setPanelHeight] = useState(280);
  const [intensity, setIntensity] = useState(INITIAL_INTENSITY);
  const [ready, setReady] = useState(false);
  const [showMask, setShowMask] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [brush, setBrush] = useState<Brush>("remove");
  const [brushSize, setBrushSize] = useState(18);
  const [undoCount, setUndoCount] = useState(0);
  const [hasSelection, setHasSelection] = useState(false);
  const [status, setStatus] = useState("Preparing your photo…");
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [exporting, setExporting] = useState(false);

  function render(amount = intensity, overlay = adjusting && showMask, original = adjusting && showOriginal): void {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      if (canvasRef.current && previewRef.current) {
        draw(canvasRef.current, previewRef.current, original ? 0 : amount, !original && overlay);
      }
    });
  }

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      setFailed(true);
      setStatus("Selection took too long. Check your connection and retry.");
      void onError("Selection took too long. Please retry.");
    }, 60_000);
    async function prepare(): Promise<void> {
      setReady(false);
      setFailed(false);
      setStatus("Preparing your photo…");
      setIntensity(INITIAL_INTENSITY);
      setShowMask(false);
      setShowOriginal(false);
      setUndoCount(0);
      setHasSelection(false);
      previewRef.current = null;
      imageRef.current = null;
      automaticMaskRef.current = null;
      historyRef.current = [];
      strokeRef.current = null;
      const previousCanvas = canvasRef.current;
      previousCanvas?.getContext("2d")?.clearRect(0, 0, previousCanvas.width, previousCanvas.height);
      try {
        const image = new Image();
        image.src = imageDataUrl;
        await image.decode();
        controller.signal.throwIfAborted();
        const scale = Math.min(1, MAX_PREVIEW_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("The preview is unavailable. Please retry.");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("The preview could not be opened. Please retry.");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const original = context.getImageData(0, 0, canvas.width, canvas.height);
        const result = await detectSkin(canvas, controller.signal, message => {
          if (!controller.signal.aborted) setStatus(message);
        });
        controller.signal.throwIfAborted();
        segmentationMsRef.current = result.inferenceMs;
        imageRef.current = image;
        automaticMaskRef.current = new Uint8Array(result.mask);
        previewRef.current = preparePreview(original, result.mask);
        const selected = result.mask.some(value => value > 0);
        setHasSelection(selected);
        setShowMask(false);
        draw(canvas, previewRef.current, INITIAL_INTENSITY, false);
        setReady(true);
        setStatus("");
        await onReady(result.inferenceMs);
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Skin selection failed. Please retry.";
        setStatus("Couldn’t select skin. Check your connection and retry, or choose another photo.");
        setFailed(true);
        await onError(message);
      } finally {
        clearTimeout(timeout);
      }
    }
    void prepare();
    return () => {
      controller.abort();
      clearTimeout(timeout);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [imageDataUrl, attempt, onError, onReady]);

  // The native Back button returns to comparison without remounting this editor.
  useEffect(() => {
    strokeRef.current = null;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (canvasRef.current && previewRef.current) {
      draw(canvasRef.current, previewRef.current, adjusting && showOriginal ? 0 : intensity, adjusting && showMask && !showOriginal);
    }
  }, [adjusting, intensity, showMask, showOriginal]);

  function rememberMask(): void {
    if (!previewRef.current) return;
    historyRef.current.push(new Uint8Array(previewRef.current.mask));
    if (historyRef.current.length > 10) historyRef.current.shift();
    setUndoCount(historyRef.current.length);
  }

  const refining = adjusting && showMask && !showOriginal;

  useEffect(() => {
    const panel = controlsRef.current;
    if (!panel) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setPanelHeight(entry.target.getBoundingClientRect().height);
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, [adjusting]);

  function pointFor(event: PointerEvent<HTMLCanvasElement>): Point {
    const bounds = event.currentTarget.getBoundingClientRect();
    const transform = photoTransform(event.currentTarget, bounds, refining ? "contain" : "cover");
    return {
      x: (event.clientX - bounds.left - transform.left) / transform.scale,
      y: (event.clientY - bounds.top - transform.top) / transform.scale,
    };
  }

  function paint(event: PointerEvent<HTMLCanvasElement>, from: Point, to: Point): void {
    const preview = previewRef.current;
    if (!preview) return;
    const transform = photoTransform(preview, event.currentTarget.getBoundingClientRect(), refining ? "contain" : "cover");
    const radius = brushSize / transform.scale / 2;
    paintMaskStroke(preview.mask, preview.width, preview.height, from, to, radius, brush);
    render();
  }

  function finishStroke(): void {
    strokeRef.current = null;
    setHasSelection(previewRef.current?.mask.some(value => value > 0) ?? false);
  }

  async function exportPreview(): Promise<void> {
    const preview = previewRef.current;
    const image = imageRef.current;
    if (!ready || !preview || !image || !hasSelection || exportLock.current) return;
    finishStroke();
    exportLock.current = true;
    setExporting(true);
    // Give the busy state a paint before the source-resolution render.
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The result could not be prepared. Please retry.");
      context.drawImage(image, 0, 0);
      const mask = resizeMask(preview.mask, preview.width, preview.height, canvas.width, canvas.height);
      const full = preparePreview(context.getImageData(0, 0, canvas.width, canvas.height), mask);
      draw(canvas, full, intensity, false);
      // Lossless export preserves decoded source pixels outside the mask.
      await onExport(canvas.toDataURL("image/png"), intensity, segmentationMsRef.current);
    } catch {
      await onError("The result could not be saved. Please try again.");
    } finally {
      exportLock.current = false;
      setExporting(false);
    }
  }

  const disabled = !ready || exporting;
  return (
    <main className={`editor-shell ${adjusting ? "adjusting" : "result"} ${refining ? "refining" : ""}`}
      style={{ "--safe-top": `${topInset}px`, "--safe-bottom": `${bottomInset}px`, "--panel-height": `${panelHeight}px` } as CSSProperties} aria-busy={!ready && !failed}>
      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { width: 100%; height: 100%; margin: 0; overflow: hidden; }
        body { background: #171411; color: #241813; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
        button, input { font: inherit; }
        .editor-shell { position: relative; width: 100%; height: 100dvh; overflow: hidden; }
        .backdrop { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .3; filter: blur(24px); pointer-events: none; }
        .canvas-wrap { position: absolute; inset: 0; overflow: hidden; }
        .photo-frame { position: relative; width: 100%; height: 100%; }
        canvas, .before { display: block; position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .before { pointer-events: none; }
        .refining .canvas-wrap { top: calc(var(--safe-top) + 96px); bottom: calc(var(--panel-height) + var(--safe-bottom) + 28px); }
        .refining canvas { object-fit: contain; }
        .divider::after { content: "‹ ›"; position: absolute; top: 48%; left: 50%; transform: translate(-50%, -50%); background: #fffdfc; color: #241813; border-radius: 50%; width: 38px; height: 38px; display: grid; place-items: center; box-shadow: 0 2px 16px #0003; font-size: 20px; }
        .divider { position: absolute; top: 0; bottom: 0; width: 2px; background: #fffdfc; pointer-events: none; }
        .compare-labels { position: absolute; bottom: calc(var(--safe-bottom) + 90px); left: 24px; right: 24px; display: flex; justify-content: space-between; pointer-events: none; z-index: 2; }
        .compare-labels span { background: #18141180; color: #fffdfc; border: 1px solid #ffffff30; border-radius: 20px; padding: 7px 12px; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; backdrop-filter: blur(12px); }
        .comparison-layer { position: absolute; inset: 0; }
        .comparison { position: absolute; inset: 0; cursor: ew-resize; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
        .comparison:focus-visible { outline: 3px solid #e4b99b; outline-offset: -4px; }
        canvas.painting { touch-action: none; cursor: crosshair; }
        .scrim { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, #100d0bba 0%, #100d0b60 16%, transparent 32%, transparent 60%, #100d0b66 80%, #100d0bd9 100%); }
        .status { position: absolute; top: 45%; left: 24px; right: 24px; margin: 0; border-radius: 16px; background: #181411db; color: #fffdfc; font-size: 14px; padding: 16px; text-align: center; }
        .retry { position: absolute; top: 57%; left: 24px; right: 24px; }
        .controls, .result-actions { position: absolute; bottom: calc(var(--safe-bottom) + 16px); left: 16px; right: 16px; max-width: 560px; margin: 0 auto; }
        .controls { background: #fffdfcf2; border: 1px solid #ffffff80; border-radius: 20px; padding: 14px; backdrop-filter: blur(24px); max-height: 48dvh; overflow-y: auto; overscroll-behavior: contain; box-shadow: 0 8px 36px #0002; }
        .result-actions .actions { flex-wrap: nowrap; }
        .result-actions .actions button { min-height: 48px; border-radius: 16px; }
        .result-actions .actions .continue { margin: 0; flex: 1.3; background: #fffdfc; color: #241813; border-color: #fffdfc; }
        .result-actions .secondary { background: #18141180; color: #fffdfc; border-color: #ffffff50; backdrop-filter: blur(16px); }
        .result-actions .hint { color: #fffdfc; text-align: center; margin-bottom: 12px; }
        .photo-heading { position: absolute; top: 22px; left: 22px; right: 22px; color: #fffdfc; pointer-events: none; }
        .photo-heading h1 { font-size: 11px; font-weight: 700; letter-spacing: 2px; margin: 0; }
        .photo-heading p { color: #f0e7e0; font-size: 12px; line-height: 18px; margin: 6px 0 0; }
        .preparing-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
        .processing { position: absolute; inset: 0; overflow: hidden; pointer-events: none; background: #17141122; }
        .scan { position: absolute; left: 0; right: 0; height: 24%; background: linear-gradient(transparent, #efd5b533); border-bottom: 1px solid #f5dec799; animation: scan 2.8s ease-in-out infinite alternate; }
        .processing-label { position: absolute; top: 45%; left: 24px; right: 24px; text-align: center; color: #fffdfc; }
        .processing-dot { display: inline-block; width: 7px; height: 7px; margin-right: 8px; border-radius: 50%; background: #efd5b5; animation: pulse 1.4s ease-in-out infinite; }
        @keyframes scan { from { transform: translateY(-100%); } to { transform: translateY(420%); } }
        @keyframes pulse { 50% { opacity: .35; transform: scale(.8); } }
        @media (prefers-reduced-motion: reduce) { .scan { animation: none; top: 30%; } .processing-dot { animation: none; } }
        .control-head { align-items: center; display: flex; justify-content: space-between; }
        .label { font-size: 15px; font-weight: 700; }
        .value { color: #87573c; font-size: 15px; font-weight: 800; }
        input[type=range] { touch-action: pan-y; accent-color: #a86d49; min-height: 36px; width: 100%; margin: 8px 0; }
        .stops { color: #756259; display: flex; font-size: 12px; justify-content: space-between; }
        .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        button { border: 1px solid #d8c6bb; background: #f7f1eb; color: #5e4a40; border-radius: 12px; cursor: pointer; min-height: 44px; padding: 8px 12px; flex: 1; font-weight: 650; }
        button[aria-pressed=true] { background: #e8d7cc; border-color: #87573c; color: #241813; }
        .continue { background: #2a1a14; border-color: #2a1a14; color: #fffdfc; width: 100%; margin-top: 12px; }
        button:disabled { opacity: .45; cursor: default; }
        button:focus-visible, input:focus-visible { outline: 3px solid #87573c; outline-offset: 3px; }
        .hint { color: #756259; font-size: 12px; line-height: 1.5; margin: 10px 0 0; }
        .correction { border-top: 1px solid #ded0c6; margin-top: 12px; padding-top: 4px; }
        .brush-label { display: block; margin-top: 12px; font-size: 13px; }
      `}</style>
      <img className="backdrop" src={imageDataUrl} alt="" />
      <div className="canvas-wrap">
        <div className="photo-frame">
        <canvas
          ref={canvasRef}
          aria-label={adjusting && showOriginal ? "Original photo" : adjusting && showMask ? "Skin selection overlay. Use add or remove to correct the selection." : "Live tan preview"}
          className={adjusting && showMask && !showOriginal && !disabled ? "painting" : ""}
          onPointerDown={event => {
            if (!adjusting || disabled || !showMask || showOriginal || strokeRef.current || event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            rememberMask();
            const point = pointFor(event);
            strokeRef.current = { pointerId: event.pointerId, point };
            paint(event, point, point);
          }}
          onPointerMove={event => {
            const stroke = strokeRef.current;
            if (!stroke || event.pointerId !== stroke.pointerId) return;
            const point = pointFor(event);
            paint(event, stroke.point, point);
            stroke.point = point;
          }}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          onLostPointerCapture={finishStroke}
        />
        {ready && <ComparisonControl imageDataUrl={imageDataUrl} active={!adjusting} />}
        </div>
      </div>
      {!ready && <img className="preparing-photo" src={imageDataUrl} alt="Selected photo" />}
      <div className="scrim" />
      <div className="photo-heading">
        <h1>{adjusting ? "ADJUST TAN" : "YOUR RESULT"}</h1>
        <p>{adjusting ? "Fine-tune your glow." : "Slide to compare. Make it yours."}</p>
      </div>
      {!ready && !failed && <div className="processing" aria-hidden="true"><div className="scan" /></div>}
      {status && <p className="status" role={failed ? "alert" : "status"}>{!ready && !failed && <span className="processing-dot" aria-hidden="true" />}{status}</p>}
      {failed && <button className="retry" type="button" onClick={() => setAttempt(value => value + 1)}>Retry skin selection</button>}
      {!adjusting && <section className="result-actions" aria-label="Result actions">
        {ready && !hasSelection && <p className="hint" role="status">No skin detected. Choose Adjust tan to select skin manually.</p>}
        <div className="actions"><button className="continue" type="button" disabled={disabled || !hasSelection} onClick={() => void exportPreview()}>{exporting ? "Saving…" : "Save to Photos"}</button>
        <button className="secondary" type="button" disabled={disabled} onClick={() => void onAdjustingChange(true)}>Adjust tan</button></div>

      </section>}
      {adjusting && <section ref={controlsRef} className="controls" aria-label="Tan controls">
        <div className="control-head"><label className="label" htmlFor="intensity">Tan intensity</label><span className="value">{Math.round(intensity * 100)}%</span></div>
        <input id="intensity" disabled={disabled || showOriginal} min="0" max="100" type="range" value={Math.round(intensity * 100)} onChange={event => {
          const next = Number(event.currentTarget.value) / 100;
          setIntensity(next);
          render(next);
        }} />
        <div className="stops"><span>Original</span><span>Golden</span><span>Deep</span></div>
        <div className="actions">
          <button type="button" disabled={disabled} aria-pressed={showMask} onClick={() => {
            setShowMask(!showMask);
            setShowOriginal(false);
            render(intensity, !showMask, false);
          }}>{showMask ? "Done selecting" : "Refine selection"}</button>
          <button type="button" disabled={disabled} aria-pressed={showOriginal} onClick={() => {
            setShowOriginal(!showOriginal);
            render(intensity, showMask, !showOriginal);
          }}>{showOriginal ? "Show edit" : "Show original"}</button>
        </div>
        {ready && !hasSelection && <p className="hint" role="status">No skin selected. Use Add skin to paint visible skin, or choose a clearer photo.</p>}
        {showMask && !showOriginal && <div className="correction">
          <p className="hint">Pink shows where the tan applies. Brush over missed skin or remove hair, clothes and facial details. All detected people are included.</p>
          <div className="actions">
            <button type="button" disabled={disabled} aria-pressed={brush === "add"} onClick={() => setBrush("add")}>Add skin</button>
            <button type="button" disabled={disabled} aria-pressed={brush === "remove"} onClick={() => setBrush("remove")}>Remove</button>
            <button type="button" disabled={disabled || undoCount === 0} onClick={() => {
              const previous = historyRef.current.pop();
              if (previous && previewRef.current) previewRef.current.mask = previous;
              setUndoCount(historyRef.current.length);
              finishStroke();
              render();
            }}>Undo</button>
            <button type="button" disabled={disabled} onClick={() => {
              if (!previewRef.current || !automaticMaskRef.current) return;
              rememberMask();
              previewRef.current.mask = new Uint8Array(automaticMaskRef.current);
              finishStroke();
              render();
            }}>Reset mask</button>
          </div>
          <label className="brush-label" htmlFor="brush-size">Brush size · {brushSize}px</label>
          <input id="brush-size" type="range" min="4" max="60" value={brushSize} disabled={disabled} onChange={event => setBrushSize(Number(event.currentTarget.value))} />
        </div>}
        <button className="continue" type="button" disabled={disabled || !hasSelection} onClick={() => {
          setShowMask(false);
          setShowOriginal(false);
          render(intensity, false, false);
          void onAdjustingChange(false);
        }}>Done</button>

      </section>}
    </main>
  );
}
