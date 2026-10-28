export interface Atmosphere { step(dt: number): void; draw(): void; resize(): void; destroy(): void }
export function createAtmosphere(canvas: HTMLCanvasElement, theme: string, opts?: { manual?: boolean; width?: number; height?: number; dpr?: number }): Atmosphere;
export function startAtmosphere(canvas: HTMLCanvasElement, theme: string): { setTheme: (next: string) => void; destroy: () => void };
