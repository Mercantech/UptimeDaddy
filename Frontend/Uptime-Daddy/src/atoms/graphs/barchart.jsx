import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, CartesianGrid, Tooltip } from 'recharts';
import { Segment, Form } from "semantic-ui-react";
import { useState } from 'react';
import { Dropdown, Input } from 'semantic-ui-react';
import helpers from "../../util/helpers";
const { metricOptions: metrics, metricMap, colorMap: colors, getAccentFunc } = helpers;

const BarChartMonitor = ({ data }) => {
    const { measurements } = data;
    const [selectedMetric, setSelectedMetric] = useState('totalTimeMs');
    const [numMeasurements, setNumMeasurements] = useState(5);
    const accentFunc = getAccentFunc(metricMap[selectedMetric]);
    const recentMeasurements = measurements.slice(0, numMeasurements);
    const dataPoints = recentMeasurements.map((m, i) => ({
        name: `M${i + 1}`,
        uv: m[selectedMetric] ?? 0,
        color: colors[accentFunc(m[selectedMetric] ?? 0)]
    }));


    const renderCustomBarLabel = ({ x, y, width, value }) => {
        return <text x={x + width / 2} y={y} fill="#B0E4CC" textAnchor="middle" dy={-10}>{`${value}ms`}</text>;
    };

    return (
        <Segment inverted style={{ marginTop: "2em", backgroundColor: "#091413", border: "1px solid #2f6d59" }}>
            <h3 style={{ color: "#B0E4CC", marginBottom: "0.5em" }}>Performance Metrics</h3>
            <Form inverted>
                <Form.Group widths='equal'>
                    <Form.Field>
                        <label style={{ color: "#B0E4CC" }}>Select Metric</label>
                        <Dropdown
                            placeholder='Select metric'
                            fluid
                            selection
                            options={metrics}
                            value={selectedMetric}
                            onChange={(e, { value }) => setSelectedMetric(value)}
                            style={{ backgroundColor: "#0B1D19", border: "1px solid #2f6d59", color: "#B0E4CC" }}
                        />
                    </Form.Field>
                    <Form.Field>
                        <label style={{ color: "#B0E4CC" }}>Number of Measurements</label>
                        <Input
                            type="number"
                            placeholder="Number of measurements"
                            value={numMeasurements}
                            onChange={(e, { value }) => setNumMeasurements(parseInt(value) || 5)}
                            min={1}
                            max={measurements.length}
                            style={{ backgroundColor: "#0B1D19", border: "1px solid #2f6d59", color: "#B0E4CC" }}
                            input={{ style: { backgroundColor: "#0B1D19", color: "#B0E4CC" } }}
                        />
                    </Form.Field>
                </Form.Group>
            </Form>
            <ResponsiveContainer width="100%" height={320}>
                <BarChart data={dataPoints} margin={{ top: 30, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid stroke="#2f6d59" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#B0E4CC" tick={{ fill: '#B0E4CC' }} />
                    <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft', fill: '#B0E4CC' }} stroke="#B0E4CC" tick={{ fill: '#B0E4CC' }} />
                    <Tooltip
                        cursor={false}
                        contentStyle={{ backgroundColor: '#091413', borderColor: '#2f6d59', color: '#B0E4CC' }}
                        itemStyle={{ color: '#B0E4CC' }}
                    />
                    <Bar dataKey="uv" label={renderCustomBarLabel} barSize={22} activeBar={false}>
                        {dataPoints.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </Segment>
    );
};

export default BarChartMonitor;