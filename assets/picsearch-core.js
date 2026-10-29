/** Public, anonymous image adapters. No credentials or WordPress dependency. */
export const PROVIDERS = {
  openverse: { name: "Openverse", url: "https://openverse.org/" },
  commons: { name: "Wikimedia Commons", url: "https://commons.wikimedia.org/" },
  artic: { name: "Art Institute of Chicago", url: "https://www.artic.edu/" },
};
export const PAGE_SIZE = 8;
const CC = "https://creativecommons.org/";
export function safeURL(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
}
export function plainText(value) {
  // Metadata can contain HTML. It is always rendered with textContent.
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
export function licenseInfo(code, version = "", suppliedURL = "") {
  const normalized = String(code || "")
    .trim()
    .toLowerCase()
    .replace(/^cc[ -]+/, "")
    .replace(/\s+/g, "-");
  const isCC0 = /^cc0(?:-|$)/.test(normalized) || /^0(?:-|$)/.test(normalized);
  const isPD = ["pdm", "pd", "public-domain", "public-domain-mark"].includes(
    normalized,
  );
  if (isCC0)
    return {
      code: "cc0",
      label: "CC0",
      url: `${CC}publicdomain/zero/1.0/`,
      publicDomain: true,
      description:
        "CC0: permite copiar, modificar y reutilizar, también comercialmente. Reconocer al autor sigue siendo una buena práctica.",
    };
  if (isPD)
    return {
      code: "pdm",
      label: "Dominio público",
      url: `${CC}publicdomain/mark/1.0/`,
      publicDomain: true,
      description:
        "La fuente identifica esta obra como de dominio público. Conserva su procedencia y revisa su ficha original.",
    };
  const match = normalized.match(/^(by(?:-sa)?)(?:-([\d.]+))?$/);
  if (!match) return null;
  const v = /^[1-4]\.0$|^2\.5$/.test(version || match[2] || "")
    ? version || match[2]
    : "";
  const codeValue = match[1];
  return {
    code: codeValue,
    label: `CC ${codeValue.toUpperCase()}${v ? ` ${v}` : ""}`,
    publicDomain: false,
    url: safeURL(suppliedURL) || (v ? `${CC}licenses/${codeValue}/${v}/` : `${CC}licenses/`),
    description:
      codeValue === "by-sa"
        ? "CC BY-SA: acredita al autor, enlaza la licencia e indica cambios. Si adaptas la obra, comparte la adaptación con la misma licencia o una compatible."
        : "CC BY: acredita al autor, enlaza la licencia e indica si hiciste cambios. Permite adaptaciones y uso comercial bajo esas condiciones.",
  };
}
function record(data) {
  if (
    !data.license ||
    !safeURL(data.image) ||
    !safeURL(data.thumbnail) ||
    !safeURL(data.detail)
  )
    return null;
  return {
    ...data,
    title: plainText(data.title) || "Sin título",
    author: plainText(data.author) || "Autor no indicado",
    image: safeURL(data.image),
    thumbnail: safeURL(data.thumbnail),
    detail: safeURL(data.detail),
    authorURL: safeURL(data.authorURL),
    width: Number(data.width) || null,
    height: Number(data.height) || null,
  };
}
export function normalizeOpenverse(item) {
  return record({
    id: `openverse:${item.id}`,
    provider: "openverse",
    title: item.title,
    author: item.creator,
    authorURL: item.creator_url,
    detail: item.foreign_landing_url,
    image: item.url,
    thumbnail: item.thumbnail || item.url,
    width: item.width,
    height: item.height,
    vector: item.filetype === "svg",
    license: licenseInfo(item.license, item.license_version, item.license_url),
  });
}
export function normalizeArtic(item) {
  if (item.is_public_domain !== true || !item.image_id) return null;
  const base = `https://www.artic.edu/iiif/2/${encodeURIComponent(item.image_id)}/full/`;
  return record({
    id: `artic:${item.id}`,
    provider: "artic",
    title: item.title,
    author: item.artist_display,
    detail: `https://www.artic.edu/artworks/${item.id}`,
    image: `${base}1686,/0/default.jpg`,
    thumbnail: `${base}600,/0/default.jpg`,
    vector: false,
    license: licenseInfo("cc0"),
  });
}
export function normalizeCommons(item) {
  const info = item.imageinfo?.[0];
  if (!info || !/^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(info.mime || ""))
    return null;
  const meta = info.extmetadata || {};
  const raw = plainText(meta.LicenseShortName?.value);
  return record({
    id: `commons:${item.pageid}`,
    provider: "commons",
    title:
      plainText(meta.ObjectName?.value) ||
      String(item.title || "").replace(/^File:/, ""),
    author: meta.Artist?.value,
    detail: info.descriptionurl,
    image: info.url,
    thumbnail: info.thumburl || info.url,
    width: info.width,
    height: info.height,
    vector: info.mime === "image/svg+xml",
    license: licenseInfo(raw, "", meta.LicenseUrl?.value),
  });
}
export function uniqueImages(images, existing = []) {
  const ids = new Set(existing.map((item) => item.id));
  const urls = new Set(existing.map((item) => item.image.split("?")[0]));
  return images.filter((item) => {
    if (!item || ids.has(item.id) || urls.has(item.image.split("?")[0]))
      return false;
    ids.add(item.id);
    urls.add(item.image.split("?")[0]);
    return true;
  });
}
export async function requestJSON(url, signal, fetcher = fetch) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 12000);
  try {
    const response = await fetcher(url, {
      signal: controller.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "Límite temporal de consultas. Espera un momento."
          : `La fuente no respondió (${response.status}).`,
      );
    const payload = await response.json();
    if (payload.error)
      throw new Error("La fuente no pudo completar la consulta.");
    return payload;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
export const adapters = {
  async openverse(
    query,
    type,
    cursor,
    signal,
    fetcher,
    license = "commercial",
  ) {
    const url = new URL("https://api.openverse.org/v1/images/");
    url.search = new URLSearchParams({
      q: query,
      page_size: String(PAGE_SIZE),
      page: String(cursor || 1),
      license: license === "public" ? "cc0,pdm" : "cc0,pdm,by,by-sa",
      mature: "false",
      filter_dead: "true",
    });
    if (type === "vector") url.searchParams.set("extension", "svg");
    if (type === "photo") url.searchParams.set("category", "photograph");
    if (type === "illustration")
      url.searchParams.set("category", "illustration");
    const payload = await requestJSON(url, signal, fetcher);
    return {
      images: (payload.results || []).map(normalizeOpenverse).filter(Boolean),
      next: payload.page < payload.page_count ? payload.page + 1 : null,
    };
  },
  async artic(query, type, cursor, signal, fetcher) {
    const url = new URL("https://api.artic.edu/api/v1/artworks/search");
    url.search = new URLSearchParams({
      limit: String(PAGE_SIZE),
      page: String(cursor || 1),
      fields:
        "id,title,artist_display,image_id,is_public_domain,artwork_type_title",
      params: JSON.stringify({
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query,
                  fields: ["title^2", "artist_display", "subject_titles"],
                  operator: "and",
                },
              },
            ],
            filter: [
              { term: { is_public_domain: true } },
              { exists: { field: "image_id" } },
            ],
          },
        },
      }),
    });
    const payload = await requestJSON(url, signal, fetcher);
    return {
      images: (payload.data || []).map(normalizeArtic).filter(Boolean),
      next:
        payload.pagination?.current_page < payload.pagination?.total_pages
          ? payload.pagination.current_page + 1
          : null,
    };
  },
  async commons(query, type, cursor, signal, fetcher) {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.search = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrsearch: `${query} filetype:${type === "vector" ? "drawing" : "bitmap"}`,
      gsrnamespace: "6",
      gsrlimit: String(PAGE_SIZE),
      gsroffset: String(cursor || 0),
      prop: "imageinfo",
      iiprop: "url|extmetadata|mime|size",
      iiurlwidth: "600",
      iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|ObjectName",
      iiextmetadatalanguage: "es",
      maxlag: "5",
    });
    const payload = await requestJSON(url, signal, fetcher);
    const images = Object.values(payload.query?.pages || {})
      .sort((a, b) => a.index - b.index)
      .map(normalizeCommons)
      .filter(Boolean);
    return {
      images: type === "vector" ? images.filter((item) => item.vector) : images,
      next: payload.continue?.gsroffset ?? null,
    };
  },
};
export async function searchProviders({
  query,
  type = "all",
  provider = "all",
  license = "commercial",
  cursors = {},
  signal,
  fetcher = fetch,
  onProgress,
}) {
  const names = Object.keys(adapters).filter(
    (name) =>
      (provider === "all" || provider === name) &&
      !(name === "artic" && ["photo", "vector"].includes(type)) &&
      !(name === "commons" && ["photo", "illustration"].includes(type)) &&
      cursors[name] !== null,
  );
  const settled = await Promise.allSettled(
    names.map(async (name) => {
      const result = {
        name,
        ...(await adapters[name](
          query,
          type,
          cursors[name],
          signal,
          fetcher,
          license,
        )),
      };
      onProgress?.(result);
      return result;
    }),
  );
  const results = [],
    errors = [],
    next = { ...cursors };
  settled.forEach((entry, index) => {
    const name = names[index];
    if (entry.status === "fulfilled") {
      results.push(entry.value);
      next[name] = entry.value.next;
    } else {
      next[name] = null;
      errors.push({
        provider: name,
        message:
          entry.reason?.name === "AbortError"
            ? "La consulta tardó demasiado."
            : entry.reason?.message || "Fuente no disponible.",
      });
    }
  });
  // Interleave providers rather than burying smaller collections at the end.
  const images = [];
  for (let index = 0; index < PAGE_SIZE; index++)
    for (const result of results)
      if (result.images[index]) images.push(result.images[index]);
  return {
    images: uniqueImages(images),
    errors,
    cursors: next,
    hasMore: results.some((result) => result.next !== null),
    successfulProviders: results.map((result) => result.name),
  };
}
