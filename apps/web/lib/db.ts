import { MongoClient, GridFSBucket, type Db } from "mongodb";

/** Conexión única a MongoDB (singleton en globalThis para resistir HMR). */
const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB ?? "oikestia";

type MongoCache = {
  client?: MongoClient;
  promise?: Promise<MongoClient>;
};

const cache: MongoCache = (globalThis as { __oikestiaMongo?: MongoCache }).__oikestiaMongo ?? {};

function getClient(): Promise<MongoClient> {
  if (!cache.promise) {
    cache.promise = new MongoClient(uri).connect();
  }
  return cache.promise;
}

export async function getDb(): Promise<Db> {
  if (!cache.client) {
    cache.client = await getClient();
  }
  return cache.client.db(dbName);
}

export type Collections = {
  users: ReturnType<Db["collection"]>;
  sessions: ReturnType<Db["collection"]>;
  interest_catalog: ReturnType<Db["collection"]>;
  email_tokens: ReturnType<Db["collection"]>;
  listings: ReturnType<Db["collection"]>;
  leads: ReturnType<Db["collection"]>;
  messages: ReturnType<Db["collection"]>;
  verificaciones: ReturnType<Db["collection"]>;
  rate_limits: ReturnType<Db["collection"]>;
};

export async function getCollections(): Promise<Collections> {
  const db = await getDb();
  return {
    users: db.collection("users"),
    sessions: db.collection("sessions"),
    interest_catalog: db.collection("interest_catalog"),
    email_tokens: db.collection("email_tokens"),
    listings: db.collection("listings"),
    leads: db.collection("leads"),
    messages: db.collection("messages"),
    verificaciones: db.collection("verificaciones"),
    rate_limits: db.collection("rate_limits"),
  };
}

/** Buckets de GridFS: fotos de publicaciones y documentos de verificación. */
export async function getGridFS(nombre: "fotos" | "documentos"): Promise<GridFSBucket> {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName: nombre });
}

/** Crea los índices necesarios. Idempotente; se llama al inicializar la conexión. */
export async function ensureIndexes(): Promise<void> {
  const db = await getDb();
  await db.collection("users").createIndexes([
    { key: { usernameNorm: 1 }, name: "uniq_usernameNorm", unique: true },
    { key: { emailHash: 1 }, name: "uniq_emailHash", unique: true },
  ]);
  await db.collection("sessions").createIndexes([
    { key: { tokenHash: 1 }, name: "uniq_token_hash", unique: true },
    { key: { expira: 1 }, name: "ttl_expira", expireAfterSeconds: 0 },
  ]);
  await db.collection("email_tokens").createIndexes([
    { key: { hash: 1 }, name: "uniq_hash", unique: true },
    { key: { expira: 1 }, name: "ttl_expira", expireAfterSeconds: 0 },
  ]);
  await db.collection("interest_catalog").createIndexes([
    { key: { clave: 1 }, name: "uniq_clave", unique: true },
  ]);
  await db.collection("listings").createIndexes([
    { key: { slug: 1 }, name: "uniq_slug", unique: true },
    { key: { estado: 1, actualizado: -1 }, name: "estado_actualizado" },
    { key: { owner: 1, actualizado: -1 }, name: "owner_actualizado" },
    // Geoespacial para la búsqueda en mapa. Usado solo si hay coords.
    { key: { "ubicacion.coords": "2dsphere" }, name: "geo_coords", sparse: true },
  ]);
  await db.collection("leads").createIndexes([
    { key: { listingId: 1, creado: -1 }, name: "listing_creado" },
    { key: { userId: 1, creado: -1 }, name: "user_creado", sparse: true },
  ]);
  await db.collection("messages").createIndexes([
    { key: { leadId: 1, creado: 1 }, name: "lead_creado" },
  ]);
  await db.collection("verificaciones").createIndexes([
    { key: { userId: 1, creado: -1 }, name: "user_creado" },
  ]);
  // Rate limiting persistente: TTL borra las ventanas caducadas.
  await db.collection("rate_limits").createIndexes([
    { key: { hasta: 1 }, name: "ttl_hasta", expireAfterSeconds: 0 },
    { key: { clave: 1 }, name: "clave" },
  ]);
}
