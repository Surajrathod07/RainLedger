import {defaults,collection,months} from './engine.js'
import {esc,fmt,icon,action,head,stat,process,chart} from './ui.js'
import {calculator} from './calculator.js'
import {results} from './results.js'
const main=document.querySelector('main'),path=location.pathname.replace(/\/$/,'')||'/'
const paths=[['/','Dashboard','layout-dashboard'],['/calculator','Calculator','calculator'],['/gis','GIS Map','map'],['/about','About Project','book-open']]
document.querySelector('nav').innerHTML=paths.map(([href,label,i])=>'<a href="'+href+'" '+(href===path?'aria-current="page"':'')+'>'+icon(i)+label+'</a>').join('')
const newLink=document.querySelector('.navcta');newLink.innerHTML=icon('plus')+'New assessment'
export function read(key){try{return JSON.parse(localStorage.getItem('rainledger-v1-'+key))}catch{return null}}
function write(key,data){try{localStorage.setItem('rainledger-v1-'+key,JSON.stringify(data));return true}catch{alert('Your browser could not save this assessment. Free some browser storage or enable local data, then try again.');return false}}
const saved=read('result'),previousDraft=read('draft'),draft={...defaults(),advanced:!!previousDraft,...previousDraft},save=()=>write('draft',draft)
function reset(e){e?.preventDefault();if((saved||read('draft'))&&!confirm('Start a new assessment and clear the saved inputs and results on this device?'))return;for(const k of ['draft','result'])localStorage.removeItem('rainledger-v1-'+k);location.assign('/calculator')}
newLink.onclick=reset
if(saved){const link=document.createElement('a');link.className='footlink';link.href='/results';link.textContent='View saved assessment';document.querySelector('footer').prepend(link)}
const sample=defaults(),samplePerf=collection(sample)
function home(){
 const r=samplePerf
 main.innerHTML='<section class="hero"><div class="herocopy"><div class="eyebrow">'+icon('droplets')+' Rainwater harvesting calculator</div><h1>Every Drop Counts.</h1><p>Calculate Your Rainwater Harvesting Potential.</p><div class="actions">'+action('/calculator','Calculate Your Potential','calculator')+action('/gis','Explore the GIS Map','map','ghost')+'</div></div><span class="caption">Rooftop harvesting system · Illustration</span></section>'+
 '<div class="sectionhead"><h2>Harvesting overview</h2><span class="tag">'+icon('house')+' Sample residential assessment</span></div><div class="stats">'+
 stat('Annual collection',fmt(r.harvest),'L','Harvestable rooftop runoff','droplets',true)+stat('Catchment area',fmt(r.area,1),'m²','40 × 30 ft rooftop','house')+stat('Annual rainfall',fmt(r.annualRain,1),'mm','Sample rainfall profile','cloud-rain')+stat('Monthly average',fmt(r.monthlyAverage),'L','Average across 12 months','droplet',true)+stat('Daily average',fmt(r.dailyAverage),'L','Annual potential ÷ 365','droplets',true)+'</div>'+
 '<div class="panels"><section class="panel"><div class="paneltop"><div><h3>Seasonal collection</h3><div class="meta">Sample monthly water profile</div></div><div class="seg"><button data-ch="volume">Collection</button><button data-ch="rain">Rainfall</button></div></div><div id="plot"></div></section><section class="panel"><h3>From rainfall to reuse</h3><p class="meta">Follow the water through a harvesting system.</p>'+process()+'</section></div>'+
 '<div class="sectionhead"><h2>Real-world applications</h2></div><div class="apps">'+[['residential','Residential rooftops'],['campus','Schools & colleges'],['commercial','Commercial buildings'],['farm','Agricultural irrigation'],['community','Community storage']].map(([file,label])=>'<article class="card appcard"><img loading="lazy" src="/assets/'+file+'.webp" alt="'+label+'"><h3>'+label+'</h3></article>').join('')+'</div>'
 const plot=k=>{document.querySelectorAll('[data-ch]').forEach(b=>b.classList.toggle('selected',b.dataset.ch===k));chart(document.querySelector('#plot'),months,k==='rain'?[{name:'Rainfall',values:sample.rain}]:[{name:'Harvested',values:r.rows.map(row=>row.harvested)}],k==='rain'?'mm':'L')}
 document.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>plot(b.dataset.ch));plot('volume')
}
async function geoPage(){
 main.innerHTML=head('Site exploration','GIS Map','Choose a district, place your property pin, or trace a rooftop to measure its catchment.')+'<section class="card formpanel" id="geo"></section><div class="actions">'+action('/calculator','Continue with this location','calculator')+'</div>'
 const {mountGeo}=await import('./geo.js');mountGeo(document.querySelector('#geo'),draft,save)
}
function about(){
 const entries=[
 ['house','The project','Rainwater Harvesting Potential Calculator is an EVS project from MIT Academy of Engineering, Alandi, Pune (2026–27). It helps households and institutions estimate what their roof can collect and how much demand their tank can meet.'],
 ['map','The planning problem','Rain that falls on a roof often leaves through a drain. A useful estimate needs the roof footprint, local rainfall, losses, and the timing of demand. A national annual average cannot capture seasonal shortages.'],
 ['calculator','Collection methodology','Monthly volume in litres = rain depth (mm) × plan area (m²) × runoff coefficient × collection efficiency. One square foot equals 0.092903 m². Enter horizontal roof dimensions or trace a polygon on the map.'],
 ['sprout','Irrigation & storage','Monthly irrigation depth is max(0, Kc × ET₀ − effective rain). Multiply by irrigated area in m² to obtain litres. The default effective-rain fraction is an editable planning assumption. Water meets pooled demand before the monthly tank capacity limit is applied.'],
 ['layers','GIS & climate data','The location picker links coordinates and district geography to gridded historical rainfall and reference evapotranspiration. Each assessment records its source. You can replace monthly values with local records.'],
 ['cylinder','Benefits & limitations','Stored runoff may displace purchased water for gardening, cleaning and flushing. Monthly accounting can overestimate supply during short dry spells. A photograph documents the site; dimensions, water quality, structural suitability and recharge require separate assessment.'],
 ['chart-column','Scenarios & suitability','When at least three complete historical years exist, the model selects annual rainfall ranks nearest the 10th, 50th and 90th percentiles. Otherwise it tests 70%, 100% and 130% of the input rainfall as illustrative sensitivities. Coverage bands describe the selected demand and tank.'],
 ['book-open','Project team & implementation','Original presentation by Vansh Thakare, Suraj Rathod, Saksham Kale and Vivekanand Jadhav. The browser application uses a TypeScript water-balance engine, JavaScript modules, interactive charts, geographic data and locally generated PDF reports.']]
 main.innerHTML=head('Project notes','About the project','A property-scale assessment of rainwater collection, storage and non-potable reuse.')+'<div class="aboutgrid">'+entries.map(([i,t,p])=>'<article class="panel"><div class="chip">'+icon(i)+'</div><h2>'+t+'</h2><p>'+p+'</p></article>').join('')+'</div><section class="panel result-section"><h2>Worked example from the presentation</h2><p>800 mm × 100 m² × 0.80 × 1.00 = <strong>64,000 litres per year</strong>. At full collection efficiency this is 64 m³, or about 175 litres per day averaged across the year.</p></section><div class="actions">'+action('/calculator','Assess a property','calculator')+'</div>'
}
if(path==='/')home()
else if(path==='/calculator') calculator(main,draft,save,()=>{if(save()&&write('result',draft))location.assign('/results')},reset)
else if(path==='/results')results(main,saved && {...defaults(),advanced:true,...saved},reset)
else if(path==='/gis')geoPage().catch(()=>{document.querySelector('#geo').textContent='The map module could not load. Refresh to try again.'})
else if(path==='/about')about()
else main.innerHTML=head('Page unavailable','Page not found')+action('/','Dashboard','layout-dashboard')
