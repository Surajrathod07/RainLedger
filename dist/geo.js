import * as L from './vendor/leaflet/leaflet.esm.min.js';
import {archive,profile} from './gis/weather.js';
for(const url of ['./vendor/leaflet/leaflet.css','./gis/map.css']){
 const href=new URL(url,import.meta.url).href;
 if(![...document.styleSheets].some(s=>s.href===href)){const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.append(link);}
}
let districtPromise,archivePromise;
const localJSON=async name=>{const r=await fetch(new URL('./gis/'+name,import.meta.url));if(!r.ok)throw Error('Reference data unavailable');return r.json();};
const getDistricts=()=>districtPromise??=(localJSON('districts.json').catch(e=>{districtPromise=null;throw e;}));
const rounded=n=>Number(n.toFixed(6));
const inRing=(x,y,ring)=>{
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [a,b]=ring[i],[c,d]=ring[j];
  if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;
 }
 return inside;
};
const contains=(rings,x,y)=>rings.some(([outer,...holes])=>inRing(x,y,outer)&&!holes.some(h=>inRing(x,y,h)));
const region=(s,d)=>{
 if(s==='Goa')return 'Konkan & Goa';
 if(s!=='Maharashtra')return '';
 if(['Mumbai','Mumbai Suburban','Thane','Palghar','Raigarh','Ratnagiri','Sindhudurg'].includes(d))return 'Konkan & Goa';
 if(['Bid','Aurangabad','Nanded','Latur','Osmanabad','Hingoli','Parbhani','Jalna'].includes(d))return 'Marathwada';
 if(['Buldana','Akola','Washim','Amravati','Yavatmal','Wardha','Nagpur','Bhandara','Gondiya','Gadchiroli','Chandrapur'].includes(d))return 'Vidarbha';
 if(['Jalgaon','Dhule','Nandurbar','Nashik','Ahmadnagar','Pune','Satara','Sangli','Solapur','Kolhapur'].includes(d))return 'Madhya Maharashtra';
 return '';
};
const blankFallback=m=>{
 m.years=[];m.rain=[8,8,12,24,48,100,150,130,100,54,24,12];m.eto=Array(12).fill(100);
 m.source='Illustrative monthly profile · no local observations';m.etoSource='Illustrative ET₀ · 100 mm/month; replace with local values';
};
function roofArea(points){
 const phi=points[0][0]*Math.PI/180, K=6371008.8*Math.PI/180;
 const xy=points.map(([y,x])=>[(x-points[0][1])*K*Math.cos(phi),(y-points[0][0])*K]);
 if(new Set(xy.map(p=>p.join(','))).size!==xy.length)return 0;
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 for(let i=0;i<xy.length;i++)for(let j=i+2;j<xy.length;j++){
  if(i===0&&j===xy.length-1)continue;
  const a=xy[i],b=xy[(i+1)%xy.length],c=xy[j],d=xy[(j+1)%xy.length];
  if(cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0)return 0;
 }
 return Math.abs(xy.reduce((s,a,i)=>{const b=xy[(i+1)%xy.length];return s+a[0]*b[1]-a[1]*b[0];},0))/2;
}
export function mountGeo(container,model,onChange=()=>{}){
 let dead=false,rows=[],request=0,weatherController,searchController,searchToken=0,drawing=false,roofLayer,pending=[],timer,offline=false,phase=0;
 container.innerHTML=`<div class="geo-shell"><div class="geo-fields"><label>Country<input data-g="country" readonly title="Country identified from the selected place"></label><label>State / territory<select data-g="state"></select></label><label>District<select data-g="district"></select></label><label>City or locality<input data-g="city" placeholder="Enter locality"></label></div>
 <div class="geo-toolbar"><label style="flex:1;min-width:180px">Find a city<input data-g="search" placeholder="e.g. Khamgaon, Maharashtra"></label><button type="button" data-g="find">Search</button><button type="button" data-g="gps">Use my location</button></div><div class="geo-results" data-g="matches" aria-live="polite"></div>
 <div class="geo-map" data-g="map" aria-label="Interactive property location map"></div>
 <p class="geo-note" data-g="mapnotice" role="status">Select a district or click the map to position your property.</p>
 <div class="geo-coordinates"><label>Latitude (°)<input type="number" data-g="lat" min="-90" max="90" step="any"></label><label>Longitude (°)<input type="number" data-g="lon" min="-180" max="180" step="any"></label><label>Climate subdivision<input data-g="climate" placeholder="Enter region if known"></label></div>
 <div class="geo-toolbar"><button type="button" data-g="apply">Apply coordinates</button><button type="button" data-g="start">Trace rooftop</button><button type="button" data-g="end" hidden>Use traced area</button><button type="button" data-g="undo" hidden>Undo point</button><button type="button" data-g="clear" hidden>Clear outline</button></div>
 <p class="geo-note" data-g="roof" role="status"></p><div class="geo-panel"><div class="geo-toolbar"><button type="button" data-g="fetch">Load historical climate</button><span class="geo-note" data-g="weather" role="status"></span></div><p class="geo-note geo-climate-summary" data-g="totals"></p></div>
 <p class="geo-note">District outlines and names use a 2019 reference map. Refine the pin for your property. <a href="/gis/credits.txt" target="_blank" rel="noopener">Map and climate sources</a></p></div>`;
 const el=k=>container.querySelector('[data-g="'+k+'"]');
 const notice=t=>{if(!dead)el('mapnotice').textContent=t;};
 const report=t=>{
  if(dead)return;
  el('weather').textContent=t;
  const total=xs=>xs?.length===12&&xs.every(n=>Number.isFinite(n)&&n>=0)?Math.round(xs.reduce((sum,n)=>sum+n,0)).toLocaleString()+' mm':'—';
  el('totals').textContent='Annual rainfall: '+total(model.rain)+'   ·   Annual reference ET₀: '+total(model.eto);
 };
 const change=()=>{if(!dead)onChange();};
 const select=(node,opts,selected,placeholder)=>{
  node.replaceChildren(new Option(placeholder,''));
  for(const value of new Set([...opts,selected].filter(Boolean)))node.add(new Option(value,value));
  node.value=selected||'';
 };
 const sync=()=>{
  for(const k of ['lat','lon','country','city','climate'])el(k).value=model[k]??'';
  select(el('state'),model.country==='India'?[...new Set(rows.map(r=>r[0]))]:[],model.state,'Select state');
  select(el('district'),rows.filter(r=>r[0]===model.state).map(r=>r[1]),model.district,'Select district');
 };
 const location=()=>[Number(model.lat),Number(model.lon)];
 const map=L.map(el('map'),{scrollWheelZoom:false,preferCanvas:true,worldCopyJump:true}).setView(location(),10);
 L.control.scale({imperial:false}).addTo(map);
 const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}).addTo(map);
 const outlines=L.layerGroup();const boundaries=L.layerGroup();
 const controls=L.control.layers({'Street map':tiles,'District reference':outlines},{'District boundaries':boundaries},{collapsed:true}).addTo(map);
 map.on('baselayerchange',e=>{offline=e.name==='District reference';if(offline)notice('District reference basemap · simplified 2019 boundaries. Street detail requires online tiles.');});
 let tileErrors=0,loaded=false;
 tiles.on('tileload',()=>{loaded=true;});
 tiles.on('tileerror',()=>{if(++tileErrors>=3&&!loaded&&map.hasLayer(tiles)){map.removeLayer(tiles);outlines.addTo(map);offline=true;renderLabels();notice('Street tiles unavailable. Showing the local district reference map.');}});
 const marker=L.marker(location(),{draggable:true,alt:'Selected property location',icon:L.icon({iconUrl:new URL('./vendor/leaflet/images/marker-icon.png',import.meta.url).href,iconSize:[25,41],iconAnchor:[12,41]})}).addTo(map);
 const labels=L.layerGroup().addTo(outlines);
 function renderLabels(){
  labels.clearLayers();
  if(!map.hasLayer(outlines)||map.getZoom()<6)return;
  let selected=rows.filter(r=>map.getBounds().contains([r[2],r[3]]));
  const stride=Math.max(1,Math.ceil(selected.length/18));
  selected.filter((_,i)=>i%stride===0).forEach(r=>{
   const text=document.createElement('span');text.textContent=r[1];
   L.marker([r[2],r[3]],{interactive:false,keyboard:false,icon:L.divIcon({className:'geo-district-label',html:text,iconSize:[88,16],iconAnchor:[44,8]})}).addTo(labels);
  });
 }
 map.on('moveend baselayerchange',renderLabels);
 const pointText=()=>model.polygonArea?'Mapped catchment: '+Number(model.polygonArea).toLocaleString(undefined,{maximumFractionDigits:1})+' m².':'';
 function paint(){
  if(roofLayer)roofLayer.remove();
  const pts=drawing?pending:model.roofPolygon||[];
  if(pts.length>1)roofLayer=(pts.length<3?L.polyline(pts):L.polygon(pts,{fillOpacity:.24})).setStyle({color:'#2b8cbe',weight:3}).addTo(map);
  if(drawing&&pts.length===1)roofLayer=L.circleMarker(pts[0],{radius:4,color:'#2b8cbe'}).addTo(map);
  el('start').textContent=drawing?'Cancel tracing':'Trace rooftop';
  el('undo').hidden=el('end').hidden=!drawing;el('clear').hidden=drawing||!model.polygonArea;
  el('roof').textContent=drawing?('Click each roof corner in order ('+pts.length+' selected), then use the traced area. Accuracy depends on the map and zoom.'):pointText();
 }
 async function weather({bundled=false}={}){
  const id=++request;weatherController?.abort();weatherController=new AbortController();
  const control=weatherController, signature=[model.lat,model.lon,model.source,model.etoSource].join('|');
  const current=()=>!dead&&id===request&&signature===[model.lat,model.lon,model.source,model.etoSource].join('|');
  const key=model.lat.toFixed(5)+','+model.lon.toFixed(5);
  report('Loading the historical climate record…');
  let expired=false;const timeout=setTimeout(()=>{expired=true;control.abort();},23000);
  try{
   let data,isBundle=false;
   const saved=await (archivePromise??=localJSON('archives.json').catch(()=>{archivePromise=null;return {};}));
   if(!current())return;
   if(saved[key]&&bundled){data=saved[key];isBundle=true;}
   else{
    try{data=await archive(model.lat,model.lon,control.signal);}
    catch(e){if(!saved[key]||!current())throw e;data=saved[key];isBundle=true;}
   }
   if(!current())return;
   profile(model,data,isBundle);report(model.source);change();
  }catch(e){
   if(current())report((expired?'Climate request timed out. ':'Climate archive unavailable. ')+'Current inputs: '+model.source+'. You can enter monthly values in the calculator.');
  }finally{clearTimeout(timeout);}
 }
 function setPoint(lat,lon,known={},zoom=map.getZoom()){
  lat=rounded(lat);lon=rounded(lon);if(!(lat>=-90&&lat<=90&&lon>=-180&&lon<=180))return;
  phase++; marker.setLatLng([lat,lon]);map.setView([lat,lon],zoom);
  const moved=lat!==model.lat||lon!==model.lon;
  const found=rows.find(r=>contains(r[4],lon,lat));
  if(moved){delete model.polygonArea;delete model.roofPolygon;drawing=false;pending=[];paint();blankFallback(model);}
  Object.assign(model,{lat,lon,country:found?'India':known.country||'',state:found?.[0]||known.state||'',district:found?.[1]||known.district||'',city:known.city||'',climate:region(found?.[0],found?.[1])});
  sync();change();
  notice((found?found[1]+', '+found[0]:'Selected coordinates')+(known.district?' · district reference point. Zoom in to refine the pin.':'.')+(offline?' District reference basemap.':''));
  if(moved)weather({bundled:true});
 }
 function reverseAndPlace(lat,lon,zoom){
  setPoint(lat,lon,{},zoom);
  const rev=phase;
  // One reverse lookup per explicit pin or GPS selection; local polygons work offline.
  clearTimeout(timer);timer=setTimeout(async()=>{
   try{
    const p=new URLSearchParams({format:'jsonv2',lat,lon,zoom:16,'accept-language':'en'});
    const r=await fetch('https://nominatim.openstreetmap.org/reverse?'+p,{signal:AbortSignal.timeout(9000)});
    if(!r.ok)return;const {address:a}=await r.json();
    if(dead||rev!==phase||!a)return;
    model.country=a.country||model.country;
    model.city=model.city||a.city||a.town||a.village||a.suburb||a.hamlet||'';
    model.state=model.state||a.state||'';model.district=model.district||a.state_district||a.county||'';
    sync();change();
   }catch{/* The exact coordinates and local district lookup remain available. */}
  },1100);
 }
 map.on('click',e=>{if(drawing){pending.push([rounded(e.latlng.lat),rounded(e.latlng.lng)]);paint();}else reverseAndPlace(e.latlng.lat,L.Util.wrapNum(e.latlng.lng,[-180,180]),map.getZoom());});
 marker.on('dragend',()=>{const p=marker.getLatLng();reverseAndPlace(p.lat,L.Util.wrapNum(p.lng,[-180,180]),map.getZoom());});
 el('start').onclick=()=>{drawing=!drawing;pending=[];if(drawing)map.setView(location(),Math.max(18,map.getZoom()));paint();};
 el('undo').onclick=()=>{pending.pop();paint();};
 el('end').onclick=()=>{const area=pending.length>=3?roofArea(pending):0;if(!(area>0)){el('roof').textContent='Choose at least three distinct corners without crossing edges.';return;}model.roofPolygon=pending.slice();model.polygonArea=area;drawing=false;paint();change();};
 el('clear').onclick=()=>{delete model.roofPolygon;delete model.polygonArea;drawing=false;paint();change();};
 el('apply').onclick=()=>{
  const a=el('lat').valueAsNumber,b=el('lon').valueAsNumber;
  if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a)>90||Math.abs(b)>180){notice('Enter latitude from −90 to 90 and longitude from −180 to 180.');return;}
  reverseAndPlace(a,b,14);
 };
 el('state').onchange=()=>{
  const state=el('state').value,group=rows.filter(r=>r[0]===state);
  if(!group.length){sync();return;}
  // Use a real district reference point so climate never comes from the previous state.
  const row=group[0];setPoint(row[2],row[3],{country:'India',state,district:row[1]},7);
 };
 el('district').onchange=()=>{const row=rows.find(r=>r[0]===model.state&&r[1]===el('district').value);if(row)setPoint(row[2],row[3],{country:'India',state:row[0],district:row[1]},10);else sync();};
 for(const k of ['city','climate'])el(k).oninput=()=>{model[k]=el(k).value;change();};
 el('gps').onclick=()=>{if(!navigator.geolocation){notice('Location access unavailable. Enter coordinates or use the map.');return;}
 notice('Finding your device location…');const g=phase;navigator.geolocation.getCurrentPosition(p=>{if(!dead&&phase===g)reverseAndPlace(p.coords.latitude,p.coords.longitude,16);},()=>{if(!dead)notice('Device location unavailable. Enter coordinates or select the map.');},{enableHighAccuracy:true,timeout:12000});};
 el('fetch').onclick=()=>weather();
 async function search(){
  const token=++searchToken;searchController?.abort();searchController=new AbortController();const controller=searchController;
  const q=el('search').value.trim(),output=el('matches');output.replaceChildren();
  if(q.length<2){output.textContent='Enter at least two letters.';return;}
  output.textContent='Searching places…';
  const timeout=setTimeout(()=>controller.abort(),10000);
  try{
   const query=q.split(',')[0].trim();
   const r=await fetch('https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name:query,count:15,language:'en',format:'json'}),{signal:controller.signal});
   if(!r.ok)throw Error();
   const data=await r.json();if(dead||token!==searchToken)return;
   const found=(data.results||[]).sort((a,b)=>Number(b.country===model.country)-Number(a.country===model.country));
   output.replaceChildren();if(!found.length)output.textContent='No matching city. Select a district or use coordinates.';
   for(const p of found.slice(0,7)){
    const b=document.createElement('button');b.type='button';b.textContent=[p.name,p.admin1,p.country].filter(Boolean).join(', ');
    b.onclick=()=>{setPoint(p.latitude,p.longitude,{country:p.country,state:p.admin1,district:p.admin2,city:p.name},12);output.replaceChildren();};output.append(b);
   }
  }catch{if(!dead&&token===searchToken)output.textContent='City search unavailable. Use a district reference point or coordinates.';}
  finally{clearTimeout(timeout);}
 }
 el('find').onclick=search;el('search').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();search();}};
 sync();paint();report(model.source);
 const resize=new ResizeObserver(()=>map.invalidateSize());resize.observe(el('map'));
 getDistricts().then(data=>{
  if(dead)return;rows=data;sync();
  const features=rows.map(r=>({type:'Feature',properties:{state:r[0],name:r[1]},geometry:{type:'MultiPolygon',coordinates:r[4]}}));
  for(const [layer,fill] of [[outlines,true],[boundaries,false]]){
   L.geoJSON(features,{interactive:false,style:{color:'#769a8a',weight:fill?1:.8,opacity:.8,fill,fillOpacity:.24,fillColor:'#c1d6ca'}}).addTo(layer);
  }
  renderLabels();
  if(!model.climate){const resolved=region(model.state,model.district);if(resolved){model.climate=resolved;el('climate').value=resolved;change();}}
 }).catch(()=>notice('District reference data unavailable. Use city search, map or coordinates.'));
 if(/^Illustrative/i.test(model.source))weather({bundled:true});
 return ()=>{dead=true;request++;phase++;searchToken++;weatherController?.abort();searchController?.abort();clearTimeout(timer);resize.disconnect();controls.remove();map.remove();};
}
