export const fmt=(n,d=0)=>n==null?'—':Number(n).toLocaleString('en-IN',{maximumFractionDigits:d})
export const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]))
export const icon=n=>'<svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#'+n+'"/></svg>'
export const action=(href,label,i,cls='')=>'<a class="btn '+cls+'" href="'+href+'">'+icon(i)+label+'</a>'
export const head=(k,t,sub='')=>'<div class="pagetitle"><div class="eyebrow">'+esc(k)+'</div><h1>'+esc(t)+'</h1><p>'+esc(sub)+'</p></div>'
export const stat=(name,val,unit,detail,i,water=false)=>'<article class="stat '+(water?'water':'')+'"><div class="stathead"><span class="chip">'+icon(i)+'</span>'+esc(name)+'</div><div class="value">'+esc(val)+' <small>'+esc(unit)+'</small></div><div class="meta">'+esc(detail)+'</div></article>'
export const process=()=>'<div class="process">'+[['cloud-rain','Rainfall'],['house','Rooftop catchment'],['waves','Gutters'],['filter','Filtration'],['cylinder','Storage tank'],['sprout','Reuse']].map(([i,s],n)=>'<div><span class="chip '+(n%2?'':'blue')+'">'+icon(i)+'</span>'+s+'</div>').join('')+'</div>'
export function chart(container,labels,series,unit,caption='Monthly profile'){
 const w=700,h=190,x0=47,y0=9,b=158,dx=(w-x0-10)/labels.length
 const peak=Math.max(1,...series.flatMap(s=>s.values)),power=10**Math.floor(Math.log10(peak)),max=Math.ceil(peak/power/0.5)*power*.5
 const y=v=>b-v/max*(b-y0)
 const colors=['#4794b6','#629273','#344e44']
 const grid=Array.from({length:4},(_,i)=>{const v=max*i/3;return '<path stroke="#dfe8df" stroke-dasharray="3 4" d="M'+x0+' '+y(v)+'H'+w+'"/><text x="'+(x0-7)+'" y="'+(y(v)+4)+'" text-anchor="end">'+(v>=1000?fmt(v/1000,1)+'k':fmt(v,1))+'</text>'}).join('')
 const line=(i)=>labels.map((_,j)=>(j?'L':'M')+(x0+dx*(j+.5))+' '+y(series[i].values[j])).join(' ')
 const desc=j=>labels[j]+' · '+series.map(s=>s.name+' '+fmt(s.values[j],1)+' '+unit).join(' · ')
 container.innerHTML='<div class="legend">'+series.map((s,i)=>'<span><i style="background:'+colors[i]+'"></i>'+esc(s.name)+' ('+esc(unit)+')</span>').join('')+'</div><svg class="plot" viewBox="0 0 '+w+' '+h+'" aria-label="'+esc(caption)+'">'+grid+
 labels.map((label,j)=>'<g class="col" tabindex="0" role="button" data-j="'+j+'" aria-label="'+esc(desc(j))+'"><title>'+esc(desc(j))+'</title><rect fill="transparent" x="'+(x0+dx*j)+'" y="0" width="'+dx+'" height="'+b+'"/><rect rx="3" fill="'+colors[0]+'" x="'+(x0+dx*(j+.25))+'" y="'+y(series[0].values[j])+'" width="'+dx*.5+'" height="'+(b-y(series[0].values[j]))+'"/><text x="'+(x0+dx*(j+.5))+'" y="'+(b+21)+'" text-anchor="middle">'+esc(label)+'</text></g>').join('')+
 series.slice(1).map((_,i)=>'<path d="'+line(i+1)+'" fill="none" stroke="'+colors[i+1]+'" stroke-width="3" pointer-events="none"/>').join('')+'</svg><output class="reading">Select a column for details.</output>'
 container.querySelectorAll('[data-j]').forEach(el=>{const show=()=>container.querySelector('output').textContent=desc(+el.dataset.j);for(const event of ['focus','pointerenter','click'])el.addEventListener(event,show)})
}
