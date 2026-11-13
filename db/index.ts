import mysql, { type Pool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";
import { mysqlSchemaStatements } from "./mysql-schema";

type Database = ReturnType<typeof createDatabase>;
type GlobalDatabase = typeof globalThis & {
  hygieneLinksPool?: Pool;
  hygieneLinksDb?: Database;
  hygieneLinksSchemaPromise?: Promise<void>;
};

const runtime = globalThis as GlobalDatabase;

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Add the cPanel MySQL connection values to the Node.js application's environment variables.`,
    );
  }
  return value;
}

export function getPool() {
  if (!runtime.hygieneLinksPool) {
    runtime.hygieneLinksPool = mysql.createPool({
      host: required("DB_HOST"),
      port: Number(process.env.DB_PORT || 3306),
      user: required("DB_USER"),
      password: required("DB_PASSWORD"),
      database: required("DB_NAME"),
      charset: "utf8mb4",
      timezone: "Z",
      dateStrings: true,
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
      maxIdle: Number(process.env.DB_CONNECTION_LIMIT || 10),
      idleTimeout: 60_000,
      enableKeepAlive: true,
    });
  }
  return runtime.hygieneLinksPool!;
}

export function getDb() {
  if (!runtime.hygieneLinksDb) {
    runtime.hygieneLinksDb = createDatabase();
  }
  return runtime.hygieneLinksDb!;
}

function createDatabase() {
  return drizzle(getPool(), { schema, mode: "default" });
}

export async function ensureMysqlSchema() {
  if (!runtime.hygieneLinksSchemaPromise) {
    runtime.hygieneLinksSchemaPromise = (async () => {
      const pool = getPool();
      for (const statement of mysqlSchemaStatements) {
        await pool.query(statement);
      }
    })().catch((error) => {
      runtime.hygieneLinksSchemaPromise = undefined;
      throw error;
    });
  }
  return runtime.hygieneLinksSchemaPromise!;
}

export async function withMysqlLock<T>(name: string, action: () => Promise<T>) {
  const connection = await getPool().getConnection();
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT GET_LOCK(?, 30) AS acquired",
      [name],
    );
    if (Number(rows[0]?.acquired) !== 1) {
      throw new Error("The catalog initialization lock could not be acquired.");
    }
    return await action();
  } finally {
    try {
      await connection.query("SELECT RELEASE_LOCK(?)", [name]);
    } finally {
      connection.release();
    }
  }
}

export function databaseTimestamp(date = new Date()) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}
