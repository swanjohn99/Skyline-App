import { useRef, useState } from 'react';
import { Pencil, Trash2, Upload } from 'lucide-react';
import {
  uploadCompanyLogo,
  deleteCompanyLogo,
  uploadCompanyFavicon,
  deleteCompanyFavicon,
} from '../api/profiles';
import { useAuth } from '../context/auth';
import { companyAssetUrl } from '../utils/companyLogo';
import ImageCropModal from './ImageCropModal';

const LOGO_CROP = {
  title: 'Crop logo',
  hint: 'Square crop · shown in the sidebar (512×512)',
  aspect: 1,
  outputSize: { width: 512, height: 512 },
};

const FAVICON_CROP = {
  title: 'Crop favicon',
  hint: 'Square crop · browser tab icon (128×128)',
  aspect: 1,
  outputSize: { width: 128, height: 128 },
};

function BrandingSection({
  label,
  description,
  preview,
  hint,
  hasAsset,
  uploading,
  onUpload,
  onRemove,
}) {
  const inputRef = useRef(null);

  return (
    <div className="company-branding-section">
      <div className="company-branding-section-head">
        <h4 className="company-branding-section-title">{label}</h4>
        <p className="company-branding-section-desc">{description}</p>
      </div>
      <div className="company-branding-row">
        <div className="company-branding-preview">{preview}</div>
        <div className="company-branding-meta">
          <p className="company-branding-hint">{hint}</p>
          <div className="company-branding-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {hasAsset ? <Pencil size={16} /> : <Upload size={16} />}
              {hasAsset ? 'Edit' : 'Upload'}
            </button>
            {hasAsset && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={uploading}
                onClick={onRemove}
              >
                <Trash2 size={16} />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={onUpload}
      />
    </div>
  );
}

export default function CompanyBrandingCard() {
  const {
    companyName,
    companyLogoPath,
    companyFaviconPath,
    refreshProfile,
    isOwner,
  } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [cropState, setCropState] = useState(null);

  if (!isOwner || !companyName) return null;

  const logoUrl = companyAssetUrl(companyLogoPath);
  const faviconUrl = companyAssetUrl(companyFaviconPath);

  function openCrop(file, kind) {
    const config = kind === 'logo' ? LOGO_CROP : FAVICON_CROP;
    setCropState({
      kind,
      imageSrc: URL.createObjectURL(file),
      ...config,
    });
  }

  function closeCrop() {
    if (cropState?.imageSrc) {
      URL.revokeObjectURL(cropState.imageSrc);
    }
    setCropState(null);
  }

  function handleFilePick(kind) {
    return (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      openCrop(file, kind);
    };
  }

  async function handleCropConfirm(file) {
    const kind = cropState.kind;
    setUploading(true);
    setError('');
    try {
      if (kind === 'logo') {
        await uploadCompanyLogo(file);
      } else {
        await uploadCompanyFavicon(file);
      }
      await refreshProfile();
      closeCrop();
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveLogo() {
    if (!window.confirm('Remove the company logo?')) return;
    setUploading(true);
    setError('');
    try {
      await deleteCompanyLogo();
      await refreshProfile();
    } catch (err) {
      setError(err.message || 'Could not remove logo.');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveFavicon() {
    if (!window.confirm('Remove the workspace favicon?')) return;
    setUploading(true);
    setError('');
    try {
      await deleteCompanyFavicon();
      await refreshProfile();
    } catch (err) {
      setError(err.message || 'Could not remove favicon.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="form-card company-branding-card">
        <h3 className="form-card-title">Workspace branding</h3>
        <p className="form-card-subtitle">
          Logo and favicon for everyone in {companyName}.
        </p>

        <BrandingSection
          label="Logo"
          description="Shown in the sidebar next to your company name."
          hint="JPEG, PNG, or WebP · max 2 MB · square crop"
          hasAsset={Boolean(logoUrl)}
          uploading={uploading}
          onUpload={handleFilePick('logo')}
          onRemove={handleRemoveLogo}
          preview={
            logoUrl ? (
              <img src={logoUrl} alt="" className="company-branding-logo" />
            ) : (
              <div className="company-branding-placeholder">
                {companyName.slice(0, 1).toUpperCase()}
              </div>
            )
          }
        />

        <BrandingSection
          label="Favicon"
          description="Shown in the browser tab for this workspace."
          hint="JPEG, PNG, or WebP · max 512 KB · square crop"
          hasAsset={Boolean(faviconUrl)}
          uploading={uploading}
          onUpload={handleFilePick('favicon')}
          onRemove={handleRemoveFavicon}
          preview={
            faviconUrl ? (
              <div className="company-branding-favicon-preview">
                <img src={faviconUrl} alt="" className="company-branding-favicon-img" />
                <img src={faviconUrl} alt="" className="company-branding-favicon-img company-branding-favicon-img--sm" />
              </div>
            ) : (
              <div className="company-branding-favicon-empty">Tab</div>
            )
          }
        />

        {error && <p className="form-message form-message--error">{error}</p>}
      </div>

      {cropState && (
        <ImageCropModal
          imageSrc={cropState.imageSrc}
          title={cropState.title}
          hint={cropState.hint}
          aspect={cropState.aspect}
          outputSize={cropState.outputSize}
          onConfirm={handleCropConfirm}
          onCancel={closeCrop}
        />
      )}
    </>
  );
}
