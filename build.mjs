import fs from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
fs.writeFileSync('dist/engine.js',stripTypeScriptTypes(fs.readFileSync('src/engine.ts','utf8')))
for(const page of ['calculator','gis','results','about']){
 fs.mkdirSync('dist/'+page,{recursive:true})
 fs.copyFileSync('dist/index.html','dist/'+page+'/index.html')
}
