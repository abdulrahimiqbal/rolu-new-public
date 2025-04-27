"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Pause } from "lucide-react";

export interface GameControlsProps {
  onLaneChange: (lane: number) => void;
  onPause: () => void;
}

export function GameControls({ onLaneChange, onPause }: GameControlsProps) {
  const [currentLane, setCurrentLane] = useState(1); // Start in the middle lane (0, 1, 2)

  // Sync with parent component if needed
  useEffect(() => {
    // Initialize by telling the parent our starting lane
    onLaneChange(currentLane);
  }, [onLaneChange, currentLane]);

  const handleLeftMove = () => {
    if (currentLane > 0) {
      const newLane = currentLane - 1;
      setCurrentLane(newLane);
      onLaneChange(newLane);
    }
  };

  const handleRightMove = () => {
    if (currentLane < 2) {
      const newLane = currentLane + 1;
      setCurrentLane(newLane);
      onLaneChange(newLane);
    }
  };

  return (
    <div className="flex justify-between items-center">
      <button
        onClick={handleLeftMove}
        disabled={currentLane === 0}
        className="w-16 h-16 flex items-center justify-center bg-black/30 rounded-full disabled:opacity-50 active:bg-black/50 transition-colors"
        aria-label="Move left"
      >
        <ArrowLeft className="w-8 h-8 text-white" />
      </button>

      <button
        onClick={onPause}
        className="w-12 h-12 flex items-center justify-center bg-black/30 rounded-full active:bg-black/50 transition-colors"
        aria-label="Pause game"
      >
        <Pause className="w-6 h-6 text-white" />
      </button>

      <button
        onClick={handleRightMove}
        disabled={currentLane === 2}
        className="w-16 h-16 flex items-center justify-center bg-black/30 rounded-full disabled:opacity-50 active:bg-black/50 transition-colors"
        aria-label="Move right"
      >
        <ArrowRight className="w-8 h-8 text-white" />
      </button>
    </div>
  );
}
