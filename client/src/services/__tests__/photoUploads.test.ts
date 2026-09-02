import { apiClient } from '@/lib/apiClient';
import { skiService } from '../skiService';
import { photoImportService } from '../photoImportService';
import { waitFor } from '@testing-library/react';

const photoResponse = { id: 'photo_1', preview_url: null, full_url: 'https://example.com/photo', filename: 'IMG_1234.HEIC' };

function readBytes(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

describe.each([
  { name: 'day photos', endpoint: '/api/v1/photos', upload: (file: File) => skiService.uploadPhoto(file) },
  { name: 'photo imports', endpoint: '/api/v1/photo_imports/import_1/photos', upload: (file: File) => photoImportService.addPhotoToImport('import_1', file) },
])('$name', ({ endpoint, upload }) => {
  afterEach(() => jest.restoreAllMocks());

  it('sends an independent copy of the original bytes, filename, and content type', async () => {
    const bytes = new Uint8Array([0, 255, 69, 88, 73, 70, 0, 128]);
    const file = new File([bytes], 'IMG_1234.HEIC', { type: 'image/heic' });
    const arrayBuffer = jest.fn().mockResolvedValue(bytes.buffer);
    Object.defineProperty(file, 'arrayBuffer', { value: arrayBuffer });
    const send = jest.spyOn(apiClient, 'uploadFormData').mockResolvedValue(photoResponse);

    await expect(upload(file)).resolves.toEqual(photoResponse);

    expect(arrayBuffer).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(endpoint, expect.any(FormData));
    const uploaded = send.mock.calls[0][1].get('file') as File;
    expect(uploaded).not.toBe(file);
    expect(uploaded.name).toBe(file.name);
    expect(uploaded.type).toBe(file.type);
    expect(new Uint8Array(await readBytes(uploaded))).toEqual(bytes);
  });

  it('waits until the photo bytes are readable before starting the upload', async () => {
    let finishRead!: (bytes: ArrayBuffer) => void;
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => new Promise<ArrayBuffer>(resolve => { finishRead = resolve; }),
    });
    const send = jest.spyOn(apiClient, 'uploadFormData').mockResolvedValue(photoResponse);

    const uploading = upload(file);
    expect(send).not.toHaveBeenCalled();

    await Promise.resolve();
    finishRead(new Uint8Array([1, 2, 3]).buffer);
    await uploading;
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('does not send an empty request when reading the selected photo fails', async () => {
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => Promise.reject(new DOMException('Photo is no longer readable', 'NotReadableError')),
    });
    const send = jest.spyOn(apiClient, 'uploadFormData').mockResolvedValue(photoResponse);

    await expect(upload(file)).rejects.toThrow('Photo is no longer readable');
    expect(send).not.toHaveBeenCalled();
  });
});

it('limits complete read-and-upload operations across both paths and continues after a failure', async () => {
  const pending: Array<{ resolve: (value: typeof photoResponse) => void; reject: (error: Error) => void }> = [];
  const send = jest.spyOn(apiClient, 'uploadFormData').mockImplementation(() => new Promise((resolve, reject) => {
    pending.push({ resolve, reject });
  }));
  const files = Array.from({ length: 4 }, (_, index) => {
    const file = new File(['photo'], `${index}.jpg`, { type: 'image/jpeg' });
    Object.defineProperty(file, 'arrayBuffer', { value: jest.fn().mockResolvedValue(new Uint8Array([index]).buffer) });
    return file;
  });
  const uploads = files.map((file, index) => (
    index % 2 === 0 ? skiService.uploadPhoto(file) : photoImportService.addPhotoToImport('import_1', file)
  ).catch(error => error));

  await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  expect(files[2].arrayBuffer).not.toHaveBeenCalled();
  expect(files[3].arrayBuffer).not.toHaveBeenCalled();

  const failure = new Error('Upload failed');
  pending[0].reject(failure);
  await waitFor(() => expect(send).toHaveBeenCalledTimes(3));
  expect(files[3].arrayBuffer).not.toHaveBeenCalled();

  pending[1].resolve(photoResponse);
  await waitFor(() => expect(send).toHaveBeenCalledTimes(4));
  pending[2].resolve(photoResponse);
  pending[3].resolve(photoResponse);
  expect(await Promise.all(uploads)).toEqual([failure, photoResponse, photoResponse, photoResponse]);
  jest.restoreAllMocks();
});
