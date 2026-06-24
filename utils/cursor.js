/**
 * Encodes the cursor (created_at and id) of a product into a base64 string.
 * @param {object} product
 * @returns {string|null} base64 encoded cursor
 */
function encodeCursor(product) {
  if (!product || !product.created_at || !product.id) return null;
  const dateVal = product.created_at instanceof Date 
    ? product.created_at.toISOString() 
    : new Date(product.created_at).toISOString();
  const rawCursor = `${dateVal}|${product.id}`;
  return Buffer.from(rawCursor).toString('base64');
}

/**
 * Decodes a base64 string back into createdAt and id.
 * @param {string} cursorStr
 * @returns {object|null} { createdAt, id }
 */
function decodeCursor(cursorStr) {
  if (!cursorStr) return null;
  try {
    const rawCursor = Buffer.from(cursorStr, 'base64').toString('utf8');
    const [createdAtStr, id] = rawCursor.split('|');
    if (!createdAtStr || !id) return null;
    return { createdAt: createdAtStr, id };
  } catch (error) {
    return null;
  }
}

module.exports = {
  encodeCursor,
  decodeCursor
};
