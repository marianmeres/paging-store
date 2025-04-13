const e=e=>"function"==typeof e,t=(t,s="")=>{if(!e(t))throw new TypeError(`${s} Expecting function arg`.trim())},s=t=>e(t.subscribe),r=(s,r=null)=>{const i=t=>e(null==r?void 0:r.persist)&&r.persist(t);let n=(()=>{const e=new Map,t=t=>(e.has(t)||e.set(t,new Set),e.get(t)),s=(e,s)=>{if(!e)throw new TypeError("Expecting valid event name.");if("function"!=typeof s)throw new TypeError("Expecting valid callback function.");return t(e).add(s),()=>t(e).delete(s)};return{publish:(e,s)=>{t(e).forEach((e=>e(s)))},subscribe:s,subscribeOnce:(e,t)=>{const r=s(e,(e=>{t(e),r()}));return r},unsubscribe:(e,s)=>{t(e).delete(s)},unsubscribeAll:t=>e.delete(t)}})(),o=s;i(o);const a=()=>o,u=e=>{o!==e&&(o=e,i(o),n.publish("change",o))};return{set:u,get:a,update:e=>{t(e,"[update]"),u(e(a()))},subscribe:e=>(t(e,"[subscribe]"),e(o),n.subscribe("change",e))}},i=(e,t=0)=>(e=parseInt(e,10),Number.isNaN(e)?t:e),n=({total:e,limit:t,offset:s}={},r)=>({total:e=i(e,0),limit:t=i(t,i(r,10)),offset:s=i(s,0)}),o=({total:e,limit:t,offset:s})=>(s<0&&(s=Math.max(0,e+s)),s++,Math.max(Math.ceil(s/t),1)),a=({total:e,limit:t,offset:s},r)=>(r=i(r,o({total:e,limit:t,offset:s})),Math.max(t*(r-1),0)),u=(e={})=>{e=n(e);const{total:t,limit:s,offset:r}=e,i=Math.ceil(t/s),u=o(e),c=u===i,l=1===u,f=i>=u+1&&u+1,b=!1!==f,p=(b?u:u-1)*s;let h=Math.max(0,Math.min(u-1,i-1));const g=0!==h&&h,d=!1===g?0:(g-1)*s;return{total:t,limit:s,offset:r,isLast:c,isFirst:l,nextPage:f,previousPage:g,hasNext:b,hasPrevious:!1!==g,nextOffset:p,previousOffset:d,currentPage:u,pageCount:i,firstOffset:0,lastOffset:a(e,i),get previosOffset(){return console.warn("WARN: 'previosOffset' was renamed to 'previousOffset'"),d}}},c=(i={},o=10)=>{const a=r(n(i,o)),c=((i,n,o=null)=>{const a=t=>e(null==o?void 0:o.persist)&&o.persist(t),u=r(null==o?void 0:o.initialValue),c=[];if(i.forEach((e=>{if(!s(e))throw new TypeError("Expecting array of StoreLike objects");e.subscribe((e=>c.push(e)))()})),!e(n))throw new TypeError("Expecting second argument to be the derivative function");if(!n.length||n.length>2)throw new TypeError("Expecting the derivative function to have exactly 1 or 2 arguments");let l=0,f=[];const b=e=>{t(e,"[derived.subscribe]"),l++||i.forEach(((e,t)=>{f.push(e.subscribe((e=>{c[t]=e,1===n.length?(u.set(n(c)),a(u.get())):n(c,(e=>{u.set(e),a(u.get())}))})))}));const s=u.subscribe(e);return()=>{--l||(f.forEach((e=>e())),f=[]),s()}};return{get:()=>{let e;return b((t=>e=t))(),e},subscribe:b}})([a],(([e])=>u(e)));return{subscribe:c.subscribe,get:c.get,update:e=>a.update((t=>n({...t,...e},o))),reset:(e=null)=>a.set(n({},e||o))}};export{u as calculatePaging,c as createPagingStore};
