import { DB } from "https://deno.land/x/sqlite@v3.7.0/mod.ts";
import type {
  PreparedQuery,
  QueryParameter,
} from "https://deno.land/x/sqlite@v3.7.0/mod.ts";

class D1PreparedStatement {
  #stmt: PreparedQuery;
  #params?: QueryParameter[];

  constructor(db: DB, statement: string) {
    this.#stmt = db.prepareQuery(statement);
    this.#params = undefined;
  }

  bind(...args: QueryParameter[]) {
    this.#params = args;
    return this;
  }

  all() {
    return this.#stmt.allEntries(this.#params);
  }

  raw() {
    return this.#stmt.all(this.#params);
  }

  run() {
    return this.#stmt.execute(this.#params);
  }

  first() {
    return this.#stmt.first(this.#params);
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
