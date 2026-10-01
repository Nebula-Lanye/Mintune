export type PictureLike = {
  pictureData?: string | null;
  format?: string | null;
  mime?: string | null;
};

export function pictureDataUri(picture: PictureLike | null | undefined) {
  const value = picture?.pictureData?.trim();
  if (!value) return undefined;
  if (/^(data:|https?:\/\/|file:\/\/|content:\/\/)/i.test(value)) return value;
  const format = picture?.format || picture?.mime || "image/jpeg";
  const mime = format.includes("/") ? format : `image/${format.replace(/^\./, "")}`;
  return `data:${mime};base64,${value}`;
}

export function sidecarArtworkNames(filename: string) {
  const base = filename.replace(/\.[^/.]+$/, "");
  return [
    `${base}.png`,
    `${base}.jpg`,
    `${base}.jpeg`,
    `${base}.webp`,
    "folder.jpg",
    "folder.png",
    "cover.jpg",
    "cover.png",
    "album.jpg",
    "album.png",
    "AlbumArt.jpg",
    "AlbumArt.png",
  ];
}

export function isArtworkFilename(filename: string) {
  return /\.(jpe?g|png|webp)$/i.test(filename);
}
