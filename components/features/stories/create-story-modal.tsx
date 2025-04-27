"use client";

import React, { useState, useCallback, ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StoryType } from '@prisma/client';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose, // If needed for explicit close button
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input'; // For file input styling later
import { Label } from '@/components/ui/label';
import { Loader2, UploadCloud, X } from 'lucide-react'; // Icons

interface CreateStoryModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

interface CreateStoryPayload {
  storyType: StoryType;
  textContent?: string | null;
  file?: File | null;
}

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ isOpen, onOpenChange }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [storyType, setStoryType] = useState<StoryType>(StoryType.TEXT); // Default to text
  const [textContent, setTextContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setTextContent('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setStoryType(StoryType.TEXT); // Reset to default
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm(); // Reset form when closing
    }
    onOpenChange(open);
  };

  const { mutate: createStory, isPending: isCreatingStory } = useMutation({
    mutationFn: async (payload: CreateStoryPayload) => {
      const formData = new FormData();
      formData.append('storyType', payload.storyType);

      if (payload.textContent) {
        formData.append('textContent', payload.textContent);
      }
      if (payload.file) {
        formData.append('file', payload.file);
      }

      const response = await fetch('/api/stories', {
        method: 'POST',
        body: formData,
        // Headers are not explicitly needed for FormData with fetch
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Try to get error details
        throw new Error(errorData.details || errorData.error || 'Failed to create story');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success(t('stories.createSuccess', 'Story created successfully!'));
      queryClient.invalidateQueries({ queryKey: ['storyReelData'] }); // Refetch story reel data
      handleOpenChange(false); // Close modal on success
    },
    onError: (error: Error) => {
      toast.error(`${t('errors.storyCreateFailed', 'Failed to create story:')} ${error.message}`);
    },
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStoryType(StoryType.IMAGE); // Assume image if file is selected
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setTextContent(''); // Clear text if image is chosen
    }
  };

  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
      setTextContent(event.target.value);
      if(event.target.value) {
          setStoryType(StoryType.TEXT); // Assume text if text is entered
          setSelectedFile(null); // Clear file if text is chosen
          setPreviewUrl(null);
      }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (storyType === StoryType.TEXT && !textContent.trim()) {
        toast.error(t('stories.textRequired', 'Please enter some text for your story.'));
        return;
    }
    if (storyType === StoryType.IMAGE && !selectedFile) {
        toast.error(t('stories.imageRequired', 'Please select an image for your story.'));
        return;
    }
    // TODO: Add GAME_SCREENSHOT logic if needed

    createStory({
      storyType,
      textContent: storyType === StoryType.TEXT ? textContent : null,
      file: storyType === StoryType.IMAGE ? selectedFile : null,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('stories.createTitle', 'Create Your Story')}</DialogTitle>
          <DialogDescription>
            {t('stories.createDescription', 'Share a moment, thought, or achievement.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Text Input */}
          <div className="space-y-2">
            <Label htmlFor="storyText">{t('stories.labelText', 'Your Text')}</Label>
            <Textarea
              id="storyText"
              placeholder={t('stories.textPlaceholder', 'What\'s on your mind?')}
              value={textContent}
              onChange={handleTextChange}
              rows={4}
              disabled={isCreatingStory || !!selectedFile}
            />
          </div>

          {/* Separator */}
           <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t('common.or', 'Or')}
                </span>
              </div>
            </div>

          {/* File Input */}
          <div className="space-y-2">
             <Label htmlFor="storyImage">{t('stories.labelImage', 'Upload Image')}</Label>
              {previewUrl ? (
                 <div className="relative group">
                    <Image
                        src={previewUrl}
                        alt="Image preview"
                        width={300}
                        height={200}
                        className="rounded-md object-cover w-full h-48 border"
                    />
                     <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-70 group-hover:opacity-100"
                        onClick={() => {
                            setSelectedFile(null);
                            setPreviewUrl(null);
                            setStoryType(StoryType.TEXT); // Revert type if image removed
                            // Clear the file input value
                            const input = document.getElementById('storyImage') as HTMLInputElement;
                            if (input) input.value = '';
                        }}
                        disabled={isCreatingStory}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                 </div>
              ) : (
                  <div className="flex items-center justify-center w-full">
                    <Label
                        htmlFor="storyImage"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 transition-colors"
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-8 h-8 mb-3 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground">
                                <span className="font-semibold">{t('stories.clickToUpload', 'Click to upload')}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">{t('stories.imageFormat', 'PNG, JPG, GIF')}</p>
                        </div>
                        <Input
                            id="storyImage"
                            type="file"
                            className="hidden"
                            accept="image/png, image/jpeg, image/gif"
                            onChange={handleFileChange}
                            disabled={isCreatingStory || !!textContent.trim()} // Disable if uploading or text entered
                        />
                    </Label>
                 </div>
              )}
          </div>

          {/* Footer */}
          <DialogFooter className="pt-4">
            {(() => {
              const buttonText = isCreatingStory ? t('common.posting', 'Posting...') : t('common.postStory', 'Post Story');
              return (
                <Button type="submit" disabled={isCreatingStory || (!textContent.trim() && !selectedFile)}>
                  {isCreatingStory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {buttonText}
                </Button>
              );
            })()}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 