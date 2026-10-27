/* Shared normalization keeps the public pages, editor and API on the same keys. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CatalogueData = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const legacy = [['range', 'Driving range'], ['acceleration', '0–100 km/h'], ['power', 'Power'], ['battery', 'Battery']];
  const key = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  function normalize(model) {
    return {
      ...model,
      images: Array.isArray(model.images) && model.images.length ? model.images : [model.image].filter(Boolean),
      colours: Array.isArray(model.colours) ? model.colours : [],
      specifications: Array.isArray(model.specifications) ? model.specifications : legacy.filter(([k]) => model[k]).map(([k, label]) => ({ key: k, label, value: String(model[k]), unit: '', group: 'Performance & battery' }))
    };
  }
  function comparison(models) {
    const rows = new Map();
    models.map(normalize).forEach(model => model.specifications.forEach(spec => {
      if (!rows.has(spec.key)) rows.set(spec.key, { key: spec.key, label: spec.label, group: spec.group });
    }));
    return [...rows.values()].map(row => ({ ...row, values: models.map(model => {
      const spec = normalize(model).specifications.find(s => s.key === row.key);
      return spec && String(spec.value).trim() ? [spec.value, spec.unit].filter(Boolean).join(' ') : 'Not specified';
    }) }));
  }
  return { normalize, comparison, key };
});
