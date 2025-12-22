/**
 * @fileoverview Asset Service
 * 
 * Handles business logic for asset operations including file uploads
 * and storage management.
 */

import { ValidationError, NotFoundError } from '@/core/errors';
import { getSupabaseClient } from '@/core/utils/supabase-client';
import { logError } from '@/core/utils/logger';
import crypto from 'crypto';

// Allowed MIME types for uploads
const ALLOWED_MIME_TYPES = [
  // Images
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  // 3D Assets (Unity)
  'model/gltf-binary', // .glb
  'model/gltf+json',   // .gltf
  'application/octet-stream', // Generic binary (often used for .fbx, .obj)
  'text/plain',        // sometimes .obj is treated as text
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.webp', // Images
  '.glb', '.gltf', '.fbx', '.obj'           // 3D Assets
];

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export interface UploadFile {
  filename: string;
  mimetype: string;
  encoding: string;
  file: Buffer;
}

/**
 * Service for managing game assets.
 */
export class AssetService {

  /**
   * Uploads a sprite or 3D asset for a fish.
   * 
   * Validates the file type and size, uploads it to Supabase Storage,
   * and updates the fish record with the public URL.
   * 
   * @param file - File object containing buffer and metadata
   * @param fishId - ID of the fish to associate the asset with
   * @returns Public URL of the uploaded asset
   * @throws {ValidationError} If file is invalid
   * @throws {NotFoundError} If fish doesn't exist
   */
  async uploadFishSprite(file: UploadFile, fishId: number): Promise<string> {
    // 1. Validate inputs
    if (!file || !file.file) {
      throw new ValidationError('No file provided');
    }

    if (!fishId || isNaN(fishId)) {
      throw new ValidationError('Invalid fish ID');
    }

    // Validate file size
    if (file.file.length > MAX_FILE_SIZE) {
      throw new ValidationError(`File size exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      // Relaxed check for 3D files which often have generic mime types
      // We'll rely more on extension validation for these
      const ext = this.getFileExtension(file.filename);
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw new ValidationError(`File type ${file.mimetype} not allowed`);
      }
    }

    // Validate extension
    const extension = this.getFileExtension(file.filename);
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      throw new ValidationError(`File extension ${extension} not allowed`);
    }

    const supabase = getSupabaseClient();

    // 2. Validate fish existence
    const { data: fish, error: fetchError } = await supabase
      .from('fish')
      .select('id, owner')
      .eq('id', fishId)
      .single();

    if (fetchError || !fish) {
      if (fetchError && fetchError.code !== 'PGRST116') {
        logError(`Database error checking fish ${fishId}`, fetchError);
        throw new Error(`Database error: ${fetchError.message}`);
      }
      throw new NotFoundError(`Fish with ID ${fishId} not found`);
    }

    // 3. Prepare file for upload
    // Generate unique filename to avoid collisions: fish-{id}-{uuid}.{ext}
    const uuid = crypto.randomUUID();
    const storageFilename = `fish-${fishId}-${uuid}${extension}`;
    const bucketName = 'fish';

    // 4. Upload to Supabase Storage
    const { error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(storageFilename, file.file, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      logError(`Failed to upload asset for fish ${fishId}`, uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // 5. Get Public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from(bucketName)
      .getPublicUrl(storageFilename);

    // 6. Update fish record with sprite_url
    const { error: updateError } = await supabase
      .from('fish')
      .update({ sprite_url: publicUrl })
      .eq('id', fishId);

    if (updateError) {
      // If DB update fails, try to cleanup the uploaded file (best effort)
      await supabase.storage.from(bucketName).remove([storageFilename]);
      
      logError(`Failed to update fish ${fishId} sprite_url`, updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    return publicUrl;
  }

  /**
   * Helper to extract file extension (including dot)
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    if (parts.length < 2) return '';
    return '.' + parts.pop()?.toLowerCase();
  }
}

