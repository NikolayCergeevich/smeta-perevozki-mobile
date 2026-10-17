(function () {
  'use strict';
  var panels = Array.from(document.querySelectorAll('.slide'));
  var ids = panels.map(function (panel) { return panel.id; });
  var aliases = {site:'result', payment:'price', ads:'extras', services:'extras'};
  var previousButton = document.getElementById('previous');
  var nextButton = document.getElementById('next');
  var askButton = document.getElementById('ask-question');
  var dialog = document.getElementById('question-dialog');
  var questionText = document.getElementById('question-text');
  var questionStatus = document.getElementById('question-status');
  var shareButton = document.getElementById('share-question');
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
    nextButton.disabled = currentIndex === panels.length - 1;
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
  nextButton.addEventListener('click', function () { moveBy(1); });
  document.addEventListener('keydown', function (event) {
    if (dialog.open || event.target.closest('textarea,input,select,summary')) return;
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
    var content = extras.closest('.slide-content');
    // После раскрытия сразу показываем цены, сохраняя кнопку закрытия вверху.
    content.scrollTop = extras.open ? content.scrollTop + extras.getBoundingClientRect().top - content.getBoundingClientRect().top - 16 : 0;
  });

  // Никаких выдуманных контактов: пользователь сам выбирает чат и отправляет вопрос.
  askButton.addEventListener('click', function () {
    if (!questionText.value.trim()) questionText.value = 'Здравствуйте! Хочу обсудить смету на сайт перевозок.\nМой вопрос: ';
    questionStatus.textContent = 'Здесь вопрос только готовится. Получателя выбираете вы.';
    shareButton.hidden = typeof navigator.share !== 'function';
    dialog.showModal();
    document.getElementById('close-question').focus();
  });
  document.getElementById('close-question').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('close', function () { askButton.focus({preventScroll:true}); });
  dialog.addEventListener('click', function (event) {
    if (event.target !== dialog) return;
    var bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  function readQuestion() {
    var value = questionText.value.trim();
    if (!value) {
      questionStatus.textContent = 'Сначала напишите вопрос.';
      questionText.focus();
    }
    return value;
  }
  document.getElementById('copy-question').addEventListener('click', async function () {
    var value = readQuestion();
    if (!value) return;
    var copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
        copied = true;
      }
    } catch (error) { /* При запрете буфера используем выделение текста. */ }
    if (!copied) {
      questionText.focus();
      questionText.select();
      try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
    }
    questionStatus.textContent = copied ? 'Текст скопирован. Отправьте его автору сметы.' : 'Выделите текст, скопируйте и отправьте автору сметы.';
  });
  shareButton.addEventListener('click', async function () {
    var value = readQuestion();
    if (!value) return;
    try {
      await navigator.share({title:'Вопрос по смете на сайт', text:value});
      questionStatus.textContent = 'Продолжите в выбранном приложении.';
    } catch (error) {
      questionStatus.textContent = error.name === 'AbortError' ? 'Отправка отменена. Вопрос сохранён здесь.' : 'Не удалось открыть отправку. Скопируйте вопрос кнопкой ниже.';
    }
  });
  function syncFromLocation() {
    var hash = location.hash.slice(1);
    var index = ids.indexOf(aliases[hash] || hash);
    if (dialog.open) dialog.close();
    activate(index < 0 ? 0 : index);
  }
  window.addEventListener('hashchange', syncFromLocation);
  window.addEventListener('popstate', syncFromLocation);
  syncFromLocation();
})();
