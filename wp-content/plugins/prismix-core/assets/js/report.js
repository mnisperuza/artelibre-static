/**
 * Photo Report Modal Handler
 *
 * @package prismix
 */

(function() {
    'use strict';

    var modal = document.getElementById('report-modal');
    var form = document.getElementById('report-form');
    var reportBtn = document.querySelector('.report-btn');
    var closeBtn = modal ? modal.querySelector('.report-modal-close') : null;
    var overlay = modal ? modal.querySelector('.report-modal-overlay') : null;
    var submitBtn = form ? form.querySelector('button[type="submit"]') : null;

    if (!modal || !form || !reportBtn) {
        return;
    }

    // Initialize aria-hidden
    modal.setAttribute('aria-hidden', 'true');

    // Open modal
    function openModal() {
        // Compensate for scrollbar width to prevent layout shift
        var scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.paddingRight = scrollbarWidth + 'px';
        document.body.style.overflow = 'hidden';

        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('active');

        // Focus first input
        var firstInput = form.querySelector('input[type="text"]');
        if (firstInput) {
            setTimeout(function() {
                firstInput.focus();
            }, 100);
        }
    }

    // Close modal
    function closeModal() {
        modal.setAttribute('aria-hidden', 'true');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        form.reset();

        // Reset submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.dataset.originalText || 'Submit Report';
        }
    }

    // Show toast notification
    function showToast(message, type) {
        type = type || 'error';

        // Remove existing toast
        var existingToast = document.querySelector('.report-toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Create toast
        var toast = document.createElement('div');
        toast.className = 'report-toast report-toast-' + type;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Show with animation
        setTimeout(function() {
            toast.classList.add('show');
        }, 10);

        // Auto-hide after 4 seconds
        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() {
                toast.remove();
            }, 300);
        }, 4000);
    }

    // Event: Open modal
    reportBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openModal();
    });

    // Event: Close on X button
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // Event: Close on overlay click
    if (overlay) {
        overlay.addEventListener('click', closeModal);
    }

    // Event: Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Event: Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Get form data
        var imageId = document.getElementById('report-image-id').value;
        var name = form.querySelector('input[name="reporter_name"]').value.trim();
        var email = form.querySelector('input[name="reporter_email"]').value.trim();
        var message = form.querySelector('textarea[name="message"]').value.trim();

        // Validate
        if (!name || !email || !message) {
            showToast(prismix_report.strings.fill_all_fields || 'Please fill in all fields', 'error');
            return;
        }

        // Email validation
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast(prismix_report.strings.invalid_email || 'Please enter a valid email', 'error');
            return;
        }

        // Disable submit button
        if (submitBtn) {
            submitBtn.dataset.originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = prismix_report.strings.sending || 'Sending...';
        }

        // Prepare form data
        var formData = new FormData();
        formData.append('action', 'prismix_submit_report');
        formData.append('nonce', prismix_report.nonce);
        formData.append('image_id', imageId);
        formData.append('reporter_name', name);
        formData.append('reporter_email', email);
        formData.append('message', message);

        // Send AJAX request
        fetch(prismix_report.ajax_url, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (data.success) {
                showToast(data.data.message || prismix_report.strings.success, 'success');
                closeModal();
            } else {
                showToast(data.data.message || prismix_report.strings.error, 'error');
                // Re-enable submit button
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = submitBtn.dataset.originalText;
                }
            }
        })
        .catch(function(error) {
            console.error('Report error:', error);
            showToast(prismix_report.strings.error || 'An error occurred', 'error');
            // Re-enable submit button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = submitBtn.dataset.originalText;
            }
        });
    });

})();
