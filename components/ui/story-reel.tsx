import React from 'react';
import { StoryItem, StoryItemProps } from './story-item'; // Assuming StoryItem will be in the same dir

// Extend the item type to include the 'type' property needed by StoryItem
interface StoryReelItem extends Omit<StoryItemProps, 'onClick'> {
  type: 'ADD' | 'USER_STORY' | 'QUESTIONS' | 'INFO_BLOCKS' | 'POWER_HOUR' | 'FRIEND' | 'FRIEND_PLACEHOLDER';
  id?: string | number;
  imageUrl: string;
  // hasNotification?: boolean; // already in StoryItemProps
}

interface StoryReelProps {
  items: StoryReelItem[]; // Use the extended type
  onItemClick: (item: StoryReelItem, index: number) => void; // Handler for clicks
  // TODO: Add props for fetching/loading state if data isn't passed directly
}

export const StoryReel: React.FC<StoryReelProps> = ({ items, onItemClick }) => {
  return (
    <div className="flex space-x-3 overflow-x-auto py-1 px-1 scrollbar-hide">
      {/* Example: Your Story Item - This will likely be handled dynamically */}
      {/* <StoryItem
        title="Your story"
        imageUrl="/placeholder-add.png" // Placeholder or user's actual story thumbnail
        onClick={() => console.log('Add story clicked')}
        isAddStory // Special prop potentially for the plus icon
      /> */}

      {items.map((item, index) => (
        <StoryItem
          key={item.id || index} // Use a stable key like item.id if available
          id={item.id}
          title={item.title}
          imageUrl={item.imageUrl}
          onClick={() => onItemClick(item, index)}
          hasNotification={item.hasNotification} // Example: Add visual indicator
        />
      ))}
    </div>
  );
}; 