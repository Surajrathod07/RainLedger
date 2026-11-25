import {fmt} from './ui.js'
function file(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
export function downloadCSV(m,r){
 let head=['Month','Rain (mm)','Starting storage (L)','Harvested (L)','Irrigation (L)','Indoor (L)','Additional (L)','Total demand (L)','Supplied (L)','Ending storage (L)','Overflow (L)','Unmet (L)','Rainfall source']
 let rows
 if(m.advanced===false){
  head=['Month','Rain (mm)','Harvested (L)','Area (m²)','Runoff coefficient','Collection efficiency (%)','Latitude','Longitude','Rainfall source']
  rows=r.rows.map(v=>[v.month,v.rain,v.harvested.toFixed(2),r.area,m.coefficient,m.efficiency,m.lat,m.lon,m.source])
 }else rows=r.rows.map(v=>[v.month,...['rain','start','harvested','irrigation','indoor','extra','demand','supplied','storage','overflow','deficit'].map(k=>v[k].toFixed(2)),m.source])
 file(new Blob(['\ufeff'+[head,...rows].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),'RainLedger-monthly-assessment.csv')
}
let lib
async function pdfLib(){
 if(!window.PDFLib){lib??=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/vendor/pdf-lib.min.js';s.onload=resolve;s.onerror=()=>{lib=null;reject()};document.head.append(s)});await lib}
 return window.PDFLib
}
export async function downloadPDF({m,r,sc,props,rating,desc,scenarioNote,historic,recommendation}){
 const {PDFDocument}=await pdfLib(),doc=await PDFDocument.create();doc.setTitle('RainLedger • Property assessment')
 const c=document.createElement('canvas');c.width=1240;c.height=1754
 const g=c.getContext('2d');let y,page=0
 function start(title){page++;g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.fillStyle='#21583f';g.fillRect(0,0,c.width,18);g.font='bold 30px sans-serif';g.fillText('RainLedger',64,90);g.font='bold 48px Georgia';g.fillText(title,64,170);y=235}
 function line(str,size=24,bold=false){g.font=(bold?'bold ':'')+size+'px sans-serif';g.fillStyle='#223d31';let t='';for(const word of String(str).split(/\s+/)){if(t&&g.measureText(t+' '+word).width>1100){g.fillText(t,64,y);y+=size*1.45;t=''}t+=(t?' ':'')+word}g.fillText(t,64,y);y+=size*1.55}
 async function finish(){g.font='20px sans-serif';g.fillText('Rainwater Harvesting Potential Calculator  •  '+page,64,1694);const img=await doc.embedJpg(c.toDataURL('image/jpeg',.92));doc.addPage([595.28,841.89]).drawImage(img,{x:0,y:0,width:595.28,height:841.89})}
 function drawTable(headers,rows,widths){const xs=widths.map((_,i)=>64+widths.slice(0,i).reduce((a,b)=>a+b,0));for(const [idx,row] of [headers,...rows].entries()){g.fillStyle=idx%2?'#f7f9f6':'#eaf1e9';g.fillRect(64,y-26,1110,43);g.fillStyle='#223d31';g.font=(idx?'':'bold ')+'20px sans-serif';row.forEach((v,i)=>g.fillText(String(v),xs[i]+5,y,widths[i]-9));y+=45}y+=22}
 if(m.advanced===false){
  start('Rooftop harvesting potential')
  line('Annual harvesting potential: '+fmt(r.harvest)+' L',32,true)
  line('Annual rainfall: '+fmt(r.annualRain,2)+' mm')
  line('Average collection: '+fmt(r.monthlyAverage,1)+' L/month · '+fmt(r.dailyAverage,1)+' L/day (365-day year)')
  for(const [label,value] of props)line(label+'  ·  '+value,22)
  line('Rainfall source: '+m.source,21)
  drawTable(['Month','Rainfall (mm)','Collection (L)'],r.rows.map(v=>[v.month,fmt(v.rain,2),fmt(v.harvested,2)]),[300,350,460])
  await finish()
 }else{
 start('Property assessment');line(rating,29,true);line(desc);y+=10;for(const [key,val] of props)line(key+'  ·  '+val,22);line('Rainfall  ·  '+m.source,21);line('ET₀  ·  '+m.etoSource,21)
 if(m.photo){const im=new Image();im.src=m.photo;await im.decode();const scale=Math.min(650/im.width,Math.max(10,1510-y)/im.height,1);g.drawImage(im,64,y,im.width*scale,im.height*scale)}
 await finish();start('Monthly water balance');line('Rain in mm. All water volumes in litres. Rounded to whole litres.',23)

 drawTable(['Month','Rain','Start','Harvest','Demand','Supply','Ending','Spill','Deficit'],r.rows.map(v=>[v.month,...['rain','start','harvested','demand','supplied','storage','overflow','deficit'].map(k=>fmt(v[k]))]),[90,80,125,147,145,140,130,130,123])
 line('Annual totals',28,true);line('Harvest '+fmt(r.harvest)+' L · supply '+fmt(r.supplied)+' L · demand '+fmt(r.demand)+' L');line('Irrigation '+fmt(r.irrigation)+' L · indoor '+fmt(m.indoor*12)+' L · additional '+fmt(m.extra*12)+' L');line('Overflow '+fmt(r.overflow)+' L · unmet demand '+fmt(r.deficit)+' L · final storage '+fmt(r.storage)+' L');line('Coverage '+fmt(r.coverage,1)+'% · average month-end tank utilization '+fmt(r.util,1)+'%');y+=20;line('Method',28,true);line('Harvest = rainfall × roof area in m² × runoff × collection efficiency. Demand is pooled before storage is capped each month. Short dry spells and storm-scale losses may differ from this estimate.');await finish()
 start('Scenario & tank analysis');line(scenarioNote,23);drawTable(['Scenario','Basis','Harvest L','Irrig. L','Cover %','Ending L','Short L','Spill L'],sc.map(s=>[s.label,s.basis,fmt(s.harvest),fmt(s.irrigation),fmt(s.coverage,1),fmt(s.storage),fmt(s.deficit),fmt(s.overflow)]),[125,168,146,140,121,140,135,135]);line('Tank sizing',29,true);line(recommendation);y+=15;line('Historical annual potential',29,true);if(historic.length){for(const v of historic)line(v.year+'  ·  '+fmt(v.volume)+' L',21)}else line('Historical data unavailable for this assessment.');line('Planning estimate for non-potable use.',20);await finish()
 }
 file(new Blob([await doc.save()],{type:'application/pdf'}),'RainLedger-property-assessment.pdf')
}
