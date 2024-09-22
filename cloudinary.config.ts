import cloudinary from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Manually importing environment variables with default values
const CLOUDINARY_API_NAME =
  process.env.CLOUDINARY_API_NAME || 'default_cloud_name';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || 'default_api_key';
const CLOUDINARY_API_SECRET =
  process.env.CLOUDINARY_API_SECRET || 'default_api_secret';

cloudinary.v2.config({
  cloud_name: CLOUDINARY_API_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

export const cloudinaryInstance = cloudinary.v2;
