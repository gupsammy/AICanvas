import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { LayerData } from '../types';
import { MINIMAP_LAYER_COLORS } from '../constants';

interface MinimapProps {
  layers: LayerData[];
  selectedLayerId: string | null;
  canvasOffset: { x: number; y: number };
  scale: number;
  onViewportChange: (offset: { x: number; y: number }) => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 150;

export default function Minimap({
  layers,
  selectedLayerId,
  canvasOffset,
  scale,
  onViewportChange,
}: MinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [minimapZoom, setMinimapZoom] = useState(1);
  const [isDraggingViewport, setIsDraggingViewport] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Get viewport bounds in world coordinates
  const getViewportInWorld = useCallback((): Rect => {
    const x = -canvasOffset.x / scale;
    const y = -canvasOffset.y / scale;
    const width = window.innerWidth / scale;
    const height = window.innerHeight / scale;
    return { x, y, width, height };
  }, [canvasOffset, scale]);

  // Compute content bounds (all layers + viewport) with padding
  const contentBounds = useMemo((): Rect => {
    const viewport = getViewportInWorld();

    if (layers.length === 0) {
      // No layers - just show viewport area with padding
      const padding = Math.max(viewport.width, viewport.height) * 0.1;
      return {
        x: viewport.x - padding,
        y: viewport.y - padding,
        width: viewport.width + padding * 2,
        height: viewport.height + padding * 2,
      };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Include all layers
    layers.forEach(layer => {
      minX = Math.min(minX, layer.x);
      minY = Math.min(minY, layer.y);
      maxX = Math.max(maxX, layer.x + layer.width);
      maxY = Math.max(maxY, layer.y + layer.height);
    });

    // Include viewport bounds
    minX = Math.min(minX, viewport.x);
    minY = Math.min(minY, viewport.y);
    maxX = Math.max(maxX, viewport.x + viewport.width);
    maxY = Math.max(maxY, viewport.y + viewport.height);

    // Add 10% padding
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const padding = Math.max(contentWidth, contentHeight) * 0.1;

    return {
      x: minX - padding,
      y: minY - padding,
      width: contentWidth + padding * 2,
      height: contentHeight + padding * 2,
    };
  }, [layers, getViewportInWorld]);

  // Calculate transform from world to minimap coordinates
  const worldToMinimap = useCallback((worldX: number, worldY: number): { x: number; y: number; scale: number } => {
    const fitScale = Math.min(
      MINIMAP_WIDTH / contentBounds.width,
      MINIMAP_HEIGHT / contentBounds.height
    ) * minimapZoom;

    const scaledWidth = contentBounds.width * fitScale;
    const scaledHeight = contentBounds.height * fitScale;
    const offsetX = (MINIMAP_WIDTH - scaledWidth) / 2;
    const offsetY = (MINIMAP_HEIGHT - scaledHeight) / 2;

    return {
      x: (worldX - contentBounds.x) * fitScale + offsetX,
      y: (worldY - contentBounds.y) * fitScale + offsetY,
      scale: fitScale,
    };
  }, [contentBounds, minimapZoom]);

  // Calculate transform from minimap to world coordinates
  const minimapToWorld = useCallback((minimapX: number, minimapY: number): { x: number; y: number } => {
    const fitScale = Math.min(
      MINIMAP_WIDTH / contentBounds.width,
      MINIMAP_HEIGHT / contentBounds.height
    ) * minimapZoom;

    const scaledWidth = contentBounds.width * fitScale;
    const scaledHeight = contentBounds.height * fitScale;
    const offsetX = (MINIMAP_WIDTH - scaledWidth) / 2;
    const offsetY = (MINIMAP_HEIGHT - scaledHeight) / 2;

    return {
      x: (minimapX - offsetX) / fitScale + contentBounds.x,
      y: (minimapY - offsetY) / fitScale + contentBounds.y,
    };
  }, [contentBounds, minimapZoom]);

  // Get viewport rectangle in minimap coordinates
  const viewportRect = useMemo(() => {
    const viewport = getViewportInWorld();
    const topLeft = worldToMinimap(viewport.x, viewport.y);
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: viewport.width * topLeft.scale,
      height: viewport.height * topLeft.scale,
    };
  }, [getViewportInWorld, worldToMinimap]);

  // Click to jump to location
  const handleMinimapClick = useCallback((e: React.MouseEvent) => {
    if (isDraggingViewport) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const minimapX = e.clientX - rect.left;
    const minimapY = e.clientY - rect.top;

    // Convert to world coordinates
    const worldPos = minimapToWorld(minimapX, minimapY);

    // Calculate new offset to center this world position in the viewport
    const newOffset = {
      x: window.innerWidth / 2 - worldPos.x * scale,
      y: window.innerHeight / 2 - worldPos.y * scale,
    };

    onViewportChange(newOffset);
  }, [isDraggingViewport, minimapToWorld, scale, onViewportChange]);

  // Start dragging viewport rectangle
  const handleViewportMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingViewport(true);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate offset from mouse to viewport center
    const viewportCenterX = viewportRect.x + viewportRect.width / 2;
    const viewportCenterY = viewportRect.y + viewportRect.height / 2;

    dragOffsetRef.current = {
      x: (e.clientX - rect.left) - viewportCenterX,
      y: (e.clientY - rect.top) - viewportCenterY,
    };
  }, [viewportRect]);

  // Drag viewport rectangle
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingViewport) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const minimapX = e.clientX - rect.left - dragOffsetRef.current.x;
    const minimapY = e.clientY - rect.top - dragOffsetRef.current.y;

    // Convert center position to world coordinates
    const worldCenter = minimapToWorld(minimapX, minimapY);

    // Calculate new offset
    const newOffset = {
      x: window.innerWidth / 2 - worldCenter.x * scale,
      y: window.innerHeight / 2 - worldCenter.y * scale,
    };

    onViewportChange(newOffset);
  }, [isDraggingViewport, minimapToWorld, scale, onViewportChange]);

  // Stop dragging
  const handleMouseUp = useCallback(() => {
    setIsDraggingViewport(false);
  }, []);

  // Global mouseup listener for drag release outside minimap
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDraggingViewport(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Minimap zoom via mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const zoomDelta = -e.deltaY * 0.002;
    setMinimapZoom(prev => Math.min(Math.max(prev + zoomDelta, 0.5), 3));
  }, []);

  // Sort layers for render order: groups first, selected last
  const sortedLayers = useMemo(() => {
    return [...layers].sort((a, b) => {
      // Groups go to back
      if (a.type === 'group' && b.type !== 'group') return -1;
      if (b.type === 'group' && a.type !== 'group') return 1;
      // Selected goes to front
      if (a.id === selectedLayerId) return 1;
      if (b.id === selectedLayerId) return -1;
      return 0;
    });
  }, [layers, selectedLayerId]);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-4 right-4 z-50 rounded-lg overflow-hidden shadow-lg select-none"
      style={{
        width: MINIMAP_WIDTH,
        height: MINIMAP_HEIGHT,
        backgroundColor: 'rgba(24, 24, 27, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(63, 63, 70, 0.8)',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleMinimapClick}
    >
      <svg width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT}>
        {/* Layer rectangles */}
        {sortedLayers.map(layer => {
          const pos = worldToMinimap(layer.x, layer.y);
          const width = layer.width * pos.scale;
          const height = layer.height * pos.scale;
          const fillColor = MINIMAP_LAYER_COLORS[layer.type] || '#3f3f46';
          const isSelected = layer.id === selectedLayerId;
          const isLoading = layer.isLoading;

          return (
            <rect
              key={layer.id}
              x={pos.x}
              y={pos.y}
              width={Math.max(width, 2)}
              height={Math.max(height, 2)}
              fill={fillColor}
              stroke={isSelected ? '#ffffff' : 'transparent'}
              strokeWidth={isSelected ? 1.5 : 0}
              opacity={layer.type === 'group' ? 0.5 : 0.8}
              className={isLoading ? 'animate-pulse' : ''}
              style={{ pointerEvents: 'none' }}
            />
          );
        })}

        {/* Viewport rectangle */}
        <rect
          x={viewportRect.x}
          y={viewportRect.y}
          width={viewportRect.width}
          height={viewportRect.height}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.6)"
          strokeWidth={1}
          style={{
            cursor: isDraggingViewport ? 'grabbing' : 'grab',
            pointerEvents: 'all',
          }}
          onMouseDown={handleViewportMouseDown}
        />
      </svg>
    </div>
  );
}
