// Runs the key queries (C1 to C6) against the seed data and prints the results.
// Run with: npm run queries   (load the data first with: npm run seed)
import { closeDb, isDbAvailable } from "@/lib/mongodb";
import { findNearbyTrails } from "@/lib/queries/c1-nearby-trails";

// Start point of Circuito DH Pequia (from the seed).
const PEQUIA_START = { lat: -32.8959, lng: -68.89533 };

function title(text: string) {
  console.log(`\n=== ${text} ===`);
}

async function main() {
  if (!(await isDbAvailable())) {
    console.error("MongoDB is not responding. Start the MongoDB service and try again.");
    process.exitCode = 1;
    return;
  }

  title("C1 Nearby trails (10 km around Pequia start)");
  console.table(await findNearbyTrails(PEQUIA_START.lat, PEQUIA_START.lng));
}

main()
  .catch((error) => {
    console.error("Queries failed:", error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
