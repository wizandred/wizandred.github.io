// 修改这些默认值后，即可直接部署到 GitHub Pages。无需构建。
window.SITE_CONFIG = Object.freeze({
  asciiText: 'WIZANDRE',       // A–Z、0–9、空格、_、-；最多 16 字符
  customArt: '',              // 自定义多行 ASCII 图案；非空时覆盖自动生成
  palette: 'aurora',          // aurora | spectrum | mono
  bootEnabled: true,          // 是否显示启动动画
  bootOncePerSession: true,   // 同一标签页会话仅启动一次；reboot 可重播
  bootDuration: 1800,         // 动画时长（毫秒）
  github: 'https://github.com/wizandred',
  repositoryOwner: 'wizandred',
  discoverRepositories: true, // 自动收录此账号的公开仓库（不收录 fork）
  repositories: [            // 也可添加其他账号的仓库；不必知道是否开启 Pages
    // {repo: 'xxx', label: '项目名称'},
    // {repo: 'owner/repo', label: '项目名称', pagesUrl: 'https://example.com/'}
  ]
});
