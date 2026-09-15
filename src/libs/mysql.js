import mysql from "mysql2/promise";

let pool;
export const isMysqlEnabled = () => process.env.DATA_SOURCE === "mysql";
export const getMysqlPool = () => {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL chưa được cấu hình");
  if (!pool) pool = mysql.createPool(process.env.DATABASE_URL);
  return pool;
};
