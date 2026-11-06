// 笔记目录：新增笔记文件后，在此数组中加一条记录即可；无需构建。
// file 相对于仓库根目录；分类可不填，默认按 notes/ 下的文件夹推导。
window.NOTES_DATA = [
  {
    "id": "note-1",
    "title": "Information Bottleneck & Representation",
    "date": "2026-11-03",
    "tag": "Theory",
    "category": "theory",
    "file": "notes/theory/information-bottleneck.md"
  },
  {
    "id": "note-2",
    "title": "Optimization & Newton-Raphson Dynamics",
    "date": "2026-10-28",
    "tag": "Math",
    "category": "math",
    "file": "notes/math/newton-raphson.md"
  }
];

// 补全可选字段，首页、终端及兼容阅读器共用同一份目录。
(function () {
  for (var i = 0; i < window.NOTES_DATA.length; i++) {
    var note = window.NOTES_DATA[i];
    var file = note.file || '';
    var relative = file.replace(/^notes\//, '');
    var folder = relative.lastIndexOf('/') >= 0 ? relative.slice(0, relative.lastIndexOf('/')) : 'uncategorized';
    note.id = note.id || relative.replace(/\.[^.]+$/, '') || ('note-' + (i + 1));
    note.category = note.category || folder;
    note.tag = note.tag || note.category.split('/').pop();
    note.date = note.date || '';
    note.kind = note.kind || (/\.html?$/i.test(file) ? 'html' : 'markdown');
  }
})();
