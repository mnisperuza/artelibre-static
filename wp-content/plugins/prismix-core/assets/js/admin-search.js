/**
 * Prismix admin global search — Ctrl/Cmd+K modal with fuzzy match.
 */
(function () {
    'use strict';

    var data    = window.prismixAdminSearch || { index: [], i18n: {} };
    var trigger = document.getElementById('prismix-search-trigger');
    var modal   = document.getElementById('prismix-search-modal');
    var input   = document.getElementById('prismix-search-input');
    var results = document.getElementById('prismix-search-results');
    if (!modal || !input || !results) { return; }

    var selectedIdx = 0;
    var currentMatches = [];

    function score(label, query) {
        if (!query) { return 0; }
        label = label.toLowerCase();
        query = query.toLowerCase();
        if (label === query) { return 1000; }
        if (label.indexOf(query) === 0) { return 500; }
        if (label.indexOf(query) !== -1) { return 100; }
        var li = 0, qi = 0, matched = 0;
        while (li < label.length && qi < query.length) {
            if (label[li] === query[qi]) { qi++; matched++; }
            li++;
        }
        if (qi === query.length) { return matched; }
        return -1;
    }

    function clearResults() {
        while (results.firstChild) { results.removeChild(results.firstChild); }
    }

    function render(query) {
        var matches = [];
        data.index.forEach(function (item) {
            var s = score(item.label + ' ' + (item.group || ''), query);
            if (s >= 0) { matches.push({ item: item, s: s }); }
        });
        matches.sort(function (a, b) { return b.s - a.s; });
        matches = matches.slice(0, 12);
        currentMatches = matches;
        selectedIdx = 0;

        clearResults();
        if (!matches.length) {
            var empty = document.createElement('li');
            empty.className = 'prismix-search-empty';
            empty.textContent = data.i18n.empty || 'No matches.';
            results.appendChild(empty);
            return;
        }
        matches.forEach(function (m, idx) {
            var li = document.createElement('li');
            li.className = 'prismix-search-row' + (idx === 0 ? ' is-selected' : '');
            li.setAttribute('role', 'option');
            li.dataset.url = m.item.url || '#';

            var lbl = document.createElement('span');
            lbl.className = 'prismix-search-label';
            lbl.textContent = m.item.label;

            var grp = document.createElement('span');
            grp.className = 'prismix-search-group';
            grp.textContent = m.item.group || '';

            li.appendChild(lbl);
            li.appendChild(grp);
            li.addEventListener('mouseenter', function () { setSelected(idx); });
            li.addEventListener('click', function () { go(idx); });
            results.appendChild(li);
        });
    }

    function setSelected(idx) {
        if (idx < 0 || idx >= currentMatches.length) { return; }
        selectedIdx = idx;
        Array.prototype.forEach.call(results.children, function (el, i) {
            el.classList.toggle('is-selected', i === idx);
        });
        var sel = results.children[idx];
        if (sel && sel.scrollIntoView) { sel.scrollIntoView({ block: 'nearest' }); }
    }

    function go(idx) {
        var m = currentMatches[idx];
        if (m && m.item.url && m.item.url !== '#') { window.location.href = m.item.url; }
    }

    function open() {
        modal.hidden = false;
        document.body.classList.add('prismix-search-open');
        input.value = '';
        render('');
        setTimeout(function () { input.focus(); }, 30);
    }

    function close() {
        modal.hidden = true;
        document.body.classList.remove('prismix-search-open');
    }

    document.addEventListener('keydown', function (e) {
        var meta = e.metaKey || e.ctrlKey;
        if (meta && e.key === 'k') {
            e.preventDefault();
            open();
            return;
        }
        if (modal.hidden) { return; }
        if (e.key === 'Escape') { close(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(Math.min(selectedIdx + 1, currentMatches.length - 1)); }
        if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(Math.max(selectedIdx - 1, 0)); }
        if (e.key === 'Enter')     { e.preventDefault(); go(selectedIdx); }
    });

    if (trigger) { trigger.addEventListener('click', open); }
    modal.addEventListener('click', function (e) {
        if (e.target.matches('[data-close]')) { close(); }
    });
    input.addEventListener('input', function () { render(input.value.trim()); });
})();
