import { useEffect, useMemo, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { v4 as uuidv4 } from 'uuid';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../context/SocketContext';

const DEFAULT_FONT_SCALE = 16;

function extractPathPoints(path) {
  return (path?.path || []).map((segment) => segment.slice());
}

function simplifyPath(pathCommands, epsilon = 1.5) {
  if (pathCommands.length < 3) {
    return pathCommands;
  }

  const simplified = [pathCommands[0]];
  for (let index = 1; index < pathCommands.length - 1; index += 1) {
    const previous = pathCommands[index - 1];
    const current = pathCommands[index];
    const next = pathCommands[index + 1];
    const currentX = current[current.length - 2];
    const currentY = current[current.length - 1];
    const previousX = previous[previous.length - 2];
    const previousY = previous[previous.length - 1];
    const nextX = next[next.length - 2];
    const nextY = next[next.length - 1];
    const area = Math.abs((previousX * (currentY - nextY) + currentX * (nextY - previousY) + nextX * (previousY - currentY)) / 2);
    if (area > epsilon) {
      simplified.push(current);
    }
  }

  simplified.push(pathCommands[pathCommands.length - 1]);
  return simplified;
}

function smoothOpenPath(commands) {
  if (commands.length < 3) {
    return commands;
  }

  const [first] = commands;
  const last = commands[commands.length - 1];
  const startX = first[first.length - 2];
  const startY = first[first.length - 1];
  const endX = last[last.length - 2];
  const endY = last[last.length - 1];
  const midpointX = (startX + endX) / 2;
  const midpointY = (startY + endY) / 2;

  return [...commands, ['Q', midpointX, midpointY, startX, startY]];
}

export function useWhiteboard({ roomId, socket, canDraw, whiteboardScale = DEFAULT_FONT_SCALE, bandwidthLevel = 'high' }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const canvasInstance = useRef(null);
  const undoStack = useRef([]);
  const completionTimers = useRef(new Map());
  const [tool, setTool] = useState('pen');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [strokeColor, setStrokeColor] = useState('#e2e8f0');
  const [opacity, setOpacity] = useState(1);
  const [displayScale, setDisplayScale] = useState(whiteboardScale || DEFAULT_FONT_SCALE);

  const isDrawingEnabled = canDraw && tool === 'pen';

  useEffect(() => {
    setDisplayScale(whiteboardScale || DEFAULT_FONT_SCALE);
  }, [whiteboardScale]);

  useEffect(() => {
    if (!canvasRef.current || canvasInstance.current) {
      return undefined;
    }

    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: false,
      selection: true,
      preserveObjectStacking: true,
      backgroundColor: 'transparent',
      enableRetinaScaling: true,
    });

    canvasInstance.current = canvas;

    const resize = () => {
      if (!wrapperRef.current) {
        return;
      }
      const { width, height } = wrapperRef.current.getBoundingClientRect();
      canvas.setWidth(Math.max(320, width * 2));
      canvas.setHeight(Math.max(320, height * 2));
      canvas.setZoom(Math.max(0.5, displayScale / DEFAULT_FONT_SCALE));
      canvas.requestRenderAll();
    };

    resize();
    window.addEventListener('resize', resize);

    canvas.on('path:created', (event) => {
      if (!socket || !roomId) {
        return;
      }

      const path = event.path;
      const strokeId = uuidv4();
      path.set({
        id: strokeId,
        data: { createdAt: Date.now(), duration: path.__duration || 0 },
      });
      undoStack.current.push(strokeId);

      const commands = simplifyPath(extractPathPoints(path), bandwidthLevel === 'low' ? 1.5 : 0.75);
      const shouldSmooth = commands.length > 1 && path.__duration && path.__duration < 200;
      const payload = {
        id: strokeId,
        tool: 'pen',
        points: shouldSmooth ? smoothOpenPath(commands) : commands,
        color: path.stroke || strokeColor,
        width: path.strokeWidth || strokeWidth,
        opacity: path.opacity ?? opacity,
      };

      completionTimers.current.set(
        strokeId,
        window.setTimeout(() => {
          socket.emit('draw-stroke', {
            roomId,
            strokeData: payload,
          });
          completionTimers.current.delete(strokeId);
        }, path.__duration && path.__duration < 200 ? 800 : 0),
      );
    });

    const handleReceiveStroke = (strokeData) => {
      if (!strokeData?.points?.length) {
        return;
      }

      const path = new fabric.Path(strokeData.points, {
        id: strokeData.id,
        fill: null,
        stroke: strokeData.color,
        strokeWidth: strokeData.width,
        opacity: strokeData.opacity,
        selectable: true,
        evented: true,
        perPixelTargetFind: true,
      });

      canvas.add(path);
      canvas.requestRenderAll();
    };

    const handleReceiveErase = ({ objectId }) => {
      const target = canvas.getObjects().find((object) => object.id === objectId);
      if (target) {
        canvas.remove(target);
        canvas.requestRenderAll();
      }
    };

    const handleBoardCleared = () => {
      canvas.clear();
      canvas.backgroundColor = 'transparent';
      canvas.requestRenderAll();
    };

    const handleReceiveUndo = ({ objectId }) => {
      const target = canvas.getObjects().find((object) => object.id === objectId);
      if (target) {
        canvas.remove(target);
        canvas.requestRenderAll();
      }
    };

    const handleReceiveScale = ({ scale }) => {
      canvas.setZoom(Math.max(0.5, scale / DEFAULT_FONT_SCALE));
      canvas.requestRenderAll();
    };

    socket?.on('receive-stroke', handleReceiveStroke);
    socket?.on('receive-erase', handleReceiveErase);
    socket?.on('board-cleared', handleBoardCleared);
    socket?.on('receive-undo', handleReceiveUndo);
    socket?.on('receive-whiteboard-scale', handleReceiveScale);

    return () => {
      window.removeEventListener('resize', resize);
      socket?.off('receive-stroke', handleReceiveStroke);
      socket?.off('receive-erase', handleReceiveErase);
      socket?.off('board-cleared', handleBoardCleared);
      socket?.off('receive-undo', handleReceiveUndo);
      socket?.off('receive-whiteboard-scale', handleReceiveScale);
      completionTimers.current.forEach((timer) => window.clearTimeout(timer));
      completionTimers.current.clear();
      canvas.dispose();
      canvasInstance.current = null;
    };
  }, [bandwidthLevel, opacity, roomId, socket, strokeColor, strokeWidth, displayScale]);

  useEffect(() => {
    const canvas = canvasInstance.current;
    if (!canvas) {
      return;
    }

    canvas.isDrawingMode = isDrawingEnabled;
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.color = strokeColor;
    canvas.freeDrawingBrush.width = strokeWidth;
    canvas.freeDrawingBrush.shadow = null;
  }, [isDrawingEnabled, strokeColor, strokeWidth]);

  const clearBoard = () => {
    const canvas = canvasInstance.current;
    if (!canvas) {
      return;
    }

    canvas.clear();
    canvas.backgroundColor = 'transparent';
    canvas.requestRenderAll();
    socket?.emit('clear-board', { roomId });
  };

  const undo = () => {
    const canvas = canvasInstance.current;
    if (!canvas) {
      return;
    }

    const objectId = undoStack.current.pop();
    if (!objectId) {
      return;
    }

    const target = canvas.getObjects().find((object) => object.id === objectId);
    if (target) {
      canvas.remove(target);
      canvas.requestRenderAll();
      socket?.emit('undo-stroke', { roomId, objectId });
    }
  };

  const eraseAtPoint = (point) => {
    const canvas = canvasInstance.current;
    if (!canvas) {
      return;
    }

    const target = canvas
      .getObjects()
      .slice()
      .reverse()
      .find((object) => object.containsPoint(point));

    if (target) {
      canvas.remove(target);
      canvas.requestRenderAll();
      socket?.emit('erase-stroke', { roomId, objectId: target.id });
    }
  };

  const setFontScale = (scale) => {
    setDisplayScale(scale);
    if (socket && roomId) {
      socket.emit('whiteboard-scale', { roomId, scale });
    }
    const canvas = canvasInstance.current;
    if (canvas) {
      canvas.setZoom(Math.max(0.5, scale / DEFAULT_FONT_SCALE));
      canvas.requestRenderAll();
    }
  };

  const saveAsImage = () => {
    const canvas = canvasInstance.current;
    if (!canvas) {
      return;
    }

    const link = document.createElement('a');
    link.href = canvas.toDataURL({ format: 'png', multiplier: 1 });
    link.download = `whiteboard-${roomId || 'export'}.png`;
    link.click();
  };

  return {
    canvasRef,
    wrapperRef,
    canvasInstance,
    tool,
    setTool,
    strokeWidth,
    setStrokeWidth,
    strokeColor,
    setStrokeColor,
    opacity,
    setOpacity,
    displayScale,
    setFontScale,
    clearBoard,
    undo,
    eraseAtPoint,
    saveAsImage,
    isDrawingEnabled,
  };
}
