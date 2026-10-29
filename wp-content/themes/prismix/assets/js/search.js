/**
 * Live Search Handler
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

	const searchInput = document.getElementById('search-input');
	const searchDropdown = document.getElementById('search-dropdown');
	let debounceTimer = null;
	let currentRequest = null;

	if (!searchInput || !searchDropdown) return;

	/**
	 * Debounce function
	 */
	function debounce(func, wait) {
		return function (...args) {
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(function () {
				func.apply(this, args);
			}, wait);
		};
	}

	/**
	 * Perform search
	 */
	function performSearch(query) {
		if (query.length < 2) {
			hideDropdown();
			return;
		}

		// Cancel previous request
		if (currentRequest) {
			currentRequest.abort();
		}

		const controller = new AbortController();
		currentRequest = controller;

		const formData = new FormData();
		formData.append('action', 'prismix_search');
		formData.append('nonce', prismix.nonce);
		formData.append('query', query);

		fetch(prismix.ajax_url, {
			method: 'POST',
			body: formData,
			credentials: 'same-origin',
			signal: controller.signal
		})
			.then(function (response) {
				return response.json();
			})
			.then(function (data) {
				if (data.success) {
					renderResults(data.data);
				}
			})
			.catch(function (error) {
				if (error.name !== 'AbortError') {
					console.error('Search error:', error);
				}
			});
	}

	/**
	 * Render search results
	 */
	function renderResults(data) {
		if (!data.artists.length && !data.images.length) {
			searchDropdown.innerHTML = '<div class="search-no-results">' + prismix.i18n.no_results + '</div>';
			showDropdown();
			return;
		}

		let html = '';

		// Artists section
		if (data.artists.length) {
			html += '<div class="search-section">';
			html += '<div class="search-section-title">' + prismix.i18n.artists + '</div>';
			data.artists.forEach(function (artist) {
				html += '<a href="' + artist.url + '" class="search-result-item">';
				html += '<img src="' + artist.image + '" alt="" class="search-result-image">';
				html += '<div class="search-result-info">';
				html += '<span class="search-result-title">' + artist.title + '</span>';
				html += '<span class="search-result-meta">' + artist.count + ' imágenes</span>';
				html += '</div>';
				html += '</a>';
			});
			html += '</div>';
		}

		// Images section
		if (data.images.length) {
			html += '<div class="search-section">';
			html += '<div class="search-section-title">' + prismix.i18n.photos + '</div>';
			data.images.forEach(function (image) {
				html += '<a href="' + image.url + '" class="search-result-item">';
				html += '<img src="' + image.thumbnail + '" alt="" class="search-result-image">';
				html += '<div class="search-result-info">';
				html += '<span class="search-result-title">' + image.title + '</span>';
				if (image.artist) {
					html += '<span class="search-result-meta">' + image.artist + '</span>';
				}
				html += '</div>';
				html += '</a>';
			});
			html += '</div>';
		}

		// View all link
		if (data.total > 6) {
			const searchUrl = prismix.home_url + '?s=' + encodeURIComponent(searchInput.value);
			html += '<a href="' + searchUrl + '" class="search-view-all">';
			html += prismix.i18n.view_all + ' (' + data.total + ')';
			html += '</a>';
		}

		searchDropdown.innerHTML = html;
		showDropdown();
	}

	/**
	 * Show dropdown
	 */
	function showDropdown() {
		searchDropdown.hidden = false;
		searchDropdown.classList.add('visible');
	}

	/**
	 * Hide dropdown
	 */
	function hideDropdown() {
		searchDropdown.hidden = true;
		searchDropdown.classList.remove('visible');
	}

	// Input event with debounce
	searchInput.addEventListener('input', debounce(function () {
		performSearch(this.value.trim());
	}, 300));

	// Focus event
	searchInput.addEventListener('focus', function () {
		if (this.value.trim().length >= 2) {
			performSearch(this.value.trim());
		}
	});

	// Click outside to close
	document.addEventListener('click', function (e) {
		if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
			hideDropdown();
		}
	});

	// Keyboard navigation
	searchInput.addEventListener('keydown', function (e) {
		const items = searchDropdown.querySelectorAll('.search-result-item, .search-view-all');
		const currentFocus = searchDropdown.querySelector('.search-result-item:focus, .search-view-all:focus');
		let currentIndex = Array.from(items).indexOf(currentFocus);

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				if (currentIndex < items.length - 1) {
					items[currentIndex + 1].focus();
				} else if (items.length > 0) {
					items[0].focus();
				}
				break;

			case 'ArrowUp':
				e.preventDefault();
				if (currentIndex > 0) {
					items[currentIndex - 1].focus();
				} else if (currentIndex === 0) {
					searchInput.focus();
				}
				break;

			case 'Escape':
				hideDropdown();
				searchInput.blur();
				break;
		}
	});

})();
