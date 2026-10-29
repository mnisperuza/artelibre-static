/**
 * Scroll-driven narrative for Arte Libre portal.
 */
(function () {
    'use strict';

    const portal = document.querySelector('[data-portal]');
    if (!portal) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const statement = portal.querySelector('[data-portal-reveal-text]');
    const machine = portal.querySelector('.al-portal-machine');
    const stageNumber = portal.querySelector('[data-portal-stage-number]');
    const stageLabel = portal.querySelector('[data-portal-stage-label]');
    const chapters = Array.from(portal.querySelectorAll('[data-portal-stage]'));
    const flow = portal.querySelector('[data-portal-flow]');
    let ticking = false;

    function rangeProgress(element, start, end) {
        if (!element) return 0;
        const rect = element.getBoundingClientRect();
        const viewport = window.innerHeight;
        return Math.max(0, Math.min(1, (viewport * start - rect.top) / (rect.height + viewport * (start - end))));
    }

    function update() {
        ticking = false;
        const heroRange = Math.max(1, window.innerHeight * 1.2);
        portal.style.setProperty('--portal-progress', Math.min(1, window.scrollY / heroRange).toFixed(4));

        if (statement && !reduceMotion) {
            statement.style.setProperty('--text-progress', rangeProgress(statement, .9, .2).toFixed(3));
        }

        let activeChapter = chapters[0];
        let activeDistance = Infinity;
        chapters.forEach(function (chapter) {
            const rect = chapter.getBoundingClientRect();
            const distance = Math.abs(rect.top + rect.height * .38 - window.innerHeight * .52);
            if (distance < activeDistance) {
                activeDistance = distance;
                activeChapter = chapter;
            }
        });

        chapters.forEach(function (chapter) { chapter.classList.toggle('is-active', chapter === activeChapter); });
        if (activeChapter && machine) {
            const stage = activeChapter.dataset.portalStage || '1';
            machine.dataset.activeStage = stage;
            if (stageNumber) stageNumber.textContent = stage.padStart(2, '0');
            if (stageLabel) stageLabel.textContent = activeChapter.dataset.stageLabel || '';
        }

        if (flow) flow.style.setProperty('--flow-progress', rangeProgress(flow, .85, .35).toFixed(3));
    }

    function requestUpdate() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
    }

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    update();
})();
