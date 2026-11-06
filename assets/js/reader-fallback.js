/* ES5 兼容阅读器：增强脚本不可用时，仍直接读取 notes/ 中的笔记文字。 */
(function () {
  function start() {
    var content = document.getElementById('markdown-content');
    var notes = window.NOTES_DATA || [];
    if (!content || content.getAttribute('data-reader-initialized') || content.textContent.trim()) return;
    var list = document.getElementById('note-list');
    var status = document.getElementById('render-status');
    var rawButton = document.getElementById('plain-mode');
    var selected = 0;
    var request = null;
    var sequence = 0;
    function textBody(markdown) {
      var text = String(markdown).replace(/^\uFEFF/, '');
      var front = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
      if (front && /^(?:id|title|date|tag|category|description)\s*:/m.test(front[1])) text = text.slice(front[0].length);
      return text;
    }
    function show(index) {
      var note = notes[index];
      if (!note) return;
      var token = ++sequence;
      if (request) { request.abort(); request = null; }
      selected = index;
      content.className = 'markdown-body raw-markdown';
      document.getElementById('article-path').textContent = note.file || note.id;
      document.getElementById('article-meta').textContent = note.tag || '';
      if (status) status.textContent = '兼容阅读模式 · 文字与公式原文已保留';
      if (note.kind === 'html') {
        content.textContent = note.title + '\n';
        var pageLink = document.createElement('a'); pageLink.href = note.file; pageLink.textContent = '打开笔记页面 →'; content.appendChild(pageLink);
        content.setAttribute('aria-busy', 'false'); return;
      }
      if (typeof note.content === 'string') {
        content.textContent = textBody(note.content); content.setAttribute('aria-busy', 'false'); return;
      }
      if (!note.file) { content.textContent = '请在 notes/index.js 中填写这篇笔记的 file 路径。'; return; }
      content.textContent = '正在加载笔记…'; content.setAttribute('aria-busy', 'true');
      var xhr = new XMLHttpRequest(); request = xhr;
      var file = note.file.split('/').map(encodeURIComponent).join('/');
      function fail(message) {
        if (token !== sequence) return;
        content.textContent = '无法读取笔记：' + note.file + '\n' + message;
        content.setAttribute('aria-busy', 'false');
        if (status) status.textContent = '请检查文件路径后，重新点击笔记重试。';
      }
      xhr.open('GET', file, true); xhr.timeout = 15000;
      xhr.onload = function () {
        if (token !== sequence) return;
        if (xhr.status >= 200 && xhr.status < 300) { content.textContent = textBody(xhr.responseText); content.setAttribute('aria-busy', 'false'); }
        else fail('HTTP ' + xhr.status);
      };
      xhr.onerror = function () { fail('网络请求失败，请通过 GitHub Pages 或本地 HTTP 服务访问。'); };
      xhr.ontimeout = function () { fail('请求超时。'); };
      xhr.send();
    }
    function sync() {
      var hash = location.hash.slice(1).split('#')[0];
      try { hash = decodeURIComponent(hash); } catch (error) {}
      for (var i = 0; i < notes.length; i++) {
        if (hash === notes[i].id || hash === '/' + notes[i].file) { show(i); return; }
      }
      show(selected);
    }
    if (list) {
      list.textContent = '';
      for (var i = 0; i < notes.length; i++) {
        var item = document.createElement('li'); item.className = 'note-item';
        var link = document.createElement('a'); link.className = 'note-button';
        var file = (notes[i].file || 'notes/' + notes[i].id + '.md').split('/').map(encodeURIComponent).join('/');
        link.href = notes[i].kind === 'html' ? file : '#/' + file;
        link.textContent = notes[i].title;
        (function (index, element) { element.onclick = function () { show(index); }; })(i, link);
        item.appendChild(link); list.appendChild(item);
      }
    }
    if (rawButton) rawButton.hidden = true;
    var boot = document.getElementById('boot-loader'); if (boot) boot.hidden = true;
    document.body.style.overflow = '';
    var surfaces = document.querySelectorAll('main,.site-header,.site-footer');
    for (var n = 0; n < surfaces.length; n++) { surfaces[n].removeAttribute('inert'); surfaces[n].inert = false; }
    window.addEventListener('hashchange', sync); sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
