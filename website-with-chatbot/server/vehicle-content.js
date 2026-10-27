const { normalize, key } = require('../js/catalogue-data');
const safeUrl = value => typeof value === 'string' && (/^https?:\/\/[^\s"'<>]+$/i.test(value) || /^\/(uploads|assets)\/[a-zA-Z0-9._/-]+$/.test(value) && !value.includes('..'));
const text = (value, max = 5000) => {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > max) throw new Error(`Text fields must contain at most ${max} characters.`);
  return value.trim();
};
function array(body, field, fallback) {
  const input = body[field + 'Json'] ?? body[field];
  if (input === undefined) return fallback;
  let value;
  try { value = typeof input === 'string' ? JSON.parse(input) : input; } catch { throw new Error(`${field} must be valid JSON.`); }
  if (!Array.isArray(value)) throw new Error(`${field} must be a list.`);
  return value;
}
function vehicle(body, current = {}, files = []) {
  const result = { ...current };
  for (const field of ['name', 'type', 'price', 'description', 'badge', 'videoUrl']) result[field] = text(body[field] ?? current[field]);
  if (['name', 'type', 'price', 'description'].some(field => !result[field])) throw new Error('Name, type, price and description are required.');
  if (result.videoUrl && !safeUrl(result.videoUrl)) throw new Error('Use an HTTP(S) video URL.');
  result.published = body.published === undefined ? current.published !== false : body.published === true || body.published === 'true';
  const galleries = files.filter(file => ['imageFile', 'imageFiles'].includes(file.fieldname)).map(file => `/uploads/${file.filename}`);
  result.images = [...new Set([body.image ?? current.image, ...array(body, 'images', normalize(current).images), ...galleries].filter(Boolean))];
  if (result.images.length > 40 || result.images.some(url => !safeUrl(url))) throw new Error('Use valid HTTP(S) or uploaded gallery images (maximum 40).');
  result.image = result.images[0] || '';
  result.colours = array(body, 'colours', normalize(current).colours);
  if (result.colours.length > 12) throw new Error('Use at most 12 colours.');
  const colourKeys = new Set();
  result.colours = result.colours.map(colour => {
    if (!colour || typeof colour !== 'object') throw new Error('Enter valid colour entries.');
    const name = text(colour.name, 100), id = key(colour.id || name), swatch = text(colour.swatch, 7);
    if (!name || !id || colourKeys.has(id) || !/^#[0-9a-f]{6}$/i.test(swatch)) throw new Error('Each colour needs a unique name and a valid six-digit swatch.');
    colourKeys.add(id);
    const uploaded = files.filter(file => file.fieldname === `colourImage_${id}`).map(file => `/uploads/${file.filename}`);
    const images = [...new Set([...(Array.isArray(colour.images) ? colour.images : []), ...uploaded])];
    if (!images.length || images.length > 8 || images.some(url => !safeUrl(url))) throw new Error('Assign 1–8 valid images to every colour.');
    return { id, name, swatch, images };
  });
  if (files.some(file => file.fieldname.startsWith('colourImage_') && !colourKeys.has(file.fieldname.slice(12)))) throw new Error('An uploaded colour image has no matching colour.');
  const oldSpecs = normalize({ ...current, ...Object.fromEntries(['range', 'acceleration', 'power', 'battery'].map(k => [k, body[k] ?? current[k]])) }).specifications;
  result.specifications = array(body, 'specifications', oldSpecs);
  if (result.specifications.length > 80) throw new Error('Use at most 80 specifications.');
  const keys = new Set();
  result.specifications = result.specifications.map(spec => {
    if (!spec || typeof spec !== 'object') throw new Error('Enter valid specifications.');
    const label = text(spec.label, 100), id = key(spec.key || label);
    if (!label || !id || id.length > 100 || keys.has(id)) throw new Error('Each specification needs a label and a unique stable key.');
    keys.add(id);
    return { key: id, label, value: text(spec.value, 1000), unit: text(spec.unit, 50), group: text(spec.group, 100) };
  });
  for (const field of ['range', 'acceleration', 'power', 'battery']) {
    const spec = result.specifications.find(s => s.key === field);
    result[field] = spec ? [spec.value, spec.unit].filter(Boolean).join(' ') : '';
  }
  return result;
}
module.exports = { vehicle, safeUrl, normalize };
