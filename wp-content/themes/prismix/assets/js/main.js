/**
 * Main JavaScript
 *
 * @package prismix
 */

(function () {
	'use strict';

	// DOM elements
	const burger = document.getElementById('burger');
	const drawer = document.getElementById('drawer');
	const closeDrawer = document.getElementById('closeDrawer');
	const yearEl = document.getElementById('y');
	const previewModal = document.getElementById('image-preview-modal');
	const previewImg = document.getElementById('image-preview-img');
	const previewTitle = document.getElementById('image-preview-title');
	const previewSubtitle = document.getElementById('image-preview-subtitle');
	const previewPrimary = document.getElementById('image-preview-primary');
	const previewSecondary = document.getElementById('image-preview-secondary');
	const previewDownload = document.getElementById('image-preview-download');
	const previewAttribution = document.getElementById('image-preview-attribution');
	const previewLicense = document.getElementById('image-preview-license');
	const previewLicenseLink = document.getElementById('image-preview-license-link');
	// Set current year in footer
	if (yearEl) {
		yearEl.textContent = new Date().getFullYear();
	}


	function buildDownloadUrl(imageUrl, source, providerId) {
		if (!imageUrl || typeof prismix === 'undefined') return imageUrl || '#';
		const url = new URL(prismix.ajax_url, window.location.href);
		url.searchParams.set('action', 'artelibre_download_image');
		url.searchParams.set('nonce', prismix.nonce || '');
		url.searchParams.set('url', imageUrl);
		url.searchParams.set('source', source || 'artelibre');
		if (providerId) url.searchParams.set('provider_id', providerId);
		return url.toString();
	}

	/**
	 * Get visible focusable elements within a container.
	 */
	function getFocusable(el) {
		if (!el) return [];
		const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
		return Array.prototype.filter.call(el.querySelectorAll(selector), function (node) {
			// Skip hidden elements
			return !node.hasAttribute('hidden') && node.offsetParent !== null;
		});
	}

	function canUsePreviewClick(event) {
		return !event.defaultPrevented
			&& event.button === 0
			&& !event.metaKey
			&& !event.ctrlKey
			&& !event.shiftKey
			&& !event.altKey;
	}

	// Track the element that opened the drawer so we can restore focus on close.
	let drawerOpener = null;
	let previewOpener = null;

	function openPreview(data, opener) {
		if (!previewModal || !previewImg || !previewPrimary || !previewSecondary || !previewDownload) return;

		previewOpener = opener || document.activeElement;
		previewModal.inert = false;
		previewImg.src = data.imageUrl || '';
		previewImg.alt = data.title || '';
		if (previewTitle) previewTitle.textContent = data.title || 'Vista previa';
		if (previewSubtitle) previewSubtitle.textContent = data.subtitle || '';

		previewPrimary.href = data.detailUrl || data.imageUrl || '#';
		previewPrimary.textContent = data.primaryLabel || 'Ver detalles';
		previewPrimary.target = data.primaryTarget || '_self';
		previewPrimary.rel = data.primaryTarget === '_blank' ? 'noopener noreferrer' : 'noopener';

		previewSecondary.href = data.imageUrl || '#';
		previewSecondary.hidden = !data.imageUrl;
		previewDownload.href = data.source === 'local' ? (data.imageUrl || '#') : buildDownloadUrl(data.imageUrl, data.source || 'artelibre', data.providerId || '');
		if (data.source === 'local') previewDownload.setAttribute('download', '');
		else previewDownload.removeAttribute('download');
		previewDownload.hidden = !data.imageUrl;
		if (previewAttribution) {
			previewAttribution.href = data.authorUrl || data.detailUrl || '#';
			previewAttribution.hidden = !data.authorUrl;
			previewAttribution.textContent = data.authorLabel || 'Ver autor y fuente ↗';
		}
		if (previewLicense) {
			previewLicense.textContent = data.source === 'local'
					? 'Contenido publicado en Arte Libre. Consulta sus detalles antes de reutilizar.'
					: (data.license
						? 'Vector ' + data.license + ' disponible para reutilización y edición.'
						: 'Uso gratuito sujeto a las condiciones específicas de ' + (data.sourceLabel || 'la fuente') + '.');
		}
		if (previewLicenseLink) {
			const licenseUrls = {
				pexels: 'https://www.pexels.com/license/',
				pixabay: 'https://pixabay.com/service/license-summary/',
				unsplash: 'https://unsplash.com/license'
			};
			const licenseUrl = data.licenseUrl || licenseUrls[data.source] || '';
			previewLicenseLink.href = licenseUrl || '#';
			previewLicenseLink.hidden = !licenseUrl;
		}

		previewModal.classList.add('is-open');
		previewModal.setAttribute('aria-hidden', 'false');
		document.body.classList.add('preview-open');
		document.body.style.overflow = 'hidden';
		document.querySelector('.image-preview-close')?.focus();
	}

	function closePreview() {
		if (!previewModal) return;
		previewModal.classList.remove('is-open');
		previewModal.setAttribute('aria-hidden', 'true');
		previewModal.inert = true;
		document.body.classList.remove('preview-open');
		document.body.style.overflow = '';

		if (previewImg) {
			previewImg.src = '';
			previewImg.alt = '';
		}

		if (previewOpener && typeof previewOpener.focus === 'function') {
			previewOpener.focus();
		}
		previewOpener = null;
	}

	/**
	 * Toggle drawer open/close
	 */
	function toggleDrawer(open) {
		if (!drawer) return;

		if (open) {
			drawerOpener = document.activeElement;
			drawer.setAttribute('aria-hidden', 'false');
			drawer.classList.add('open');
			document.body.style.overflow = 'hidden';
			burger?.setAttribute('aria-expanded', 'true');

			// Focus the close button when drawer opens.
			if (closeDrawer) {
				closeDrawer.focus();
			} else {
				const firstFocusable = getFocusable(drawer)[0];
				if (firstFocusable) firstFocusable.focus();
			}
		} else {
			drawer.setAttribute('aria-hidden', 'true');
			drawer.classList.remove('open');
			document.body.style.overflow = '';
			burger?.setAttribute('aria-expanded', 'false');

			// Restore focus to whatever opened the drawer (burger by default).
			const restoreTo = drawerOpener && document.body.contains(drawerOpener) ? drawerOpener : burger;
			if (restoreTo && typeof restoreTo.focus === 'function') {
				restoreTo.focus();
			}
			drawerOpener = null;
		}
	}

	// Burger button click
	if (burger) {
		burger.addEventListener('click', function () {
			const isOpen = drawer?.classList.contains('open');
			toggleDrawer(!isOpen);
		});
	}

	// Close button click
	if (closeDrawer) {
		closeDrawer.addEventListener('click', function () {
			toggleDrawer(false);
		});
	}

	// Keydown handling while drawer is open: Escape closes, Tab/Shift+Tab cycles focus.
	document.addEventListener('keydown', function (e) {
		if (!drawer || !drawer.classList.contains('open')) return;

		if (e.key === 'Escape') {
			e.preventDefault();
			toggleDrawer(false);
			return;
		}

		if (e.key === 'Tab') {
			const focusables = getFocusable(drawer);
			if (focusables.length === 0) {
				e.preventDefault();
				return;
			}
			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			const active = document.activeElement;

			if (e.shiftKey) {
				if (active === first || !drawer.contains(active)) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (active === last || !drawer.contains(active)) {
					e.preventDefault();
					first.focus();
				}
			}
		}
	});

	document.addEventListener('keydown', function (e) {
		if (!previewModal || !previewModal.classList.contains('is-open')) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			closePreview();
			return;
		}
		if (e.key === 'Tab') {
			const focusables = getFocusable(previewModal);
			if (!focusables.length) return;
			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
			if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
		}
	});

	// Close drawer when clicking outside
	if (drawer) {
		drawer.addEventListener('click', function (e) {
			if (e.target === drawer) {
				toggleDrawer(false);
			}
		});
	}

	if (previewModal) {
		previewModal.addEventListener('click', function (e) {
			if (e.target.hasAttribute('data-preview-close')) {
				closePreview();
			}
		});
	}

	document.addEventListener('click', function (e) {
		const card = e.target.closest('.card-image, .artelibre-card');
		if (!card || !canUsePreviewClick(e)) return;
		if (e.target.closest('a, button') && e.target.closest('a, button') !== card) return;

		const href = card.getAttribute('href') || '';
		const imageUrl = card.dataset.imageUrl || href;
		if (!imageUrl) return;

		e.preventDefault();

		const titleNode = card.querySelector('.title');
		const subtitleNode = card.querySelector('.sub');
		const imageNode = card.querySelector('img');
		const isExternal = card.classList.contains('artelibre-card') || card.dataset.previewOrigin === 'external' || card.target === '_blank';
		const source = card.dataset.source || (isExternal ? 'externa' : 'local');
		const sourceLabel = source === 'pexels' ? 'Pexels' : source === 'pixabay' ? 'Pixabay' : source === 'unsplash' ? 'Unsplash' : source === 'openverse' ? 'Openverse' : source === 'artinstitute' ? 'Art Institute of Chicago' : source === 'commons' ? 'Wikimedia Commons' : 'Arte Libre';
		const authorUrl = card.dataset.authorUrl || '';

		openPreview({
			imageUrl: imageUrl,
			title: card.dataset.previewTitle || (titleNode ? titleNode.textContent.trim() : '') || (imageNode ? imageNode.alt : ''),
			subtitle: card.dataset.previewSubtitle || (subtitleNode ? subtitleNode.textContent.replace(/\s+/g, ' ').trim() : ''),
			detailUrl: card.dataset.detailUrl || authorUrl || href || imageUrl,
			primaryLabel: isExternal ? 'Ver fuente' : 'Ver detalles',
			primaryTarget: isExternal ? '_blank' : '_self',
			authorUrl: authorUrl,
			authorLabel: authorUrl ? 'Autor y fuente en ' + sourceLabel + ' ↗' : '',
			source: source,
			sourceLabel: sourceLabel,
			providerId: card.dataset.providerId || '',
			license: card.dataset.license || '',
			licenseUrl: card.dataset.licenseUrl || ''
		}, card);
	});

	document.addEventListener('keydown', function (e) {
		if (e.key !== 'Enter' && e.key !== ' ') return;
		const card = e.target.closest('.artelibre-card[role="button"]');
		if (!card || e.target.closest('a, button')) return;
		e.preventDefault();
		card.click();
	});

	const imageFull = document.querySelector('.image-full');
	if (imageFull) {
		imageFull.addEventListener('click', function () {
			openPreview({
				imageUrl: imageFull.currentSrc || imageFull.src,
				title: document.querySelector('.image-title') ? document.querySelector('.image-title').textContent.trim() : (imageFull.alt || ''),
				subtitle: document.querySelector('.image-artist') ? document.querySelector('.image-artist').textContent.replace(/\s+/g, ' ').trim() : '',
				detailUrl: window.location.href,
				primaryLabel: 'Ver detalles',
				primaryTarget: '_self',
				source: 'local',
				sourceLabel: 'Arte Libre'
			}, imageFull);
		});
		imageFull.style.cursor = 'zoom-in';
	}

	const revealItems = document.querySelectorAll('.hero, .section, .card, .image-page > *, .artelibre-api-trending, .page-section');
	if ('IntersectionObserver' in window && revealItems.length) {
		const revealObserver = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-revealed');
					revealObserver.unobserve(entry.target);
				}
			});
		}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

		revealItems.forEach(function (item, index) {
			item.classList.add('reveal-on-scroll');
			item.style.setProperty('--reveal-delay', ((index % 8) * 60) + 'ms');
			revealObserver.observe(item);
		});
	}

	/**
	 * Copy link functionality
	 */
	document.addEventListener('click', function (e) {
		const copyBtn = e.target.closest('.copy-link');
		if (!copyBtn) return;

		const url = copyBtn.dataset.url;
		if (!url) return;

		navigator.clipboard.writeText(url).then(function () {
			const originalText = copyBtn.innerHTML;
			copyBtn.innerHTML = '✓';
			copyBtn.classList.add('copied');

			setTimeout(function () {
				copyBtn.innerHTML = originalText;
				copyBtn.classList.remove('copied');
			}, 2000);
		}).catch(function (err) {
			console.error('Failed to copy:', err);
		});
	});

	/**
	 * Mobile drawer submenu toggle
	 */
	if (drawer) {
		const drawerMenuItems = drawer.querySelectorAll('.menu-item-has-children > a');
		drawerMenuItems.forEach(function (menuLink) {
			menuLink.addEventListener('click', function (e) {
				const parentItem = this.parentElement;
				const submenu = parentItem.querySelector('.sub-menu');

				if (submenu) {
					e.preventDefault();

					// Toggle this submenu
					const isOpen = parentItem.classList.contains('submenu-open');

					// Close all other submenus at the same level
					const siblings = Array.from(parentItem.parentElement.children);
					siblings.forEach(function (sibling) {
						if (sibling !== parentItem) {
							sibling.classList.remove('submenu-open');
						}
					});

					// Toggle current submenu
					if (isOpen) {
						parentItem.classList.remove('submenu-open');
					} else {
						parentItem.classList.add('submenu-open');
					}
				}
			});
		});
	}

	/**
	 * Smooth scroll for anchor links
	 */
	document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
		anchor.addEventListener('click', function (e) {
			const targetId = this.getAttribute('href');
			if (targetId === '#') return;

			const target = document.querySelector(targetId);
			if (target) {
				e.preventDefault();
				target.scrollIntoView({
					behavior: 'smooth',
					block: 'start'
				});
			}
		});
	});

	/**
	 * Show toast notification
	 */
	function showToast(message, type) {
		type = type || 'error';

		// Remove existing toast
		var existingToast = document.querySelector('.prismix-toast');
		if (existingToast) {
			existingToast.remove();
		}

		// Create toast element
		var toast = document.createElement('div');
		toast.className = 'prismix-toast prismix-toast-' + type;
		toast.innerHTML = '<span class="toast-icon">' + (type === 'error' ? '⚠️' : '✓') + '</span><span class="toast-message">' + message + '</span>';

		document.body.appendChild(toast);

		// Trigger animation
		setTimeout(function () {
			toast.classList.add('show');
		}, 10);

		// Auto remove after 4 seconds
		setTimeout(function () {
			toast.classList.remove('show');
			setTimeout(function () {
				toast.remove();
			}, 300);
		}, 4000);
	}

	/**
	 * Unlike photo handler (Dashboard liked photos)
	 */
	document.addEventListener('click', function (e) {
		const unlikeBtn = e.target.closest('.unlike-photo-btn');
		if (!unlikeBtn) return;

		e.preventDefault();
		e.stopPropagation();

		const imageId = unlikeBtn.dataset.imageId;
		const card = unlikeBtn.closest('.liked-photo-card');

		if (!imageId || !card || unlikeBtn.classList.contains('loading')) return;

		unlikeBtn.classList.add('loading');

		// Send unlike request (toggle like off)
		const formData = new FormData();
		formData.append('action', 'prismix_vote');
		formData.append('nonce', typeof prismix !== 'undefined' ? prismix.nonce : '');
		formData.append('image_id', imageId);
		formData.append('vote_type', 'like');

		fetch(typeof prismix !== 'undefined' ? prismix.ajax_url : '/wp-admin/admin-ajax.php', {
			method: 'POST',
			body: formData,
			credentials: 'same-origin'
		})
			.then(function (response) {
				return response.json();
			})
			.then(function (data) {
				if (data.success && data.data.user_vote === null) {
					// Like was removed - animate and remove card
					card.classList.add('removing');
					setTimeout(function () {
						card.remove();

						// Update the tab count
						const likedTab = document.querySelector('.dashboard-tab[data-tab="liked"] .tab-count');
						if (likedTab) {
							const currentCount = parseInt(likedTab.textContent, 10) || 0;
							if (currentCount > 1) {
								likedTab.textContent = currentCount - 1;
							} else {
								likedTab.remove();
							}
						}

						// Check if grid is empty
						const grid = document.getElementById('liked-photos-list');
						if (grid && grid.children.length === 0) {
							grid.innerHTML = '<div class="no-results"><div class="no-results-icon">❤️</div><p>You haven\'t liked any photos yet.</p></div>';
						}
					}, 300);
				} else if (!data.success && data.data && data.data.message) {
					// Show error toast
					showToast(data.data.message, 'error');
					unlikeBtn.classList.remove('loading');
				} else {
					unlikeBtn.classList.remove('loading');
				}
			})
			.catch(function (error) {
				console.error('Unlike error:', error);
				showToast('Ocurrió un error. Inténtalo de nuevo.', 'error');
				unlikeBtn.classList.remove('loading');
			});
	});

})();

/* Color mode toggle — flips data-color-mode + persists to localStorage. */
(function () {
	'use strict';
	var btn = document.getElementById('prismix-color-toggle');
	if (!btn) { return; }
	btn.addEventListener('click', function () {
		var current = document.documentElement.getAttribute('data-color-mode') || 'light';
		var next = (current === 'dark') ? 'light' : 'dark';
		document.documentElement.setAttribute('data-color-mode', next);
		btn.setAttribute('aria-label', next === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro');
		try { localStorage.setItem('prismixColorMode', next); } catch (e) {}
	});
})();
