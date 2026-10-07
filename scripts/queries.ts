// Runs the key queries (C1 to C6) against the seed data and prints the results.
// Run with: npm run queries   (load the data first with: npm run seed)
import { closeDb, isDbAvailable } from "@/lib/mongodb";
import { findNearbyTrails } from "@/lib/queries/c1-nearby-trails";
import { isInsideStartRadius } from "@/lib/queries/c2-inside-start-radius";
import { getLeaderboard } from "@/lib/queries/c3-leaderboard";
import { getPersonalBest } from "@/lib/queries/c4-personal-best";
import { getAverageRatings } from "@/lib/queries/c5-average-rating";

// Circuito DH Pequia (from the seed).
const PEQUIA_SLUG = "circuito-dh-pequia";
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

  title("C2 Inside the 30 m start radius of Pequia?");
  // ~0.0009 degrees of latitude is about 100 m.
  console.log("At the start:      ", await isInsideStartRadius(PEQUIA_SLUG, PEQUIA_START.lat, PEQUIA_START.lng));
  console.log("~100 m to the south:", await isInsideStartRadius(PEQUIA_SLUG, PEQUIA_START.lat - 0.0009, PEQUIA_START.lng));

  title("C3 Leaderboard of Pequia (top 10, must NOT include the SOS or the invalid time)");
  console.table(await getLeaderboard(PEQUIA_SLUG, 10));

  title("C4 Personal best on Pequia");
  console.log("Lucas R. (3 valid descents):", await getPersonalBest(PEQUIA_SLUG, "Lucas R."));
  console.log("Dieguito (only an invalid one):", await getPersonalBest(PEQUIA_SLUG, "Dieguito"));

  title("C5 Average rating per trail");
  console.table(await getAverageRatings());
}

main()
  .catch((error) => {
    console.error("Queries failed:", error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
