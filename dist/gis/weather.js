/** ERA5 daily rain and reference ET in mm. Use only complete consecutive calendar years. */
export function aggregateDaily(daily, first, last) {
 const dates=daily?.time, rain=daily?.rain_sum, eto=daily?.et0_fao_evapotranspiration;
 const result=[]; let index=0;
 for(let year=first; year<=last; year++) {
  const row={year,rain:Array(12).fill(0),eto:Array(12).fill(0)};
  for(let t=Date.UTC(year,0,1); t<Date.UTC(year+1,0,1);t+=86400000,index++) {
   const d=new Date(t);
   if(dates?.[index]!==d.toISOString().slice(0,10)||![rain?.[index],eto?.[index]].every(n=>Number.isFinite(n)&&n>=0)) throw Error('Incomplete daily archive');
   row.rain[d.getUTCMonth()]+=rain[index]; row.eto[d.getUTCMonth()]+=eto[index];
  }
  result.push(row);
 }
 if(index!==dates?.length)throw Error('Unexpected archive dates');
 return result;
}
export async function archive(lat,lon,signal) {
 const last=new Date().getUTCFullYear()-1,first=last-9;
 const params=new URLSearchParams({latitude:lat,longitude:lon,start_date:first+'-01-01',end_date:last+'-12-31',daily:'rain_sum,et0_fao_evapotranspiration',models:'era5',timezone:'auto'});
 const r=await fetch('https://archive-api.open-meteo.com/v1/archive?'+params,{signal});
 if(!r.ok)throw Error('Weather service unavailable');
 const json=await r.json();
 return {years:aggregateDaily(json.daily,first,last), gridLat:json.latitude,gridLon:json.longitude};
}
export function profile(model,series,offline=false){
 const years=series.years;
 model.years=years;
 for(const k of ['rain','eto'])model[k]=Array.from({length:12},(_,i)=>Number((years.reduce((n,y)=>n+y[k][i],0)/years.length).toFixed(2)));
 const period=years[0].year+'–'+years[years.length-1].year;
 model.source='Open-Meteo · ERA5 historical reanalysis · '+period+' · grid '+series.gridLat+'°, '+series.gridLon+'°'+(offline?' · bundled '+series.name+' archive':'');
 model.etoSource=model.source;
}
