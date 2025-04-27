import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface StoryItemProps {
  id?: string | number;
  title: string;
  imageUrl: string; // Image URL is now always expected (can be placeholder/icon path)
  onClick: () => void;
  hasNotification?: boolean;
}

export const StoryItem: React.FC<StoryItemProps> = ({
  id,
  title,
  imageUrl,
  onClick,
  hasNotification = false,
}) => {
  const imageSize = 64;

  const borderClass = hasNotification
    ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600'
    : 'bg-gray-300';

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center space-y-1 text-center w-20 focus:outline-none group"
    >
      <div
        className={cn(
          'relative rounded-full p-0.5 transition-all',
          borderClass,
          'group-hover:scale-105'
        )}
        style={{ width: imageSize + 4, height: imageSize + 4 }}
      >
        <div className={cn(
            "relative rounded-full w-full h-full flex items-center justify-center overflow-hidden",
            "bg-background"
         )}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              width={imageSize}
              height={imageSize}
              className="object-cover rounded-full"
            />
          ) : (
             <div className="w-full h-full bg-muted rounded-full"></div>
          )}
        </div>
      </div>
      <span className="text-xs font-medium truncate w-full text-foreground group-hover:text-primary transition-colors">{title}</span>
    </button>
  );
}; 