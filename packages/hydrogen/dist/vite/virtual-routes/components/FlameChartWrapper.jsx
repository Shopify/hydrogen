import { jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useRef } from "react";
import _useResizeObserver from "use-resize-observer";
const useResizeObserver = _useResizeObserver;
const FlameChartWrapper = (props) => {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const flameChart = useRef(null);
  useResizeObserver({
    ref: boxRef,
    onResize: ({ width = 0, height = 0 }) => {
      if (props.onResize) {
        props.onResize(flameChart.current, width, height);
      } else {
        flameChart.current?.resize(width, height - 3);
      }
    }
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
      timeframeTimeseries
    } = props;
    if (canvasRef.current && boxRef.current) {
      const { width = 0, height = 0 } = boxRef.current.getBoundingClientRect();
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
        plugins
      });
    }
  }, [props]);
  const setBoxRef = useCallback(
    (ref) => {
      const isNewRef = ref !== boxRef.current;
      boxRef.current = ref;
      if (isNewRef) {
        initialize();
      }
    },
    [initialize]
  );
  const setCanvasRef = useCallback(
    (ref) => {
      const isNewRef = ref !== canvasRef.current;
      canvasRef.current = ref;
      if (isNewRef) {
        initialize();
      }
    },
    [initialize]
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
      flameChart.current?.on("select", props.onSelect);
    }
    return () => {
      if (props.onSelect) {
        flameChart.current?.removeListener("select", props.onSelect);
      }
    };
  }, [props.onSelect]);
  return /* @__PURE__ */ jsx("div", { style: { height: `100%` }, className: props.className, ref: setBoxRef, children: /* @__PURE__ */ jsx("canvas", { ref: setCanvasRef }) });
};
export {
  FlameChartWrapper
};
