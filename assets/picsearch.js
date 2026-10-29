import {
  PROVIDERS,
  safeURL,
  uniqueImages,
  searchProviders,
} from "./picsearch-core.js";

const root = document.getElementById("picsearch");
if (root) initialize();
function initialize() {
  const form = document.getElementById("picsearch-form");
  const input = document.getElementById("search-input");
  const grid = document.getElementById("ps-grid");
  const status = document.getElementById("ps-status");
  const heading = document.getElementById("ps-heading");
  const more = document.getElementById("ps-more");
  const retry = document.getElementById("ps-retry");
  const provider = document.getElementById("ps-provider");
  const license = document.getElementById("ps-license");
  const clear = document.getElementById("search-clear");
  const health = document.getElementById("ps-source-health");
  const cache = new Map();
  let images = [],
    cursors = {},
    errors = [],
    hasMore = false,
    busy = false,
    controller,
    requestId = 0;
  let query = "",
    initialSelection = true;
  const getType = () =>
    document.querySelector('input[name="image_type"]:checked')?.value || "all";
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function updateURL() {
    const url = new URL(location.href);
    for (const name of ["s", "q", "image_type", "source", "license"])
      url.searchParams.delete(name);
    if (!initialSelection) url.searchParams.set("q", query);
    if (getType() !== "all") url.searchParams.set("image_type", getType());
    if (provider.value !== "all")
      url.searchParams.set("source", provider.value);
    if (license.value === "public") url.searchParams.set("license", "public");
    if (url.href !== location.href) history.pushState(null, "", url);
  }
  function sourceLinks() {
    const term = encodeURIComponent(query || "nature");
    document.getElementById("ps-pexels").href =
      `https://www.pexels.com/search/${term}/`;
    document.getElementById("ps-pixabay").href =
      `https://pixabay.com/images/search/${term}/`;
    document.getElementById("ps-unsplash").href =
      `https://unsplash.com/s/photos/${term}`;
  }
  function showImages() {
    const filtered = images.filter(
      (item) => license.value !== "public" || item.license.publicDomain,
    );
    const fragment = document.createDocumentFragment();
    filtered.forEach((item) => {
      const card = element("button", "ps-card");
      card.type = "button";
      card.dataset.imageId = item.id;
      card.setAttribute(
        "aria-label",
        `Ver ${item.title}, ${item.license.label}`,
      );
      const frame = element("span", "ps-card-frame");
      const image = document.createElement("img");
      image.src = safeURL(item.thumbnail);
      image.alt = item.title;
      image.loading = "lazy";
      image.decoding = "async";
      image.width = 600;
      image.height = 450;
      image.addEventListener(
        "error",
        () => {
          image.hidden = true;
          frame.classList.add("ps-image-unavailable");
          frame.append(
            element("span", "", "Vista previa no disponible · abre la fuente"),
          );
        },
        { once: true },
      );
      frame.append(
        image,
        element(
          "span",
          "ps-card-license",
          item.vector ? `SVG · ${item.license.label}` : item.license.label,
        ),
      );
      const body = element("span", "ps-card-body");
      body.append(
        element("span", "ps-card-source", PROVIDERS[item.provider].name),
        element("strong", "ps-card-title", item.title),
        element("span", "ps-card-author", item.author),
      );
      card.append(frame, body);
      card.addEventListener("click", () =>
        document.dispatchEvent(
          new CustomEvent("artelibre:preview", {
            detail: { ...item, opener: card },
          }),
        ),
      );
      fragment.append(card);
    });
    grid.replaceChildren(fragment);
    if (!filtered.length && !busy) {
      const empty = element("div", "ps-empty");
      empty.append(
        element(
          "strong",
          "",
          images.length
            ? "No hay coincidencias con esta licencia."
            : "Todavía no encontramos esa mirada.",
        ),
        element(
          "p",
          "",
          images.length
            ? "Prueba otra licencia o carga más imágenes."
            : "Prueba una palabra más amplia, otra fuente o los buscadores de abajo.",
        ),
      );
      grid.append(empty);
    }
    return filtered.length;
  }
  function showStatus(cached = false) {
    const count = showImages();
    status.textContent = busy
      ? count
        ? `${count} imágenes disponibles · consultando las demás fuentes…`
        : "Buscando en las fuentes seleccionadas…"
      : `${count} ${count === 1 ? "imagen disponible" : "imágenes disponibles"}${cached ? " · selección reciente guardada en este navegador" : ""}${errors.length ? " · algunas fuentes no respondieron" : ""}.`;
    grid.setAttribute("aria-busy", String(busy));
    more.hidden = !hasMore;
    more.disabled = busy;
    more.textContent = busy ? "Buscando…" : "Ver más imágenes ↓";
    retry.hidden = !errors.length || busy;
    health.replaceChildren();
    for (const error of errors)
      health.append(
        element(
          "span",
          "ps-source-warning",
          `${PROVIDERS[error.provider].name}: ${error.message}`,
        ),
      );
  }
  function readCache(key) {
    try {
      const entry =
        cache.get(key) || JSON.parse(sessionStorage.getItem(key) || "null");
      if (entry && Date.now() - entry.time < 300000) return entry;
    } catch {
      /* Storage may be disabled. Search still works. */
    }
    return null;
  }
  function writeCache(key, data) {
    const value = { ...data, time: Date.now() };
    cache.set(key, value);
    if (cache.size > 8) cache.delete(cache.keys().next().value);
    try {
      const keys = Object.keys(sessionStorage).filter((name) =>
        name.startsWith("picsearch:v1:"),
      );
      while (keys.length >= 8) sessionStorage.removeItem(keys.shift());
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Cache is optional. */
    }
  }
  async function search(reset = true, force = false) {
    if (!reset && busy) return;
    controller?.abort();
    controller = new AbortController();
    const id = ++requestId;
    if (reset) {
      query = input.value.trim().slice(0, 120) || "landscape";
      cursors = {};
      images = [];
      errors = [];
      hasMore = false;
      heading.textContent = initialSelection
        ? "Una selección para empezar"
        : `Miradas sobre «${query}»`;
    }
    sourceLinks();
    const key = `picsearch:v1:${JSON.stringify([query, getType(), provider.value, license.value])}`;
    const cached = reset && !force ? readCache(key) : null;
    if (cached) {
      ({ images, cursors, errors, hasMore } = cached);
      busy = false;
      showStatus(true);
      return;
    }
    busy = true;
    if (reset) {
      grid.replaceChildren(
        ...Array.from({ length: 8 }, () => {
          const skeleton = element("div", "ps-skeleton");
          skeleton.setAttribute("aria-hidden", "true");
          return skeleton;
        }),
      );
      status.textContent = "Buscando en las fuentes seleccionadas…";
      grid.setAttribute("aria-busy", "true");
    } else showStatus();
    more.disabled = true;
    retry.hidden = true;
    try {
      const result = await searchProviders({
        query,
        type: getType(),
        provider: provider.value,
        license: license.value,
        cursors,
        signal: controller.signal,
        onProgress: (partial) => {
          if (id !== requestId) return;
          images = [...images, ...uniqueImages(partial.images, images)];
          showStatus();
        },
      });
      if (id !== requestId) return;
      images = [...images, ...uniqueImages(result.images, images)];
      cursors = result.cursors;
      errors = result.errors;
      hasMore = result.hasMore;
      if (result.successfulProviders.length)
        writeCache(key, { images, cursors, errors, hasMore });
    } catch {
      if (id !== requestId) return;
      errors = [
        {
          provider: "openverse",
          message:
            "No se pudo conectar. Revisa tu conexión y vuelve a intentarlo.",
        },
      ];
    } finally {
      if (id === requestId) {
        busy = false;
        showStatus();
      }
    }
  }
  function restore() {
    const params = new URLSearchParams(location.search);
    input.value = (params.get("q") || params.get("s") || "").slice(0, 120);
    initialSelection = !input.value;
    const type = ["photo", "illustration", "vector"].includes(
      params.get("image_type"),
    )
      ? params.get("image_type")
      : "all";
    document.querySelector(
      `input[name="image_type"][value="${type}"]`,
    ).checked = true;
    provider.value = Object.hasOwn(PROVIDERS, params.get("source"))
      ? params.get("source")
      : "all";
    license.value =
      params.get("license") === "public" ? "public" : "commercial";
    clear.hidden = !input.value;
    syncSources();
    search();
  }
  function syncSources() {
    const type = getType();
    for (const option of provider.options)
      option.disabled =
        (option.value === "artic" && ["photo", "vector"].includes(type)) ||
        (option.value === "commons" && ["photo", "illustration"].includes(type));
    if (provider.selectedOptions[0]?.disabled) provider.value = "all";
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (input.value.trim().length < 2) {
      status.textContent = "Escribe al menos dos caracteres para buscar.";
      input.focus();
      return;
    }
    initialSelection = false;
    query = input.value.trim();
    updateURL();
    search();
  });
  input.addEventListener("input", () => {
    clear.hidden = !input.value;
  });
  clear.addEventListener("click", () => {
    input.value = "";
    clear.hidden = true;
    initialSelection = true;
    query = "";
    updateURL();
    search();
    input.focus();
  });
  root.querySelectorAll('input[name="image_type"]').forEach((radio) =>
    radio.addEventListener("change", () => {
      syncSources();
      updateURL();
      search();
    }),
  );
  provider.addEventListener("change", () => {
    updateURL();
    search();
  });
  license.addEventListener("change", () => {
    updateURL();
    search();
  });
  document.querySelectorAll("[data-query]").forEach((button) =>
    button.addEventListener("click", () => {
      input.value = button.dataset.query;
      initialSelection = false;
      query = input.value;
      clear.hidden = false;
      updateURL();
      search();
    }),
  );
  more.addEventListener("click", () => search(false));
  retry.addEventListener("click", () => search(true, true));
  window.addEventListener("popstate", restore);
  restore();
}
