import React, { useRef, useEffect, useCallback } from 'react';
import { City, GRID_SIZE, PlayerId, PlayerInfo } from '../types/game';
import { FACTION_PALETTES } from '../utils/pixelRenderer';
import { Maximize2 } from 'lucide-react';

interface MinimapProps {
  gridSize?: number;
  owners: Uint8Array;
  cities: City[];
  deathStates?: Uint8Array;
  exploredTiles: Uint8Array;
  showAllFog: boolean;
  cameraX: number;
  cameraY: number;
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
  players: PlayerInfo[];
  onPanTo: (worldX: number, worldY: number) => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  gridSize,
  owners,
  cities,
  deathStates,
  exploredTiles,
  showAllFog,
  cameraX,
  cameraY,
  zoom,
  viewportWidth,
  viewportHeight,
  players,
  onPanTo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);
  const currentGridSize = gridSize || GRID_SIZE;

  const drawMinimap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    // Map grid down to canvas size
    const scale = currentGridSize / size;

    // Palette lookup RGB
    const rgbColors: Record<PlayerId, [number, number, number]> = {
      0: [100, 116, 139], // Grey
      1: [37, 99, 235],   // Blue
      2: [220, 38, 38],   // Red
      3: [22, 163, 74],   // Green
      4: [217, 119, 6],   // Gold
    };

    for (let my = 0; my < size; my++) {
      for (let mx = 0; mx < size; mx++) {
        const gx = Math.min(currentGridSize - 1, Math.floor(mx * scale));
        const gy = Math.min(currentGridSize - 1, Math.floor(my * scale));
        const gIdx = gy * currentGridSize + gx;

        const isExplored = showAllFog || exploredTiles[gIdx] === 1;
        const pIdx = (my * size + mx) * 4;

        if (!isExplored) {
          data[pIdx] = 15;     // R
          data[pIdx + 1] = 23; // G
          data[pIdx + 2] = 42; // B
          data[pIdx + 3] = 255;
        } else {
          const owner = owners[gIdx] as PlayerId;
          const [r, g, b] = rgbColors[owner] || rgbColors[0];
          const isInverted = Boolean(deathStates && deathStates[gIdx] > 0);

          data[pIdx] = isInverted ? 255 - r : r;
          data[pIdx + 1] = isInverted ? 255 - g : g;
          data[pIdx + 2] = isInverted ? 255 - b : b;
          data[pIdx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Draw Cities on minimap
    for (const city of cities) {
      const gIdx = city.y * currentGridSize + city.x;
      const isExplored = showAllFog || exploredTiles[gIdx] === 1;
      if (!isExplored) continue;

      const mx = Math.floor(city.x / scale);
      const my = Math.floor(city.y / scale);

      ctx.fillStyle = city.isCapital ? '#FEF08A' : '#FFFFFF';
      ctx.fillRect(mx - 1, my - 1, 3, 3);
      ctx.fillStyle = '#000000';
      ctx.fillRect(mx, my, 1, 1);
    }

    // Draw Viewport Box
    const viewTileW = viewportWidth / zoom;
    const viewTileH = viewportHeight / zoom;
    const viewLeft = (cameraX / zoom) / scale;
    const viewTop = (cameraY / zoom) / scale;
    const viewWidth = viewTileW / scale;
    const viewHeight = viewTileH / scale;

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(viewLeft, viewTop, viewWidth, viewHeight);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(viewLeft, viewTop, viewWidth, viewHeight);
  }, [currentGridSize, owners, cities, deathStates, exploredTiles, showAllFog, cameraX, cameraY, zoom, viewportWidth, viewportHeight]);

  useEffect(() => {
    drawMinimap();
  }, [drawMinimap]);

  const handlePointerAction = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scale = currentGridSize / canvas.width;
    const worldTileX = Math.max(0, Math.min(currentGridSize - 1, Math.floor(clickX * scale)));
    const worldTileY = Math.max(0, Math.min(currentGridSize - 1, Math.floor(clickY * scale)));

    onPanTo(worldTileX, worldTileY);
  };

  return (
    <div className="bg-[#111827] border-2 border-slate-700 shadow-2xl p-2 select-none font-mono">
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[10px] text-slate-300">
        <span className="font-bold tracking-wider uppercase text-amber-400">Tactical Radar</span>
        <span className="text-slate-400">{currentGridSize} × {currentGridSize}</span>
      </div>

      <div className="relative border border-slate-800 bg-black cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={180}
          height={180}
          className="block"
          onPointerDown={(e) => {
            isDraggingRef.current = true;
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            handlePointerAction(e);
          }}
          onPointerMove={(e) => {
            if (isDraggingRef.current) {
              handlePointerAction(e);
            }
          }}
          onPointerUp={() => {
            isDraggingRef.current = false;
          }}
        />
      </div>

      {/* Faction Roster Mini Summary */}
      <div className="mt-2 space-y-1 text-[10px]">
        {players.map((p) => {
          const pal = FACTION_PALETTES[p.id];
          return (
            <div key={p.id} className="flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-1.5 truncate">
                <div
                  className="w-2 h-2 shrink-0 border border-black"
                  style={{ backgroundColor: pal.primary }}
                />
                <span className={`truncate ${p.isEliminated ? 'line-through text-slate-600' : ''}`}>
                  {p.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 tabular-nums shrink-0">
                <span>{p.citiesCount} C</span>
                <span>·</span>
                <span>{p.territoryCount} T</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
