(function ($) {
    'use strict';

    var ArtelibereImageSearch = {
        currentPage: 1,
        currentQuery: '',
        currentImageType: 'all',
        isSearching: false,
        hasMore: true,
        perPage: 12,

        // ─── Inicialización ───────────────────────────────────────────────
        init: function () {
            this.bindClearButton();
            this.bindTypeFilter();

            if (artelibresearch.is_search === '1' && artelibresearch.search_query) {
                this.currentQuery = artelibresearch.search_query;
                // Leer image_type desde URL (pasado por PHP)
                this.currentImageType = artelibresearch.image_type || 'all';
                this.bindSearchPageEvents();
                this.runSearch(true);
            }

            if (artelibresearch.is_home === '1') {
                this.loadTrending();
            }
        },

        // ─── Sincronizar radio buttons con hidden input del form ──────────
        bindTypeFilter: function () {
            // Pre-seleccionar el radio correcto según el valor actual
            var currentType = artelibresearch.image_type || 'all';
            $('input[name="artelibre_image_type"][value="' + currentType + '"]').prop('checked', true);

            // Al cambiar radio → actualizar hidden input (para el Submit nativo)
            $(document).on('change', 'input[name="artelibre_image_type"]', function () {
                $('#search-image-type').val($(this).val());
            });
        },

        // ─── Clear button ─────────────────────────────────────────────────
        bindClearButton: function () {
            var $input = $('#search-input');
            var $clear = $('#search-clear');

            if (!$input.length || !$clear.length) return;

            if ($input.val().trim().length > 0) {
                $clear.removeAttr('hidden');
            }

            $input.on('input', function () {
                if ($(this).val().trim().length > 0) {
                    $clear.removeAttr('hidden');
                } else {
                    $clear.attr('hidden', '');
                }
            });

            $clear.on('click', function () {
                $input.val('').trigger('input').focus();
                var homeUrl = artelibresearch.home_url || window.location.origin + '/';
                window.location.href = homeUrl;
            });
        },

        // ─── Eventos de la página de búsqueda ─────────────────────────────
        bindSearchPageEvents: function () {
            var self = this;

            $(document).on('change', 'input[name="artelibre_image_type"]', function () {
                self.currentImageType = $(this).val();
                self.runSearch(true);
            });

            $(document).on('click', '#artelibre-load-more', function () {
                self.loadMore();
            });
        },

        // ─── Búsqueda principal ───────────────────────────────────────────
        runSearch: function (reset) {
            if (this.isSearching) return;

            var $container = $('#artelibre-api-results');
            var $loadMore = $('#artelibre-load-more');

            if (!$container.length) return;

            if (reset) {
                this.currentPage = 1;
                this.hasMore = true;
                $container.html(
                    '<div class="artelibre-loading">' +
                    '<p>Buscando imágenes en Pexels, Pixabay, Unsplash y Openverse…</p>' +
                    '</div>'
                );
                $loadMore.attr('hidden', '');
            }

            this.isSearching = true;
            $loadMore.attr('hidden', '').prop('disabled', true);

            var self = this;

            $.ajax({
                url: artelibresearch.ajax_url,
                type: 'POST',
                dataType: 'json',
                data: {
                    action: 'artelibre_search',
                    nonce: artelibresearch.nonce,
                    query: this.currentQuery,
                    limit: this.perPage,
                    page: this.currentPage,
                    image_type: this.currentImageType,
                },
                success: function (response) {
                    var results = (response.success && response.data && response.data.results)
                        ? response.data.results
                        : [];

                    if (reset) {
                        $container.empty();
                    }

                    if (results.length === 0 && self.currentPage === 1) {
                        $container.html(
                            '<p class="artelibre-no-api-results">' +
                            'No encontramos imágenes para este término. Prueba con otra palabra.' +
                            '</p>'
                        );
                        $loadMore.attr('hidden', '');
                        return;
                    }

                    self.appendResults(results, $container);

                    if (results.length >= self.perPage) {
                        $loadMore.removeAttr('hidden');
                        self.hasMore = true;
                    } else {
                        $loadMore.attr('hidden', '');
                        self.hasMore = false;
                    }
                },
                error: function () {
                    if (reset) {
                        $container.html(
                            '<p class="artelibre-no-api-results">No pudimos conectar con las fuentes de imágenes.</p>'
                        );
                    }
                    $loadMore.attr('hidden', '');
                },
                complete: function () {
                    self.isSearching = false;
                    $loadMore.prop('disabled', false);
                },
            });
        },

        // ─── Load More ────────────────────────────────────────────────────
        loadMore: function () {
            if (!this.hasMore || this.isSearching) return;
            this.currentPage++;
            this.runSearch(false);
        },

        // ─── Agregar resultados al grid ───────────────────────────────────
        appendResults: function (results, $container) {
            var self = this;
            var $grid = $container.find('.artelibre-results-grid');

            if (!$grid.length) {
                $grid = $('<div class="grid artelibre-results-grid"></div>');
                $container.append($grid);
            }

            $.each(results, function (i, image) {
                $grid.append(self.renderImage(image));
            });
        },

        // ─── Renderizar card con estructura del tema Prismix ──────────────
        renderImage: function (image) {
            var likesHtml = (image.likes && image.likes > 0)
                ? '<span class="badge">' + image.likes + ' \u2764</span><span>&bull;</span>'
                : '';
            var sourceNames = { artinstitute: 'Art Institute of Chicago', commons: 'Wikimedia Commons' };
            var sourceBadge = image.source
                ? (sourceNames[image.source] || image.source.charAt(0).toUpperCase() + image.source.slice(1))
                : '';
            var sourceUrl = image.source === 'unsplash'
                ? 'https://unsplash.com/?utm_source=arte_libre&utm_medium=referral'
                : (image.source === 'pexels'
                    ? 'https://www.pexels.com/'
                    : (image.source === 'pixabay'
                        ? 'https://pixabay.com/'
                        : (image.source === 'openverse' ? 'https://openverse.org/'
                            : (image.source === 'artinstitute' ? 'https://www.artic.edu/'
                                : (image.source === 'commons' ? 'https://commons.wikimedia.org/' : '')))));
            var authorName = this.escapeHtml(image.author_name || 'Autor desconocido');
            var rawAuthorUrl = image.author_url || '';
            if (image.source === 'unsplash' && rawAuthorUrl) {
                try {
                    var attributedUrl = new URL(rawAuthorUrl);
                    attributedUrl.searchParams.set('utm_source', 'arte_libre');
                    attributedUrl.searchParams.set('utm_medium', 'referral');
                    rawAuthorUrl = attributedUrl.toString();
                } catch (error) {}
            }
            var authorUrl = this.escapeHtml(rawAuthorUrl);
            var detailUrl = this.escapeHtml(image.detail_url || rawAuthorUrl || image.image_url);
            var providerId = this.escapeHtml(image.provider_id || '');
            var license = this.escapeHtml(image.license || '');
            var licenseUrl = this.escapeHtml(image.license_url || '');
            var thumbnailUrl = this.escapeHtml(image.thumbnail_url || image.image_url || '');
            var thumbnailUrl2x = this.escapeHtml(image.thumbnail_url_2x || '');
            var responsiveAttributes = thumbnailUrl2x && thumbnailUrl2x !== thumbnailUrl
                ? ' srcset="' + thumbnailUrl + ' 1x, ' + thumbnailUrl2x + ' 2x"'
                : '';
            var previewTitle = 'Imagen de ' + authorName;
            var subtitle = [sourceBadge, license, authorName].filter(Boolean).join(' • ');

            return '<article class="card card-image artelibre-card" role="button" tabindex="0"'
                + ' data-source="' + this.escapeHtml(image.source) + '"'
                + ' data-image-url="' + this.escapeHtml(image.image_url) + '"'
                + ' data-author-url="' + authorUrl + '"'
                + ' data-detail-url="' + detailUrl + '"'
                + ' data-provider-id="' + providerId + '"'
                + ' data-license="' + license + '"'
                + ' data-license-url="' + licenseUrl + '"'
                + ' data-preview-title="' + previewTitle + '"'
                + ' data-preview-subtitle="' + this.escapeHtml(subtitle) + '"'
                + ' data-preview-origin="external" aria-label="Abrir vista previa de imagen de ' + authorName + '">'
                + '<div class="thumb">'
                +   '<img src="' + thumbnailUrl + '"' + responsiveAttributes
                +       ' alt="Imagen de ' + authorName + '" loading="lazy" decoding="async"'
                +       ' sizes="(max-width: 600px) calc(100vw - 30px), (max-width: 820px) 50vw, (max-width: 1024px) 33vw, 25vw">'
                + '</div>'
                + '<div class="overlay"></div>'
                + '<span class="card-action" aria-hidden="true">↗</span>'
                + '<div class="meta">'
                +   '<div class="title">Imagen de ' + authorName + '</div>'
                +   '<div class="sub">'
                +     likesHtml
                +     (sourceUrl ? '<a class="badge source-link" href="' + sourceUrl + '" target="_blank" rel="noopener noreferrer">' + sourceBadge + '</a>' : '<span class="badge">' + sourceBadge + '</span>')
                +     (license ? '<span class="badge license-badge">' + license + '</span>' : '')
                +     (authorUrl ? '<a class="attribution-link" href="' + authorUrl + '" target="_blank" rel="noopener noreferrer">' + authorName + '</a>' : '<span>' + authorName + '</span>')
                +   '</div>'
                + '</div>'
                + '</article>';
        },

        // ─── Trending en homepage ─────────────────────────────────────────
        loadTrending: function () {
            var $grid = $('#artelibre-trending-api-grid');
            if (!$grid.length) return;

            var self = this;

            $.ajax({
                url: artelibresearch.ajax_url,
                type: 'POST',
                dataType: 'json',
                data: {
                    action: 'artelibre_trending',
                    nonce: artelibresearch.nonce,
                    limit: 12,
                },
                success: function (response) {
                    $grid.empty();

                    var results = (response.success && response.data && response.data.results)
                        ? response.data.results
                        : [];

                    if (results.length === 0) {
                        $grid.html('<p class="no-results">No hay imágenes disponibles por ahora.</p>');
                        return;
                    }

                    var shown = results.slice(0, 12);
                    $.each(shown, function (i, image) {
                        $grid.append(self.renderImage(image));
                    });
                },
                error: function () {
                    $grid.html('<p class="no-results">No pudimos cargar la selección visual.</p>');
                },
            });
        },

        // ─── Utilidades ───────────────────────────────────────────────────
        escapeHtml: function (text) {
            if (!text) return '';
            return $('<div/>').text(String(text)).html();
        },
    };

    $(document).ready(function () {
        ArtelibereImageSearch.init();
    });

})(jQuery);
