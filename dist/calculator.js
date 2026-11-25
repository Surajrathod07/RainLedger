import {months,sum,validate} from './engine.js'
import {esc,fmt,icon,head} from './ui.js'
const steps=['Location','Rooftop','Rainfall']
export function calculator(main,m,save,submit,reset){
 let step=location.hash==='#advanced'?2:0,release=null,generation=0
 if(location.hash==='#advanced')m.advanced=true
 const input=(label,key,min=0,max='',unit='')=>'<label>'+esc(label)+(unit?' ('+unit+')':'')+'<input type="number" required step="any" data-field="'+key+'" min="'+min+'" '+(max!==''?'max="'+max+'"':'')+' value="'+esc(m[key])+'"></label>'
 const select=(label,key,options)=>'<label>'+label+'<select data-field="'+key+'">'+options.map(o=>'<option '+(m[key]===o?'selected':'')+'>'+esc(o)+'</option>').join('')+'</select></label>'
 const text=(label,key)=>'<label>'+label+'<input data-field="'+key+'" value="'+esc(m[key])+'"></label>'
 const monthly=(label,key)=>'<h3>'+label+'</h3><div class="grid months">'+months.map((s,i)=>'<label>'+s+'<input required type="number" step="any" min="0" data-series="'+key+'" data-index="'+i+'" value="'+esc(m[key][i])+'"></label>').join('')+'</div>'
 const grid=(...fields)=>'<div class="grid">'+fields.join('')+'</div>'
 const area=()=>fmt(m.polygonArea??m.length*m.width*.092903,2)+' m² · '+fmt(m.polygonArea?m.polygonArea/.092903:m.length*m.width,2)+' ft²'
 function roof(){
  return '<h2>Rooftop & catchment</h2>'+grid(select('Property type','property',['Residential','School or college','Commercial','Agricultural','Community']),select('Roof surface','material',['Concrete','Metal','Tile','Other']))+grid(input('Roof length','length',0.000001,'','ft'),input('Roof width','width',0.000001,'','ft'))+'<div class="note">Catchment area <strong id="area">'+area()+'</strong> · '+(m.polygonArea?'Traced roof footprint. <button type="button" id="dimensions" class="light">Use dimensions</button>':'Horizontal length × width')+'</div>'+grid(input('Runoff coefficient','coefficient',0,1),input('Collection efficiency','efficiency',0,100,'%'))+'<p class="hint">The editable material coefficient accounts for roof runoff. Collection efficiency accounts for subsequent conveyance and filtration losses.</p><hr class="rule"><label>Rooftop photograph (optional)<input id="upload" type="file" accept="image/jpeg,image/png,image/webp"></label><p class="hint">For site documentation. Enter measured dimensions above.</p><div id="photo"></div>'
 }
 function rainfall(){
  return '<h2>Monthly rainfall</h2><p class="hint">Edit any month or retrieve a historical profile on the Location step.</p><div class="note" id="source">'+esc(m.source)+'</div>'+monthly('Monthly depth (mm)','rain')+'<div id="annual" class="metricline"></div><p class="hint">'+(m.years.length?m.years.length+' complete historical years available for scenario comparison.':'Historical comparisons become available after a successful weather lookup.')+'</p><hr class="rule"><label class="advanced-toggle"><input id="advanced" type="checkbox" '+(m.advanced?'checked':'')+'> Advanced Assessment</label><p class="hint">Model tank storage, irrigation demand and monthly shortages.</p>'+(m.advanced?'<section class="advanced-inputs">'+demand()+'</section>':'')
 }
 function demand(){
  return '<h2>Tank & water demand</h2>'+grid(input('Tank capacity','tank',0,'','L'),input('Initial stored water','initial',0,m.tank,'L'),select('Tank type','tankType',['Above-ground tank','Underground cistern','Modular tank','Other']))+'<p class="hint" id="space"></p>'+grid(text('Filter or collection system (optional)','filter'))+'<hr class="rule"><h3>Irrigation requirements</h3>'+grid(text('Plants or vegetation','plant'),select('Irrigation method','mode',['ET-based estimate','Manual monthly demand']),input('Irrigated area','land',0,'','ft²'))+
  (m.mode==='ET-based estimate'?grid(input('Plant coefficient Kc','kc'),input('Effective rainfall fraction','effective',0,100,'%'))+'<p class="hint" id="etosource">'+esc(m.etoSource)+'</p>'+monthly('Reference evapotranspiration (mm/month)','eto'):monthly('Irrigation demand (L/month)','manual'))+
  '<hr class="rule"><h3>Indoor & other non-potable use</h3>'+grid(input('Indoor demand','indoor',0,'','L/month'),input('Additional demand','extra',0,'','L/month'))+'<p class="hint">Both monthly amounts repeat throughout the year. Enter other uses only once to avoid double counting.</p>'
 }
 function values(){
  if(document.querySelector('#area'))document.querySelector('#area').textContent=area()
  if(document.querySelector('#annual'))document.querySelector('#annual').textContent='Annual rainfall: '+fmt(sum(m.rain),1)+' mm · Monthly average: '+fmt(sum(m.rain)/12,1)+' mm'
  if(document.querySelector('#space')){document.querySelector('#space').textContent='Available capacity at the start: '+fmt(m.tank-m.initial)+' L';document.querySelector('[data-field=initial]').max=m.tank}
 }
 function picture(){
  const box=document.querySelector('#photo');if(!box)return;box.replaceChildren()
  if(m.photo){const img=new Image();img.src=m.photo;img.alt='Uploaded rooftop';img.className='photo';box.append(img);const b=document.createElement('button');b.type='button';b.className='light';b.textContent='Remove photograph';b.onclick=()=>{m.photo='';save();picture()};box.append(b)}
 }
 function error(msg){const el=document.querySelector('#err');el.hidden=false;el.textContent=msg;el.scrollIntoView({block:'nearest'})}
 async function render(next){
  if(typeof release==='function')release();release=null;step=next;const seq=++generation
  main.innerHTML=head('Property assessment','Rainwater calculator','Estimate the rainwater your rooftop can collect.')+'<div class="stepbar">'+steps.map((s,i)=>'<button type="button" data-step="'+i+'" class="'+(step===i?'active':'')+'" '+(step===i?'aria-current="step"':'')+'>'+s+'</button>').join('')+'<span class="last-step">Results</span></div><form novalidate><section class="card formpanel">'+[()=>'<h2>Property location</h2><div id="geo"></div>',roof,rainfall][step]()+'</section><div id="err" class="error" role="alert" hidden></div><div class="actions formactions"><button type="button" class="light" id="back">'+(step?'Previous':'Reset assessment')+'</button><button type="submit">'+(step===2?'View results':'Continue to '+steps[step+1])+'</button></div></form>'
  main.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>render(+b.dataset.step))
  const form=main.querySelector('form');form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;if(step<2){render(step+1);return}const issues=validate(m,m.advanced);if(issues.length){error('Check these inputs: '+issues.join(', '));return}submit()}
  main.querySelector('#back').onclick=step?()=>render(step-1):reset
  form.querySelectorAll('[data-field],[data-series]').forEach(el=>el.addEventListener('input',()=>{
   const k=el.dataset.field,arr=el.dataset.series
   if(arr){m[arr][+el.dataset.index]=el.value===''?null:el.valueAsNumber
    if(arr==='rain'){if(!m.source.startsWith('Manually edited'))m.source='Manually edited rainfall profile · original: '+m.source;document.querySelector('#source').textContent=m.source}
    if(arr==='eto'){if(!m.etoSource.startsWith('Manually edited'))m.etoSource='Manually edited ET₀ profile · original: '+m.etoSource;document.querySelector('#etosource').textContent=m.etoSource}
   }else{m[k]=el.type==='number'?(el.value===''?null:el.valueAsNumber):el.value}
   if(k==='material'){m.coefficient=({Concrete:.8,Metal:.9,Tile:.75,Other:.8})[m.material];form.querySelector('[data-field=coefficient]').value=m.coefficient}
   save();values();if(k==='mode')render(step)
  }))
  const toggle=main.querySelector('#advanced')
  if(toggle)toggle.onchange=()=>{m.advanced=toggle.checked;save();render(step);main.querySelector('#advanced').focus()}
  values();picture()
  const dims=main.querySelector('#dimensions');if(dims)dims.onclick=()=>{m.polygonArea=null;m.roofPolygon=[];save();render(step)}
  const file=main.querySelector('#upload')
  if(file)file.onchange=async()=>{const f=file.files[0];if(!f)return;try{
   if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>15e6)throw Error('Choose a JPG, PNG or WebP photograph smaller than 15 MB.')
   const img=await createImageBitmap(f);const scale=Math.min(1,960/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,img.width*scale);c.height=Math.max(1,img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);img.close();m.photo=c.toDataURL('image/jpeg',.74);save();picture()
  }catch(e){error(e.message||'This photograph could not be opened.')}}
  if(step===0){try{const {mountGeo}=await import('./geo.js');if(seq===generation)release=await mountGeo(main.querySelector('#geo'),m,save)}catch{if(seq===generation)error('Could not load the location controls. Refresh the page to retry.')}}
 }
 render(step)
}
