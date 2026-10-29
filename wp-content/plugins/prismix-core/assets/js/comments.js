/**
 * Photo Comments Handler
 *
 * @package prismix
 */

(function() {
    'use strict';

    var commentsSection = document.getElementById('comments-section');
    var commentsList = document.getElementById('comments-list');
    var commentForm = document.getElementById('comment-form');
    var loadMoreBtn = document.getElementById('load-more-comments');
    var commentCountEl = document.querySelector('.comment-count');

    if (!commentsSection || !commentsList) {
        return;
    }

    var imageId = commentsSection.dataset.imageId;
    var currentPage = 1;
    var perPage = parseInt(prismix_comments.per_page) || 5;
    var totalComments = 0;
    var isLoading = false;

    /**
     * Show toast notification
     */
    function showToast(message, type) {
        type = type || 'error';

        // Remove existing toast
        var existingToast = document.querySelector('.comment-toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Create toast
        var toast = document.createElement('div');
        toast.className = 'comment-toast comment-toast-' + type;
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

    /**
     * Format relative time
     */
    function formatRelativeTime(dateString) {
        var date = new Date(dateString);
        var now = new Date();
        var diffMs = now - date;
        var diffSecs = Math.floor(diffMs / 1000);
        var diffMins = Math.floor(diffSecs / 60);
        var diffHours = Math.floor(diffMins / 60);
        var diffDays = Math.floor(diffHours / 24);

        if (diffDays > 30) {
            return date.toLocaleDateString();
        } else if (diffDays > 0) {
            return diffDays + (diffDays === 1 ? ' day ago' : ' days ago');
        } else if (diffHours > 0) {
            return diffHours + (diffHours === 1 ? ' hour ago' : ' hours ago');
        } else if (diffMins > 0) {
            return diffMins + (diffMins === 1 ? ' minute ago' : ' minutes ago');
        } else {
            return 'Just now';
        }
    }

    /**
     * Render a single comment
     */
    function renderComment(comment) {
        var div = document.createElement('div');
        div.className = 'comment-item';
        div.dataset.commentId = comment.id;

        var avatarUrl = comment.avatar_url || '';
        var displayName = comment.display_name || prismix_comments.strings.anonymous;
        var profileUrl = comment.profile_url || '';
        var relativeTime = formatRelativeTime(comment.created_at);

        var avatarHtml = '<img src="' + avatarUrl + '" alt="" loading="lazy">';
        if (profileUrl) {
            avatarHtml = '<a href="' + profileUrl + '" class="comment-avatar-link">' + avatarHtml + '</a>';
        }

        var authorHtml = '<span class="comment-author">' + escapeHtml(displayName) + '</span>';
        if (profileUrl) {
            authorHtml = '<a href="' + profileUrl + '" class="comment-author-link">' + escapeHtml(displayName) + '</a>';
        }

        div.innerHTML =
            '<div class="comment-avatar">' +
                avatarHtml +
            '</div>' +
            '<div class="comment-content">' +
                '<div class="comment-meta">' +
                    authorHtml +
                    '<span class="comment-date">' + relativeTime + '</span>' +
                '</div>' +
                '<div class="comment-text">' + escapeHtml(comment.comment_text) + '</div>' +
            '</div>';

        return div;
    }

    /**
     * Escape HTML entities
     */
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Update comment count display
     */
    function updateCommentCount(count) {
        totalComments = count;
        if (commentCountEl) {
            commentCountEl.textContent = '(' + count + ')';
        }
    }

    /**
     * Toggle load more button visibility
     */
    function updateLoadMoreButton() {
        if (loadMoreBtn) {
            var loadedCount = commentsList.querySelectorAll('.comment-item').length;
            if (loadedCount < totalComments) {
                loadMoreBtn.style.display = 'block';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }
    }

    /**
     * Load comments
     */
    function loadComments(page, append) {
        if (isLoading) return;
        isLoading = true;

        if (loadMoreBtn) {
            loadMoreBtn.disabled = true;
            loadMoreBtn.textContent = prismix_comments.strings.loading || 'Loading...';
        }

        var formData = new FormData();
        formData.append('action', 'prismix_get_comments');
        formData.append('nonce', prismix_comments.nonce);
        formData.append('image_id', imageId);
        formData.append('page', page);
        formData.append('per_page', perPage);

        fetch(prismix_comments.ajax_url, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (data.success) {
                if (!append) {
                    commentsList.innerHTML = '';
                }

                var comments = data.data.comments || [];
                comments.forEach(function(comment) {
                    commentsList.appendChild(renderComment(comment));
                });

                updateCommentCount(data.data.total);
                currentPage = page;
                updateLoadMoreButton();

                if (comments.length === 0 && !append) {
                    commentsList.innerHTML = '<p class="no-comments">' +
                        (prismix_comments.strings.no_comments || 'No comments yet. Be the first to comment!') +
                        '</p>';
                }
            }
        })
        .catch(function(error) {
            console.error('Comments error:', error);
        })
        .finally(function() {
            isLoading = false;
            if (loadMoreBtn) {
                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = prismix_comments.strings.load_more || 'Load More';
            }
        });
    }

    /**
     * Submit new comment
     */
    function submitComment(e) {
        e.preventDefault();

        var textarea = commentForm.querySelector('textarea[name="comment"]');
        var submitBtn = commentForm.querySelector('button[type="submit"]');
        var commentText = textarea.value.trim();

        if (!commentText) {
            showToast(prismix_comments.strings.empty_comment || 'Please enter a comment', 'error');
            return;
        }

        // Disable form
        textarea.disabled = true;
        submitBtn.disabled = true;
        submitBtn.textContent = prismix_comments.strings.submitting || 'Posting...';

        var formData = new FormData();
        formData.append('action', 'prismix_submit_comment');
        formData.append('nonce', prismix_comments.nonce);
        formData.append('image_id', imageId);
        formData.append('comment', commentText);

        fetch(prismix_comments.ajax_url, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (data.success) {
                showToast(data.data.message || prismix_comments.strings.success, 'success');
                textarea.value = '';
            } else {
                showToast(data.data.message || prismix_comments.strings.error, 'error');
            }
        })
        .catch(function(error) {
            console.error('Submit error:', error);
            showToast(prismix_comments.strings.error || 'An error occurred', 'error');
        })
        .finally(function() {
            textarea.disabled = false;
            submitBtn.disabled = false;
            submitBtn.textContent = prismix_comments.strings.submit || 'Post Comment';
        });
    }

    // Event: Load more button
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            loadComments(currentPage + 1, true);
        });
    }

    // Event: Comment form submission
    if (commentForm) {
        commentForm.addEventListener('submit', submitComment);
    }

    // Initial load
    loadComments(1, false);

})();
