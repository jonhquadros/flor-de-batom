
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
 * Refatorado para usar async/await e garantir a persistência no Firestore.
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

  // 3. Monitorar progresso
  if (onProgress) {
    uploadTask.on('state_changed', (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      onProgress(progress);
    });
  }

  // 4. Aguardar conclusão do upload no Storage
  await uploadTask;

  // 5. Obter URL pública
  const downloadURL = await getDownloadURL(storageRef);
  
  // 6. Preparar metadados
  const mediaData: Media = {
    id: mediaId,
    name: file.name,
    url: downloadURL,
    path: filePath,
    size: compressedFile.size,
    type: file.type,
    createdAt: new Date().toISOString() // Fallback caso o serverTimestamp demore
  };

  // 7. Gravar no Firestore (Crucial: aguardar a gravação)
  const mediaDocRef = doc(db, 'media', mediaId);
  await setDoc(mediaDocRef, {
    ...mediaData,
    createdAt: serverTimestamp() // Usa o tempo oficial do servidor Firebase
  }, { merge: true });

  return mediaData;
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
