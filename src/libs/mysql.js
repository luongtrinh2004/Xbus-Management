import mysql from "mysql2/promise";

let pool;
export const isMysqlEnabled = () => process.env.DATA_SOURCE === "mysql";
export const getMysqlPool = () => {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL chưa được cấu hình");
  if (!pool)
    pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      // DATE là ngày nghiệp vụ, không được đổi timezone khi Node đọc từ MySQL.
      dateStrings: ["DATE"],
      // DATETIME hiện có trong hệ thống được lưu theo giờ Việt Nam. Khai báo
      // cố định offset khi đọc/ghi để VPS (thường chạy UTC) không lệch 7 tiếng.
      timezone: "+07:00",
    });
  return pool;
};
