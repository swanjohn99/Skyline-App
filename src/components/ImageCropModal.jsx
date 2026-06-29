import { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import { X } from 'lucide-react';
import { getCroppedImage } from '../utils/cropImage';
import 'react-easy-crop/react-easy-crop.css';

export default function ImageCropModal({
  imageSrc,
  title,
  hint,
  aspect = 1,
  outputSize,
  onConfirm,
  onCancel,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onCropComplete = useCallback((_croppedArea, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setSaving(true);
    setError('');
    try {
      const blob = await getCroppedImage(imageSrc, croppedAreaPixels, outputSize);
      const file = new File([blob], 'image.png', { type: 'image/png' });
      await onConfirm(file);
    } catch (err) {
      setError(err.message || 'Could not crop image.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="crop-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="crop-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="crop-modal-header">
          <div>
            <h2 id="crop-modal-title" className="crop-modal-title">{title}</h2>
            {hint && <p className="crop-modal-hint">{hint}</p>}
          </div>
          <button type="button" className="crop-modal-close" onClick={onCancel} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div className="crop-modal-body">
          <div className="crop-modal-cropper">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <label className="crop-modal-zoom">
            <span>Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>
        </div>

        {error && <p className="form-message form-message--error crop-modal-error">{error}</p>}

        <footer className="crop-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </div>
    </div>
  );
}
