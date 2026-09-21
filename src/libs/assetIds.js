const toSlug = (value) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const assetCategoryIdFromName = (name) =>
  `asset_category_${toSlug(name)}`;
export const assetUnitIdFromName = (name) => `asset_unit_${toSlug(name)}`;
