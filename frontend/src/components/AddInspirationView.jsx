import { ExtractedTextPickerPanel } from './ExtractedTextPickerPanel.jsx'
import { imageDataUrl } from '../lib/images.js'

export function AddInspirationView({
  currentUser,
  step,
  step1Form,
  onStep1Change,
  sources,
  sourcesLoading,
  screenshotFiles,
  cameraInputRef,
  onCameraCaptureChange,
  onGalleryFilesChange,
  onRemoveScreenshotFile,
  onPreviewSubmit,
  submitting,
  draftForm,
  onDraftFormChange,
  draftScreenshots,
  onScreenshotTextChange,
  onCommitSubmit,
  goBackToStep1,
  formError,
}) {
  return (
    <section className="view-panel add-inspiration-view sheet-surface-card">
      <h2 className="view-panel-heading">
        {step === 1 ? '1 · Upload & details' : '2 · Preview & save'}
      </h2>

      {step === 1 && (
        <form className="form" onSubmit={onPreviewSubmit}>
          <label>
            Source title
            <input
              name="source_title"
              value={step1Form.source_title}
              onChange={onStep1Change}
            />
          </label>

          {currentUser && (
            <label>
              Link to saved source (optional)
              <select
                name="source"
                value={step1Form.source == null ? '' : String(step1Form.source)}
                onChange={onStep1Change}
                disabled={sourcesLoading}
              >
                <option value="">None</option>
                {sources.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.title}
                    {s.author ? ` — ${s.author}` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Essence or Summary
            <input
              name="essence"
              value={step1Form.essence}
              onChange={onStep1Change}
            />
          </label>

          <label>
            Your thoughts (optional if you add screenshots)
            <textarea
              name="user_thoughts"
              value={step1Form.user_thoughts}
              onChange={onStep1Change}
              rows={3}
            />
          </label>

          <label>
            Source type
            <select
              name="source_type"
              value={step1Form.source_type}
              onChange={onStep1Change}
            >
              <option value="book">book</option>
              <option value="article">article</option>
              <option value="video">video</option>
              <option value="podcast">podcast</option>
              <option value="other">other</option>
            </select>
          </label>

          <label>
            Reference (optional)
            <input
              name="reference"
              value={step1Form.reference}
              onChange={onStep1Change}
            />
          </label>

          <label className="checkbox-row comic-panel-checkbox">
            <input
              type="checkbox"
              name="is_comic_panel"
              checked={Boolean(step1Form.is_comic_panel)}
              onChange={onStep1Change}
            />
            Save image only
          </label>

          {currentUser && (
            <label className="checkbox-row">
              <input
                type="checkbox"
                name="is_public"
                checked={Boolean(step1Form.is_public)}
                onChange={onStep1Change}
              />
              Show on public home page (visitors without an account can see this inspiration)
            </label>
          )}

          <div className="screenshot-block" role="group" aria-label="Screenshots">
            <p className="screenshot-block-label">
              Screenshots (optional if you added thoughts)
            </p>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="visually-hidden"
              tabIndex={-1}
              onChange={onCameraCaptureChange}
              aria-hidden
            />
            <div className="screenshot-actions">
              <button
                type="button"
                className="secondary camera-btn"
                onClick={() => cameraInputRef.current?.click()}
              >
                Take photo
              </button>
              <label className="file-picker-label">
                Choose from library
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onGalleryFilesChange}
                />
              </label>
            </div>
            <p className="hint">
              {step1Form.is_comic_panel
                ? 'You can still crop and frame each image before upload. No text recognition runs for comic panels.'
                : 'After you choose images, you can zoom and frame the area to send to OCR (or use the full image). '}
              Take photo and library picker both add to the list.
            </p>
          </div>
          {screenshotFiles.length > 0 && (
            <div className="screenshot-file-list">
              <p className="hint">{screenshotFiles.length} file(s) selected</p>
              <ul className="screenshot-file-items">
                {screenshotFiles.map((f, i) => (
                  <li key={`${f.name}-${f.lastModified}-${i}`} className="screenshot-file-row">
                    <span className="screenshot-file-name">{f.name}</span>
                    <button
                      type="button"
                      className="screenshot-file-remove"
                      onClick={() => onRemoveScreenshotFile(i)}
                      aria-label={`Remove ${f.name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button type="submit" disabled={submitting}>
            {submitting
              ? step1Form.is_comic_panel
                ? 'Preparing…'
                : 'Running OCR…'
              : 'Continue to preview'}
          </button>
        </form>
      )}

      {step === 2 && draftForm && (
        <form className="form" onSubmit={onCommitSubmit}>
          <p className="hint">
            {draftForm.is_comic_panel
              ? 'Confirm details before saving. Every image below is stored as-is (no OCR).'
              : 'Confirm title, essence or summary, and source type before saving (required). Review captured text below — only the text is saved with your inspiration, not the images.'}
          </p>

          <label>
            Source title
            <input
              name="source_title"
              value={draftForm.source_title}
              onChange={onDraftFormChange}
              required
            />
          </label>

          <label>
            Essence or Summary
            <input
              name="essence"
              value={draftForm.essence}
              onChange={onDraftFormChange}
              required
            />
          </label>

          <label>
            Your thoughts
            <textarea
              name="user_thoughts"
              value={draftForm.user_thoughts ?? ''}
              onChange={onDraftFormChange}
              rows={3}
            />
          </label>

          <label>
            Source type
            <select
              name="source_type"
              value={draftForm.source_type}
              onChange={onDraftFormChange}
              required
            >
              <option value="book">book</option>
              <option value="article">article</option>
              <option value="video">video</option>
              <option value="podcast">podcast</option>
              <option value="other">other</option>
            </select>
          </label>

          <label>
            Reference
            <input
              name="reference"
              value={draftForm.reference ?? ''}
              onChange={onDraftFormChange}
            />
          </label>

          {currentUser && (
            <label>
              Link to saved source (optional)
              <select
                name="source"
                value={
                  draftForm.source == null || draftForm.source === undefined
                    ? ''
                    : String(draftForm.source)
                }
                onChange={onDraftFormChange}
              >
                <option value="">None</option>
                {draftForm.source != null &&
                  draftForm.source !== undefined &&
                  !sources.some((s) => s.id === draftForm.source) && (
                    <option value={String(draftForm.source)}>
                      Source #{draftForm.source} (not in list)
                    </option>
                  )}
                {sources.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.title}
                    {s.author ? ` — ${s.author}` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          {draftScreenshots.length > 0 && draftForm.is_comic_panel && (
            <div className="preview-shots">
              <h3>Comic panels</h3>
              {draftScreenshots.map((s, index) => (
                <div key={`${s.filename}-${index}`} className="preview-shot">
                  <img
                    src={imageDataUrl(s.image_base64, s.filename)}
                    alt={s.filename}
                    className="preview-thumb"
                  />
                  <p className="hint preview-shot-comic-note">
                    No OCR — this image is saved to your library as-is.
                  </p>
                </div>
              ))}
            </div>
          )}

          {draftScreenshots.length > 0 && !draftForm.is_comic_panel && (
            <div className="preview-shots">
              <h3>Captured text</h3>
              {draftScreenshots.map((s, index) => (
                <div key={`${s.filename}-${index}`} className="preview-shot preview-shot--text-only">
                  <p className="preview-shot-filename hint">{s.filename}</p>
                  <label>
                    Extracted text (edit or use pick list)
                    <textarea
                      className="ocr-textarea"
                      value={s.extracted_text ?? ''}
                      onChange={(e) => onScreenshotTextChange(index, e.target.value)}
                      rows={5}
                    />
                  </label>
                  <ExtractedTextPickerPanel
                    text={s.extracted_text ?? ''}
                    onApply={(next) => onScreenshotTextChange(index, next)}
                  />
                </div>
              ))}
            </div>
          )}

          {currentUser && (
            <label className="checkbox-row">
              <input
                type="checkbox"
                name="is_public"
                checked={Boolean(draftForm.is_public)}
                onChange={onDraftFormChange}
              />
              Show on public home page (visitors without an account can see this inspiration)
            </label>
          )}

          <div className="actions">
            <button
              type="button"
              className="secondary"
              onClick={goBackToStep1}
              disabled={submitting}
            >
              Back
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save inspiration'}
            </button>
          </div>
        </form>
      )}

      {formError && <p className="error">Error: {formError}</p>}
    </section>
  )
}
