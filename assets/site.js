/** Shared browser-only navigation, image preview and contact drafts. */
(() => {
  "use strict";
  const safeURL = (value) => {
    try {
      const url = new URL(value, location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };
  const byId = (id) => document.getElementById(id);
  const drawer = byId("drawer"),
    burger = byId("burger"),
    preview = byId("image-preview-modal");
  let drawerOpener, previewOpener, currentImage, downloadController, toastTimer;
  const focusables = (node) =>
    [
      ...node.querySelectorAll(
        'a[href],button:not([disabled]),input,select,textarea,[tabindex="0"]',
      ),
    ].filter((item) => item.getClientRects().length && !item.hidden);
  function announce(message) {
    let toast = byId("al-notification");
    if (!toast) {
      toast = document.createElement("p");
      toast.id = "al-notification";
      toast.className = "al-notification";
      toast.setAttribute("role", "status");
      document.body.append(toast);
    }
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 5500);
  }
  function toggleDrawer(open) {
    if (!drawer) return;
    if (open) drawerOpener = document.activeElement;
    drawer.inert = !open;
    drawer.classList.toggle("open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    burger?.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
    if (open) (byId("closeDrawer") || focusables(drawer)[0])?.focus();
    else drawerOpener?.focus();
  }
  if (drawer) drawer.inert = true;
  burger?.addEventListener("click", () =>
    toggleDrawer(!drawer.classList.contains("open")),
  );
  byId("closeDrawer")?.addEventListener("click", () => toggleDrawer(false));
  drawer?.addEventListener("click", (event) => {
    if (event.target === drawer || event.target.closest("a[href]"))
      toggleDrawer(false);
  });
  const toggle = byId("prismix-color-toggle");
  const updateThemeLabel = () =>
    toggle?.setAttribute(
      "aria-label",
      document.documentElement.dataset.colorMode === "dark"
        ? "Activar tema claro"
        : "Activar tema oscuro",
    );
  updateThemeLabel();
  const pagePath = (value) =>
    new URL(value, location.href).pathname
      .replace(/\/index\.html$/, "/")
      .replace(/\/$/, "");
  document.querySelectorAll("nav a[href]").forEach((anchor) => {
    if (pagePath(anchor.href) === pagePath(location.href))
      anchor.setAttribute("aria-current", "page");
  });
  toggle?.addEventListener("click", () => {
    const mode =
      document.documentElement.dataset.colorMode === "dark" ? "light" : "dark";
    document.documentElement.dataset.colorMode = mode;
    updateThemeLabel();
    try {
      localStorage.setItem("prismixColorMode", mode);
    } catch {}
  });
  if (byId("y")) byId("y").textContent = String(new Date().getFullYear());
  function closePreview() {
    if (!preview) return;
    downloadController?.abort();
    preview.inert = true;
    preview.classList.remove("is-open");
    preview.setAttribute("aria-hidden", "true");
    document.body.classList.remove("preview-open");
    document.body.style.overflow = "";
    byId("image-preview-img").removeAttribute("src");
    currentImage = null;
    previewOpener?.focus();
  }
  function link(id, url, text) {
    const node = byId(id);
    if (!node) return;
    const href = safeURL(url);
    node.hidden = !href;
    if (href) node.href = href;
    else node.removeAttribute("href");
    node.target = "_blank";
    node.rel = "noopener noreferrer";
    if (text) node.textContent = text;
  }
  function openPreview(data) {
    if (!preview || !safeURL(data.image)) return;
    downloadController?.abort();
    currentImage = data;
    previewOpener = data.opener || document.activeElement;
    preview.inert = false;
    const img = byId("image-preview-img");
    img.hidden = false;
    img.src = safeURL(data.image);
    img.alt = data.title || "Vista previa";
    byId("image-preview-title").textContent = data.title || "Vista previa";
    byId("image-preview-subtitle").textContent = [
      data.author,
      data.sourceName ||
        {
          artic: "Art Institute of Chicago",
          commons: "Wikimedia Commons",
          openverse: "Openverse",
        }[data.provider],
    ]
      .filter(Boolean)
      .join(" · ");
    link("image-preview-primary", data.detail, "Ver ficha original ↗");
    link("image-preview-secondary", data.image, "Abrir original ↗");
    link(
      "image-preview-attribution",
      data.authorURL,
      data.author ? `Autor: ${data.author} ↗` : "Ver autor ↗",
    );
    byId("image-preview-license").textContent =
      data.license?.description ||
      "Consulta la ficha original para conocer las condiciones de uso de esta imagen.";
    link(
      "image-preview-license-link",
      data.license?.url,
      "Consultar licencia ↗",
    );
    const download = byId("image-preview-download");
    download.href = safeURL(data.image);
    download.hidden = false;
    download.textContent = data.vector ? "Descargar SVG" : "Descargar imagen";
    download.removeAttribute("aria-disabled");
    let copy = byId("ps-copy-attribution");
    if (!copy) {
      copy = document.createElement("button");
      copy.id = "ps-copy-attribution";
      copy.type = "button";
      copy.className = "btn btn-quiet";
      copy.textContent = "Copiar atribución";
      copy.addEventListener("click", () => {
        if (!currentImage) return;
        const item = currentImage;
        copyText(
          `${item.title || "Imagen"} — ${item.author || "Autor no indicado"}. ${item.detail || item.image}. ${item.license?.label || "Consultar licencia"}${item.license?.url ? ` (${item.license.url})` : ""}. Si adaptas la obra, añade una descripción de tus cambios.`,
        );
      });
      download.parentElement.append(copy);
    }
    let notice = byId("ps-download-status");
    if (!notice) {
      notice = document.createElement("p");
      notice.id = "ps-download-status";
      notice.setAttribute("role", "status");
      notice.className = "ps-download-status";
      download.parentElement.after(notice);
    }
    notice.textContent = "";
    preview.classList.add("is-open");
    preview.setAttribute("aria-hidden", "false");
    document.body.classList.add("preview-open");
    document.body.style.overflow = "hidden";
    preview.querySelector("[data-preview-close]")?.focus();
  }
  byId("image-preview-img")?.addEventListener("error", () => {
    byId("image-preview-img").hidden = true;
    const status = byId("ps-download-status");
    if (status)
      status.textContent =
        "La vista previa no está disponible. Puedes consultar la ficha original.";
  });
  document.addEventListener("artelibre:preview", (event) =>
    openPreview(event.detail),
  );
  preview?.addEventListener("click", (event) => {
    if (event.target.closest("[data-preview-close]")) closePreview();
  });
  byId("image-preview-download")?.addEventListener("click", async (event) => {
    event.preventDefault();
    if (
      !currentImage ||
      event.currentTarget.getAttribute("aria-disabled") === "true"
    )
      return;
    const item = currentImage,
      button = event.currentTarget,
      notice = byId("ps-download-status");
    downloadController = new AbortController();
    const activeController = downloadController;
    const downloadSignal = activeController.signal;
    const timeout = setTimeout(() => activeController.abort(), 20000);
    button.setAttribute("aria-disabled", "true");
    button.textContent = "Preparando descarga…";
    notice.textContent = "";
    try {
      const response = await fetch(safeURL(item.image), {
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: downloadSignal,
      });
      if (
        !response.ok ||
        !/^image\//.test(response.headers.get("Content-Type") || "") ||
        Number(response.headers.get("Content-Length")) > 30 * 1024 * 1024
      )
        throw new Error("Invalid image");
      const chunks = [],
        reader = response.body?.getReader();
      let size = 0;
      if (reader) {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > 30 * 1024 * 1024) {
            await reader.cancel();
            throw new Error("Image too large");
          }
          chunks.push(part.value);
        }
      }
      const blob = reader
        ? new Blob(chunks, { type: response.headers.get("Content-Type") })
        : await response.blob();
      if (
        blob.size > 30 * 1024 * 1024 ||
        currentImage !== item ||
        downloadSignal.aborted
      )
        throw new Error("Unavailable image");
      const extension = blob.type.includes("svg")
        ? "svg"
        : blob.type.includes("png")
          ? "png"
          : blob.type.includes("webp")
            ? "webp"
            : "jpg";
      const url = URL.createObjectURL(blob),
        anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `artelibre-${(item.id || "imagen").replace(/[^\w-]/g, "-")}.${extension}`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      notice.textContent =
        "Descarga preparada. Conserva también la atribución y la licencia.";
    } catch {
      if (currentImage === item)
        notice.textContent =
          "Esta fuente no permite descargar directamente desde aquí. Usa «Abrir original» y guarda la imagen, o visita su ficha para descargarla.";
    } finally {
      clearTimeout(timeout);
      if (currentImage === item) {
        button.removeAttribute("aria-disabled");
        button.textContent = item.vector ? "Descargar SVG" : "Descargar imagen";
      }
    }
  });
  document.addEventListener("click", (event) => {
    const card = event.target.closest(".card-image:not(.ps-card)");
    if (
      !card ||
      event.target.closest("button,a") !== card ||
      !card.dataset.imageUrl
    )
      return;
    event.preventDefault();
    openPreview({
      image: card.dataset.imageUrl,
      title: card.dataset.previewTitle || card.querySelector("img")?.alt,
      detail: card.dataset.detailUrl || card.href,
      author: card.dataset.previewSubtitle,
      opener: card,
    });
  });
  document.addEventListener("keydown", (event) => {
    const modal = preview?.classList.contains("is-open")
      ? preview
      : drawer?.classList.contains("open")
        ? drawer
        : null;
    if (!modal) return;
    if (event.key === "Escape") {
      event.preventDefault();
      modal === preview ? closePreview() : toggleDrawer(false);
    }
    if (event.key === "Tab") {
      const items = focusables(modal);
      if (!items.length) return;
      if (
        event.shiftKey &&
        (document.activeElement === items[0] ||
          !modal.contains(document.activeElement))
      ) {
        event.preventDefault();
        items.at(-1).focus();
      } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
        event.preventDefault();
        items[0].focus();
      }
    }
  });
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      announce("Texto copiado.");
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.className = "ps-copy-fallback";
      area.setAttribute("aria-label", "Texto para copiar");
      document.body.append(area);
      area.focus();
      area.select();
      announce("Selecciona y copia el texto. Cierra este campo con Escape.");
      area.addEventListener("keydown", (event) => {
        if (event.key === "Escape") area.remove();
      });
    }
  }
  const brief = document.querySelector(".al-studio-form");
  brief?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!brief.reportValidity()) return;
    const values = new FormData(brief),
      packages = { plus: "Esencial", pro: "Profesional", max: "Integral" };
    const services = {
      campana: "Campaña",
      identidad: "Identidad de marca",
      contenido: "Contenido",
      mixto: "Necesito orientación",
      otro: "Otro",
    };
    const text = `Solicitud de Creative Studio\n\nNombre: ${values.get("studio_contact_name")}\nMarca o negocio: ${values.get("studio_business")}\nCorreo: ${values.get("studio_email")}\nServicio: ${services[values.get("studio_service")] || "Por definir"}\nPaquete: ${packages[values.get("studio_package")] || "Por definir"}\n\nProyecto:\n${values.get("studio_message")}`;
    let draft = byId("al-contact-draft");
    if (!draft) {
      draft = document.createElement("section");
      draft.id = "al-contact-draft";
      draft.className = "al-contact-draft";
      draft.setAttribute("tabindex", "-1");
      brief.after(draft);
    }
    draft.replaceChildren();
    const title = document.createElement("h3");
    title.textContent = "Tu solicitud está lista para enviar";
    const note = document.createElement("p");
    note.textContent =
      "Aún no se ha enviado. Abre tu correo y confirma el envío, o copia la solicitud y envíala a artelibrework@gmail.com.";
    const area = document.createElement("textarea");
    area.value = text;
    area.readOnly = true;
    area.rows = 9;
    area.setAttribute("aria-label", "Borrador de solicitud");
    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const mail = document.createElement("a");
    mail.className = "btn primary";
    mail.textContent = "Abrir mi correo ↗";
    mail.href = `mailto:artelibrework@gmail.com?subject=${encodeURIComponent(`Solicitud Studio: ${String(values.get("studio_business")).replace(/[\r\n]/g, " ")}`)}&body=${encodeURIComponent(text)}`;
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "btn";
    copy.textContent = "Copiar solicitud";
    copy.addEventListener("click", () => copyText(text));
    actions.append(mail, copy);
    draft.append(title, note, area, actions);
    draft.focus();
  });
  document.querySelectorAll("[data-studio-package]").forEach((link) =>
    link.addEventListener("click", () => {
      const value = link.dataset.studioPackage;
      if (["plus", "pro", "max"].includes(value)) {
        const radio = document.querySelector(
          `input[name="studio_package"][value="${value}"]`,
        );
        if (radio) radio.checked = true;
      }
    }),
  );
})();
