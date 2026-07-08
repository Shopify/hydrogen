import type {} from "../../globals";

declare global {
  interface Window {
    PerfKit?: {
      navigate: () => void;
      setPageType: (pageType: string) => void;
    };
  }
}

export {};
