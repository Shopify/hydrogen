import {useEffect, useRef, useState, useMemo} from 'react';
import type {fabric as FabricNS} from 'fabric';

export interface ExportedDesign {
  dataUrl: string;
  width: number;
  height: number;
}

export function FabricDesignEditor({
  width = 600,
  height = 700,
  initialImage,
  onExport,
}: {
  width?: number;
  height?: number;
  initialImage?: string;
  onExport?: (design: ExportedDesign) => void;
}) {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<FabricNS.Canvas | null>(null);
  const [fabricLib, setFabricLib] = useState<typeof import('fabric') | null>(
    null,
  );

  const devicePixelRatioSafe = useMemo(() => {
    return typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  }, []);

  useEffect(() => {
    let disposed = false;

    async function setup() {
      const fabric = await import('fabric');
      if (disposed) return;
      setFabricLib(fabric);

      const {Canvas, Image: FabricImage} = fabric;
      const canvasEl = canvasElementRef.current;
      if (!canvasEl) return;

      const canvas = new Canvas(canvasEl, {
        width,
        height,
        selection: true,
        preserveObjectStacking: true,
      });

      // handle high-DPI
      const dpr = devicePixelRatioSafe;
      canvas.setDimensions({width, height});
      canvas.setZoom(dpr);

      fabricCanvasRef.current = canvas;

      // Optional initial image
      if (initialImage) {
        FabricImage.fromURL(initialImage, (img) => {
          img.set({left: width / 2, top: height / 2, originX: 'center', originY: 'center'});
          img.scaleToWidth(Math.min(width * 0.8, 512));
          canvas.add(img);
          canvas.requestRenderAll();
        }, {crossOrigin: 'anonymous'});
      }

      // Basic helpers for quick testing
      (window as any).fabricCanvas = canvas;
    }

    void setup();

    return () => {
      disposed = true;
      const existing = fabricCanvasRef.current;
      if (existing) {
        existing.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [width, height, initialImage, devicePixelRatioSafe]);

  function handleAddText() {
    if (!fabricLib || !fabricCanvasRef.current) return;
    const {Textbox} = fabricLib;
    const textbox = new Textbox('Seu texto aqui', {
      left: width / 2,
      top: height / 2,
      originX: 'center',
      originY: 'center',
      fontSize: 36,
      fill: '#111827',
    });
    fabricCanvasRef.current.add(textbox);
    fabricCanvasRef.current.setActiveObject(textbox);
    fabricCanvasRef.current.requestRenderAll();
  }

  function handleExport() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({format: 'png', enableRetinaScaling: true});
    onExport?.({dataUrl, width, height});
  }

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
      <div style={{display: 'flex', gap: '0.5rem'}}>
        <button type="button" onClick={handleAddText}>
          Adicionar texto
        </button>
        <button type="button" onClick={handleExport}>
          Exportar PNG
        </button>
      </div>
      <canvas ref={canvasElementRef} />
    </div>
  );
}
