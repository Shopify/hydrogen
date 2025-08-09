import type {ModelViewerElement} from '@google/model-viewer/lib/model-viewer.js';
import type {PartialDeep} from 'type-fest';

declare global {
  namespace React.JSX {
    interface IntrinsicElements {
      'shop-pay-button': {
        channel?: string;
        variants: string;
        'store-url': string;
      };
      'model-viewer': PartialDeep<
        ModelViewerElement,
        {recurseIntoArrays: true}
      > & { 
        class?: string; 
        bounds?: string; 
        'rotation-per-second'?: string; 
        'interaction-policy'?: string; 
        'rotationPerSecond'?: string;
        'interactionPolicy'?: string;
        ref?: (instance: HTMLElement | null) => void;
      };
    }
  }
}

export {};