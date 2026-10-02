import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile('src/libs/staffImport.js','utf8');
const {prepareStaffImport:prepare}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const users=[{id:'1',code:'NV01',name:'An',email:'an@test.vn',citizenId:'001234567890',role:'admin',address:'Hà Nội'},{id:'2',code:'NV02',email:'binh@test.vn'}];
const types=[{id:'web',name:'Web App'}];
test('matches normalized staff code, preserves blank and unrelated fields without mutating users',()=>{
 const result=prepare([{code:' nv01 ',address:'',name:'An mới',role:'user',typeId:'Web App',birthday:'29/02/2024'}],users,types);
 assert.deepEqual(result.patches,[{id:'1',changes:{name:'An mới',typeId:'web',birthday:'2024-02-29'}}]);assert.equal(users[0].name,'An');
});
for(const row of [{code:'NV01',birthday:'31/02/2024'},{code:'NV01',email:'invalid'},{code:'NV01',phone:'912345678'},{code:'NV01',typeId:'Unknown'},{code:'NV01',email:'binh@test.vn'},null,{}])test(`rejects invalid row ${JSON.stringify(row)}`,()=>assert.throws(()=>prepare([row],users,types)));
test('rejects duplicate file codes and duplicate system codes',()=>{assert.throws(()=>prepare([{code:'NV01'},{code:'nv01'}],users,types));assert.throws(()=>prepare([{code:'NV01'}],[...users,{id:'3',code:'nv01'}],types));});
test('unknown codes skipped and unchanged rows counted',()=>{const r=prepare([{code:'NV01',name:'An'},{code:'UNKNOWN'}],users,types);assert.equal(r.updated,0);assert.equal(r.skipped,1);assert.equal(r.unchanged,1);});
test('invalid later row prevents any planned update from being applied',()=>{assert.throws(()=>prepare([{code:'NV01',name:'Changed'},{code:'NV02',birthday:'wrong'}],users,types));assert.equal(users[0].name,'An');});
