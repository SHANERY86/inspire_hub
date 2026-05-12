export function AddSourceView({
  currentUser,
  newSource,
  onNewSourceFieldChange,
  onAddSourceSubmit,
  sourceFormBusy,
  sourceFormMessage,
  isbnCoverPreviewUrl,
  setIsbnCoverPreviewUrl,
  barcodeIsbnRef,
  onBarcodeIsbnPhoto,
  lookupIsbnForNewSource,
}) {
  if (!currentUser) {
    return (
      <section className="card view-panel add-source-view">
        <p className="hint">Sign in to add sources.</p>
      </section>
    )
  }

  return (
    <section className="card view-panel add-source-view">
      <h2 className="view-panel-heading">Add source</h2>
      <p className="hint">
        Track books or other works. <strong>Look up ISBN</strong> fills title,
        author, and a cover preview from Open Library. <strong>Scan ISBN (photo)</strong>{' '}
        reads the barcode when your browser supports it (Chrome or Edge on HTTPS or
        localhost; not over plain http:// to a home network). Otherwise enter the ISBN
        and use Look up ISBN.
      </p>
      <form className="form sources-form" onSubmit={onAddSourceSubmit}>
        <input
          ref={barcodeIsbnRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="visually-hidden"
          tabIndex={-1}
          onChange={onBarcodeIsbnPhoto}
          aria-hidden
        />
        <label>
          Title
          <input
            name="title"
            value={newSource.title}
            onChange={onNewSourceFieldChange}
            required
          />
        </label>
        <label>
          Author
          <input
            name="author"
            value={newSource.author}
            onChange={onNewSourceFieldChange}
          />
        </label>
        <label>
          ISBN
          <input
            name="isbn"
            value={newSource.isbn}
            onChange={onNewSourceFieldChange}
            inputMode="numeric"
            autoComplete="off"
          />
        </label>
        <div className="sources-isbn-actions">
          <button
            type="button"
            className="secondary"
            disabled={sourceFormBusy}
            onClick={() => barcodeIsbnRef.current?.click()}
          >
            Scan ISBN (photo)
          </button>
          <button
            type="button"
            className="secondary"
            disabled={sourceFormBusy}
            onClick={() => void lookupIsbnForNewSource()}
          >
            Look up ISBN
          </button>
        </div>
        {isbnCoverPreviewUrl && (
          <div className="source-cover-preview-wrap">
            <p className="hint source-cover-preview-label">Cover preview</p>
            <img
              src={isbnCoverPreviewUrl}
              alt="Book cover preview from Open Library"
              className="source-cover-preview-img"
              onError={() => setIsbnCoverPreviewUrl('')}
            />
          </div>
        )}
        <label>
          Type
          <select
            name="source_type"
            value={newSource.source_type}
            onChange={onNewSourceFieldChange}
          >
            <option value="book">book</option>
            <option value="article">article</option>
            <option value="video">video</option>
            <option value="podcast">podcast</option>
            <option value="other">other</option>
          </select>
        </label>
        <label>
          Notes
          <textarea
            name="notes"
            rows={2}
            value={newSource.notes}
            onChange={onNewSourceFieldChange}
          />
        </label>
        {sourceFormMessage && (
          <p className="hint sources-form-message">{sourceFormMessage}</p>
        )}
        <button type="submit" disabled={sourceFormBusy}>
          {sourceFormBusy ? 'Saving…' : 'Add source'}
        </button>
      </form>
    </section>
  )
}
