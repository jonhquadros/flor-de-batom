'use server';

import { v2 as cloudinary } from 'cloudinary';

function ensureCloudinaryConfig() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary não configurado no servidor. Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET nas variáveis de ambiente.');
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
}

export async function uploadToCloudinary(base64Image: string, fileName: string) {
  try {
    ensureCloudinaryConfig();

    const result = await cloudinary.uploader.upload(base64Image, {
      folder: 'flor-de-batom/products',
      public_id: fileName.split('.')[0] + '-' + Date.now(),
      transformation: [
        { width: 1200, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    return {
      success: true,
      url: result.secure_url.replace('/upload/', '/upload/f_auto,q_auto/'),
      public_id: result.public_id,
      size: result.bytes,
      format: result.format,
    };
  } catch (error: any) {
    console.error('Cloudinary Upload Error:', error);
    throw new Error(error.message || 'Falha ao subir para Cloudinary');
  }
}

export async function deleteFromCloudinary(publicId: string) {
  try {
    ensureCloudinaryConfig();
    await cloudinary.uploader.destroy(publicId);
    return { success: true };
  } catch (error: any) {
    console.error('Cloudinary Delete Error:', error);
    throw new Error(error.message || 'Falha ao excluir do Cloudinary');
  }
}
