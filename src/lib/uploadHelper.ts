import { supabase } from './supabase';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export type UploadResult = {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
};

export type DeleteResult = {
  success: boolean;
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
        error: 'File size must be less than 5MB',
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
      path: filePath,
    };
  } catch (error) {
    console.error('Unexpected upload error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred during upload',
    };
  }
};

export const deleteImage = async (
  bucketName: string,
  filePath: string
): Promise<DeleteResult> => {
  try {
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return {
        success: false,
        error: deleteError.message || 'Failed to delete image',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected delete error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred during deletion',
    };
  }
};

export const extractPathFromUrl = (url: string, bucketName: string): string | null => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split(`/${bucketName}/`);
    if (pathParts.length > 1) {
      return pathParts[1];
    }
    return null;
  } catch (error) {
    console.error('Error extracting path from URL:', error);
    return null;
  }
};

export const getUploadLimitText = (language: 'en' | 'es'): string => {
  return language === 'en' ? 'Max 5MB. JPG, PNG, WEBP.' : 'Máx 5MB. JPG, PNG, WEBP.';
};
