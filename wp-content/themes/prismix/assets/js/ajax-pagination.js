/**
 * AJAX Pagination Handler
 *
 * @package prismix
 */

(function () {
	'use strict';

	// Check if prismix object exists
	if (typeof prismix === 'undefined') {
		return;
	}

	/**
	 * Handle Load More button click for Artist Gallery
	 */
	const loadMoreArtist = document.getElementById('load-more-artist');
	if (loadMoreArtist) {
		loadMoreArtist.addEventListener('click', function () {
			loadMore(this, 'artist');
		});
	}

	/**
	 * Handle Load More button click for Homepage
	 */
	const loadMoreHome = document.getElementById('load-more-home');
	if (loadMoreHome) {
		loadMoreHome.addEventListener('click', function () {
			loadMore(this, 'home');
		});
	}

	/**
	 * Handle Load More button click for Photos page
	 */
	const loadMorePhotos = document.getElementById('load-more-photos');
	if (loadMorePhotos) {
		loadMorePhotos.addEventListener('click', function () {
			loadMore(this, 'photos');
		});
	}

	/**
	 * Load more content via AJAX
	 */
	function loadMore(button, type) {
		const page = parseInt(button.dataset.page, 10);
		const maxPages = parseInt(button.dataset.max, 10);
		const artistId = button.dataset.artist || 0;
		const spinner = button.querySelector('.loading-spinner');

		// Get current sort order - check both button and dropdown
		const activeSort = document.querySelector('.sort-btn.active');
		const sortSelect = document.getElementById('sort-select');
		let orderby = 'newest';

		if (activeSort) {
			orderby = activeSort.dataset.orderby;
		} else if (sortSelect) {
			// Handle dropdown select (photos page)
			const sortValue = sortSelect.value;
			if (sortValue === 'date-asc') {
				orderby = 'oldest';
			} else if (sortValue === 'likes') {
				orderby = 'likes';
			} else {
				orderby = 'newest';
			}
		}

		// Get current filter (for homepage)
		const activeFilter = document.querySelector('.chip.active');
		const filter = activeFilter ? activeFilter.dataset.filter : 'newest';

		// Disable button and show spinner
		button.disabled = true;
		if (spinner) spinner.hidden = false;

		// Create form data
		const formData = new FormData();
		formData.append('action', 'prismix_load_more');
		formData.append('nonce', prismix.nonce);
		formData.append('page', page + 1);
		formData.append('orderby', orderby);
		formData.append('filter', filter);
		formData.append('type', type);

		if (artistId) {
			formData.append('artist_id', artistId);
		}

		// Add content_type for photos page
		if (type === 'photos') {
			formData.append('content_type', 'image');
		}

		// Add category filter for photos page
		const categorySelect = document.getElementById('category-select');
		if (categorySelect && categorySelect.value) {
			formData.append('category', categorySelect.value);
		}

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
				if (data.success && data.data.html) {
					// Get the appropriate grid
					let grid;
					if (type === 'artist') {
						grid = document.getElementById('artist-gallery');
					} else if (type === 'photos') {
						grid = document.getElementById('photos-grid');
					} else {
						grid = document.getElementById('gallery-grid');
					}

					if (grid) {
						// Append new content
						grid.insertAdjacentHTML('beforeend', data.data.html);

						// Update page number
						button.dataset.page = page + 1;

						// Hide button if no more pages
						if (!data.data.has_more || page + 1 >= maxPages) {
							button.style.display = 'none';
						}
					}
				}
			})
			.catch(function (error) {
				console.error('Load more error:', error);
			})
			.finally(function () {
				button.disabled = false;
				if (spinner) spinner.hidden = true;
			});
	}

	/**
	 * Handle sorting controls
	 */
	document.addEventListener('click', function (e) {
		const sortBtn = e.target.closest('.sort-btn');
		if (!sortBtn || sortBtn.tagName === 'A') return; // Skip if it's a link (taxonomy page)

		e.preventDefault();

		const orderby = sortBtn.dataset.orderby;
		const artistId = document.getElementById('artist-gallery')?.dataset.artistId;

		if (!orderby) return;

		// Update active state
		document.querySelectorAll('.sort-btn').forEach(function (btn) {
			btn.classList.remove('active');
			btn.setAttribute('aria-selected', 'false');
		});
		sortBtn.classList.add('active');
		sortBtn.setAttribute('aria-selected', 'true');

		// Reload gallery with new sort order
		reloadGallery(orderby, artistId);
	});

	/**
	 * Handle filter chips (Homepage)
	 */
	document.addEventListener('click', function (e) {
		const chip = e.target.closest('.chip');
		if (!chip) return;

		const filter = chip.dataset.filter;
		// Only handle chips with data-filter attribute (homepage filters)
		// Let other chips (like popular page time filters) navigate normally
		if (!filter) return;

		e.preventDefault();

		// Get the target type (galleries or pictures)
		const target = chip.dataset.target || 'galleries';

		// Update active state only for chips in the same section
		const section = chip.closest('.section');
		if (section) {
			section.querySelectorAll('.chip').forEach(function (c) {
				c.classList.remove('active');
				c.setAttribute('aria-selected', 'false');
			});
		}
		chip.classList.add('active');
		chip.setAttribute('aria-selected', 'true');

		// Reload appropriate grid based on target
		if (target === 'pictures') {
			reloadPicturesWithFilter(filter);
		} else {
			reloadGalleryWithFilter(filter);
		}
	});

	/**
	 * Reload gallery with new sort order
	 */
	function reloadGallery(orderby, artistId) {
		const grid = document.getElementById('artist-gallery');
		const loadMoreBtn = document.getElementById('load-more-artist');

		if (!grid) return;

		// Show loading state
		grid.classList.add('loading');

		const formData = new FormData();
		formData.append('action', 'prismix_load_more');
		formData.append('nonce', prismix.nonce);
		formData.append('page', 1);
		formData.append('orderby', orderby);
		formData.append('type', 'artist');
		formData.append('artist_id', artistId);
		formData.append('reload', '1');

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
					grid.innerHTML = data.data.html;

					// Reset and show/hide load more button
					if (loadMoreBtn) {
						loadMoreBtn.dataset.page = '1';
						loadMoreBtn.style.display = data.data.has_more ? '' : 'none';
					}
				}
			})
			.catch(function (error) {
				console.error('Reload error:', error);
			})
			.finally(function () {
				grid.classList.remove('loading');
			});
	}

	/**
	 * Reload gallery with filter (Homepage)
	 */
	function reloadGalleryWithFilter(filter) {
		const grid = document.getElementById('gallery-grid');
		const loadMoreBtn = document.getElementById('load-more-home');

		if (!grid) return;

		// Show loading state
		grid.classList.add('loading');

		const formData = new FormData();
		formData.append('action', 'prismix_filter');
		formData.append('nonce', prismix.nonce);
		formData.append('filter', filter);

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
					grid.innerHTML = data.data.html;

					// Reset load more button
					if (loadMoreBtn) {
						loadMoreBtn.dataset.page = '1';
						loadMoreBtn.style.display = data.data.has_more ? '' : 'none';
					}
				}
			})
			.catch(function (error) {
				console.error('Filter error:', error);
			})
			.finally(function () {
				grid.classList.remove('loading');
			});
	}

	/**
	 * Reload pictures with filter (Homepage Trending Pictures)
	 */
	function reloadPicturesWithFilter(filter) {
		const grid = document.getElementById('trending-pictures-grid');

		if (!grid) return;

		// Show loading state
		grid.classList.add('loading');

		const formData = new FormData();
		formData.append('action', 'prismix_filter_pictures');
		formData.append('nonce', prismix.nonce);
		formData.append('filter', filter);

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
					grid.innerHTML = data.data.html;
				}
			})
			.catch(function (error) {
				console.error('Pictures filter error:', error);
			})
			.finally(function () {
				grid.classList.remove('loading');
			});
	}

})();
