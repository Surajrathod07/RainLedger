import test from 'node:test'
import assert from 'node:assert/strict'
import {defaults,collection,simulate,scenarios,validate,sum} from '../dist/engine.js'
const near=(a,b)=>assert.ok(Math.abs(a-b)<.000001,a+' ≠ '+b)
test('Harvest-only assessment is independent of incomplete storage and demand inputs',()=>{
 const model={...defaults(),polygonArea:100,coefficient:.8,efficiency:100,rain:[800,...Array(11).fill(0)],tank:null,eto:[]}
 const result=collection(model)
 near(result.harvest,64000);near(result.monthlyAverage,64000/12);near(result.dailyAverage,64000/365)
 assert.equal(result.annualRain,800);assert.throws(()=>simulate(model))
 assert.throws(()=>collection({...model,rain:[]}))
})
test('Manual irrigation ignores inactive ET parameters and preserves monthly harvest',()=>{
 const model={...defaults(),mode:'Manual monthly demand',kc:null,effective:null,eto:[]}
 assert.deepEqual(simulate(model).rows.map(row=>row.harvested),collection(model).rows.map(row=>row.harvested))
})
test('Rectangular footprint and square-foot conversion',()=>{const s=simulate({...defaults(),length:25,width:40});assert.equal(s.ft,1000);near(s.area,92.903)})
test('Mapped 100 m² example from slide 7 yields 64,000 L annually',()=>{
 const m={...defaults(),polygonArea:100,coefficient:.8,efficiency:100,rain:[800,...Array(11).fill(0)]}
 const r=simulate(m);near(r.harvest,64000);assert.equal(r.rows[0].harvested,64000);near(sum(m.rain),800)
})
test('Collection efficiency applies after roof runoff',()=>{near(simulate({...defaults(),polygonArea:100,rain:Array(12).fill(10),efficiency:50,coefficient:.8}).rows[0].harvested,400)})
for(const [key,val] of [['coefficient',1.01],['coefficient',-.1],['efficiency',101],['efficiency',-1],['length',0],['initial',5001],['tank',-1],['land',-1],['lat',91],['rain',Array(11).fill(1)],['eto',[null,...Array(11).fill(1)]]]){
 test('Validation rejects '+key+' '+val,()=>{assert.ok(validate({...defaults(),[key]:val}).length)})
}
test('Effective rainfall reduces crop demand and cannot produce negative irrigation',()=>{
 const m={...defaults(),rain:[20,200,...Array(10).fill(0)],eto:Array(12).fill(100),kc:.7,effective:50,land:100,indoor:21,extra:7}
 const r=simulate(m);near(r.rows[0].irrigation,60*100*.092903);near(r.rows[0].demand,r.rows[0].irrigation+28);assert.equal(r.rows[1].irrigation,0)
})
test('Demand, overflow, carryover, deficit, mass conservation and storage bounds',()=>{
 const m={...defaults(),polygonArea:1,coefficient:1,efficiency:100,tank:30,initial:7,rain:[100,0,0,0,...Array(8).fill(1)],mode:'Manual monthly demand',manual:Array(12).fill(10),indoor:0,extra:0}
 const r=simulate(m);assert.equal(r.rows[0].storage,30);assert.equal(r.rows[0].overflow,67);assert.equal(r.rows[1].start,30);assert.equal(r.rows[4].deficit,9)
 for(const v of r.rows){near(v.start+v.harvested,v.supplied+v.storage+v.overflow);near(v.demand,v.supplied+v.deficit);assert.ok(v.storage>=0&&v.storage<=m.tank)}
})
test('No demand or tank handles undefined rates',()=>{const r=simulate({...defaults(),initial:0,tank:0,land:0,indoor:0,extra:0});assert.equal(r.coverage,null);assert.equal(r.util,null);near(r.overflow,r.harvest)})
test('Historical scenarios select complete-year rainfall ranks and use paired ET',()=>{const m=defaults();m.years=Array.from({length:10},(_,i)=>({year:2016+i,rain:Array(12).fill(10+i),eto:Array(12).fill(100+i)}));const sc=scenarios(m);assert.deepEqual(sc.map(s=>s.basis),['2017','2021','2024']);near(sc[2].harvest,simulate({...m,...m.years[8]}).harvest)})
test('Sensitivity factors are transparent and irrigation is recalculated',()=>{const m=defaults(),r=simulate(m),sc=scenarios(m);near(sc[0].harvest,.7*r.harvest);near(sc[2].harvest,1.3*r.harvest);assert.ok(sc[0].irrigation>=sc[2].irrigation)})
