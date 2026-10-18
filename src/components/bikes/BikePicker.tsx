"use client";

import { Select } from "@/components/ui/Select";
import { etiquetaBici } from "@/lib/bikes/bike-label";
import type { Bici } from "@/lib/types";

// "¿Con qué bici bajás?" before a trail run or a freeride.
// With 0 or 1 bike there is nothing to choose: it renders nothing.

interface BikePickerProps {
  id: string;
  bicis: Bici[];
  /** Id of the chosen bike. */
  value: string;
  onChange: (bikeId: string) => void;
}

export function BikePicker({ id, bicis, value, onChange }: BikePickerProps) {
  if (bicis.length < 2) return null;

  const options = bicis.map((bici) => ({
    value: bici.id,
    label: bici.principal ? `${etiquetaBici(bici)} (principal)` : etiquetaBici(bici),
  }));

  return (
    <Select
      id={id}
      label="¿Con qué bici bajás?"
      options={options}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
