# ArteLibre — sitio estático

Esta carpeta es la versión que se publica. Abre esta carpeta completa en VS Code
y ejecuta Live Server sobre `index.html`. No necesita WordPress, PHP, base de datos,
instalación de dependencias ni un paso de compilación.

## GitHub Pages

Publica el contenido de esta carpeta en la raíz de un repositorio independiente.
Conserva juntos `index.html`, `.nojekyll`, `assets/`, `wp-content/`, `wp-includes/`
y las carpetas de páginas. En GitHub: Settings → Pages → Deploy from a branch →
main → /(root). Las rutas relativas funcionan también en `/nombre-repositorio/`.
No publiques el repositorio completo de Local Sites ni sus archivos de configuración.

## PicSearch

`assets/picsearch-core.js` consulta en paralelo las API públicas de Openverse,
Wikimedia Commons y Art Institute of Chicago. Las consultas salen directamente del
navegador hacia esas fuentes, sin claves privadas. Puede haber límites temporales
o bloqueos de red de cada proveedor; la interfaz conserva los resultados de las
otras fuentes y permite reintentar. La caché opcional vive en sessionStorage
durante cinco minutos, con un máximo de ocho búsquedas. No se envían registros
de búsquedas a un servidor de ArteLibre.

Pexels, Pixabay y Unsplash se ofrecen como enlaces a sus buscadores oficiales.
No se mezclan resultados de esos servicios sin una integración de API configurada.
La galería integrada admite CC0, dominio público, CC BY y CC BY-SA. El filtro de
uso comercial se refiere al copyright; no sustituye otros permisos sobre personas
o marcas. Verifica siempre la ficha original. Las descripciones están en
`buscador/index.html#licencias`, con enlaces a las condiciones oficiales.

Las vistas previas permiten copiar la atribución y descargar cuando el origen
autoriza CORS. Si no lo permite, la interfaz indica cómo abrir el original para
guardarlo. El límite de descarga directa es de 30 MB.

## Contacto

Studio prepara un borrador local. El visitante lo copia o lo abre en su cliente de
correo para enviarlo a artelibrework@gmail.com. No muestra confirmaciones falsas
de envío. Murales ofrece contacto por correo. No hay recepción automática de
formularios ni subida de archivos en este hosting estático.

## Recursos y mantenimiento

`assets/site.js` controla menú, tema, vista previa y borradores. `assets/static.css`
contiene el pulido visual. Las fuentes Quicksand y Comfortaa se sirven localmente
en WOFF2; sus licencias OFL están en `assets/fonts/`. El tema original conserva
la licencia de sus archivos. Las imágenes externas conservan su licencia individual.

Los scripts de WordPress, nonces y jQuery dejaron de cargarse en el HTML publicado.
Los archivos heredados permanecen como parte de la exportación, pero PicSearch
no los utiliza. Se eliminó del HTML CSS de bloques de WordPress que no se usaba.

Para comprobar sintaxis: `npm run check` (no requiere npm install).
No sobrescribas esta carpeta con una nueva exportación de Simply Static sin volver
a aplicar la adaptación. La copia anterior de los HTML está fuera de esta carpeta,
en `Documents/artelibre-pages-tools/backups/static-before-upgrade-2026-10-27/`.
