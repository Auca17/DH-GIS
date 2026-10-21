// Measures how much the indexes help: runs the same query twice and compares
// explain("executionStats"):
//   - WITHOUT index: hint({ $natural: 1 }) forces a full collection scan (COLLSCAN).
//   - WITH index: MongoDB picks the index by itself (IXSCAN).
// Nothing is dropped or created: the database stays exactly as it was.
//
// Run with: npm run explain   (local database only, see LOCAL_URI below)
// It prints a table and writes docs/explain.md (in Spanish, for the team).
//
// Compass equivalent (collection → Explain Plan tab, or mongosh):
//   db.bajadas.find({ senderoId: ObjectId("..."), estado: "completada", valida: true })
//     .sort({ duracion: 1 }).limit(10).hint({ $natural: 1 }).explain("executionStats")
import { writeFileSync } from "node:fs";
import { MongoClient, type Document } from "mongodb";

// Measurements are for the course: always the local database, never Atlas.
const LOCAL_URI = "mongodb://127.0.0.1:27017/dh";

const PEQUIA_SLUG = "circuito-dh-pequia";
const PEQUIA_START = { lat: -32.8959, lng: -68.89533 };

interface Measure {
  query: string;
  mode: "without index" | "with index";
  plan: string;
  docsExamined: number;
  keysExamined: number;
  returned: number;
  timeMs: number;
}

/** Finds the first object with `executionStats` anywhere in an explain answer. */
function findExecutionStats(explain: Document): Document | null {
  if (explain.executionStats) return explain.executionStats as Document;
  for (const value of Object.values(explain)) {
    if (value && typeof value === "object") {
      const found = findExecutionStats(value as Document);
      if (found) return found;
    }
  }
  return null;
}

/** Collects the stage names of a plan, e.g. "LIMIT > FETCH > IXSCAN". */
function planStages(stage: Document | undefined): string[] {
  if (!stage) return [];
  const name = String(stage.stage ?? "?");
  const child = (stage.inputStage ?? stage.inputStages?.[0]) as Document | undefined;
  return [name, ...planStages(child)];
}

function toMeasure(query: string, mode: Measure["mode"], explain: Document): Measure {
  const stats = findExecutionStats(explain);
  if (!stats) throw new Error(`No executionStats in the explain of ${query}`);
  return {
    query,
    mode,
    plan: planStages(stats.executionStages as Document).join(" > "),
    docsExamined: stats.totalDocsExamined as number,
    keysExamined: stats.totalKeysExamined as number,
    returned: stats.nReturned as number,
    timeMs: stats.executionTimeMillis as number,
  };
}

async function main() {
  const client = new MongoClient(LOCAL_URI, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.db().command({ ping: 1 });
  } catch {
    console.error("Local MongoDB is not responding. Start the MongoDB service and try again.");
    process.exitCode = 1;
    return;
  }

  const db = client.db();
  const trail = await db.collection("senderos").findOne({ codigo: PEQUIA_SLUG }, { projection: { _id: 1 } });
  const user = await db.collection("usuarios").findOne({ nombre: "Lucas R." }, { projection: { _id: 1 } });
  if (!trail || !user) {
    console.error('No seed data. Run: MONGODB_URI="mongodb://127.0.0.1:27017/dh" npx tsx scripts/seed.ts');
    process.exitCode = 1;
    await client.close();
    return;
  }

  // The filter + sort part of each query (the stages that can use an index).
  // C3 leaderboard: index { senderoId, estado, valida, duracion }.
  const c3Filter = { senderoId: trail._id, estado: "completada", valida: true };
  // C4 personal best: same index (prefix senderoId, estado, valida), then filters usuarioId.
  const c4Filter = { senderoId: trail._id, usuarioId: user._id, estado: "completada", valida: true };
  // C9 reviews of a trail: index { senderoId, fecha: -1 }.
  const c9Filter = { senderoId: trail._id };

  const descents = db.collection("bajadas");
  const reviews = db.collection("resenas");
  const measures: Measure[] = [];

  for (const mode of ["without index", "with index"] as const) {
    // hint({ $natural: 1 }) = "read the collection in disk order", which means no index.
    const hint = mode === "without index" ? { hint: { $natural: 1 } } : {};

    const c3 = await descents.find(c3Filter, hint).sort({ duracion: 1 }).limit(10).explain("executionStats");
    measures.push(toMeasure("C3 leaderboard", mode, c3));

    const c4 = await descents.find(c4Filter, hint).explain("executionStats");
    measures.push(toMeasure("C4 personal best", mode, c4));

    const c9 = await reviews.find(c9Filter, hint).sort({ fecha: -1 }).explain("executionStats");
    measures.push(toMeasure("C9 reviews", mode, c9));
  }

  // C1 ($geoNear) only runs on its 2dsphere index: MongoDB does not even allow forcing a scan.
  let c1Note: string;
  try {
    await db
      .collection("senderos")
      .aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [PEQUIA_START.lng, PEQUIA_START.lat] },
            distanceField: "distanciaM",
            maxDistance: 10_000,
          },
        },
      ], { hint: { $natural: 1 } })
      .toArray();
    c1Note = "C1 corrió con hint({ $natural: 1 }) (no debería pasar).";
  } catch (error) {
    c1Note = `C1 ($geoNear) con hint({ $natural: 1 }) es rechazada por MongoDB: "${(error as Error).message}"`;
  }

  await client.close();

  console.table(measures);
  console.log(c1Note);
  writeFileSync("docs/explain.md", toMarkdown(measures, c1Note));
  console.log("Written: docs/explain.md");
}

// The report is in Spanish: the team studies with it (like docs/consultas-mongo.md).
function toMarkdown(measures: Measure[], c1Note: string): string {
  const modo = { "without index": "sin índice", "with index": "con índice" };
  const rows = measures
    .map(
      (m) =>
        `| ${m.query} | ${modo[m.mode]} | \`${m.plan}\` | ${m.docsExamined} | ${m.keysExamined} | ${m.returned} | ${m.timeMs} |`,
    )
    .join("\n");
  // Date in Mendoza time, YYYY-MM-DD ("sv-SE" formats dates that way).
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Mendoza" });
  return `# Índices: explain("executionStats") sin y con índice

Generado con \`npm run explain\` sobre la base local (${today}).
"Sin índice" obliga a leer toda la colección con \`hint({ $natural: 1 })\`; "con índice" deja que MongoDB elija.

| Consulta | Modo | Plan | Docs leídos | Claves leídas | Devueltos | Tiempo (ms) |
|---|---|---|---|---|---|---|
${rows}

## Cómo leerlo

- **COLLSCAN**: MongoDB leyó todos los documentos de la colección para encontrar los que sirven.
- **IXSCAN**: MongoDB recorrió el índice y leyó solo los documentos que necesitaba.
- Cuanto más se parecen "docs leídos" y "devueltos", mejor le queda el índice a la consulta.
- El tiempo cambia de una corrida a otra (caché, otros programas). Lo que hay que comparar es "docs leídos", que no cambia.
- C4 usa el índice del ranking solo para \`senderoId, estado, valida\`: igual lee todas las bajadas válidas del sendero
  y después se queda con las de ese rider. Un índice \`{ usuarioId: 1, senderoId: 1 }\` le quedaría mejor.

## C1 (geoespacial)

${c1Note}

\`$geoNear\` necesita el índice 2dsphere de \`senderos.inicio\`: no existe una versión "sin índice" para comparar.
`;
}

main().catch((error) => {
  console.error("Explain failed:", error);
  process.exitCode = 1;
});
