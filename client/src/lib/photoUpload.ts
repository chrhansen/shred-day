import { apiClient } from '@/lib/apiClient';

const MAX_PARALLEL_PHOTO_UPLOADS = 2;
let activeUploads = 0;
const waitingUploads: Array<() => void> = [];

async function acquireUploadSlot(): Promise<void> {
  if (activeUploads < MAX_PARALLEL_PHOTO_UPLOADS) {
    activeUploads += 1;
    return;
  }
  await new Promise<void>(resolve => waitingUploads.push(resolve));
}

function releaseUploadSlot(): void {
  const nextUpload = waitingUploads.shift();
  if (nextUpload) nextUpload();
  else activeUploads -= 1;
}

export async function uploadPhotoFile<T>(endpoint: string, file: File): Promise<T> {
  await acquireUploadSlot();
  try {
    // Safari can lose access to Photos-library files when its network process reads them.
    const bytes = await file.arrayBuffer();
    const photo = new Blob([bytes], { type: file.type });
    const formData = new FormData();
    formData.append('file', photo, file.name);
    return await apiClient.uploadFormData<T>(endpoint, formData);
  } finally {
    releaseUploadSlot();
  }
}
