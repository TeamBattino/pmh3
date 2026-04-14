"use client";

type SliderFieldRenderProps = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
};

export function SliderFieldRender({
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: SliderFieldRenderProps) {
  const current = typeof value === "number" ? value : min;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <span>
          {current}
          {unit ?? ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
