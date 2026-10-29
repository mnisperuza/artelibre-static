/**
 * Like/Dislike AJAX Handler
 *
 * @package prismix
 */

(function () {
	'use strict';

	// Check if prismix object exists (passed via wp_localize_script)
	if (typeof prismix === 'undefined') {
		console.error('prismix object not found');
		return;
	}

	// Track cooldown state
	let voteCooldown = false;
	let cooldownTimer = null;

	/**
	 * Show toast notification
	 */
	function showToast(message, type) {
		type = type || 'error';

		// Remove existing toast
		const existingToast = document.querySelector('.vote-toast');
		if (existingToast) {
			existingToast.remove();
		}

		// Create toast element
		const toast = document.createElement('div');
		toast.className = 'vote-toast vote-toast-' + type;
		toast.textContent = message;
		document.body.appendChild(toast);

		// Trigger animation
		setTimeout(function() {
			toast.classList.add('show');
		}, 10);

		// Auto-remove after 3 seconds
		setTimeout(function () {
			toast.classList.remove('show');
			setTimeout(function() {
				toast.remove();
			}, 300);
		}, 3000);
	}

	/**
	 * Start cooldown on all vote buttons
	 */
	function startCooldown(seconds) {
		if (voteCooldown) return;

		voteCooldown = true;
		const buttons = document.querySelectorAll('.vote-btn');
		buttons.forEach(function(btn) {
			btn.classList.add('cooldown');
		});

		// Clear existing timer
		if (cooldownTimer) {
			clearTimeout(cooldownTimer);
		}

		// End cooldown after specified time
		cooldownTimer = setTimeout(function() {
			voteCooldown = false;
			buttons.forEach(function(btn) {
				btn.classList.remove('cooldown');
			});
		}, seconds * 1000);
	}

	/**
	 * Handle vote button click
	 */
	document.addEventListener('click', function (e) {
		const voteBtn = e.target.closest('.vote-btn');
		if (!voteBtn) return;

		e.preventDefault();

		// Check if in cooldown
		if (voteCooldown) {
			return;
		}

		const imageId = voteBtn.dataset.imageId;
		const voteType = voteBtn.dataset.voteType;

		if (!imageId || !voteType) return;

		// Disable button during request
		voteBtn.disabled = true;
		voteBtn.classList.add('loading');

		// Create form data
		const formData = new FormData();
		formData.append('action', 'prismix_vote');
		formData.append('nonce', prismix.nonce);
		formData.append('image_id', imageId);
		formData.append('vote_type', voteType);

		// Send AJAX request
		fetch(prismix.ajax_url, {
			method: 'POST',
			body: formData,
			credentials: 'same-origin'
		})
			.then(function (response) {
				return response.json().then(function(data) {
					return { status: response.status, data: data };
				});
			})
			.then(function (result) {
				const response = result.data;

				if (response.success) {
					// Update counts
					const likeCount = document.getElementById('like-count');
					const dislikeCount = document.getElementById('dislike-count');

					if (likeCount) {
						likeCount.textContent = response.data.likes;
					}
					if (dislikeCount) {
						dislikeCount.textContent = response.data.dislikes;
					}

					// Update active states
					const container = voteBtn.closest('.vote-buttons');
					if (container) {
						const likeBtn = container.querySelector('.vote-btn.like');
						const dislikeBtn = container.querySelector('.vote-btn.dislike');

						if (likeBtn) {
							likeBtn.classList.toggle('active', response.data.user_vote === 'like');
						}
						if (dislikeBtn) {
							dislikeBtn.classList.toggle('active', response.data.user_vote === 'dislike');
						}
					}
				} else {
					// Handle errors
					const errorData = response.data || {};
					const errorCode = errorData.code || '';
					const errorMessage = errorData.message || 'An error occurred.';
					const waitTime = errorData.wait || 0;

					// Show error message
					showToast(errorMessage, 'error');

					// Start cooldown if rate limited
					if (result.status === 429 && waitTime > 0) {
						startCooldown(waitTime);
					}

					// Handle specific error codes
					if (errorCode === 'login_required') {
						// Could redirect to login page
						// window.location.href = prismix.login_url;
					}

					console.error('Vote failed:', errorCode, errorMessage);
				}
			})
			.catch(function (error) {
				console.error('Vote error:', error);
				showToast('Connection error.', 'error');
			})
			.finally(function () {
				voteBtn.disabled = false;
				voteBtn.classList.remove('loading');
			});
	});

	// Add toast styles dynamically
	const style = document.createElement('style');
	style.textContent = `
		.vote-toast {
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
		.vote-toast.show {
			transform: translateX(-50%) translateY(0);
			opacity: 1;
		}
		.vote-toast-error {
			background: #ef4444;
		}
		.vote-toast-success {
			background: #10b981;
		}
		.vote-btn.cooldown {
			opacity: 0.5;
			cursor: not-allowed;
			pointer-events: none;
		}
	`;
	document.head.appendChild(style);

})();
