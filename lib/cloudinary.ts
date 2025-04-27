import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

// Function to sign Cloudinary upload parameters
export const signUploadParams = (paramsToSign: any) => {
    return cloudinary.utils.api_sign_request(
        paramsToSign,
        process.env.CLOUDINARY_API_SECRET as string
    );
};

// Function to upload an asset to Cloudinary
export const uploadAsset = async (file: File, options: any = {}) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", options.uploadPreset || "rolu_assets");

    if (options.folder) {
        formData.append("folder", options.folder);
    }

    if (options.tags && options.tags.length > 0) {
        formData.append("tags", options.tags.join(","));
    }

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`,
        {
            method: "POST",
            body: formData,
        }
    );

    return await response.json();
};

// Function to delete an asset from Cloudinary
export const deleteAsset = async (publicId: string) => {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
        {
            public_id: publicId,
            timestamp,
        },
        process.env.CLOUDINARY_API_SECRET as string
    );

    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("timestamp", timestamp.toString());
    formData.append("api_key", process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY as string);
    formData.append("signature", signature);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/destroy`,
        {
            method: "POST",
            body: formData,
        }
    );

    return await response.json();
};

export default cloudinary; 