'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const config = window.SITE_CONFIG;
  const notes = window.NOTES_DATA;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const safeStore = {
    get(key, session = false) { try { return (session ? sessionStorage : localStorage).getItem(key); } catch { return null; } },
    set(key, value, session = false) { try { (session ? sessionStorage : localStorage).setItem(key, value); return true; } catch { return false; } }
  };
  // 5 × 7 点阵：原生字符生成，无需字体服务；可直接粘贴图案覆盖。
  const glyphs = {
    A:['01110','11011','11011','11111','11011','11011','11011'],B:['11110','11011','11011','11110','11011','11011','11110'],
    C:['01111','11000','11000','11000','11000','11000','01111'],D:['11110','11011','11011','11011','11011','11011','11110'],
    E:['11111','11000','11000','11110','11000','11000','11111'],F:['11111','11000','11000','11110','11000','11000','11000'],
    G:['01111','11000','11000','11011','11011','11011','01111'],H:['11011','11011','11011','11111','11011','11011','11011'],
    I:['11111','00100','00100','00100','00100','00100','11111'],J:['00111','00011','00011','00011','11011','11011','01110'],
    K:['11011','11011','11110','11100','11110','11011','11011'],L:['11000','11000','11000','11000','11000','11000','11111'],
    M:['11011','11111','11111','11011','11011','11011','11011'],N:['11001','11101','11101','11011','11011','11001','11001'],
    O:['01110','11011','11011','11011','11011','11011','01110'],P:['11110','11011','11011','11110','11000','11000','11000'],
    Q:['01110','11011','11011','11011','11111','01110','00011'],R:['11110','11011','11011','11110','11100','11010','11011'],
    S:['01111','11000','11000','01110','00011','00011','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],
    U:['11011','11011','11011','11011','11011','11011','01110'],V:['11011','11011','11011','11011','11011','01110','00100'],
    W:['11011','11011','11011','11011','11111','11111','11011'],X:['11011','11011','01110','00100','01110','11011','11011'],
    Y:['11011','11011','01110','00100','00100','00100','00100'],Z:['11111','00011','00110','00100','01100','11000','11111'],
    0:['01110','11011','11011','11011','11011','11011','01110'],1:['00100','01100','00100','00100','00100','00100','01110'],
    2:['01110','11011','00011','00110','01100','11000','11111'],3:['11110','00011','00011','01110','00011','00011','11110'],
    4:['11011','11011','11011','11111','00011','00011','00011'],5:['11111','11000','11000','11110','00011','00011','11110'],
    6:['01111','11000','11000','11110','11011','11011','01110'],7:['11111','00011','00110','00100','01100','01100','01100'],
    8:['01110','11011','11011','01110','11011','11011','01110'],9:['01110','11011','11011','01111','00011','00011','11110'],
    '-':['00000','00000','00000','11111','00000','00000','00000'],_ :['00000','00000','00000','00000','00000','00000','11111'],
    ' ':['00000','00000','00000','00000','00000','00000','00000']
  };
  const normalizeArt = value => String(value || '').split('\n').slice(0,24).map(line => line.slice(0,120)).join('\n');
  function makeAscii(value) {
    const chars = String(value).toUpperCase().slice(0,16).split('');
    return Array.from({length:7}, (_, row) => chars.map(c => (glyphs[c] || glyphs[' '])[row].replace(/1/g,'█').replace(/0/g,' ')).join('  ')).join('\n');
  }
  // 访客端只读；艺术字默认值由站点作者在 config.js 中维护。
  const preferences = config;
  function renderArt(element, options) {
    element.textContent = normalizeArt(options.customArt).trim() ? normalizeArt(options.customArt) : makeAscii(options.asciiText);
    element.dataset.palette = options.palette;
    element.setAttribute('aria-label', `${options.asciiText} ASCII 像素艺术字`);
  }
  function fitArt() {
    const art = $('#ascii-logo');
    art.style.fontSize = '';
    const available = $('.hero-inner').clientWidth - 8;
    if (art.scrollWidth > available) art.style.fontSize = `${Math.max(2, parseFloat(getComputedStyle(art).fontSize) * available / art.scrollWidth)}px`;
  }
  function applyArt() { renderArt($('#ascii-logo'), preferences); fitArt(); }
  applyArt();
  window.addEventListener('resize', fitArt);
  let toastTimer;
  function toast(message) {
    $('#toast').textContent = message; $('#toast').hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3000);
  }
  // 正文阅读器先于首页效果启动，避免装饰效果故障导致正文空白。
  const reader = window.notesReader;
  const count = String(notes.length).padStart(2,'0');
  // 模拟 shell：命令仅控制此页面，不执行系统命令。
  const output=$('#terminal-output'), input=$('#terminal-input');
  const history=[]; let historyIndex=0;
  const repositories=window.repositoryDirectory;
  const commandNames=['help','ls','folders','cd theory','cd math','cd archives','cd home','repos','repo','go','open repo','open','cat','whoami','github','clear','reboot'];
  function line(text, className='') { const p=document.createElement('p'); p.textContent=text; if(className) p.className=className; output.append(p); }
  function navigate(target) { location.hash=target; if(location.hash===`#${target}`) { const element=document.getElementById(target); if(element) element.scrollIntoView({behavior:reducedMotion.matches?'auto':'smooth'}); } }
  function listNotes() {
    line('~/notes/'); notes.forEach((note,index)=>{
      const p=document.createElement('p'), b=document.createElement('button'); b.type='button'; b.className='inline-command'; b.dataset.command=`open ${index+1}`; b.textContent=`${String(index+1).padStart(2,'0')}  ${note.title}`;
      p.append(b,document.createTextNode(`  [${note.tag}]`)); output.append(p);
    });
    line('使用 open 1 / open 2 打开笔记。','terminal-comment');
  }
  function listRepositories() {
    if(!repositories) { line('仓库目录暂不可用，可使用 github 访问源码。'); return; }
    line('~/repositories/','terminal-comment');
    const container=document.createElement('div');container.className='terminal-repo-list';output.appendChild(container);
    function render() {
      if(!container.isConnected) { unsubscribe();return; }
      container.textContent='';repositories.entries().forEach(record=>container.appendChild(window.createRepositoryLink(record,true)));
      if(!repositories.entries().length)container.textContent='暂无已收录仓库，可使用 repo 仓库名查看。';
    }
    const unsubscribe=repositories.subscribe(render);render();
    line('repo 名称 查看入口 · go 名称 跳转 · 支持 owner/repo','terminal-comment');
  }
  function showRepository(value,go) {
    if(!value){listRepositories();return;}
    if(!repositories){line('仓库目录暂不可用，可使用 github。');return;}
    const result=document.createElement('div');result.className='terminal-repo-result';result.textContent='◇ 正在确认仓库入口…';output.appendChild(result);
    repositories.resolve(value).then(record=>{
      if(!result.isConnected)return;
      const target=repositories.destination(record);result.textContent='';
      result.appendChild(window.createRepositoryLink(record,true));
      const reason=document.createElement('p');reason.className='terminal-comment';reason.textContent='↳ '+target.reason;result.appendChild(reason);
      output.scrollTop=output.scrollHeight;
      if(go)location.assign(target.href);
    }).catch(error=>{if(result.isConnected)result.textContent=error.message;});
  }
  function runCommand(raw) {
    const value=raw.trim(); if(!value) return;
    history.push(value); historyIndex=history.length;
    $('#terminal-counter').textContent=String(history.length).padStart(2,'0')+' CMDS';
    line(`guest@wizandre:~$ ${value}`,'cyan');
    const [command,...args]=value.split(/\s+/); const argument=args.join(' ');
    switch(command.toLowerCase()) {
      case 'help':
        line('help          查看命令\nls            列出所有笔记\nfolders       查看笔记分类\ncd theory     进入 theory 文件夹分类\ncd archives   进入笔记归档\ncd home       回到首页\nopen 1 / 2    打开指定笔记（也支持 ID 或文件路径）\ncat 1 / 2     在终端查看笔记标题与简介\nwhoami        关于这个笔记空间\ngithub        显示 GitHub 链接\nrepos         列出外联仓库（Pages / Source）\nrepo 名称     查看仓库入口，支持 owner/repo\ngo 名称       优先跳转 Pages；未启用时进入源码\nreboot        重播进入动画\nclear         清空终端\n↑ / ↓ 历史命令 · Tab 补全 · Esc 退出输入'); break;
      case 'repos': listRepositories(); break;
      case 'repo': showRepository(argument,false); break;
      case 'go': if(argument)showRepository(argument,true);else line('使用 go 仓库名，例如 go wizandred.github.io。'); break;
      case 'ls': if(argument) { const matches=notes.filter(note=>note.category===argument); if(!matches.length) line('未找到该分类，输入 folders 查看分类。'); else matches.forEach(note=>line(note.file)); } else listNotes(); break;
      case 'folders': reader.categories.forEach(category=>line(category+'/')); line('使用 cd theory 等命令进入分类。','terminal-comment'); break;
      case 'cd':
        if(['archives','notes','./archives','~/notes','~/notes/'].includes(argument)) { line('→ ~/notes/'); navigate('notes-container'); }
        else if(['home','~','..','/',''].includes(argument)) { line('→ ~'); navigate('top'); }
        else if(reader.openCategory(argument.replace(/^notes\//,'' ).replace(/\/$/,''))) line('→ ~/notes/'+argument+'/');
        else line(`找不到目录：${argument}。输入 folders 查看分类。`); break;
      case 'open': case 'cat': {
        if(command.toLowerCase()==='open' && argument.startsWith('repo ')){showRepository(argument.slice(5),true);break;}
        const index=reader.resolveNote(argument);
        if(!notes[index]) { line('请选择有效笔记：open 1、open 2，或先运行 ls。'); break; }
        if(command.toLowerCase()==='open') { line(`→ ${notes[index].title}`); reader.openNote(index); }
        else { const note=notes[index]; line(`${note.title}\n[${note.tag}] · ${note.date}`); line((note.content||'外部 Markdown 笔记').split('\n\n')[1]||'使用 open 打开全文。'); } break;
      }
      case 'whoami': line('wizandre / NOTES & RESEARCH\nFirst-principles derivations, multimodal representations, and mathematical foundations.'); break;
      case 'github': { const p=document.createElement('p'),a=document.createElement('a'); a.href=config.github; a.target='_blank'; a.rel='noopener noreferrer'; a.className='cyan'; a.textContent=`${config.github} ↗`; p.append(a); output.append(p); break; }
      case 'clear': output.replaceChildren(); break;
      case 'reboot': line('重新启动笔记空间…'); startBoot(true); break;
      default: line(`未识别的命令：${command}。输入 help 查看可用命令。`);
    }
    while(output.childElementCount>70) output.firstElementChild.remove();
    output.scrollTop=output.scrollHeight;
  }
  $('#terminal-form').addEventListener('submit',event=>{ event.preventDefault(); runCommand(input.value); input.value=''; });
  document.addEventListener('click',event=>{ const button=event.target.closest('[data-command]'); if(button) runCommand(button.dataset.command); });
  input.addEventListener('keydown',event=>{
    if(event.key==='ArrowUp'||event.key==='ArrowDown') { event.preventDefault(); historyIndex=Math.max(0,Math.min(history.length,historyIndex+(event.key==='ArrowUp'?-1:1))); input.value=history[historyIndex]||''; input.setSelectionRange(input.value.length,input.value.length); }
    if(event.key==='Tab' && input.value) { const matches=commandNames.filter(name=>name.startsWith(input.value)); if(matches.length===1) { event.preventDefault(); input.value=matches[0]; } }
    if(event.key==='Escape') input.blur();
  });
  document.addEventListener('keydown',event=>{ if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'&&$('#boot-loader').hidden) { event.preventDefault(); $('#terminal-form').scrollIntoView({block:'center',behavior:'instant'}); input.focus({preventScroll:true}); } });
  function updateTerminalLocation(){
    const path=$('#article-path').textContent;
    $('#terminal-location').textContent='~/'+path.split('/').slice(0,-1).join('/');
  }
  window.addEventListener('hashchange',updateTerminalLocation);updateTerminalLocation();
  // 启动画面：可跳过、会话内只显示一次；减少动态效果设置会自动跳过。
  let bootTimer, bootActive=false, previousFocus;
  function finishBoot() {
    if(!bootActive) return;
    bootActive=false; clearInterval(bootTimer);
    safeStore.set('wizandre:boot:v1','done',true);
    const loader=$('#boot-loader'); loader.classList.add('exiting');
    document.body.style.overflow='';
    document.querySelector('main').inert=false; $('.site-header').inert=false; $('.site-footer').inert=false;
    setTimeout(()=>{loader.hidden=true;loader.classList.remove('exiting'); if(previousFocus && previousFocus.focus) previousFocus.focus({preventScroll:true});},reducedMotion.matches?0:300);
  }
  function startBoot(force=false) {
    if(bootActive || (!force && (!config.bootEnabled || reducedMotion.matches || (config.bootOncePerSession && safeStore.get('wizandre:boot:v1',true))))) return;
    if(reducedMotion.matches&&force) { toast('已启用减少动态效果，启动动画已跳过。'); return; }
    bootActive=true; previousFocus=document.activeElement;
    $('#boot-loader').hidden=false; $('#boot-log').textContent='[ .. ]  initializing notes workspace'; $('#boot-progress').style.width='0%'; $('#boot-status').textContent='正在初始化笔记空间…';
    document.body.style.overflow='hidden';
    document.querySelector('main').inert=true; $('.site-header').inert=true; $('.site-footer').inert=true;
    $('#skip-boot').focus({preventScroll:true});
    const messages=['[ ok ]  establishing local session','[ ok ]  loading ASCII identity','[ ok ]  mounting /notes/ · '+count+' entries','[ ok ]  welcome to first principles.'];
    const started=performance.now(), duration=Math.max(800,Math.min(5000,Number(config.bootDuration)||1800));
    bootTimer=setInterval(()=>{ const progress=Math.min(1,(performance.now()-started)/duration); $('#boot-progress').style.width=`${progress*100}%`; $('#boot-log').textContent=messages.slice(0,Math.min(messages.length,Math.floor(progress*5))).join('\n'); if(progress>=1){$('#boot-status').textContent='ACCESS GRANTED';finishBoot();} },70);
  }
  $('#skip-boot').addEventListener('click',finishBoot);
  $('#replay-boot').addEventListener('click',()=>startBoot(true));
  document.addEventListener('keydown',event=>{ if(bootActive&&['Escape','Enter'].includes(event.key)){event.preventDefault();finishBoot();} });
  startBoot();
})();
