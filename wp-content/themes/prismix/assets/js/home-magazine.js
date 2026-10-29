(function () {
    'use strict';

    function scrollRail(railId, dir) {
        var rail = document.getElementById(railId);
        if (!rail) return;
        var amount = Math.max(240, Math.floor(rail.clientWidth * 0.85)) * dir;
        rail.scrollBy({ left: amount, behavior: 'smooth' });
    }

    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.rail-arrow');
        if (!btn) return;
        var railId = btn.getAttribute('data-rail');
        var dir = parseInt(btn.getAttribute('data-dir'), 10) || 1;
        scrollRail(railId, dir);
    });
})();
