import React, { useEffect, useRef, useState } from 'react';
import { SWATCHES } from '@/constants';
import { ColorSwatch, Group } from '@mantine/core';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { DndContext, useDraggable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

interface Response {
  expr: string;
  result: string;
  assign: boolean;
}

type Position = { x: number; y: number };

declare global {
  interface Window {
    MathJax: any;
  }
}

// Draggable component
function DraggableLatex({
  id,
  children,
  position,
}: {
  id: string;
  children: React.ReactNode;
  position: Position;
  onDragEnd: (id: string, position: Position) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const [isDragging, setIsDragging] = useState(false);

  const style: React.CSSProperties = {
    position: 'absolute',
    top: position.y,
    left: position.x,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    zIndex: isDragging ? 1000 : undefined,
    pointerEvents: 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onPointerDown={() => setIsDragging(true)}
      onPointerUp={() => setIsDragging(false)}
      onPointerCancel={() => setIsDragging(false)}
      onPointerLeave={() => setIsDragging(false)}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('rgb(255,255,255)');
  const [reset, setReset] = useState(false);
  const [latexExpressions, setLatexExpressions] = useState<string[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [dictOfVars, setDictOfVars] = useState({});
  const dpr = window.devicePixelRatio || 1;
  const [isErasing, setIsErasing] = useState(false);
  const [eraserSize, setEraserSize] = useState(12);

  // Load MathJax
  useEffect(() => {
    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.MathJax) {
        window.MathJax.Hub.Config({
          tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
        });
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      canvas.style.background = 'black';
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineWidth = 3;
      }
    }
  }, []);

  // Typeset with MathJax
  useEffect(() => {
    if (latexExpressions.length > 0 && window.MathJax) {
      setTimeout(() => {
        window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub]);
      }, 0);
    }
  }, [latexExpressions]);

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.background = 'black';
    }
  };

  useEffect(() => {
    if (reset) {
        resetCanvas();
        setLatexExpressions([]);
        setPositions([]);
        setDictOfVars({});
        setReset(false);
    }
  }, [reset]);

  const sendData = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const imageData = canvas.toDataURL('image/png');

    try {
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/calculate/`, {
        image: imageData,
        dict_of_vars: dictOfVars,
        });

        const respData: Response[] = response.data.data;

        const newLatexList: string[] = [];
        const newPositions: Position[] = [];

        respData.forEach((data, idx) => {
        if (data.assign) {
            setDictOfVars((prev) => ({ ...prev, [data.expr]: data.result }));
        }

        const latex = `\\(\\LARGE{${data.expr} = ${data.result}}\\)`;
        newLatexList.push(latex);

        // Arrange results vertically spaced by 60px starting from y=50, x=10 fixed
        const pos: Position = { x: 10, y: 50 + (latexExpressions.length + idx) * 15 };

        newPositions.push(pos);
        });

        setLatexExpressions((prev) => [...prev, ...newLatexList]);
        setPositions((prev) => [...prev, ...newPositions]);
    } catch (error) {
        console.error('Error sending data:', error);
    }
};

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.background = 'black';
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.strokeStyle = isErasing ? 'black' : color;
      ctx.lineWidth = isErasing ? eraserSize : 5;
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => setIsDrawing(false);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const index = parseInt(active.id.toString().replace('latex-', ''), 10);
    if (isNaN(index)) return;

    setPositions((prev) =>
      prev.map((pos, i) =>
        i === index
          ? {
              x: pos.x + delta.x,
              y: pos.y + delta.y,
            }
          : pos
      )
    );
  };

  return (
    <>
      <div className="grid grid-cols-[1fr_2fr_1fr] gap-2 items-center p-2 bg-black">
            <Button
                onClick={() => setReset(true)}
                className="z-20 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 text-white font-semibold rounded-2xl px-5 py-2 shadow-md
    hover:from-indigo-600 hover:via-purple-700 hover:to-pink-700 hover:shadow-lg transition duration-300 ease-in-out border border-gray-300 hover:border-white"
            >
                Reset
            </Button>

            <Group
                className="z-20 justify-self-center border border-gray-300 rounded p-1 bg-gray-900 items-center"
                >
                {SWATCHES.map((swatch) => (
                    <ColorSwatch
                    key={swatch}
                    color={swatch}
                    onClick={() => setColor(swatch)}
                    size={16}
                    style={{ border: '1px solid #ccc', cursor: 'pointer' }}
                    className="hover:border-white transition-all duration-300"
                    />
                ))}
            </Group>

            <Button
                onClick={sendData}
                className="z-20 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 text-white font-semibold rounded-2xl px-5 py-2 shadow-md
    hover:from-indigo-600 hover:via-purple-700 hover:to-pink-700 hover:shadow-lg transition duration-300 ease-in-out border border-gray-300 hover:border-white"
            >
                Run
            </Button>
            </div>
            <div className="">
                <Button
                    onClick={() => setIsErasing((prev) => !prev)}
                    className={`fixed bottom-5 right-5 flex items-center gap-1 px-2 py-2 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl z-50 transition-all duration-300 border border-gray-400 ${
                    isErasing
                        ? 'bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800'
                        : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600'
                    }`}
                >
                    {isErasing ? '🧽' : '🧼'}
                </Button>
            </div>

      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full"
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onMouseMove={draw}
      />

      <DndContext onDragEnd={handleDragEnd}>
        {latexExpressions.map((latex, index) => (
          <DraggableLatex
            key={index}
            id={`latex-${index}`}
            position={positions[index] || { x: 10, y: 200 }}
            onDragEnd={() => {}}
          >
            <div className="p-2 text-white rounded shadow-md">
              <div className="latex-content">{latex}</div>
            </div>
          </DraggableLatex>
        ))}
      </DndContext>
    </>
  );
}
