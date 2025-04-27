"use client";

import React, { useState, useEffect } from 'react';
import { UserStory, StoryType } from '@prisma/client';
import Image from 'next/image';
import { X, Pause, Play } from 'lucide-react'; // Removed ChevronLeft/Right for single view
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion'; // Import motion components

// Updated Props for viewing a single story
interface StoryViewerProps {
  story: UserStory | null; // The story to display
  user: { // User who owns the story
    username: string | null;
    profileImage: string | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

const STORY_DURATION_MS = 7000; // 7 seconds

// Define animation variants
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const StoryViewer: React.FC<StoryViewerProps> = ({ story, user, isOpen, onClose }) => {
  // Removed currentIndex state
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Reset progress when story changes or modal opens/closes
  useEffect(() => {
    setProgress(0);
    setIsPaused(false);
  }, [story, isOpen]);

  // Timer logic for progress and auto-close/next
  useEffect(() => {
    if (!isOpen || isPaused || !story) {
      return; // Don't run timer if closed, paused, or no story
    }

    setProgress(0); // Reset progress for the new story
    const startTime = Date.now();

    const intervalId = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const calculatedProgress = Math.min(100, (elapsedTime / STORY_DURATION_MS) * 100);
      setProgress(calculatedProgress);

      if (elapsedTime >= STORY_DURATION_MS) {
        // Just close when timer finishes for single view
        onClose();
        // If implementing multi-story view later, call handleNext here
      }
    }, 50);

    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, isOpen, isPaused]); // Removed onClose from deps to prevent reset on re-render

  // Removed handleNext and handlePrev

  // Use the passed story directly
  const currentStory = story;
  const storyUser = user; // Use passed user info

  if (!isOpen || !currentStory || !storyUser) {
    return null; // Don't render if closed or missing data
  }

  // Use AnimatePresence to handle mount/unmount animations
  return (
    <AnimatePresence>
      {isOpen && currentStory && storyUser && (
        <motion.div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4 backdrop-blur-sm"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="relative w-full max-w-md h-[85vh] max-h-[700px] bg-muted rounded-lg overflow-hidden flex flex-col items-center justify-center"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.6 }}
            onClick={(e) => e.stopPropagation()} // Prevent clicks on modal closing backdrop
          >
            {/* Progress Bar Container (simplified for single story) */}
            <div className="absolute top-2 left-2 right-2 flex space-x-1 px-1">
              <div className="flex-1 h-1 bg-gray-500 bg-opacity-50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Header: User Info & Close Button */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <div className="flex items-center space-x-2">
                {/* Use actual Avatar with passed user data */}
                <Avatar className="h-8 w-8">
                  <AvatarImage src={storyUser.profileImage || undefined} alt={storyUser.username || 'User'} />
                  <AvatarFallback>{(storyUser.username || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-white">{storyUser.username || 'User'}</p>
                  <p className="text-xs text-gray-300">
                    {formatDistanceToNowStrict(new Date(currentStory.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 h-8 w-8">
                <X size={20} />
              </Button>
            </div>

            {/* Story Content (remains largely the same) */}
            <div className="w-full h-full flex items-center justify-center">
              {currentStory.type === StoryType.IMAGE && currentStory.contentUrl && (
                <Image
                  src={currentStory.contentUrl}
                  alt="Story Image"
                  fill
                  className="object-contain"
                  priority
                />
              )}
              {currentStory.type === StoryType.TEXT && currentStory.textContent && (
                <div className="p-8 text-center text-white text-2xl font-semibold break-words">
                  {currentStory.textContent}
                </div>
              )}
              {/* TODO: Add rendering for GAME_SCREENSHOT and HIGH_SCORE */}
              {(currentStory.type !== StoryType.IMAGE && currentStory.type !== StoryType.TEXT) && (
                    <p className="text-white">Unsupported story type</p>
              )}
            </div>

             {/* Clickable Zones (simplified for single view) */}
             <div className="absolute inset-0 flex z-20">
                {/* Pause/Resume zone */}
                <div className="w-full h-full cursor-pointer" onClick={() => setIsPaused(p => !p)}></div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 