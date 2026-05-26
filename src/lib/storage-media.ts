
'use client';

import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject, 
  FirebaseStorage 
} from 'firebase/storage';
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  Firestore, 
  serverTimestamp 
} from 'firebase/firestore';
import { Media } from './types';
import imageCompression from 'browser-image-compression';

/**
 * Faz compressão da imagem antes do upload para melhorar performance.
 */
async function compressImage(file: File) {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };
  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.error("Erro na compressão:", error);
    return file;
  }
}

/**
 * Upload de arquivo para o Firebase Storage com registro no Firestore.
 */
export async function uploadMedia(
  storage: FirebaseStorage, 
  db: Firestore, 
  file: File, 
  folder: string = 'products',
  onProgress?: (progress: number) => void
): Promise<Media> {
  const compressedFile = await compressImage(file);
  const mediaId = `IMG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const extension = file.name.split('.').pop();
  const filePath = `${folder}/${mediaId}.${extension}`;
  
  const storageRef = ref(storage, filePath);
  const uploadTask = uploadBytesResumable(storageRef, compressedFile);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => reject(error),
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        const mediaData: Media = {
          id: mediaId,
          name: file.name,
          url: downloadURL,
          path: filePath,
          size: compressedFile.size,
          type: file.type,
          createdAt: new Date().toISOString()
        };

        const mediaDocRef = doc(db, 'media', mediaId);
        await setDoc(mediaDocRef, {
          ...mediaData,
          createdAt: serverTimestamp()
        }, { merge: true });

        resolve(mediaData);
      }
    );
  });
}

/**
 * Exclui arquivo do Storage e documento do Firestore.
 */
export async function deleteMedia(
  storage: FirebaseStorage, 
  db: Firestore, 
  media: Media
) {
  const storageRef = ref(storage, media.path);
  await deleteObject(storageRef);
  await deleteDoc(doc(db, 'media', media.id));
}
