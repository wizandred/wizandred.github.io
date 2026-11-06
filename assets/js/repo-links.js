'use strict';
// 同一份仓库状态驱动网页目录与终端；网络失败不影响笔记阅读。
(function (root) {
  function normalizeRepo(value, owner) {
    let name = String(value || '').trim();
    name = name.replace(/^https:\/\/github\.com\//i, '').replace(/^\/+|\/+$/g, '').replace(/\.git$/, '');
    if (!name.includes('/')) name = owner + '/' + name;
    if (!/^[a-z\d](?:[a-z\d-]*[a-z\d])?\/[a-z\d_.-]+$/i.test(name) || /\/(?:\.|\.\.)$/.test(name)) throw new Error('请输入仓库名或 owner/repo。');
    return name;
  }
  function pagesAddress(repo) {
    const parts = repo.split('/'), owner = parts[0].toLowerCase(), name = parts[1];
    return 'https://' + owner + '.github.io/' + (name.toLowerCase() === owner + '.github.io' ? '' : encodeURIComponent(name) + '/');
  }
  function validPagesUrl(value) {
    if (!value) return '';
    try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch (error) { return ''; }
  }
  function createDirectory(options) {
    const owner = options.owner || 'wizandred';
    const records = new Map(), listeners = new Set(), pending = new Map();
    const fetcher = options.fetcher;
    const origin = options.origin || '';
    function notify() { listeners.forEach(listener => listener()); }
    function add(item) {
      const fullName = normalizeRepo(item.repo || item.full_name, owner), key = fullName.toLowerCase();
      const previous = records.get(key) || {};
      const record = Object.assign({repo:fullName,label:fullName.split('/')[1],description:'',hasPages:null,checked:false}, previous, item, {repo:fullName});
      record.sourceUrl = 'https://github.com/' + fullName;
      record.pagesUrl = validPagesUrl(record.pagesUrl) || pagesAddress(fullName);
      records.set(key, record); return record;
    }
    function destination(record) {
      const pages = record.hasPages === true && record.pageReachable !== false;
      return {
        href:pages ? record.pagesUrl : record.sourceUrl,
        kind:pages ? 'pages' : 'source',
        label:pages ? 'PAGES' : 'SOURCE',
        reason:record.unavailable ? '仓库不存在或不可见，请检查源码地址' : record.pageReachable === false ? 'Pages 暂不可用，转到源码' : record.hasPages === false ? '未启用 Pages，转到源码' : record.hasPages === true ? 'Pages 已启用' : '无法确认 Pages，保留源码入口'
      };
    }
    async function request(url, method) {
      if (!fetcher) throw new Error('Network unavailable');
      let controller = typeof AbortController === 'function' ? new AbortController() : null;
      let timer;
      try {
        return await Promise.race([
          fetcher(url, {method:method || 'GET',headers:{Accept:'application/vnd.github+json'},credentials:'omit',signal:controller ? controller.signal : undefined}),
          new Promise((resolve,reject) => { timer=setTimeout(()=>{if(controller)controller.abort();reject(new Error('Request timed out'));},4500); })
        ]);
      } finally { clearTimeout(timer); }
    }
    function mergeMetadata(data, existing) {
      return add(Object.assign({}, existing || {}, {
        repo:data.full_name,
        label:existing && existing.label ? existing.label : data.name,
        description:existing && existing.description ? existing.description : data.description || '',
        hasPages:typeof data.has_pages === 'boolean' ? data.has_pages : null,
        checked:true,checkedAt:Date.now(),unavailable:false,pageReachable:undefined
      }));
    }
    async function resolve(value) {
      let fullName;
      try { fullName=normalizeRepo(value,owner); } catch (error) { return Promise.reject(error); }
      const key=fullName.toLowerCase();
      if(pending.has(key)) return pending.get(key);
      let record=records.get(key) || add({repo:fullName});
      const fresh=record.checkedAt && Date.now()-record.checkedAt<60000;
      const needsProbe=record.hasPages===true && new URL(record.pagesUrl).origin===origin && record.pageReachable===undefined;
      if(fresh && !needsProbe) return record;
      const promise=(async()=>{
        try {
          if(!fresh){
          const response=await request('https://api.github.com/repos/'+fullName);
          if(response.ok) record=mergeMetadata(await response.json(),record);
          else { record=add(Object.assign({},record,{checkedAt:Date.now(),unavailable:response.status===404})); }
          }
        } catch(error) { record=add(Object.assign({},record,{checkedAt:Date.now()})); }
        // 主页部署到 GitHub Pages 后，其他项目 Pages 通常与其同源，可进一步检查 404。
        // 跨域检测失败不等于 Pages 不存在，不能据此错误覆盖 has_pages。
        if(record.hasPages===true && new URL(record.pagesUrl).origin===origin) {
          try {
            const response=await request(record.pagesUrl,'HEAD');
            if(response.ok) record.pageReachable=true;
            else if([404,410,500,502,503,504].includes(response.status)) record.pageReachable=false;
          } catch(error) { /* 无法探测时保留 GitHub 元数据判断。 */ }
        }
        records.set(key,record); notify(); return record;
      })();
      pending.set(key,promise);
      try { return await promise; } finally { pending.delete(key); }
    }
    async function discover() {
      if(!options.discover) return;
      try {
        // 仅收录当前账户的公开自有仓库；超过一页时继续读取，最多 1000 个。
        for(let page=1;page<=10;page++) {
          const response=await request('https://api.github.com/users/'+encodeURIComponent(owner)+'/repos?type=owner&per_page=100&sort=pushed&page='+page);
          if(!response.ok) break;
          const entries=await response.json(); if(!Array.isArray(entries))break;
          entries.filter(item=>!item.fork&&!item.archived).forEach(data=>{
            if(!data.full_name || String(data.owner && data.owner.login || '').toLowerCase()!==owner.toLowerCase())return;
            mergeMetadata(data,records.get(data.full_name.toLowerCase()));
          });
          notify(); if(entries.length<100)break;
        }
      } catch(error) { /* 离线初始目录与显式配置继续可用。 */ }
    }
    (options.initial || []).forEach(add); (options.configured || []).forEach(add);
    return {resolve,discover,destination,normalize:value=>normalizeRepo(value,owner),entries:()=>Array.from(records.values()),subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);}};
  }
  root.RepoLinks={normalizeRepo,pagesAddress,createDirectory};
  if(typeof module==='object'&&module.exports)module.exports=root.RepoLinks;
  if(typeof document==='undefined')return;
  const config=root.SITE_CONFIG || {};
  const directory=createDirectory({owner:config.repositoryOwner,discover:config.discoverRepositories,initial:root.REPOSITORIES_DATA,configured:config.repositories,origin:location.origin,fetcher:typeof fetch==='function'?fetch.bind(root):null});
  root.repositoryDirectory=directory;
  const list=document.getElementById('repository-list'), status=document.getElementById('repository-status'), preview=document.getElementById('terminal-repository-preview');
  function renderLink(record, compact) {
    const destination=directory.destination(record), link=document.createElement('a');
    link.className=compact?'repo-terminal-link':'repository-link'; link.href=destination.href; link.dataset.repository=record.repo;
    link.title=destination.reason+' · '+record.repo;
    const icon=document.createElement('span');icon.className='repository-icon';icon.textContent=destination.kind==='pages'?'◇':'⌘';icon.setAttribute('aria-hidden','true');
    const name=document.createElement('span');name.className='repository-name';name.textContent=record.label;
    const badge=document.createElement('span');badge.className='repository-badge '+destination.kind;badge.textContent=destination.label;
    const arrow=document.createElement('span');arrow.className='repository-arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
    link.append(icon,name,badge,arrow);return link;
  }
  root.createRepositoryLink=renderLink;
  function render() {
    if(list){list.textContent='';directory.entries().forEach(record=>{const li=document.createElement('li');li.appendChild(renderLink(record,false));list.appendChild(li);});}
    if(status)status.textContent=String(directory.entries().length).padStart(2,'0');
    if(preview){
      preview.textContent='';const entries=directory.entries();preview.hidden=entries.length===0;
      const label=document.createElement('span');label.className='terminal-preview-label';label.textContent='LINKS';preview.appendChild(label);
      entries.slice(0,2).forEach(record=>preview.appendChild(renderLink(record,true)));
      if(entries.length>2){const more=document.createElement('button');more.type='button';more.className='terminal-preview-more';more.dataset.command='repos';more.textContent='+'+(entries.length-2);more.setAttribute('aria-label','查看全部仓库');preview.appendChild(more);}
    }
    document.querySelectorAll('#terminal-output a[data-repository]').forEach(link=>{
      const record=directory.entries().find(item=>item.repo.toLowerCase()===link.dataset.repository.toLowerCase());if(!record)return;
      const target=directory.destination(record);link.href=target.href;link.title=target.reason+' · '+record.repo;
      const badge=link.querySelector('.repository-badge');if(badge){badge.textContent=target.label;badge.className='repository-badge '+target.kind;}
      const icon=link.querySelector('.repository-icon');if(icon)icon.textContent=target.kind==='pages'?'◇':'⌘';
    });
  }
  directory.subscribe(render);render();
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[data-repository]');
    if(!link || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
    event.preventDefault();link.setAttribute('aria-busy','true');
    directory.resolve(link.dataset.repository).then(record=>{location.assign(directory.destination(record).href);}).catch(()=>{location.assign(link.href);}).finally(()=>link.removeAttribute('aria-busy'));
  });
  // 不阻塞首屏与正文；所有输出共享同一状态。
  directory.discover();
})(typeof window==='undefined'?globalThis:window);
