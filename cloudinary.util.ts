import { cloudinaryInstance } from './cloudinary.config';

// Upload a file to Cloudinary
export const uploadToCloudinary = async (
  path: string,
  folder: string = 'Uploads'
): Promise<any> => {
  try {
    const result = await cloudinaryInstance.uploader.upload(path, {
      folder,
    });
    return result;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

// Delete a file from Cloudinary
export const deleteFromCloudinary = async (public_id: string): Promise<any> => {
  try {
    const result = await cloudinaryInstance.uploader.destroy(public_id);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

// Fetch details of an uploaded file
export const fetchCloudinaryFileDetails = async (
  public_id: string
): Promise<any> => {
  try {
    const result = await cloudinaryInstance.api.resource(public_id);
    return result;
  } catch (error) {
    console.error('Error fetching file details from Cloudinary:', error);
    throw new Error('Failed to fetch file details from Cloudinary');
  }
};

// List files in a folder
export const listFilesInCloudinaryFolder = async (
  folder: string
): Promise<any> => {
  try {
    const result = await cloudinaryInstance.api.resources({
      type: 'upload',
      prefix: folder,
    });
    return result;
  } catch (error) {
    console.error('Error listing files from Cloudinary folder:', error);
    throw new Error('Failed to list files from Cloudinary folder');
  }
};

// Rename a file in Cloudinary
export const renameCloudinaryFile = async (
  public_id: string,
  new_public_id: string
): Promise<any> => {
  try {
    const result = await cloudinaryInstance.uploader.rename(
      public_id,
      new_public_id
    );
    return result;
  } catch (error) {
    console.error('Error renaming file in Cloudinary:', error);
    throw new Error('Failed to rename file in Cloudinary');
  }
};

// Bulk delete files in Cloudinary
export const bulkDeleteFromCloudinary = async (
  public_ids: string[]
): Promise<any> => {
  try {
    const result = await cloudinaryInstance.api.delete_resources(public_ids);
    return result;
  } catch (error) {
    console.error('Error bulk deleting from Cloudinary:', error);
    throw new Error('Failed to bulk delete files from Cloudinary');
  }
};

// Delete a folder from Cloudinary
export const deleteCloudinaryFolder = async (folder: string): Promise<any> => {
  try {
    const result = await cloudinaryInstance.api.delete_folder(folder);
    return result;
  } catch (error) {
    console.error('Error deleting Cloudinary folder:', error);
    throw new Error('Failed to delete Cloudinary folder');
  }
};
