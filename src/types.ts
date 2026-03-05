export interface Screensaver {
  readonly name: string;
  readonly description: string;
  readonly disabled?: boolean;
  readonly boring?: boolean;
  init(canvas: HTMLCanvasElement): void;
  shutdown(): void;
}

export type ScreensaverFactory = () => Screensaver;
