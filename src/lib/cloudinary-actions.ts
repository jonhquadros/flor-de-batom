'use server';

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: 'dijgjpenq',
  api_key: '942439691422265',
  api_secret: '_lfybHAD8ySuVv5ROjq3mBCH2S4',
});

export async function uploadToCloudinary(base64Image: string, fileName: string) {
  try {
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: 'flor-de-batom/products',
      public_id: fileName.split('.')[0] + '-' + Date.now(),
      transformation: [
        { width: 1200, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" }
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
    await cloudinary.uploader.destroy(publicId);
    return { success: true };
  } catch (error: any) {
    console.error('Cloudinary Delete Error:', error);
    throw new Error(error.message || 'Falha ao excluir do Cloudinary');
  }
}
