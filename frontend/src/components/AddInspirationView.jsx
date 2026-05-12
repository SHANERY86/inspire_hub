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
  onPreviewSubmit,
  submitting,
  draftForm,
  onDraftFormChange,
  draftScreenshots,
  onScreenshotTextChange,
  onScreenshotKeepChange,
  onCommitSubmit,
  goBackToStep1,
  formError,
}) {
  return (
    <section className="card view-panel add-inspiration-view">
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
            Essence
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
              Take photo adds each shot. Library picker replaces the current list.
            </p>
          </div>
          {screenshotFiles.length > 0 && (
            <p className="hint">{screenshotFiles.length} file(s) selected</p>
          )}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Running OCR…' : 'Continue to preview'}
          </button>
        </form>
      )}

      {step === 2 && draftForm && (
        <form className="form" onSubmit={onCommitSubmit}>
          <p className="hint">
            Confirm title, essence, and source type before saving (required).
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
            Essence
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

          {draftScreenshots.length > 0 && (
            <div className="preview-shots">
              <h3>Screenshots</h3>
              {draftScreenshots.map((s, index) => (
                <div key={`${s.filename}-${index}`} className="preview-shot">
                  <img
                    src={imageDataUrl(s.image_base64, s.filename)}
                    alt={s.filename}
                    className="preview-thumb"
                  />
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={s.keep}
                      onChange={(e) =>
                        onScreenshotKeepChange(index, e.target.checked)
                      }
                    />
                    Keep this image when saving
                  </label>
                  <label>
                    Extracted text (from OCR — use list below to set final text)
                    <textarea
                      className="ocr-textarea ocr-textarea-readonly"
                      value={s.extracted_text ?? ''}
                      readOnly
                      rows={5}
                      aria-readonly="true"
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
