export const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const sum = (x         ) => x.reduce((a,b)=>a+b,0)
                                                           
                                                
export function defaults(){
 return {advanced:false,country:'India', state:'Maharashtra', district:'Pune',city:'Pune',climate:'',lat:18.5204,lon:73.8567,
  polygonArea:null               ,roofPolygon:[]              ,property:'Residential',material:'Concrete',length:40,width:30,coefficient:0.8,efficiency:90,
  tank:5000,initial:0,tankType:'Above-ground tank',filter:'',plant:'Mixed garden',kc:0.75,land:400,
  mode:'ET-based estimate',effective:70, indoor:2400,extra:200,manual:Array(12).fill(600)            ,
  eto:[105,115,145,160,155,105,85,85,95,115,100,90],rain:[1,1,3,12,30,150,190,130,145,95,28,15],
  source:'Illustrative monthly profile • no observation period',etoSource:'Illustrative ET₀ profile',years:[]          ,photo:''}
}
export function validate(m       , advanced=true){
 const errors         =[]
 function range(label       ,v       ,min       ,max=Infinity){if(!Number.isFinite(v)||v<min||v>max) errors.push(label)}
 if(m.polygonArea!=null){range('Mapped area',m.polygonArea,0.000001)}else{range('Roof length',m.length,0.000001);range('Roof width',m.width,0.000001)};range('Runoff coefficient',m.coefficient,0,1)
 range('Collection efficiency',m.efficiency,0,100);range('Latitude',m.lat,-90,90);range('Longitude',m.lon,-180,180)
 const series                    =[['Rainfall',m.rain]]
 if(advanced){
  range('Tank capacity',m.tank,0);range('Initial storage (must fit tank)',m.initial,0,m.tank)
  range('Indoor demand',m.indoor,0);range('Additional demand',m.extra,0)
  if(m.mode==='ET-based estimate'){
   range('Irrigated area',m.land,0);range('Crop coefficient',m.kc,0);range('Effective rain fraction',m.effective,0,100)
   series.push(['ET₀',m.eto])
  }else series.push(['Irrigation',m.manual])
 }
 for(const [k,v] of series){
  if(!Array.isArray(v)||v.length!==12||v.some(n=>!Number.isFinite(n)||n<0))errors.push(k+' needs 12 non-negative values')
 }
 return errors
}
export function collection(m       ){
 const errors=validate(m,false);if(errors.length)throw new Error(errors.join(', '))
 const area=m.polygonArea??m.length*m.width*.092903
 const ft=m.polygonArea?area/.092903:m.length*m.width
 const rows=m.rain.map((rain,i)=>({month:months[i],rain,harvested:rain*area*m.coefficient*m.efficiency/100}))
 const harvest=sum(rows.map(row=>row.harvested))
 return {area,ft,rows,harvest,annualRain:sum(m.rain),monthlyAverage:harvest/12,dailyAverage:harvest/365}
}
export function simulate(m       ) {
 const errors=validate(m);if(errors.length) throw new Error(errors.join(', '))
 const yieldProfile=collection(m)
 let storage=m.initial
 const rows=yieldProfile.rows.map(({month,rain,harvested},i)=>{
  const start=storage
  const irrigation=m.mode==='ET-based estimate'? Math.max(0,m.kc*m.eto[i]-rain*m.effective/100)*m.land*.092903:m.manual[i]
  const demand=irrigation+m.indoor+m.extra,available=start+harvested,supplied=Math.min(available,demand)
  storage=Math.min(m.tank,available-supplied)
  const overflow=Math.max(0,available-supplied-storage),deficit=demand-supplied
  return {month,rain,start,harvested,irrigation,indoor:m.indoor,extra:m.extra,demand,supplied,storage,overflow,deficit}
 })
 const total=(key                                           )=>sum(rows.map(r=>r[key]))
 const demand=total('demand'), supplied=total('supplied')
 return {...yieldProfile,rows,demand,supplied,coverage:demand?100*supplied/demand:null,storage,overflow:total('overflow'),deficit:total('deficit'),irrigation:total('irrigation'),util:m.tank?100*total('storage')/(12*m.tank):null}
}
export function scenarios(m       ){
 const ranked=[...m.years].sort((a,b)=>sum(a.rain)-sum(b.rain))
 return ['Drought','Typical','Wet'].map((label,i)=>{
  const year=ranked.length>=3?ranked[Math.round((ranked.length-1)*[.1,.5,.9][i])]:null
  const factor=[.7,1,1.3][i], rain=year?year.rain:m.rain.map(v=>v*factor)
  return {label,basis:year?String(year.year):Math.round(factor*100)+'% of input',...simulate({...m,rain,eto:year?.eto?.length===12?year.eto:m.eto})}
 })
}
