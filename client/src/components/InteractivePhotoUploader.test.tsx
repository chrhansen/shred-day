// @jest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InteractivePhotoUploader } from './InteractivePhotoUploader';
import '@testing-library/jest-dom';

describe('InteractivePhotoUploader', () => {
  const mockOnFilesSelected = jest.fn();
  const mockOnRemovePhoto = jest.fn();

  const file = new File(['dummy'], 'photo1.jpg', { type: 'image/jpeg' });
  const samplePhotos = [
    {
      id: '1',
      serverId: '1',
      previewUrl: 'https://example.com/photo1.jpg',
      uploadStatus: 'completed' as const,
      originalFile: file,
    },
  ];

  it('renders the dropzone and preview', () => {
    render(
      <InteractivePhotoUploader
        photos={samplePhotos}
        onFilesSelected={mockOnFilesSelected}
        onRemovePhoto={mockOnRemovePhoto}
      />
    );
    expect(screen.getByTestId('photo-dropzone-label')).toBeInTheDocument();
    expect(screen.getByTestId('photo-preview')).toBeInTheDocument();
  });

  it('calls onFilesSelected when a file is selected', () => {
    render(
      <InteractivePhotoUploader
        photos={[]}
        onFilesSelected={mockOnFilesSelected}
        onRemovePhoto={mockOnRemovePhoto}
      />
    );
    const input = screen.getByLabelText(/upload/i);
    const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(mockOnFilesSelected).toHaveBeenCalledWith([file]);
  });

  it('calls onRemovePhoto when remove button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <InteractivePhotoUploader
        photos={samplePhotos}
        onFilesSelected={mockOnFilesSelected}
        onRemovePhoto={mockOnRemovePhoto}
      />
    );
    const removeBtn = screen.getByRole('button', { name: /remove photo/i });
    await user.click(removeBtn);
    expect(mockOnRemovePhoto).toHaveBeenCalledWith('1');
  });
});
