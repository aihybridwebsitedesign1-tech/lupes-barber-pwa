import { supabase } from './supabase';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export type UploadResult = {
  success: boolean;
  url?: string;
  error?: string;
};

export const uploadImage = async (
  file: File,
  bucketName: string,
  pathPrefix: string
): Promise<UploadResult> => {
  try {
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: 'File size must be less than 100MB',
      };
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Only JPG, PNG, and WEBP images are allowed',
      };
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${pathPrefix}/${timestamp}_${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return {
        success: false,
        error: uploadError.message || 'Failed to upload image',
      };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrl,
    };
  } catch (error) {
    console.error('Unexpected upload error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred during upload',
    };
  }
};

export const getUploadLimitText = (language: 'en' | 'es'): string => {
  return language === 'en' ? 'Max 100MB. JPG, PNG, WEBP.' : 'Máx 100MB. JPG, PNG, WEBP.';
};
