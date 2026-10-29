/**
 * Artist Favorites AJAX Handler
 *
 * @package prismix
 */

(function () {
	'use strict';

	// Check if prismix object exists
	if (typeof prismix === 'undefined') {
		console.error('prismix object not found');
		return;
	}

	/**
	 * Show toast notification
	 */
	function showToast(message, type) {
		type = type || 'success';

		// Remove existing toast
		const existingToast = document.querySelector('.fav-toast');
		if (existingToast) {
			existingToast.remove();
		}

		// Create toast element
		const toast = document.createElement('div');
		toast.className = 'fav-toast fav-toast-' + type;
		toast.textContent = message;
		document.body.appendChild(toast);

		// Trigger animation
		setTimeout(function() {
			toast.classList.add('show');
		}, 10);

		// Auto-remove after 2.5 seconds
		setTimeout(function () {
			toast.classList.remove('show');
			setTimeout(function() {
				toast.remove();
			}, 300);
		}, 2500);
	}

	/**
	 * Handle favorite button click on artist page
	 */
	document.addEventListener('click', function (e) {
		const favBtn = e.target.closest('.favorite-artist-btn:not(.login-to-fav)');
		if (!favBtn) return;

		e.preventDefault();

		const artistId = favBtn.dataset.artistId;
		if (!artistId) return;

		// Disable button during request
		favBtn.disabled = true;
		favBtn.classList.add('loading');

		// Create form data
		const formData = new FormData();
		formData.append('action', 'prismix_toggle_artist_favorite');
		formData.append('nonce', prismix.nonce);
		formData.append('artist_id', artistId);

		// Send AJAX request
		fetch(prismix.ajax_url, {
			method: 'POST',
			body: formData,
			credentials: 'same-origin'
		})
			.then(function (response) {
				return response.json();
			})
			.then(function (data) {
				if (data.success) {
					// Update button state
					const isFavorited = data.data.favorited;
					favBtn.classList.toggle('active', isFavorited);

					// Update icon
					const iconSpan = favBtn.querySelector('.fav-icon');
					if (iconSpan) {
						iconSpan.textContent = isFavorited ? '★' : '☆';
					}

					// Update text
					const textSpan = favBtn.querySelector('.fav-text');
					if (textSpan) {
						textSpan.textContent = isFavorited ? 'Remove from favourites' : 'Add to favourites';
					}

					// Update count
					const countSpan = favBtn.querySelector('.fav-count');
					if (countSpan && typeof data.data.count !== 'undefined') {
						countSpan.textContent = data.data.count;
					}

					// Update title
					favBtn.title = isFavorited ? 'Remove from favourites' : 'Add to favourites';

					// Show toast
					showToast(data.data.message, 'success');
				} else {
					showToast(data.data.message || 'An error occurred.', 'error');
				}
			})
			.catch(function (error) {
				console.error('Favorite error:', error);
				showToast('Connection error.', 'error');
			})
			.finally(function () {
				favBtn.disabled = false;
				favBtn.classList.remove('loading');
			});
	});

	/**
	 * Handle remove favorite from dashboard
	 */
	document.addEventListener('click', function (e) {
		const removeBtn = e.target.closest('.remove-favorite-btn');
		if (!removeBtn) return;

		e.preventDefault();

		const artistId = removeBtn.dataset.artistId;
		if (!artistId) return;

		const card = removeBtn.closest('.favorite-album-card');

		// Disable button during request
		removeBtn.disabled = true;

		// Create form data
		const formData = new FormData();
		formData.append('action', 'prismix_toggle_artist_favorite');
		formData.append('nonce', prismix.nonce);
		formData.append('artist_id', artistId);

		// Send AJAX request
		fetch(prismix.ajax_url, {
			method: 'POST',
			body: formData,
			credentials: 'same-origin'
		})
			.then(function (response) {
				return response.json();
			})
			.then(function (data) {
				if (data.success && !data.data.favorited) {
					// Remove card with animation
					if (card) {
						card.classList.add('removing');
						setTimeout(function() {
							card.remove();

							// Update count in stat card
							const statNumber = document.querySelector('.stat-card.favorite-albums .stat-number');
							if (statNumber) {
								const currentCount = parseInt(statNumber.textContent) || 0;
								statNumber.textContent = Math.max(0, currentCount - 1);
							}

							// Check if list is empty
							const list = document.getElementById('favorite-albums-list');
							if (list && list.children.length === 0) {
								list.innerHTML = '<p class="no-results">No favorite albums at the moment.</p>';
							}
						}, 300);
					}
					showToast(data.data.message, 'success');
				} else {
					showToast(data.data.message || 'An error occurred.', 'error');
					removeBtn.disabled = false;
				}
			})
			.catch(function (error) {
				console.error('Remove favorite error:', error);
				showToast('Connection error.', 'error');
				removeBtn.disabled = false;
			});
	});

	/**
	 * Handle load more favorites in dashboard
	 */
	document.addEventListener('click', function (e) {
		const loadMoreBtn = e.target.closest('#load-more-favorites');
		if (!loadMoreBtn) return;

		e.preventDefault();

		const currentPage = parseInt(loadMoreBtn.dataset.page) || 1;
		const nextPage = currentPage + 1;

		// Disable button
		loadMoreBtn.disabled = true;
		loadMoreBtn.classList.add('loading');

		// Create form data
		const formData = new FormData();
		formData.append('action', 'prismix_load_favorite_albums');
		formData.append('nonce', prismix.nonce);
		formData.append('page', nextPage);

		// Send AJAX request
		fetch(prismix.ajax_url, {
			method: 'POST',
			body: formData,
			credentials: 'same-origin'
		})
			.then(function (response) {
				return response.json();
			})
			.then(function (data) {
				if (data.success) {
					// Append new cards
					const list = document.getElementById('favorite-albums-list');
					if (list && data.data.html) {
						list.insertAdjacentHTML('beforeend', data.data.html);
					}

					// Update page counter
					loadMoreBtn.dataset.page = nextPage;

					// Hide button if no more
					if (!data.data.has_more) {
						loadMoreBtn.style.display = 'none';
					}
				}
			})
			.catch(function (error) {
				console.error('Load more error:', error);
			})
			.finally(function () {
				loadMoreBtn.disabled = false;
				loadMoreBtn.classList.remove('loading');
			});
	});

	// Add styles dynamically
	const style = document.createElement('style');
	style.textContent = `
		.fav-toast {
			position: fixed;
			bottom: 20px;
			left: 50%;
			transform: translateX(-50%) translateY(100px);
			background: #333;
			color: #fff;
			padding: 12px 24px;
			border-radius: 8px;
			font-size: 14px;
			z-index: 9999;
			opacity: 0;
			transition: transform 0.3s ease, opacity 0.3s ease;
			max-width: 90%;
			text-align: center;
		}
		.fav-toast.show {
			transform: translateX(-50%) translateY(0);
			opacity: 1;
		}
		.fav-toast-error {
			background: #ef4444;
		}
		.fav-toast-success {
			background: #10b981;
		}
		.favorite-artist-btn {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			padding: 6px 12px;
			border: 1.5px solid #fbbf24;
			border-radius: 16px;
			background: transparent;
			color: #fbbf24;
			font-size: 13px;
			font-weight: 500;
			cursor: pointer;
			transition: all 0.2s ease;
			white-space: nowrap;
		}
		.favorite-artist-btn:hover {
			background: rgba(251, 191, 36, 0.1);
		}
		.favorite-artist-btn.active {
			background: #fbbf24;
			color: #000;
		}
		.favorite-artist-btn.loading {
			opacity: 0.6;
			pointer-events: none;
		}
		.favorite-artist-btn .fav-icon {
			font-size: 14px;
		}
		.favorite-artist-btn .fav-count {
			margin-left: 2px;
		}
		.favorite-album-card {
			position: relative;
			background: #1a1a2e;
			border-radius: 12px;
			overflow: hidden;
			transition: transform 0.2s ease, opacity 0.3s ease;
		}
		.favorite-album-card:hover {
			transform: translateY(-4px);
		}
		.favorite-album-card.removing {
			opacity: 0;
			transform: scale(0.9);
		}
		.favorite-album-card .album-link {
			display: block;
			text-decoration: none;
			color: inherit;
		}
		.favorite-album-card .album-thumb {
			aspect-ratio: 1;
			overflow: hidden;
		}
		.favorite-album-card .album-thumb img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
		.favorite-album-card .album-thumb .thumb-placeholder {
			width: 100%;
			height: 100%;
			background: #2a2a4a;
		}
		.favorite-album-card .album-info {
			padding: 12px;
		}
		.favorite-album-card .album-title {
			margin: 0 0 4px;
			font-size: 14px;
			font-weight: 600;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.favorite-album-card .album-count {
			font-size: 12px;
			color: #888;
		}
		.favorite-album-card .remove-favorite-btn {
			position: absolute;
			top: 8px;
			right: 8px;
			width: 28px;
			height: 28px;
			border: none;
			border-radius: 50%;
			background: rgba(0,0,0,0.7);
			color: #fff;
			font-size: 18px;
			cursor: pointer;
			opacity: 0;
			transition: opacity 0.2s ease, background 0.2s ease;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.favorite-album-card:hover .remove-favorite-btn {
			opacity: 1;
		}
		.favorite-album-card .remove-favorite-btn:hover {
			background: #ef4444;
		}
	`;
	document.head.appendChild(style);

})();
