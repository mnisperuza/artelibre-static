(function () {
  'use strict';

  document.querySelectorAll('[data-studio-package]').forEach(function (link) {
    link.addEventListener('click', function () {
      var value = link.getAttribute('data-studio-package');
      var input = document.querySelector('input[name="studio_package"][value="' + value + '"]');
      if (input) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
})();
