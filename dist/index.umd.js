!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports):"function"==typeof define&&define.amd?define(["exports"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self).ticker={})}(this,(function(e){"use strict";const t=e=>"function"==typeof e,s=(e,s="")=>{if(!t(e))throw new TypeError(`${s} Expecting function arg`.trim())},i=e=>t(e.subscribe),r=(e=undefined,i=null)=>{const r=e=>t(i?.persist)&&i.persist(e);let n=(()=>{const e=new Map,t=t=>(e.has(t)||e.set(t,new Set),e.get(t)),s=(e,s)=>{if("function"!=typeof s)throw new TypeError("Expecting callback function as second argument");return t(e).add(s),()=>t(e).delete(s)};return{publish:(e,s={})=>{t(e).forEach((e=>e(s)))},subscribe:s,subscribeOnce:(e,t)=>{const i=s(e,(e=>{t(e),i()}));return i},unsubscribeAll:t=>e.delete(t)}})(),o=e;r(o);const a=()=>o,c=e=>{o!==e&&(o=e,r(o),n.publish("change",o))};return{set:c,get:a,update:e=>{s(e,"[update]"),c(e(a()))},subscribe:e=>(s(e,"[subscribe]"),e(o),n.subscribe("change",e))}},n=(e,t=0)=>(e=parseInt(e,10),Number.isNaN(e)?t:e),o=({total:e,limit:t,offset:s}={},i)=>({total:e=n(e,0),limit:t=n(t,n(i,10)),offset:s=n(s,0)}),a=({total:e,limit:t,offset:s})=>(s<0&&(s=Math.max(0,e+s)),s++,Math.max(Math.ceil(s/t),1)),c=({total:e,limit:t,offset:s},i)=>(i=n(i,a({total:e,limit:t,offset:s})),Math.max(t*(i-1),0)),u=(e={})=>{e=o(e);const{total:t,limit:s,offset:i}=e,r=Math.ceil(t/s),n=a(e),u=n===r,f=1===n,l=r>=n+1&&n+1,b=!1!==l,p=(b?n:n-1)*s;let h=Math.max(0,Math.min(n-1,r-1));const g=0!==h&&h;return{total:t,limit:s,offset:i,isLast:u,isFirst:f,nextPage:l,previousPage:g,hasNext:b,hasPrevious:!1!==g,nextOffset:p,previosOffset:!1===g?0:(g-1)*s,currentPage:n,pageCount:r,firstOffset:0,lastOffset:c(e,r)}};e.calculatePaging=u,e.createPagingStore=(e={},n=10)=>{const a=r(o(e,n)),c=((e,n,o=null)=>{const a=e=>t(o?.persist)&&o.persist(e),c=r(o?.initialValue),u=[];if(e.forEach((e=>{if(!i(e))throw new TypeError("Expecting array of StoreLike objects");e.subscribe((e=>u.push(e)))()})),!t(n))throw new TypeError("Expecting second argument to be the derivative function");if(!n.length||n.length>2)throw new TypeError("Expecting the derivative function to have exactly 1 or 2 arguments");let f=0,l=[];return{get:c.get,subscribe:t=>{s(t,"[derived.subscribe]"),f++||e.forEach(((e,t)=>{l.push(e.subscribe((e=>{u[t]=e,1===n.length?(c.set(n(u)),a(c.get())):n(u,(e=>{c.set(e),a(c.get())}))})))}));const i=c.subscribe(t);return()=>{--f||(l.forEach((e=>e())),l=[]),i()}}}})([a],(([e])=>u(e)));return{subscribe:c.subscribe,get:c.get,update:e=>a.update((t=>o({...t,...e},n))),reset:(e=null)=>a.set(o({},e||n))}}}));