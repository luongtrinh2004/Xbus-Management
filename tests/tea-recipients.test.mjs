import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('src/app/api/notifications/run/route.js','utf8').replace(/^import[\s\S]*?;\n/gm,'').replace('export async function POST','async function POST');
async function run({ids=['a','b'],excluded=['b'],role='admin',invitations,fail=false,logs={}}={}) {
 const sent=[];let saved;
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
 const ctx=vm.createContext({Response,Date,Intl,Set,Map,Math,Number,String,Boolean,Array,Object,console:{error(){}},process:{env:{}},NextResponse:{json:(body,init)=>Response.json(body,init)},getToken:async()=>({id:'admin',role}),getSettings:async()=>({teaReminderSettings:{enabled:false,excludedUserIds:excluded},notificationEmailLogs:logs}),getFunds:async()=>[],getUsers:async()=>[{id:'a',name:'A',email:'a@test.vn',status:'able'},{id:'b',name:'B',email:'b@test.vn',status:'able'},{id:'c',email:'c@test.vn',status:'disabled'}],getWaterSchedules:async()=>[],getWaterExemptions:async()=>[],getAfternoonTea:async()=>({invitations:invitations??[{id:'tea1',scheduledAt:today,title:'Mời trà chiều',menus:[]}]}),toVietnamDateKey:value=>value.slice(0,10),createNotificationContent:args=>({text:args.message,html:'test'}),sendNotificationEmail:async message=>{if(fail)throw Error('SMTP failed');sent.push(message.to);},saveSettings:async settings=>{saved=settings;}});
 vm.runInContext(source,ctx);
 const response=await ctx.POST({json:async()=>({action:'sendTeaNow',recipientIds:ids}),headers:new Headers()});
 return {status:response.status,body:await response.json(),sent,saved,today};
}
test('manual send contacts selected recipients except excluded people, even when automation disabled',async()=>{const r=await run();assert.deepEqual(r.sent,['a@test.vn']);assert.equal(r.body.sent,1);});
test('manual selection does not expand to all employees',async()=>{const r=await run({ids:['b'],excluded:[]});assert.deepEqual(r.sent,['b@test.vn']);});
test('empty selection rejected without sending',async()=>{const r=await run({ids:[]});assert.equal(r.status,400);assert.equal(r.sent.length,0);});
test('inactive or unknown recipient rejected without partial sends',async()=>{for(const id of ['c','unknown']){const r=await run({ids:['a',id]});assert.equal(r.status,400);assert.equal(r.sent.length,0);}});
test('no invitation today means no email',async()=>{const r=await run({invitations:[]});assert.equal(r.status,400);assert.equal(r.sent.length,0);});
test('unauthorized callers cannot send',async()=>{const r=await run({role:'user'});assert.equal(r.status,403);assert.equal(r.sent.length,0);});
test('SMTP failure is counted as failure and not logged as sent',async()=>{const r=await run({fail:true});assert.equal(r.body.sent,0);assert.equal(r.body.failed,1);assert.deepEqual(Object.keys(r.saved.notificationEmailLogs),[]);});
test('recently sent recipient is skipped for 60 seconds',async()=>{const first=await run();const r=await run({logs:first.saved.notificationEmailLogs});assert.equal(r.sent.length,0);assert.equal(r.body.skipped,1);});
