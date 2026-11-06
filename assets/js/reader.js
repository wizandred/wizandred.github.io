'use strict';
// 阅读器独立于首页效果；增强排版失败时，正文仍显示为纯文本。
window.createNotesReader = function () {
  const notes = window.NOTES_DATA || [];
  const content = document.getElementById('markdown-content');
  const status = document.getElementById('render-status');
  const rawButton = document.getElementById('plain-mode');
  const list = document.getElementById('note-list');
  const categories = Array.from(new Set(notes.map(note => note.category || 'uncategorized'))).sort();
  let activeCategory = '', selectedIndex = -1, sequence = 0, rawMode = false, lastMarkdown = '';
  const siteBase = new URL('./', location.href);
  const count = String(notes.length).padStart(2, '0');
  ['note-count', 'directory-count'].forEach(id => { document.getElementById(id).textContent = count; });
  document.querySelector('.count').textContent = count;
  const encoded = value => value.split('/').map(encodeURIComponent).join('/');
  const noteHash = note => note.kind === 'html' ? new URL(encoded(note.file), siteBase).href : '#/' + encoded(note.file || 'notes/' + note.id + '.md');
  const categoryHash = category => '#/category/' + encoded(category);
  const categoryName = category => ({theory:'理论 · Theory',math:'数学 · Math',uncategorized:'未分类'})[category] || category;
  const resolveNote = value => {
    if (/^\d+$/.test(value)) return Number(value) - 1;
    return notes.findIndex(note => note.id === value || note.file === value || (note.file && note.file.replace(/^notes\//, '') === value));
  };
  function scrollToArticle(heading) {
    const target = heading ? document.getElementById('heading-' + heading) : document.querySelector('.article-viewer');
    if (target) target.scrollIntoView({behavior:'auto', block:'start'});
  }
  function renderList() {
    list.textContent = '';
    const shown = notes.filter(note => !activeCategory || (note.category || 'uncategorized') === activeCategory);
    document.querySelector('.directory-path').textContent = '~/notes/' + (activeCategory ? activeCategory + '/' : '');
    document.getElementById('directory-count').textContent = String(shown.length).padStart(2, '0');
    document.querySelectorAll('.category-link').forEach(link => {
      const active = link.dataset.category === activeCategory;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
    });
    shown.forEach(note => {
      const li = document.createElement('li'); li.className = 'note-item';
      const link = document.createElement('a'); link.className = 'note-button'; link.href = noteHash(note); link.dataset.noteId = note.id;
      const title = document.createElement('span'); title.className = 'note-item-title'; title.textContent = note.title + (note.kind === 'html' ? ' ↗' : '');
      const meta = document.createElement('span'); meta.className = 'note-item-meta'; meta.textContent = '[' + note.tag + ']' + (note.date ? ' · ' + note.date : '');
      link.append(title, meta); li.appendChild(link); list.appendChild(li);
      link.addEventListener('click', event => { if (location.hash === link.hash) { event.preventDefault(); loadNote(notes.indexOf(note), true); } });
    });
    markSelection();
  }
  function markSelection() {
    document.querySelectorAll('.note-button').forEach(link => {
      const active = selectedIndex >= 0 && link.dataset.noteId === notes[selectedIndex].id;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
  }
  const categoryNav = document.getElementById('category-list');
  ['', ...categories].forEach(category => {
    const link = document.createElement('a'); link.className = 'category-link'; link.href = category ? categoryHash(category) : '#notes-container'; link.dataset.category = category;
    const number = category ? notes.filter(note => (note.category || 'uncategorized') === category).length : notes.length;
    link.textContent = (category ? categoryName(category) : '全部笔记') + ' · ' + number;
    categoryNav.appendChild(link);
    link.addEventListener('click', event => { if (location.hash === link.hash) { event.preventDefault(); activeCategory = category; renderList(); document.getElementById('notes-container').scrollIntoView({behavior:'auto'}); } });
  });
  function showRaw(markdown, message) {
    content.classList.add('raw-markdown'); content.textContent = markdown;
    status.textContent = message || '纯文本模式 · 公式保留原文';
    rawButton.setAttribute('aria-pressed', 'true'); rawButton.textContent = '排版阅读';
  }
  function rewriteResources(note) {
    const base = new URL(encoded(note.file || './'), siteBase);
    content.querySelectorAll('img[src]').forEach(image => {
      try { image.src = new URL(image.getAttribute('src'), base).href; image.loading = 'lazy'; } catch (error) { /* 保留原始地址 */ }
    });
    content.querySelectorAll('a[href]').forEach(link => {
      const value = link.getAttribute('href');
      try {
        const url = new URL(value, base);
        const target = notes.find(item => item.file && new URL(encoded(item.file), siteBase).pathname === url.pathname && url.origin === siteBase.origin);
        if (target) link.href = noteHash(target) + url.hash;
        else if (value.startsWith('#')) link.href = noteHash(note) + value;
        else link.href = url.href;
        if (url.origin !== siteBase.origin && /^https?:$/.test(url.protocol)) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
      } catch (error) { /* 无法解析的地址仍由浏览器处理 */ }
    });
    content.querySelectorAll('table').forEach(table => {
      const wrapper = document.createElement('div'); wrapper.className = 'table-scroll'; wrapper.tabIndex = 0; wrapper.setAttribute('aria-label', '可左右滚动的表格');
      table.parentNode.insertBefore(wrapper, table); wrapper.appendChild(table);
    });
  }
  function renderMarkdown(markdown, note) {
    lastMarkdown = markdown;
    content.classList.remove('raw-markdown'); status.textContent = '';
    rawButton.textContent = '纯文本'; rawButton.setAttribute('aria-pressed', 'false');
    if (rawMode) { showRaw(markdown); return; }
    if (!window.marked || !window.DOMPurify) { showRaw(markdown, '排版库未就绪，已显示原文'); return; }
    try {
      const math = [];
      const protectedMd = markdown.replace(/(`{3,}[^\n]*\n[\s\S]*?\n`{3,}|~~~[^\n]*\n[\s\S]*?\n~~~|`[^`\n]+`|\\[\s\S]|\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g, match => {
        if (match.startsWith('`') || match.startsWith('~~~') || match.startsWith('\\')) return match;
        math.push(match); return 'WIZMATHPLACEHOLDER' + (math.length - 1) + 'END';
      });
      const html = window.marked.parse(protectedMd).replace(/WIZMATHPLACEHOLDER(\d+)END/g, (_, index) => math[Number(index)]);
      content.innerHTML = window.DOMPurify.sanitize(html);
      const usedIds = new Set();
      content.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(heading => {
        const replacement = document.createElement('h' + Math.min(6, Number(heading.tagName[1]) + 1));
        replacement.innerHTML = heading.innerHTML;
        const base = heading.textContent.trim().toLowerCase().replace(/[^\w\u00c0-\uffff -]/g, '').replace(/\s+/g, '-') || 'section';
        let id = base, suffix = 2; while (usedIds.has(id)) id = base + '-' + suffix++;
        usedIds.add(id); replacement.id = 'heading-' + id; heading.replaceWith(replacement);
      });
      rewriteResources(note);
    } catch (error) { showRaw(markdown, '排版失败，已切换为原文'); return; }
    if (window.hljs) content.querySelectorAll('pre code').forEach(block => { try { window.hljs.highlightElement(block); } catch (error) { /* 代码本身继续可读 */ } });
    if (window.renderMathInElement) {
      try { window.renderMathInElement(content, {delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false,trust:false}); }
      catch (error) { status.textContent = '部分公式未排版，原文仍保留'; }
    }
    // 超长的行内公式也只在自己的区域滚动，不挤宽正文。
    content.querySelectorAll('.katex').forEach(math => {
      if (math.closest('.katex-display')) return;
      const wrapper = document.createElement('span'); wrapper.className = 'inline-math-scroll';
      math.parentNode.insertBefore(wrapper, math); wrapper.appendChild(math);
    });
  }
  async function loadNote(index, scroll, heading) {
    const token = ++sequence, note = notes[index]; if (!note) return;
    selectedIndex = index; markSelection();
    content.setAttribute('aria-busy', 'true'); content.dataset.readerInitialized = 'true';
    content.classList.remove('raw-markdown'); content.textContent='正在加载笔记…'; status.textContent=''; rawButton.disabled=true;
    document.getElementById('article-path').textContent = note.file || 'notes/' + note.id + '.md';
    document.getElementById('article-meta').textContent = (note.tag || '').toUpperCase() + (note.date ? ' · ' + note.date : '');
    document.title = note.title + ' — NOTES & RESEARCH';
    try {
      if (note.kind === 'html') {
        lastMarkdown = ''; content.classList.remove('raw-markdown'); content.textContent = ''; rawButton.disabled=false;
        const title = document.createElement('h2'); title.textContent = note.title;
        const paragraph = document.createElement('p'); paragraph.textContent = note.description || '这是一篇独立的 HTML 笔记。';
        const link = document.createElement('a'); link.href = noteHash(note); link.textContent = '打开笔记页面 →';
        content.append(title, paragraph, link); content.setAttribute('aria-busy', 'false');
        status.textContent = ''; rawButton.hidden = true;
        if (scroll) scrollToArticle();
        return;
      }
      rawButton.hidden = false;
      // 直接读取 notes/ 下的文件，无需生成索引或运行构建。
      let markdown = note.content;
      if (typeof markdown !== 'string') {
        if (!note.file) throw new Error('笔记未提供正文或文件路径');
        const response = await fetch(new URL(encoded(note.file), siteBase).href);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        markdown = await response.text();
      }
      if (token !== sequence) return;
      markdown=String(markdown).replace(/^\uFEFF/,'');
      const front=/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(markdown);
      if(front && /^(?:id|title|date|tag|category|description)\s*:/m.test(front[1])) markdown=markdown.slice(front[0].length);
      renderMarkdown(markdown, note);
    } catch (error) {
      if (token !== sequence) return;
      content.classList.add('raw-markdown'); content.textContent = '无法读取笔记：' + (note.file || note.id) + '\n' + error.message;
      status.textContent = '请检查文件路径后重新点击笔记重试。';
    }
    if (token !== sequence) return;
    content.setAttribute('aria-busy', 'false'); rawButton.disabled=false;
    if (scroll) requestAnimationFrame(() => scrollToArticle(heading));
  }
  rawButton.addEventListener('click', () => {
    if (selectedIndex < 0) return;
    rawMode = rawButton.getAttribute('aria-pressed') !== 'true'; renderMarkdown(lastMarkdown, notes[selectedIndex]);
  });
  function syncHash(initial) {
    const parts = location.hash.slice(1).split('#');
    function decode(value) { try { return decodeURIComponent(value); } catch (error) { return value; } }
    const route = decode(parts[0]), heading = decode(parts.slice(1).join('#'));
    if (route.startsWith('/category/')) {
      const category = route.slice('/category/'.length);
      activeCategory = categories.includes(category) ? category : '';
      renderList();
      const index = notes.findIndex(note => !activeCategory || (note.category || 'uncategorized') === activeCategory);
      if (index >= 0) loadNote(index, false);
      if (!categories.includes(category)) status.textContent = '未找到该分类，已显示全部笔记。';
      requestAnimationFrame(() => document.getElementById('notes-container').scrollIntoView({behavior:'auto'}));
      return;
    }
    const index = notes.findIndex(note => (route.startsWith('/') && '/' + (note.file || 'notes/' + note.id + '.md') === route) || note.id === route);
    if (index >= 0) { activeCategory = notes[index].category || 'uncategorized'; renderList(); loadNote(index, true, heading); return; }
    if (route.startsWith('/notes/')) { activeCategory = ''; renderList(); content.textContent = '没有找到这篇笔记，请从目录重新选择。'; content.classList.add('raw-markdown'); status.textContent = '链接中的文件路径未包含在笔记索引中。'; scrollToArticle(); return; }
    if (route === 'notes-container') { activeCategory = ''; renderList(); }
    if (initial && notes.length) loadNote(0, false);
    if (!notes.length) { content.textContent = '尚无笔记。请将笔记放入 notes/，并添加到笔记目录。'; content.dataset.readerInitialized = 'true'; }
  }
  function openNote(index) {
    if (!notes[index]) return false;
    if (notes[index].kind === 'html') { location.href = noteHash(notes[index]); return true; }
    const hash = noteHash(notes[index]);
    if (location.hash === hash) loadNote(index, true); else location.hash = hash;
    return true;
  }
  function openCategory(category) {
    if (!categories.includes(category)) return false;
    const hash = categoryHash(category);
    if (location.hash === hash) syncHash(false); else location.hash = hash;
    return true;
  }
  renderList(); syncHash(true);
  window.addEventListener('hashchange', () => syncHash(false));
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    const active = entries[0].isIntersecting;
    document.querySelectorAll('.nav-link[href^="#"]').forEach(link => link.classList.toggle('active', active ? link.hash === '#notes-container' : link.hash === '#top'));
  }, {threshold:0,rootMargin:'-25% 0px -40% 0px'}).observe(document.getElementById('notes-container'));
  return {notes, categories, resolveNote, openNote, openCategory};
};

// defer 脚本执行时 HTML 已解析，阅读器不依赖首页效果脚本。
window.notesReader = window.createNotesReader();
