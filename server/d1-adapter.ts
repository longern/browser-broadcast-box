import { DB } from "https://deno.land/x/sqlite@v3.7.0/mod.ts";
import type {
  PreparedQuery,
  QueryParameter,
} from "https://deno.land/x/sqlite@v3.7.0/mod.ts";

const finalizationRegistry = new FinalizationRegistry((stmt: PreparedQuery) => {
  stmt.finalize();
});

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
    const start_time = performance.now();
    this.#stmt.allEntries(this.#params);
    const end_time = performance.now();
    return new Promise((resolve) =>
      resolve({
        results: this.#stmt.allEntries(this.#params),
        success: true,
        meta: {
          duration: end_time - start_time,
        },
      })
    );
  }

  raw() {
    return new Promise((resolve) => resolve(this.#stmt.all(this.#params)));
  }

  run() {
    return new Promise((resolve) => resolve(this.#stmt.execute(this.#params)));
  }

  first() {
    return new Promise((resolve) => resolve(this.#stmt.first(this.#params)));
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
