import { DB, PreparedQuery } from "https://deno.land/x/sqlite@v3.7.0/mod.ts";
import type { QueryParameter } from "https://deno.land/x/sqlite@v3.7.0/mod.ts";

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

class D1PreparedStatement {
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
      };
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
        results: null,
        success: true,
        meta: { duration: end_time - start_time },
      };
    });
  }

  first() {
    return promiseFn(() => this.#stmt.first(this.#params));
  }
}

export class D1Adapter {
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
