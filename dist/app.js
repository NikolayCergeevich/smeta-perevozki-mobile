(function () {
  'use strict';
  var panels = Array.prototype.slice.call(document.querySelectorAll('.screen'));
  var tabLinks = Array.prototype.slice.call(document.querySelectorAll('[data-tab]'));
  var names = {price:'Цена', result:'Результат', start:'Начало', later:'Потом'};
  var ids = Object.keys(names);
  var aliases = {site:'result', payment:'price', support:'later', ads:'later', services:'later'};
  var nextLabels = ['Далее: что получите', 'Далее: как начнём', 'Далее: расходы потом'];
  var nav = document.querySelector('.navigation');
  var nextLink = document.getElementById('next');
  var backButton = document.getElementById('back');
  var currentIndex = 0;
  if (!nav || !panels.length || !tabLinks.length) return;
  document.documentElement.classList.add('js');
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-orientation', 'horizontal');
  panels.forEach(function (panel) {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', 'tab-' + panel.id);
  });
  tabLinks.forEach(function (tab) {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', tab.dataset.tab);
  });
  function validSection(id) {
    id = aliases[id] || id;
    return Object.prototype.hasOwnProperty.call(names, id) ? id : 'price';
  }
  function activate(id, options) {
    id = validSection(id);
    options = options || {};
    currentIndex = ids.indexOf(id);
    panels.forEach(function (panel) { panel.hidden = panel.id !== id; });
    tabLinks.forEach(function (tab, index) {
      var active = tab.dataset.tab === id;
      tab.classList.toggle('is-active', active);
      tab.classList.toggle('is-complete', index < currentIndex);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && options.focus) tab.focus();
    });
    document.title = names[id] + ' · Смета на сайт перевозок';
    document.getElementById('step-count').textContent = 'Шаг ' + (currentIndex + 1) + ' из 4';
    backButton.disabled = currentIndex === 0;
    if (currentIndex < ids.length - 1) {
      nextLink.href = '#' + ids[currentIndex + 1];
      nextLink.dataset.route = ids[currentIndex + 1];
      nextLink.removeAttribute('download');
      nextLink.textContent = nextLabels[currentIndex] + ' →';
      document.getElementById('footer-hint').textContent = 'Нажмите «Далее», чтобы посмотреть следующий шаг.';
    } else {
      nextLink.href = './smeta.pdf';
      delete nextLink.dataset.route;
      nextLink.download = 'Смета_сайт_перевозок_черновик.pdf';
      nextLink.textContent = 'Сохранить смету PDF ↓';
      document.getElementById('footer-hint').textContent = 'Сохраните смету. Вопросы обсудим до начала работы.';
    }
    if (options.history && window.location.hash !== '#' + id) {
      try { window.history.pushState(null, '', '#' + id); }
      catch (error) { window.location.hash = id; }
    }
    if (options.scroll) window.scrollTo({top:0, behavior:'auto'});
    if (options.focusPanel) document.getElementById('heading-' + id).focus({preventScroll:true});
  }
  tabLinks.forEach(function (tab, index) {
    tab.addEventListener('click', function (event) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      activate(tab.dataset.tab, {history:true, scroll:true});
    });
    tab.addEventListener('keydown', function (event) {
      var next = null;
      if (event.key === 'ArrowRight') next = (index + 1) % tabLinks.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabLinks.length) % tabLinks.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabLinks.length - 1;
      if (event.key === ' ') {
        event.preventDefault();
        activate(tab.dataset.tab, {history:true, scroll:true});
      }
      if (next !== null) {
        event.preventDefault();
        activate(tabLinks[next].dataset.tab, {history:true, focus:true, scroll:true});
      }
    });
  });
  document.querySelectorAll('[data-route]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (!link.dataset.route || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      activate(link.dataset.route, {history:true, scroll:true, focusPanel:true});
    });
  });
  backButton.addEventListener('click', function () {
    if (currentIndex > 0) activate(ids[currentIndex - 1], {history:true, scroll:true, focusPanel:true});
  });

  // Вложенные условия открываем в том же окне; при закрытии возвращаем фокус к кнопке.
  var lastDialogTrigger = null;
  function openDialog(id, trigger) {
    var dialog = document.getElementById(id);
    if (!dialog || typeof dialog.showModal !== 'function') {
      window.location.href = './smeta.pdf';
      return;
    }
    var activeDialog = document.querySelector('dialog[open]');
    if (activeDialog) activeDialog.close();
    if (trigger && !trigger.closest('dialog')) lastDialogTrigger = trigger;
    dialog.showModal();
    dialog.querySelector('.dialog-body').scrollTop = 0;
    document.body.classList.add('modal-open');
  }
  document.querySelectorAll('[data-dialog], [data-open-dialog]').forEach(function (button) {
    button.addEventListener('click', function () { openDialog(button.dataset.dialog || button.dataset.openDialog, button); });
  });
  document.querySelectorAll('dialog').forEach(function (dialog) {
    dialog.querySelector('.close-dialog').addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) return;
      var bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    dialog.addEventListener('close', function () {
      if (document.querySelector('dialog[open]')) return;
      document.body.classList.remove('modal-open');
      if (lastDialogTrigger) lastDialogTrigger.focus({preventScroll:true});
    });
  });
  function syncFromLocation() {
    var hash = window.location.hash.slice(1);
    var activeDialog = document.querySelector('dialog[open]');
    if (activeDialog) activeDialog.close();
    activate(hash, {scroll:true});
    // Сохраняем старые ссылки на разделы из предыдущей версии сметы.
    if (hash === 'ads' || hash === 'services') openDialog('extras-details', null);
  }
  window.addEventListener('hashchange', syncFromLocation);
  window.addEventListener('popstate', syncFromLocation);
  syncFromLocation();
})();
