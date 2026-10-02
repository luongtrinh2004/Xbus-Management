const headerKey = value => String(value).trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
const columns = {
  code: ['MA_NV', 'Mã nhân sự', 'Mã NV', 'Code'],
  name: ['HO_TEN', 'Họ và tên', 'Họ tên'],
  jiraAccount: ['Tài khoản Jira - Confluence', 'Tk Jira', 'Jira'],
  typeId: ['NHOM', 'Bộ phận'],
  citizenId: ['CCCD', 'Số CCCD'],
  phone: ['DIEN_THOAI', 'Số điện thoại', 'Phone'],
  birthday: ['NGAY_SINH', 'Ngày sinh'],
  email: ['EMAIL'],
  address: ['Địa chỉ'],
  citizenIssuedDate: ['Ngày Cấp', 'Ngày cấp CCCD'],
  gender: ['Giới tính'], position: ['Chức vụ'], joinedDate: ['Ngày tham gia'],
  categoryId: ['Hình thức'], role: ['Vai trò'], status: ['Trạng thái'],
  schedulingPoints: ['Điểm rèn luyện', 'Điểm bê nước'], waterTripCount: ['Số lượt bê nước'],
};
export function mapStaffImportRow(row) {
  const normalized = new Map(Object.entries(row).map(([key, value]) => [headerKey(key), value]));
  const result = {};
  for (const [field, aliases] of Object.entries(columns)) {
    const key = aliases.map(headerKey).find(key => normalized.has(key));
    if (key !== undefined) result[field] = normalized.get(key);
  }
  return result;
}
export function staffExportRow(user, departments, formatDate) {
  return {
    MA_NV: String(user.code || ''),
    HO_TEN: user.name || '',
    'Tài khoản Jira - Confluence': user.jiraAccount || '',
    NHOM: departments.get(user.typeId) || user.typeId || '',
    CCCD: String(user.citizenId || ''),
    DIEN_THOAI: String(user.phone || ''),
    NGAY_SINH: user.birthday ? formatDate(user.birthday) : '',
    EMAIL: user.email || '',
    'Địa chỉ': user.address || '',
    'Ngày Cấp': user.citizenIssuedDate ? formatDate(user.citizenIssuedDate) : '',
  };
}
