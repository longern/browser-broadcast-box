import { DB, PreparedQuery, QueryParameter, RowObject } from "sqlite";

const finalizationRegistry = new FinalizationRegistry((stmt: PreparedQuery) => {
  stmt.finalize();
});

function promiseFn<T>(fn: () => T) {
  return new Promise<T>((resolve, reject) => {
    try {
      const result = fn();
      resolve(result);
    } catch (e) {
      reject(e);
    }
  });
}

export declare interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  // deno-lint-ignore no-explicit-any
  meta: any;
}

export class D1PreparedStatement {
  #stmt: PreparedQuery;
  #params?: QueryParameter[];

  constructor(db: DB, statement: string) {
    this.#stmt = db.prepareQuery(statement);
    this.#params = undefined;
    finalizationRegistry.register(this, this.#stmt);
  }

  bind(...args: QueryParameter[]) {
    this.#params = args;
    return this;
  }

  all() {
    return promiseFn(() => {
      const start_time = performance.now();
      const results = this.#stmt.allEntries(this.#params);
      const end_time = performance.now();
      return {
        results,
        success: true,
        meta: { duration: end_time - start_time },
      } as D1Result<typeof results[number]>;
    });
  }

  raw() {
    return promiseFn(() => this.#stmt.all(this.#params));
  }

  run() {
    return promiseFn(() => {
      const start_time = performance.now();
      this.#stmt.execute(this.#params);
      const end_time = performance.now();
      return {
        results: undefined,
        success: true,
        meta: { duration: end_time - start_time },
      } as D1Result;
    });
  }

  first(column: string): Promise<unknown | null>;
  first(column?: undefined): Promise<RowObject | null>;
  first(column?: string) {
    return promiseFn(() => {
      const obj = this.#stmt.firstEntry(this.#params);
      if (!obj) return null;
      if (column) {
        if (column in obj) return obj[column];
        throw new Error(`Column ${column} not found`);
      }
      return obj;
    });
  }
}

export class D1Database {
  #db: DB;

  constructor(path?: string) {
    this.#db = new DB(path);
  }

  prepare(sql: string) {
    return new D1PreparedStatement(this.#db, sql);
  }

  exec(sql: string) {
    return new Promise((resolve) => resolve(this.#db.query(sql)));
  }
}
