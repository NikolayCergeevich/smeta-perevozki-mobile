(function () {
  'use strict';
  var panels = Array.from(document.querySelectorAll('.slide'));
  var ids = panels.map(function (panel) { return panel.id; });
  var aliases = {site:'result', payment:'price', ads:'extras', services:'extras'};
  var previousButton = document.getElementById('previous');
  var nextButton = document.getElementById('next');
  var currentIndex = 0;
  if (!panels.length) return;
  document.documentElement.classList.add('js');

  function activate(index, options) {
    options = options || {};
    currentIndex = Math.max(0, Math.min(index, panels.length - 1));
    panels.forEach(function (panel, panelIndex) { panel.hidden = panelIndex !== currentIndex; });
    document.querySelectorAll('.progress i').forEach(function (segment, segmentIndex) {
      segment.classList.toggle('active', segmentIndex === currentIndex);
      segment.classList.toggle('passed', segmentIndex < currentIndex);
    });
    var currentPanel = panels[currentIndex];
    var heading = currentPanel.querySelector('h1,h2');
    document.getElementById('slide-count').textContent = String(currentIndex + 1).padStart(2, '0') + ' / 10';
    previousButton.disabled = currentIndex === 0;
    var isLastSlide = currentIndex === panels.length - 1;
    document.getElementById('next-label').textContent = isLastSlide ? 'В начало' : 'Далее';
    nextButton.setAttribute('aria-label', isLastSlide ? 'Вернуться к началу' : 'Следующий слайд');
    currentPanel.querySelector('.slide-content').scrollTop = 0;
    document.title = heading.textContent.replace(/\s+/g, ' ').trim() + ' · Смета на сайт';
    if (options.history && location.hash !== '#' + currentPanel.id) {
      try { history.pushState(null, '', '#' + currentPanel.id); }
      catch (error) { location.hash = currentPanel.id; }
    }
    if (options.focus) heading.focus({preventScroll:true});
  }
  function moveBy(direction) { activate(currentIndex + direction, {history:true, focus:true}); }
  previousButton.addEventListener('click', function () { moveBy(-1); });
  nextButton.addEventListener('click', function () {
    if (currentIndex === panels.length - 1) activate(0, {history:true, focus:true});
    else moveBy(1);
  });
  document.addEventListener('keydown', function (event) {
    if (event.target.closest('summary')) return;
    var destination = {ArrowRight:currentIndex + 1, ArrowLeft:currentIndex - 1, Home:0, End:panels.length - 1}[event.key];
    if (destination !== undefined) {
      event.preventDefault();
      activate(destination, {history:true, focus:true});
    }
  });

  // Горизонтальный жест листает слайды; вертикальный оставлен для чтения длинного текста.
  var gesture = null;
  var slides = document.getElementById('slides');
  slides.addEventListener('pointerdown', function (event) {
    if (!event.isPrimary || event.button !== 0 || event.target.closest('button,a,summary,input,textarea')) return;
    gesture = {x:event.clientX, y:event.clientY, pointerId:event.pointerId};
    if (event.pointerType === 'mouse') slides.setPointerCapture(event.pointerId);
  });
  slides.addEventListener('pointerup', function (event) {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    var dx = event.clientX - gesture.x;
    var dy = event.clientY - gesture.y;
    gesture = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) moveBy(dx < 0 ? 1 : -1);
  });
  slides.addEventListener('pointercancel', function () { gesture = null; });

  var extras = document.getElementById('extras-prices');
  extras.addEventListener('toggle', function () {
    document.getElementById('extras-toggle-label').textContent = extras.open ? 'Свернуть список услуг' : 'Посмотреть услуги и цены';
    var content = extras.closest('.slide-content');
    // После раскрытия сразу показываем цены, сохраняя кнопку закрытия вверху.
    content.scrollTop = extras.open ? content.scrollTop + extras.getBoundingClientRect().top - content.getBoundingClientRect().top - 16 : 0;
  });

  function syncFromLocation() {
    var hash = location.hash.slice(1);
    var index = ids.indexOf(aliases[hash] || hash);
    activate(index < 0 ? 0 : index);
  }
  window.addEventListener('hashchange', syncFromLocation);
  window.addEventListener('popstate', syncFromLocation);
  syncFromLocation();
})();
