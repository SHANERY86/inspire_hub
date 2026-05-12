/** Open Library cover URL from stored ISBN (digits only); may 404 if no art. */
export function openLibraryCoverUrlFromIsbn(isbn) {
  const d = String(isbn ?? '').replace(/\D/g, '')
  if (d.length === 10 || d.length === 13) {
    return `https://covers.openlibrary.org/b/isbn/${d}-M.jpg`
  }
  return null
}
