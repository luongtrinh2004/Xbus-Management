import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import XLSX from 'xlsx';
const source=await readFile('src/libs/staffExcel.js','utf8');
const {staffExportRow,mapStaffImportRow}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('staff workbook round trip has exactly the requested columns and preserves leading zeros',()=>{
 const row=staffExportRow({code:'001',name:'Nguyễn An',typeId:'web',citizenId:'001234567890',phone:'0912345678',birthday:'2000-01-02',jiraAccount:'an'},new Map([['web','Web App']]),()=> '02/01/2000');
 assert.deepEqual(Object.keys(row),['MA_NV','HO_TEN','Tài khoản Jira - Confluence','NHOM','CCCD','DIEN_THOAI','NGAY_SINH','EMAIL','Địa chỉ','Ngày Cấp']);
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet([row]),'Nhân sự');
 const read=XLSX.read(XLSX.write(book,{type:'buffer',bookType:'xlsx'}),{type:'buffer'});
 const mapped=mapStaffImportRow(XLSX.utils.sheet_to_json(read.Sheets['Nhân sự'],{raw:false,defval:''})[0]);
 assert.equal(mapped.code,'001');assert.equal(mapped.citizenId,'001234567890');assert.equal(mapped.phone,'0912345678');assert.equal(mapped.typeId,'Web App');assert.equal(mapped.birthday,'02/01/2000');assert.equal(mapped.citizenIssuedDate,'');assert.ok(!Object.hasOwn(mapped,'role'));
});
test('header matching accepts wrapped Jira label and legacy labels',()=>{
 assert.deepEqual(mapStaffImportRow({'Tài khoản Jira -\nConfluence':'an','Ngày cấp CCCD':'02/01/2020','Mã nhân sự':'NV01'}),{code:'NV01',jiraAccount:'an',citizenIssuedDate:'02/01/2020'});
});
