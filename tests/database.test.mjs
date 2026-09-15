import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("PostgreSQL migration, payment lifecycle, completion, refunds and immutable audit", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);`,
    );
    const sql = await readFile(
      new URL(
        "../supabase/migrations/202609130001_parish.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(sql.replace("create extension if not exists pgcrypto;", ""));
    for (const migration of (
      await readdir(new URL("../supabase/migrations/", import.meta.url))
    )
      .filter((f) => f.endsWith(".sql") && !f.includes("0001_"))
      .sort())
      await db.exec(
        await readFile(
          new URL(`../supabase/migrations/${migration}`, import.meta.url),
          "utf8",
        ),
      );
    const u = crypto.randomUUID(),
      c = crypto.randomUUID(),
      l = crypto.randomUUID(),
      p = crypto.randomUUID();
    await db.query("insert into auth.users values($1,$2)", [
      u,
      JSON.stringify({ full_name: "María Guadalupe López" }),
    ]);
    await db.query("select admin_write($1,$2,$3,$4,$5)", [
      u,
      "courses",
      "insert",
      null,
      JSON.stringify({
        id: c,
        title: "Bautismo",
        description: "Curso",
        sacrament: "Bautismo",
        price_cents: 2500,
      }),
    ]);
    await db.query(
      "insert into lessons(id,course_id,title,position,question,options,correct_answer) values($1,$2,$3,0,$4,$5,1)",
      [l, c, "Lección", "Pregunta", JSON.stringify(["No", "Sí"])],
    );
    await db.query(
      "insert into payments(id,user_id,course_id,amount_cents,stripe_session_id) values($1,$2,$3,2500,'cs_test')",
      [p, u, c],
    );
    const count = async (table) =>
      Number((await db.query(`select count(*) as n from ${table}`)).rows[0].n);
    assert.equal(await count("enrollments"), 0);
    await assert.rejects(() =>
      db.query("select complete_lesson($1,$2,1)", [u, l]),
    );
    const object = {
      id: "cs_test",
      payment_status: "paid",
      metadata: { payment_id: p },
      currency: "usd",
      amount_subtotal: 2500,
      payment_intent: "pi_test",
    };
    await db.query("select apply_stripe_event($1,$2,$3)", [
      "evt_unpaid",
      "checkout.session.completed",
      JSON.stringify({ ...object, payment_status: "unpaid" }),
    ]);
    assert.equal(await count("enrollments"), 0);
    await db.query("select apply_stripe_event($1,$2,$3)", [
      "evt_wrong",
      "checkout.session.completed",
      JSON.stringify({ ...object, amount_subtotal: 1 }),
    ]);
    assert.equal(await count("enrollments"), 0);
    await db.query("select apply_stripe_event($1,$2,$3)", [
      "evt_ok",
      "checkout.session.completed",
      JSON.stringify(object),
    ]);
    assert.equal(await count("enrollments"), 1);
    await assert.rejects(() =>
      db.query("update lessons set title=$1 where id=$2", ["Changed", l]),
    );
    await db.query("select apply_stripe_event($1,$2,$3)", [
      "evt_ok",
      "checkout.session.completed",
      JSON.stringify(object),
    ]);
    assert.equal(await count("enrollments"), 1);
    await assert.rejects(() =>
      db.query("select complete_lesson($1,$2,0)", [u, l]),
    );
    assert.equal(await count("certificates"), 0);
    await db.query("select complete_lesson($1,$2,1)", [u, l]);
    assert.equal(await count("certificates"), 1);
    await db.query("select complete_lesson($1,$2,1)", [u, l]);
    assert.equal(await count("certificates"), 1);
    await db.query("select apply_stripe_event($1,$2,$3)", [
      "evt_refund",
      "charge.refunded",
      JSON.stringify({ payment_intent: "pi_test", amount_refunded: 2500 }),
    ]);
    assert.equal(
      (await db.query("select status from enrollments")).rows[0].status,
      "revoked",
    );
    assert.equal(
      (await db.query("select revoked from certificates")).rows[0].revoked,
      true,
    );
    await db.query("select apply_stripe_event($1,$2,$3)", [
      "evt_late",
      "checkout.session.completed",
      JSON.stringify(object),
    ]);
    assert.equal(
      (await db.query("select status from payments")).rows[0].status,
      "refunded",
    );
    await assert.rejects(() =>
      db.query("select complete_lesson($1,$2,1)", [u, l]),
    );
    await assert.rejects(() => db.exec("delete from audit_logs"));
    await assert.rejects(() => db.exec("truncate audit_logs"));
    assert.ok(
      (
        await db.query(
          "select actor_id from audit_logs where entity=$1 and actor_id=$2",
          ["courses", u],
        )
      ).rows.length > 0,
    );
    await db.exec("set role authenticated");
    await assert.rejects(() => db.exec("select * from payments"));
    await assert.rejects(() =>
      db.query("select apply_stripe_event($1,$2,$3)", [
        "evt_hack",
        "checkout.session.completed",
        JSON.stringify(object),
      ]),
    );
    await db.exec("reset role");
    const p2 = crypto.randomUUID();
    await db.query(
      "insert into payments(id,user_id,course_id,amount_cents,stripe_session_id) values($1,$2,$3,2500,'cs_expired')",
      [p2, u, c],
    );
    await db.query("select apply_stripe_event($1,$2,$3)", [
      "evt_expired",
      "checkout.session.expired",
      JSON.stringify({ id: "cs_expired" }),
    ]);
    assert.equal(
      (await db.query("select status from payments where id=$1", [p2])).rows[0]
        .status,
      "failed",
    );
  } finally {
    await db.close();
  }
});
