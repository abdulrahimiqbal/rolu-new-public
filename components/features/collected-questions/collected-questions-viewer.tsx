"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CollectedQuestion } from '@/app/api/user/collected-questions/route'; // Import the type
import { cn } from '@/lib/utils'; // Import cn for conditional classes

interface CollectedQuestionsViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CollectedQuestionsViewer({ isOpen, onClose }: CollectedQuestionsViewerProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  // Fetch collected questions
  const { data: questions, isLoading, error, refetch } = useQuery<CollectedQuestion[]>({
    queryKey: ['collectedQuestions'],
    queryFn: async () => {
      const response = await fetch('/api/user/collected-questions');
      if (!response.ok) {
        throw new Error('Failed to fetch collected questions');
      }
      return response.json();
    },
    enabled: isOpen, // Only fetch when the modal is open
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Reset state when index changes or modal opens
  const resetQuestionState = useCallback(() => {
    setSelectedOptionId(null);
    setIsAnswerRevealed(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      resetQuestionState();
      // refetch(); // Optional: Refetch every time modal opens
    } else {
        // Reset fully when closed
        setCurrentIndex(0);
        resetQuestionState();
    }
  }, [isOpen, resetQuestionState]);

  // Reset state when navigating between questions
  useEffect(() => {
    resetQuestionState();
  }, [currentIndex, resetQuestionState]);

  const currentQuestion = questions?.[currentIndex];
  const correctAnswerId = currentQuestion?.options.find(o => o.isCorrect)?.id;

  const handleNext = () => {
    if (questions && currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose(); // Close after the last question
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleOptionClick = (optionId: string) => {
    if (!isAnswerRevealed) {
      setSelectedOptionId(optionId);
    }
  };

  const handleSubmitAnswer = () => {
    if (!selectedOptionId) return; // Should not happen if button is enabled
    setIsAnswerRevealed(true);
    // TODO: Optionally call useMutation here to record the review attempt
  };

  const getOptionClass = (option: CollectedQuestion['options'][number]): string => {
    if (!isAnswerRevealed) {
      // Before reveal: Highlight selected
      return selectedOptionId === option.id ? 'border-primary ring-2 ring-primary' : '';
    }
    // After reveal: Show correct/incorrect
    if (option.isCorrect) {
      return 'bg-green-100 border-green-500 text-green-900 hover:bg-green-100'; // Correct answer
    }
    if (selectedOptionId === option.id && !option.isCorrect) {
      return 'bg-red-100 border-red-500 text-red-900 hover:bg-red-100'; // Incorrectly selected
    }
    return 'bg-muted/50 border-transparent hover:bg-muted/50'; // Other incorrect options
  };

  if (!isOpen) {
    return null;
  }

  const showSubmitButton = selectedOptionId && !isAnswerRevealed;
  const showNextButton = isAnswerRevealed;
  const showFinishButton = isAnswerRevealed && questions && currentIndex === questions.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md h-[85vh] max-h-[700px] bg-background text-foreground rounded-lg overflow-hidden flex flex-col">
        
        {/* Header */} 
        <div className="flex items-center justify-between p-3 border-b">
          <h2 className="text-lg font-semibold">{t('questions.reviewTitle', 'Review Questions')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X size={20} />
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>{t('common.loading', 'Loading questions...')}</p>
            </div>
          )}
          {error && (
            <div className="text-center text-destructive">
              <p>{t('errors.questionLoadFailed', 'Failed to load questions.')}</p>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-2">
                 {t('common.retry', 'Retry')}
              </Button>
            </div>
          )}
          {!isLoading && !error && !currentQuestion && questions?.length === 0 && (
              <p className="text-muted-foreground">{t('questions.noneCollected', 'You haven\'t collected any questions yet!')}</p>
          )}
          {!isLoading && !error && currentQuestion && (
            <div className="w-full text-center">
              {/* Question Text */}
              <p className="text-xl font-medium mb-6">{currentQuestion.question}</p>
              
              {/* Options */}
              <div className="space-y-3 mb-4">
                {currentQuestion.options.map(option => (
                  <Button 
                    key={option.id} 
                    variant="outline"
                    className={cn(
                        "w-full justify-start p-4 h-auto text-left whitespace-normal transition-all relative",
                        getOptionClass(option)
                    )}
                    onClick={() => handleOptionClick(option.id)}
                    disabled={isAnswerRevealed || isLoading}
                  >
                    {option.text}
                     {/* Show icons after reveal */} 
                     {isAnswerRevealed && option.isCorrect && (
                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600" />
                     )}
                     {isAnswerRevealed && selectedOptionId === option.id && !option.isCorrect && (
                        <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-600" />
                     )}
                  </Button>
                ))}
              </div>

              {/* Explanation */} 
              {isAnswerRevealed && correctAnswerId && (
                <div className="mt-4 p-3 bg-muted rounded-md text-left text-sm">
                    <p className="font-semibold mb-1">{t('questions.explanation', 'Explanation')}:</p>
                    <p>{currentQuestion.options.find(o => o.id === correctAnswerId)?.explanation || t('questions.noExplanation', 'No explanation provided.')}</p>
                </div>
              )}
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
            {questions && questions.length > 0 && (
                 <span className="text-sm text-muted-foreground">
                     {currentIndex + 1} / {questions.length}
                 </span>
            )}
            {/* Conditional Next/Submit/Finish Button */} 
            <Button 
                variant="default" // Make submit/next/finish more prominent
                onClick={showSubmitButton ? handleSubmitAnswer : handleNext} 
                disabled={isLoading || !questions || questions.length === 0 || (showSubmitButton && !selectedOptionId) || (!showSubmitButton && !showNextButton && !showFinishButton) }
            >
                 {showFinishButton ? t('common.finish', 'Finish') : (showSubmitButton ? t('common.submit', 'Submit') : t('common.next', 'Next'))}
                 {!showFinishButton && <ChevronRight size={20} className="ml-1" />}
            </Button>
        </div>

      </div>
    </div>
  );
} 