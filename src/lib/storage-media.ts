'use client';

import {
  doc,
  setDoc,
  deleteDoc,
  Firestore,
  serverTimestamp
} from 'firebase/firestore';
import { Media } from './types';
import imageCompression from 'browser-image-compression';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { uploadToCloudinary, deleteFromCloudinary } from './cloudinary-actions';

/**
 * Comprime a imagem antes do envio. Não envia o original silenciosamente
 * quando a compressão falha, pois isso pode exceder o limite da Server Action.
 */
async function compressImage(file: File): Promise<File> {
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!supportedTypes.includes(file.type)) {
    throw new Error('Formato não suportado. Envie uma imagem JPG, PNG ou WebP.');
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
  });

  if (compressed.size > 1024 * 1024) {
    throw new Error('Não foi possível reduzir esta imagem para menos de 1 MB. Tente uma foto com resolução menor.');
  }

  return compressed;
}

/** Converte arquivo para Base64 para envio via Server Action. */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Não foi possível preparar a imagem para envio.'));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo selecionado.'));
  });
}

/** Upload de arquivo para o Cloudinary com registro no Firestore. */
export async function uploadMedia(
  _storage: any,
  db: Firestore,
  file: File,
  _folder: string = 'products',
  onProgress?: (progress: number) => void
): Promise<Media> {
  try {
    if (onProgress) onProgress(10);

    // 1. Comprimir e validar imagem localmente
    const compressedFile = await compressImage(file);
    if (onProgress) onProgress(30);

    // 2. Converter para Base64
    const base64 = await fileToBase64(compressedFile);
    if (onProgress) onProgress(50);

    // 3. Chamar Server Action para Cloudinary
    const result = await uploadToCloudinary(base64, file.name);
    if (onProgress) onProgress(80);

    // 4. Preparar metadados para Firestore
    const mediaId = `IMG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const mediaData: any = {
      id: mediaId,
      name: file.name,
      url: result.url,
      path: result.public_id,
      size: result.size,
      type: file.type || result.format,
      createdAt: serverTimestamp()
    };

    // 5. Gravar metadados no Firestore
    const mediaDocRef = doc(db, 'media', mediaId);
    await setDoc(mediaDocRef, mediaData, { merge: true });

    if (onProgress) onProgress(100);

    return {
      ...mediaData,
      createdAt: new Date().toISOString()
    } as Media;
  } catch (e: any) {
    console.error('[Media] Erro no upload Cloudinary/Firestore:', e);

    if (e.code === 'permission-denied' || e.message?.includes('permissions')) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'media/new',
        operation: 'create',
      }));
    }
    throw e;
  }
}

/** Exclui arquivo do Cloudinary e documento do Firestore. */
export async function deleteMedia(
  _storage: any,
  db: Firestore,
  media: Media
) {
  try {
    await deleteFromCloudinary(media.path);
    await deleteDoc(doc(db, 'media', media.id));
  } catch (e) {
    console.error('[Media] Erro ao excluir mídia:', e);
    throw e;
  }
}
