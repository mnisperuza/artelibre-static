/**
 * Lightweight client feedback for Murales submissions.
 */
(function () {
    'use strict';

    const form = document.querySelector('[data-mural-form]');
    if (!form) return;

    const input = form.querySelector('[data-mural-image]');
    const preview = form.querySelector('[data-mural-preview]');
    const uploadCopy = form.querySelector('[data-mural-upload-copy]');
    const description = form.querySelector('[data-mural-description]');
    const counter = form.querySelector('[data-mural-word-count]');
    const submit = form.querySelector('.al-murals-submit-button');
    let previewUrl = '';

    function words(value) {
        const clean = value.trim();
        return clean ? clean.split(/\s+/u) : [];
    }

    function updateCount() {
        const count = words(description.value).length;
        counter.textContent = count + ' / 25 palabras';
        counter.classList.toggle('is-over', count > 25);
        description.setCustomValidity(count > 25 ? 'Usa máximo 25 palabras.' : '');
    }

    description.addEventListener('input', updateCount);

    input.addEventListener('change', function () {
        const file = input.files && input.files[0];
        if (!file) return;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(file);
        preview.src = previewUrl;
        preview.hidden = false;
        uploadCopy.hidden = true;
    });

    form.addEventListener('submit', function () {
        if (!form.checkValidity()) return;
        submit.disabled = true;
        submit.firstChild.textContent = 'Enviando… ';
    });

    window.addEventListener('pagehide', function () {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    });

    updateCount();
}());
