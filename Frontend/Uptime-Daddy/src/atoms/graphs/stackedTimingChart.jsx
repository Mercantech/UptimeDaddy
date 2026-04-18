import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Segment, Form, Input } from "semantic-ui-react";
import { useState, useMemo } from "react";
import { measurementToStackSegments } from "../../util/measurementTimingSegments.js";

export { measurementToStackSegments };

const STACK_META = [
  { key: "dns", label: "DNS-opslag", fill: "#408A71" },
  { key: "tcp", label: "TCP-forbindelse", fill: "#4c8ec9" },
  { key: "tls", label: "TLS-handtryk", fill: "#d9a441" },
  { key: "wait", label: "Ventetid (server)", fill: "#9b59b6" },
  { key: "download", label: "Download", fill: "#2f6d59" },
];

function StackedTimingChart({ data }) {
  const { measurements = [] } = data ?? {};
  /** null = felt midlertidigt tomt (backspace); ellers tal som før. */
  const [numMeasurements, setNumMeasurements] = useState(5);

  const effectiveRaw =
    numMeasurements === null ? 5 : Math.max(1, numMeasurements || 1);

  const cappedNum = Math.min(
    effectiveRaw,
    Math.max(1, measurements.length)
  );

  const chartData = useMemo(() => {
    return measurements.slice(0, cappedNum).map((m, i) => {
      const seg = measurementToStackSegments(m);
      return {
        name: `Måling ${i + 1}`,
        ...seg,
        total: seg.dns + seg.tcp + seg.tls + seg.wait + seg.download,
      };
    });
  }, [measurements, cappedNum]);

  const renderTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    if (!row) return null;
    return (
      <div
        style={{
          backgroundColor: "#091413",
          border: "1px solid #2f6d59",
          borderRadius: 6,
          padding: "10px 12px",
          color: "#B0E4CC",
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{row.name}</div>
        {STACK_META.map(({ key, label, fill }) => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 4 }}>
            <span style={{ color: fill }}>{label}</span>
            <span>{Number(row[key] ?? 0).toFixed(2)} ms</span>
          </div>
        ))}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #2f6d59", fontWeight: 600 }}>
          Total: {Number(row.total ?? 0).toFixed(2)} ms
        </div>
      </div>
    );
  };

  if (!measurements.length) {
    return (
      <Segment inverted style={{ marginTop: "2em", backgroundColor: "#091413", border: "1px solid #2f6d59" }}>
        <h3 style={{ color: "#B0E4CC" }}>Responstid (stablet)</h3>
        <p style={{ color: "#8aa89c" }}>Ingen målinger endnu — vent på næste ping.</p>
      </Segment>
    );
  }

  return (
    <Segment inverted style={{ marginTop: "2em", backgroundColor: "#091413", border: "1px solid #2f6d59" }}>
      <h3 style={{ color: "#B0E4CC", marginBottom: "0.25em" }}>Responstid (stablet pr. fase)</h3>
      <p style={{ color: "#8aa89c", fontSize: "0.9rem", marginBottom: "1em", maxWidth: "52rem" }}>
        Hver søjle er én måling. Farverne viser faserne fra curl (DNS → TCP → TLS → ventetid til første byte → download).
        Værdierne er afledt af kumulative tidsstempler, så højden svarer til den samlede responstid.
      </p>
      <Form inverted>
        <Form.Field style={{ maxWidth: 280 }}>
          <label style={{ color: "#B0E4CC" }}>Antal seneste målinger</label>
          <Input
            type="number"
            value={numMeasurements === null ? "" : cappedNum}
            onChange={(e, { value }) => {
              if (value === "") {
                setNumMeasurements(null);
                return;
              }
              const n = parseInt(value, 10);
              if (Number.isFinite(n)) setNumMeasurements(n);
            }}
            min={1}
            max={measurements.length}
            style={{ backgroundColor: "#0B1D19", border: "1px solid #2f6d59", color: "#B0E4CC" }}
            input={{ style: { backgroundColor: "#0B1D19", color: "#B0E4CC" } }}
          />
        </Form.Field>
      </Form>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={chartData} margin={{ top: 16, right: 12, left: 4, bottom: 8 }}>
          <CartesianGrid stroke="#2f6d59" strokeDasharray="3 3" />
          <XAxis dataKey="name" stroke="#B0E4CC" tick={{ fill: "#B0E4CC", fontSize: 12 }} />
          <YAxis
            label={{ value: "ms", angle: 0, position: "insideTopLeft", fill: "#B0E4CC", offset: 10 }}
            stroke="#B0E4CC"
            tick={{ fill: "#B0E4CC" }}
          />
          <Tooltip content={renderTooltip} cursor={{ fill: "#1a2e28" }} />
          <Legend
            wrapperStyle={{ color: "#B0E4CC", paddingTop: 12 }}
            formatter={(value) => <span style={{ color: "#B0E4CC" }}>{value}</span>}
          />
          {STACK_META.map(({ key, label, fill }) => (
            <Bar key={key} dataKey={key} name={label} stackId="timing" fill={fill} barSize={28} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Segment>
  );
}

export default StackedTimingChart;
