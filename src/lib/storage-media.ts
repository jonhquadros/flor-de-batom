
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
    console.log(`[Media] Comprimindo imagem: ${file.name}`);
    return await imageCompression(file, options);
  } catch (error) {
    console.warn("[Media] Erro na compressão, enviando original:", error);
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
  // 1. Comprimir imagem
  const compressedFile = await compressImage(file);
  
  // 2. Preparar caminhos e IDs
  const mediaId = `IMG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const extension = file.name.split('.').pop() || 'jpg';
  const filePath = `${folder}/${mediaId}.${extension}`;
  
  const storageRef = ref(storage, filePath);
  const uploadTask = uploadBytesResumable(storageRef, compressedFile);

  console.log(`[Media] Iniciando upload para Storage: ${filePath}`);

  // 3. Monitorar progresso e aguardar upload
  await new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`[Media] Progresso ${file.name}: ${progress.toFixed(0)}%`);
        if (onProgress) onProgress(progress);
      },
      (error) => {
        console.error("[Media] Erro crítico no Storage:", error);
        reject(error);
      },
      () => {
        console.log(`[Media] Upload concluído no Storage: ${file.name}`);
        resolve(true);
      }
    );
  });

  // 4. Obter URL pública
  const downloadURL = await getDownloadURL(storageRef);
  
  // 5. Preparar metadados
  const mediaData: any = {
    id: mediaId,
    name: file.name,
    url: downloadURL,
    path: filePath,
    size: compressedFile.size,
    type: file.type,
    createdAt: serverTimestamp()
  };

  // 6. Gravar no Firestore
  console.log(`[Media] Gravando metadados no Firestore: ${mediaId}`);
  const mediaDocRef = doc(db, 'media', mediaId);
  
  try {
    await setDoc(mediaDocRef, mediaData, { merge: true });
    console.log(`[Media] Sucesso total: ${file.name}`);
  } catch (e: any) {
    console.error("[Media] Erro ao gravar no Firestore:", e);
    if (e.code === 'permission-denied' || e.message?.includes('permissions')) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: mediaDocRef.path,
        operation: 'create',
        requestResourceData: mediaData
      }));
    }
    throw e;
  }

  return {
    ...mediaData,
    createdAt: new Date().toISOString()
  } as Media;
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
  try {
    await deleteObject(storageRef);
  } catch (e) {
    console.warn("[Media] Arquivo não encontrado no Storage ao excluir:", e);
  }
  await deleteDoc(doc(db, 'media', media.id));
}
