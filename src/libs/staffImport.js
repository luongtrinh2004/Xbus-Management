const codeOf = value => String(value || '').trim().toUpperCase();
const text = value => String(value ?? '').trim();
const fields = ['name','jiraAccount','typeId','citizenId','phone','birthday','email','address','citizenIssuedDate'];
function dateOf(value) {
  let raw = text(value);
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 1 || value > 2958465) throw Error('ngày Excel không hợp lệ');
    raw = new Date(Date.UTC(1899,11,30) + value * 86400000).toISOString().slice(0,10);
  }
  const vi = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (vi) raw = `${vi[3]}-${vi[2].padStart(2,'0')}-${vi[1].padStart(2,'0')}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw Error('ngày phải có dạng dd/mm/yyyy');
  const date = new Date(`${raw}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== raw || Number(raw.slice(0,4)) < 1900) throw Error('ngày không tồn tại');
  return raw;
}
export function prepareStaffImport(rows, users, types) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 10000) throw Error('File phải có từ 1 đến 10.000 dòng');
  const byCode = new Map();
  for (const user of users) {
    const code = codeOf(user.code);
    if (!code) continue;
    if (byCode.has(code)) throw Error(`Dữ liệu hệ thống có mã nhân sự trùng: ${code}`);
    byCode.set(code,user);
  }
  const patches=[], seen=new Set(); let skipped=0;
  const groups = new Map();
  for (const type of types) for (const key of [type.id,type.name]) {
    const normalized=text(key).toLocaleLowerCase('vi');
    const ids=groups.get(normalized)||new Set();ids.add(type.id);groups.set(normalized,ids);
  }
  for (const [index,row] of rows.entries()) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw Error(`Dòng ${index+2}: dữ liệu không hợp lệ`);
    const code=codeOf(row.code);
    if (!code) throw Error(`Dòng ${index+2}: thiếu MA_NV`);
    if (seen.has(code)) throw Error(`Mã nhân sự bị lặp trong file: ${code}`);
    seen.add(code);
    const user=byCode.get(code);
    if (!user) { skipped++;continue; }
    const changes={};
    for (const field of fields) {
      if (!Object.hasOwn(row,field) || row[field] == null || text(row[field]) === '') continue;
      if (!['string','number'].includes(typeof row[field])) throw Error(`${code}: ${field} không hợp lệ`);
      let value=text(row[field]);
      if (value.length > (field === 'address' ? 1000 : 191)) throw Error(`${code}: ${field} quá dài`);
      if (field === 'typeId') {
        const ids=groups.get(value.toLocaleLowerCase('vi'));
        if (!ids || ids.size !== 1) throw Error(`${code}: nhóm/bộ phận không tồn tại hoặc trùng tên: ${value}`);
        value=[...ids][0];
      }
      if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw Error(`${code}: email không hợp lệ`);
      if (field === 'phone' && !/^(\+84|0)\d{9,10}$/.test(value)) throw Error(`${code}: số điện thoại không hợp lệ, kiểm tra số 0 đầu`);
      if (field === 'citizenId' && !/^\d{9,12}$/.test(value)) throw Error(`${code}: CCCD phải có 9–12 chữ số`);
      if (['birthday','citizenIssuedDate'].includes(field)) {
        try { value=dateOf(row[field]); } catch(error) { throw Error(`${code}: ${field === 'birthday' ? 'NGAY_SINH' : 'Ngày Cấp'} — ${error.message}`); }
      }
      if (value !== text(user[field])) changes[field]=value;
    }
    if (Object.keys(changes).length) patches.push({id:user.id,changes});
  }
  const updated=new Map(patches.map(p=>[p.id,p.changes]));
  for (const field of ['email','citizenId']) {
    const seenValues=new Map();
    for (const user of users) {
      const value=text(({...user,...updated.get(user.id)})[field]).toLowerCase();
      if (!value) continue;
      if (seenValues.has(value) && (updated.has(user.id) || updated.has(seenValues.get(value)))) throw Error(`${field === 'email' ? 'Email' : 'CCCD'} bị trùng giữa các nhân sự`);
      seenValues.set(value,user.id);
    }
  }
  return {patches,updated:patches.length,skipped,unchanged:rows.length-skipped-patches.length};
}
