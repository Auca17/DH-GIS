"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

// The bike fields, shared by the sign-up screen and "Agregar bici" in the profile.
// Inputs keep text (what the person types); `biciParaEnviar` turns it into the
// numbers the API expects. The server validates everything again.

export interface BikeFormValues {
  type: string;
  brand: string;
  model: string;
  year: string;
  wheelSize: string;
  travelFrontMm: string;
  travelRearMm: string;
}

export const BIKE_FORM_EMPTY: BikeFormValues = {
  type: "DH",
  brand: "",
  model: "",
  year: "",
  wheelSize: "29",
  travelFrontMm: "",
  travelRearMm: "",
};

/** The body the API expects: numbers as numbers (an empty field becomes NaN and the server rejects it). */
export function biciParaEnviar(values: BikeFormValues) {
  return {
    type: values.type,
    brand: values.brand,
    model: values.model,
    year: Number(values.year),
    wheelSize: values.wheelSize,
    travelFrontMm: Number(values.travelFrontMm),
    travelRearMm: Number(values.travelRearMm),
  };
}

const TYPE_OPTIONS = [
  { value: "DH", label: "DH" },
  { value: "Enduro", label: "Enduro" },
  { value: "Trail", label: "Trail" },
];

const WHEEL_OPTIONS = [
  { value: "29", label: "29" },
  { value: "27.5", label: "27.5" },
  { value: "mullet", label: "Mullet (29 adelante, 27.5 atrás)" },
];

interface BikeFieldsProps {
  /** Prefix for the input ids, so two forms on one page do not repeat ids. */
  idPrefix: string;
  values: BikeFormValues;
  onChange: (values: BikeFormValues) => void;
}

export function BikeFields({ idPrefix, values, onChange }: BikeFieldsProps) {
  function set(field: keyof BikeFormValues, value: string) {
    onChange({ ...values, [field]: value });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Select
        id={`${idPrefix}-type`}
        label="Tipo"
        options={TYPE_OPTIONS}
        value={values.type}
        onChange={(e) => set("type", e.target.value)}
      />
      <Select
        id={`${idPrefix}-wheel`}
        label="Rodado"
        options={WHEEL_OPTIONS}
        value={values.wheelSize}
        onChange={(e) => set("wheelSize", e.target.value)}
      />
      <Input
        id={`${idPrefix}-brand`}
        label="Marca"
        placeholder="ej. Specialized"
        maxLength={40}
        required
        value={values.brand}
        onChange={(e) => set("brand", e.target.value)}
      />
      <Input
        id={`${idPrefix}-model`}
        label="Modelo"
        placeholder="ej. Demo"
        maxLength={60}
        required
        value={values.model}
        onChange={(e) => set("model", e.target.value)}
      />
      <Input
        id={`${idPrefix}-year`}
        label="Año"
        type="number"
        inputMode="numeric"
        placeholder="ej. 2024"
        required
        value={values.year}
        onChange={(e) => set("year", e.target.value)}
      />
      <Input
        id={`${idPrefix}-front`}
        label="Recorrido delantero (mm)"
        type="number"
        inputMode="numeric"
        placeholder="ej. 200"
        required
        value={values.travelFrontMm}
        onChange={(e) => set("travelFrontMm", e.target.value)}
      />
      <Input
        id={`${idPrefix}-rear`}
        label="Recorrido trasero (mm)"
        type="number"
        inputMode="numeric"
        placeholder="0 si es rígida"
        helperText="Poné 0 si no tiene suspensión trasera."
        required
        value={values.travelRearMm}
        onChange={(e) => set("travelRearMm", e.target.value)}
      />
    </div>
  );
}
