'use client';

import React, { useState, useRef, useCallback, ChangeEvent, DragEvent } from 'react';
import ImageKit from 'imagekit-javascript';
import { Button } from '@/components/ui/button'; // Assuming shadcn button
import { Input } from '@/components/ui/input';   // Assuming shadcn input
import Image from 'next/image'; // Using Next.js Image for preview
import { Loader2, AlertCircle, CheckCircle, UploadCloud, Camera, X } from 'lucide-react'; // Icons
import { useTranslation } from "react-i18next";
import { useAmplitude } from "@/contexts/amplitude-provider"; // Import useAmplitude

// Ensure these env variables are available client-side
const IMAGEKIT_PUBLIC_KEY = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
const IMAGEKIT_URL_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
const AUTH_API_ENDPOINT = '/api/imagekit/auth'; // Our backend endpoint

interface ImageUploadInputProps {
  userId: string;
  quizId: string;
  gameSessionId?: string;
  /** Called with the uploaded image URL and MIME type on successful upload and evaluation trigger */
  onSubmit: (data: { imageUrl: string; imageMimeType: string }) => Promise<void>;
  /** Optional: Called if the upload itself fails */
  onUploadError?: (message: string) => void;
}

const ImageUploadInput: React.FC<ImageUploadInputProps> = ({ userId, quizId, gameSessionId, onSubmit, onUploadError }) => {
  const { t } = useTranslation();
  const { track } = useAmplitude(); // Get track function
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null); // Clear previous errors
    setUploadSuccess(false);
    const file = event.target.files?.[0];
    if (file) {
      track('Image Capture Attempted', { // Track capture attempt (via file selection)
        quizId,
        source: event.target.id === 'cameraInput' ? 'camera' : 'fileSelector' 
      });
      // Basic validation (can add more)
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file.');
        setSelectedFile(null);
        setPreviewUrl(null);
        return;
      }
      // Optional: Size validation (e.g., max 5MB)
      // if (file.size > 5 * 1024 * 1024) { ... }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      track('Image Captured', { // Track successful capture/selection
        quizId,
        fileSize: file.size,
        fileType: file.type,
        source: 'fileSelector' // Assuming source can be determined earlier
      });
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleCameraClick = () => {
    // For native mobile apps, this might trigger the camera directly
    // For web, we still use the file input but specify capture
    if (cameraInputRef.current) {
      track('Camera Activated', { quizId }); // Use quizId prop
      cameraInputRef.current.click();
    }
  };

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_URL_ENDPOINT) {
        setError('ImageKit configuration is missing. Please contact support.');
        console.error('Missing ImageKit Public Key or URL Endpoint');
        return;
    }


    setIsLoading(true);
    setError(null);
    setUploadSuccess(false);

    try {
        // 1. Fetch authentication parameters from your backend
        const authResponse = await fetch(AUTH_API_ENDPOINT);
        if (!authResponse.ok) {
            const errorData = await authResponse.json();
            throw new Error(errorData.error || `Failed to fetch authentication parameters (${authResponse.status})`);
        }
        const authParams = await authResponse.json();

        // 2. Initialize ImageKit SDK
        const imagekit = new ImageKit({
            publicKey: IMAGEKIT_PUBLIC_KEY!,
            urlEndpoint: IMAGEKIT_URL_ENDPOINT!,
        });

        // 3. Upload using ImageKit SDK
        console.log(`Uploading ${selectedFile.name} to ImageKit...`);
        const uploadResponse = await imagekit.upload({
            file: selectedFile,
            fileName: selectedFile.name, // You can customize the filename
            tags: ["quiz_upload"], // Optional tags
            token: authParams.token, // Pass fetched credentials
            expire: authParams.expire,
            signature: authParams.signature,
            // Optional: Use progress callback
            // onUploadProgress: (progress) => { console.log('Upload Progress:', progress.loaded, '/', progress.total); }
        });

        console.log('ImageKit Upload Success:', uploadResponse);
        setUploadSuccess(true);

        // 4. Call the onSubmit prop passed from the parent component
        // This triggers the call to our backend evaluation endpoint
        await onSubmit({
            imageUrl: uploadResponse.url,
            imageMimeType: selectedFile.type
        });

    } catch (err: any) {
      console.error('Upload failed:', err);
      const errorMsg = err.message || 'An unknown error occurred during upload.';
      setError(errorMsg);
      if (onUploadError) {
        onUploadError(errorMsg);
      }
    } finally {
      setIsLoading(false);
      // Optionally clear selection after successful submission?
      // setSelectedFile(null);
      // setPreviewUrl(null);
    }
  }, [selectedFile, onSubmit, onUploadError]);

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    // Implement drag and drop logic here
  }, []);

  return (
    <div className="space-y-4">
      <Input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden" // Hide the default input, use button instead
        disabled={isLoading}
      />

      <Button
        onClick={triggerFileSelect}
        variant="outline"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2"
      >
        <UploadCloud className="h-4 w-4" />
        {selectedFile ? `Change Image (${selectedFile.name})` : 'Select Screenshot'}
      </Button>

      {previewUrl && (
        <div className="mt-4 border rounded-md p-2 bg-muted/40 flex justify-center">
          <Image
            src={previewUrl}
            alt="Selected image preview"
            width={200} // Adjust size as needed
            height={200}
            className="object-contain rounded"
          />
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm p-3 border border-red-600/50 bg-red-500/10 rounded-md flex items-center gap-2">
           <AlertCircle className="h-4 w-4 flex-shrink-0" />
           <span>{error}</span>
        </div>
      )}

       {/* Optional: Explicit success message for upload itself before evaluation starts */}
       {/* {uploadSuccess && !isLoading && !error && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Upload Complete</AlertTitle>
          <AlertDescription>Image uploaded successfully. Starting evaluation...</AlertDescription>
        </Alert>
      )} */}

      <Button
        onClick={handleUpload}
        disabled={!selectedFile || isLoading}
        className="w-full"
      >
        {isLoading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading & Evaluating...</>
        ) : (
          'Submit Image for Evaluation'
        )}
      </Button>
    </div>
  );
};

export default ImageUploadInput; 