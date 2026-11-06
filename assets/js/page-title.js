/* 标签标题只跟随当前入口；首页预载笔记不会覆盖首页标题。保持 ES5 兼容。 */
(function () {
  var booting = false;
  var suffix = ' — wizandre';
  var categories = {theory: '理论 · Theory', math: '数学 · Math', uncategorized: '未分类'};

  function currentTitle() {
    var route = location.hash.slice(1).split('#')[0];
    try { route = decodeURIComponent(route); } catch (error) {}
    var notes = window.NOTES_DATA || [];
    for (var i = 0; i < notes.length; i++) {
      if (route === notes[i].id || route === '/' + notes[i].file) return notes[i].title;
    }
    if (route.indexOf('/notes/') === 0) return '笔记未找到';
    if (route.indexOf('/category/') === 0) {
      var category = route.slice('/category/'.length);
      for (var n = 0; n < notes.length; n++) {
        if ((notes[n].category || 'uncategorized') === category) return (categories[category] || category) + ' · 笔记分类';
      }
      return '分类未找到';
    }
    if (route === 'notes-container') return '笔记归档';
    if (route === 'repositories-container') return '仓库导航';
    if (route === 'terminal' || route === 'terminal-form') return '终端导航';
    return 'NOTES & RESEARCH';
  }

  function sync() {
    document.title = (booting ? '正在载入' : currentTitle()) + suffix;
  }
  window.sitePageTitle = {
    sync: sync,
    setBooting: function (value) { booting = !!value; sync(); }
  };
  window.addEventListener('hashchange', sync);
  sync();
})();
