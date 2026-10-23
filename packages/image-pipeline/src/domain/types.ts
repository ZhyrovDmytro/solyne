export interface RasterImage {
  readonly data: Uint8Array;
  readonly height: number;
  readonly width: number;
}

export interface SkinMask {
  readonly alpha: Uint8Array;
  readonly height: number;
  readonly width: number;
}

export interface SkinMaskDiagnostics {
  readonly engine: string;
  readonly inferenceMs: number;
  readonly model: string;
  readonly selectedPixelRatio: number;
}

export interface SkinMaskResult {
  readonly diagnostics: SkinMaskDiagnostics;
  readonly mask: SkinMask;
}

export interface SkinMaskEngine {
  segment(input: RasterImage): Promise<SkinMaskResult>;
}

export interface MaskRefiner {
  refine(input: { image: RasterImage; mask: SkinMask }): Promise<SkinMask>;
}

export type TanIntensity = number;

export interface TanRenderInput {
  readonly image: RasterImage;
  readonly intensity: TanIntensity;
  readonly mask: SkinMask;
}

export interface TanRenderResult {
  readonly image: RasterImage;
  readonly rendererVersion: string;
}

export interface TanRenderer {
  render(input: TanRenderInput): Promise<TanRenderResult>;
}
