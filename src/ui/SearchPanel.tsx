import React from 'react';
import { ORE_CATALOG } from './oreCatalog';

export interface SearchFormValues {
  edition: 'java' | 'bedrock';
  version: string;
  seedInput: string;
  dimension: 'overworld' | 'nether' | 'end';
  x: string;
  z: string;
  radius: number;
  oreId: string;
}

export interface SearchPanelProps {
  values: SearchFormValues;
  onChange: (values: SearchFormValues) => void;
  onSubmit: () => void;
  isSearching: boolean;
  error: string | null;
}

const RADIUS_PRESETS = [100, 500, 1000, 2500, 5000];

export function SearchPanel({ values, onChange, onSubmit, isSearching, error }: SearchPanelProps) {
  const set = <K extends keyof SearchFormValues>(key: K, value: SearchFormValues[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <div
      style={{
        width: 300,
        flexShrink: 0,
        background: 'var(--stone)',
        borderRight: '1px solid var(--hairline)',
        padding: 'var(--space-4)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, margin: 0, letterSpacing: 0.2 }}>Find ore</h2>
        <p style={{ fontSize: 12, color: 'var(--torch-muted)', margin: '4px 0 0' }}>
          Calculated from your world seed — no online API, runs on-device.
        </p>
      </div>

      <Field label="Edition">
        <SegmentedControl
          options={[
            { value: 'java', label: 'Java' },
            { value: 'bedrock', label: 'Bedrock', disabled: true },
          ]}
          value={values.edition}
          onChange={(v) => set('edition', v as SearchFormValues['edition'])}
        />
      </Field>

      <Field label="Version">
        <Select value={values.version} onChange={(v) => set('version', v)}>
          <option value="26.2">26.2 (current)</option>
          <option value="26.1">26.1</option>
        </Select>
      </Field>

      <Field label="World seed">
        <input
          className="mono"
          type="text"
          value={values.seedInput}
          onChange={(e) => set('seedInput', e.target.value)}
          placeholder="e.g. -4172144997902289642 or a word"
          style={inputStyle}
        />
      </Field>

      <Field label="Dimension">
        <SegmentedControl
          options={[
            { value: 'overworld', label: 'Overworld' },
            { value: 'nether', label: 'Nether', disabled: true },
            { value: 'end', label: 'End', disabled: true },
          ]}
          value={values.dimension}
          onChange={(v) => set('dimension', v as SearchFormValues['dimension'])}
        />
      </Field>

      <Field label="Your position">
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <LabeledNumberInput label="X" value={values.x} onChange={(v) => set('x', v)} />
          <LabeledNumberInput label="Z" value={values.z} onChange={(v) => set('z', v)} />
        </div>
      </Field>

      <Field label="Find">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {ORE_CATALOG.map((ore) => {
            const isSelected = values.oreId === ore.id;
            const isAvailable = ore.engineSupport !== 'not-yet-wired';
            return (
              <button
                key={ore.id}
                type="button"
                disabled={!isAvailable}
                title={isAvailable ? ore.displayName : `${ore.displayName} — engine not wired yet`}
                onClick={() => set('oreId', ore.id)}
                style={{
                  aspectRatio: '1',
                  borderRadius: 'var(--radius-sm)',
                  border: isSelected ? `1.5px solid ${ore.color}` : '1px solid var(--hairline)',
                  background: isSelected ? 'var(--stone-hover)' : 'var(--stone-raised)',
                  fontSize: 18,
                  opacity: isAvailable ? 1 : 0.3,
                  cursor: isAvailable ? 'pointer' : 'not-allowed',
                  position: 'relative',
                }}
              >
                {ore.icon}
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: 'var(--torch-dim)', marginTop: 6 }}>
          Only diamond is wired to a calculation path right now — others light up as the engine grows.
        </p>
      </Field>

      <Field label={`Search radius: ${values.radius.toLocaleString()} blocks`}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {RADIUS_PRESETS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => set('radius', r)}
              style={{
                ...pillStyle,
                borderColor: values.radius === r ? 'var(--accent)' : 'var(--hairline)',
                color: values.radius === r ? 'var(--accent)' : 'var(--torch-muted)',
              }}
            >
              {r >= 1000 ? `${r / 1000}k` : r}
            </button>
          ))}
        </div>
        {values.radius >= 2500 && (
          <p style={{ fontSize: 11, color: 'var(--ore-gold)', marginTop: 6 }}>
            Large radius — this scans many chunks and may take a moment.
          </p>
        )}
      </Field>

      {error && (
        <div style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(232,72,58,0.1)', padding: 8, borderRadius: 6 }}>
          {error}
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={isSearching}
        style={{
          background: 'var(--accent)',
          color: '#08171a',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 14,
          cursor: isSearching ? 'default' : 'pointer',
          opacity: isSearching ? 0.6 : 1,
        }}
      >
        {isSearching ? 'Searching…' : '🔍 Find nearby ores'}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--torch-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function LabeledNumberInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <span style={{ position: 'absolute', left: 8, top: 8, fontSize: 11, color: 'var(--torch-dim)' }}>{label}</span>
      <input
        className="mono"
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, paddingLeft: 22 }}
      />
    </div>
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
      {children}
    </select>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; disabled?: boolean }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={opt.disabled}
          onClick={() => onChange(opt.value)}
          title={opt.disabled ? `${opt.label} — not supported yet` : undefined}
          style={{
            flex: 1,
            padding: '8px 0',
            border: 'none',
            background: value === opt.value ? 'var(--accent)' : 'var(--stone-raised)',
            color: value === opt.value ? '#08171a' : opt.disabled ? 'var(--torch-dim)' : 'var(--torch)',
            fontSize: 12,
            fontWeight: 600,
            cursor: opt.disabled ? 'not-allowed' : 'pointer',
            opacity: opt.disabled ? 0.5 : 1,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--stone-raised)',
  border: '1px solid var(--hairline)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--torch)',
  padding: '8px 10px',
  fontSize: 13,
  width: '100%',
};

const pillStyle: React.CSSProperties = {
  background: 'var(--stone-raised)',
  border: '1px solid var(--hairline)',
  borderRadius: 999,
  padding: '4px 10px',
  fontSize: 12,
  cursor: 'pointer',
};
