import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {aggregateDaily,profile} from '../dist/gis/weather.js'

function daily(year) {
 const time=[]
 for(let day=Date.UTC(year,0,1);day<Date.UTC(year+1,0,1);day+=86400000)time.push(new Date(day).toISOString().slice(0,10))
 return {time,rain_sum:time.map(()=>2),et0_fao_evapotranspiration:time.map(()=>3)}
}
test('daily rain and reference ET become monthly totals, including leap day',()=>{
 const [year]=aggregateDaily(daily(2024),2024,2024)
 assert.equal(year.rain[1],58);assert.equal(year.eto[1],87)
 assert.equal(year.rain.reduce((a,b)=>a+b),732)
})
test('missing or duplicate archive days and null measurements are rejected',()=>{
 const missing=daily(2023);missing.time.splice(2,1)
 assert.throws(()=>aggregateDaily(missing,2023,2023))
 const duplicate=daily(2023);duplicate.time[4]=duplicate.time[3]
 assert.throws(()=>aggregateDaily(duplicate,2023,2023))
 const blank=daily(2023);blank.rain_sum[4]=null
 assert.throws(()=>aggregateDaily(blank,2023,2023))
})
test('bundled site-specific archive includes ten intact years for nine places',()=>{
 const archives=JSON.parse(readFileSync(new URL('../dist/gis/archives.json',import.meta.url)))
 assert.equal(Object.keys(archives).length,9)
 for(const data of Object.values(archives)){
  assert.deepEqual(data.years.map(y=>y.year),Array.from({length:10},(_,i)=>2016+i))
  for(const row of data.years)for(const values of [row.rain,row.eto]){
   assert.equal(values.length,12);assert.ok(values.every(n=>Number.isFinite(n)&&n>=0))
  }
 }
 const m={};profile(m,archives['18.52040,73.85670'],true)
 assert.match(m.source,/2016–2025/);assert.match(m.source,/Pune city/)
 assert.equal(Number(m.rain.reduce((a,b)=>a+b).toFixed(2)),1428.97)
})
