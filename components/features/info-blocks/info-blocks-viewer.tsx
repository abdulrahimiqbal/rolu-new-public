"use client";

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// Use the same data structure type from the API route
import type { CollectedQuestion as InfoBlockData } from '@/app/api/user/collected-questions/route';

interface InfoBlocksViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoBlocksViewer({ isOpen, onClose }: InfoBlocksViewerProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch info blocks (which are quizzes with correct option/explanation)
  const { data: infoBlocks, isLoading, error, refetch } = useQuery<InfoBlockData[]>({
    queryKey: ['infoBlocks'],
    queryFn: async () => {
      const response = await fetch('/api/user/info-blocks');
      if (!response.ok) {
        throw new Error('Failed to fetch info blocks');
      }
      return response.json();
    },
    enabled: isOpen, // Only fetch when the modal is open
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  useEffect(() => {
    // Reset index when modal opens
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (infoBlocks && currentIndex < infoBlocks.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (infoBlocks && currentIndex === infoBlocks.length - 1) {
      onClose(); // Close after the last item
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const currentInfoBlock = infoBlocks?.[currentIndex];
  const explanation = currentInfoBlock?.options?.[0]?.explanation; // Assumes API returns only the correct option

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md h-[85vh] max-h-[700px] bg-background text-foreground rounded-lg overflow-hidden flex flex-col">
        
        {/* Header */} 
        <div className="flex items-center justify-between p-3 border-b">
          <h2 className="text-lg font-semibold">{t('infoBlocks.reviewTitle', 'Info Blocks')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X size={20} />
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>{t('common.loading', 'Loading info...')}</p>
            </div>
          )}
          {error && (
            <div className="text-center text-destructive">
              <p>{t('errors.infoLoadFailed', 'Failed to load info blocks.')}</p>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-2">
                 {t('common.retry', 'Retry')}
              </Button>
            </div>
          )}
          {!isLoading && !error && !currentInfoBlock && infoBlocks?.length === 0 && (
              <p className="text-muted-foreground">{t('infoBlocks.noneCollected', 'You haven\'t collected any info blocks yet!')}</p>
          )}
          {!isLoading && !error && currentInfoBlock && (
            <div className="w-full text-left">
              {/* Associated Question */}
              <p className="text-sm text-muted-foreground mb-2">{t('infoBlocks.relatedQuestion', 'Related Question:')}</p>
              <p className="text-lg font-medium mb-4 border-l-4 pl-3">{currentInfoBlock.question}</p>
              
              {/* Explanation (Info Block Content) */}
               <p className="text-sm text-muted-foreground mb-2">{t('infoBlocks.info', 'Information:')}</p>
              <div className="p-4 bg-muted rounded-md">
                 <p>{explanation || t('infoBlocks.noInfo', 'No information available for this topic.')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */} 
        <div className="flex items-center justify-between p-3 border-t">
            <Button 
                variant="ghost" 
                onClick={handlePrev} 
                disabled={isLoading || currentIndex === 0}
            >
                 <ChevronLeft size={20} className="mr-1" />
                 {t('common.previous', 'Previous')}
            </Button>
            {infoBlocks && infoBlocks.length > 0 && (
                 <span className="text-sm text-muted-foreground">
                     {currentIndex + 1} / {infoBlocks.length}
                 </span>
            )}
            <Button 
                variant="ghost" 
                onClick={handleNext} 
                disabled={isLoading || !infoBlocks || infoBlocks.length === 0}
            >
                 {infoBlocks && currentIndex === infoBlocks.length - 1 ? t('common.finish', 'Finish') : t('common.next', 'Next')}
                 <ChevronRight size={20} className="ml-1" />
            </Button>
        </div>

      </div>
    </div>
  );
} 