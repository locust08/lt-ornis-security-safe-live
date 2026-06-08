/// <reference path="../.astro/types.d.ts" />

interface Window {
  ttq?: {
    track?: (eventName: string, payload?: Record<string, unknown>) => void;
  };
  ornisTrackMetaEvent?: (
    eventName: string,
    parameters?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => void;
  ornisTrackMetaCustomEvent?: (eventName: string, parameters?: Record<string, unknown>) => void;
}
