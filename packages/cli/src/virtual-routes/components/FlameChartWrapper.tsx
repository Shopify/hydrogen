import {useCallback, useEffect, useRef, type MutableRefObject} from 'react';
import type {
  FlameChartNodes,
  FlameChartSettings,
  Marks,
  Waterfall,
  WaterfallItem,
  Mark,
  UIPlugin,
  FlatTreeNode,
  Timeseries,
  FlameChart,
} from 'flame-chart-js';

// Type is broken in use-resize-observer
import _useResizeObserver from 'use-resize-observer';
const useResizeObserver =
  _useResizeObserver as unknown as typeof import('use-resize-observer').default;

declare global {
  // Downloaded via CDN
  var flameChartJs: typeof import('flame-chart-js');
}

export type NodeTypes =
  | {node: FlatTreeNode | null; type: 'flame-chart-node'}
  | {node: WaterfallItem | null; type: 'waterfall-node'}
  | {node: Mark | null; type: 'mark'}
  | null;

export type FlameChartProps = {
  data?: FlameChartNodes;
  marks?: Marks;
  waterfall?: Waterfall;
  timeseries?: Timeseries;
  timeframeTimeseries?: Timeseries;
  colors?: Record<string, string>;
  settings?: FlameChartSettings;
  position?: {x: number; y: number};
  zoom?: {
    start: number;
    end: number;
  };
  plugins?: UIPlugin[];
  className?: string;

  onSelect?: (data: NodeTypes) => void;
  onResize?: (
    flameChart: FlameChart | null,
    width: number,
    height: number,
  ) => void;
};

export const FlameChartWrapper = (props: FlameChartProps) => {
  const boxRef = useRef<null | HTMLDivElement>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);
  const flameChart = useRef<null | FlameChart>(null);

  useResizeObserver({
    ref: boxRef,
    onResize: ({width = 0, height = 0}) => {
      flameChart.current?.resize(width, height - 3);

      if (props.onResize) {
        props.onResize(flameChart.current, width, height);
      }
    },
  });

  const initialize = useCallback(() => {
    const {
      data,
      marks,
      waterfall,
      timeseries,
      settings,
      colors,
      plugins,
      timeframeTimeseries,
    } = props;

    if (canvasRef.current && boxRef.current) {
      const {width = 0, height = 0} = boxRef.current.getBoundingClientRect();

      canvasRef.current.width = width;
      canvasRef.current.height = height - 3;

      flameChart.current = new flameChartJs.FlameChart({
        canvas: canvasRef.current,
        data,
        marks,
        waterfall,
        timeseries,
        timeframeTimeseries,
        settings,
        colors,
        plugins,
      });
    }
  }, [props]);

  const setBoxRef = useCallback(
    (ref: HTMLDivElement) => {
      const isNewRef = ref !== boxRef.current;

      boxRef.current = ref;

      if (isNewRef) {
        initialize();
      }
    },
    [initialize],
  );

  const setCanvasRef = useCallback(
    (ref: HTMLCanvasElement) => {
      const isNewRef = ref !== canvasRef.current;

      canvasRef.current = ref;

      if (isNewRef) {
        initialize();
      }
    },
    [initialize],
  );

  useEffect(() => {
    if (props.data) {
      flameChart.current?.setNodes(props.data);
    }
  }, [props.data]);

  useEffect(() => {
    if (props.marks) {
      flameChart.current?.setMarks(props.marks);
    }
  }, [props.marks]);

  useEffect(() => {
    if (props.waterfall) {
      flameChart.current?.setWaterfall(props.waterfall);
    }
  }, [props.waterfall]);

  useEffect(() => {
    if (props.timeseries) {
      flameChart.current?.setTimeseries(props.timeseries);
    }
  }, [props.timeseries]);

  useEffect(() => {
    if (props.timeframeTimeseries) {
      flameChart.current?.setTimeframeTimeseries(props.timeframeTimeseries);
    }
  }, [props.timeframeTimeseries]);

  useEffect(() => {
    if (props.settings && flameChart.current) {
      flameChart.current.setSettings(props.settings);
      flameChart.current.renderEngine.recalcChildrenSizes();
      flameChart.current.render();
    }
  }, [props.settings]);

  useEffect(() => {
    if (props.position) {
      flameChart.current?.setFlameChartPosition(props.position);
    }
  }, [props.position]);

  useEffect(() => {
    if (props.zoom) {
      flameChart.current?.setZoom(props.zoom.start, props.zoom.end);
    }
  }, [props.zoom]);

  useEffect(() => {
    if (props.onSelect) {
      flameChart.current?.on('select', props.onSelect);
    }

    return () => {
      if (props.onSelect) {
        flameChart.current?.removeListener('select', props.onSelect);
      }
    };
  }, [props.onSelect]);

  return (
    <div style={{height: `100%`}} className={props.className} ref={setBoxRef}>
      <canvas ref={setCanvasRef} />
    </div>
  );
};
