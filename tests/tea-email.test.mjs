import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('src/libs/emailNotifications.js','utf8').replace(/^import .*;\n/gm,'').replaceAll('export ','');
const ctx=vm.createContext({URL,process});vm.runInContext(source,ctx);
test('tea invitation uses the shared email layout, menu image and order link with escaped text',()=>{
 const result=ctx.createNotificationContent({name:'An',title:'Happy Hour',message:'Mời <mọi người>',actionUrl:'https://xbus-office.xmobility.vn/afternoon-tea',actionLabel:'Đặt ngay',images:[{url:'/images/menu.png',label:'Menu <quán>'},{url:'javascript:alert(1)',label:'bad'}]});
 assert.match(result.html,/Đặt ngay/);assert.match(result.html,/href="https:\/\/xbus-office.xmobility.vn\/afternoon-tea"/);assert.match(result.html,/src="https:\/\/xbus-office.xmobility.vn\/images\/menu.png"/);assert.match(result.html,/&lt;mọi người&gt;/);assert.doesNotMatch(result.html,/javascript:/);
});
test('existing reminder action remains unchanged by default',()=>{const r=ctx.createNotificationContent({name:'An',title:'Nhắc quỹ',message:'Nội dung'});assert.match(r.html,/>Truy cập Xbus Office<\/a>/);assert.doesNotMatch(r.html,/<img/);});
