import accents from "./status/stautsAccent";

const metricOptions = [
	{ key: "dnsLookupMs", text: "DNS Lookup", value: "dnsLookupMs" },
	{ key: "connectMs", text: "Connect", value: "connectMs" },
	{ key: "tlsHandshakeMs", text: "TLS Handshake", value: "tlsHandshakeMs" },
	{ key: "timeToFirstByteMs", text: "Time to First Byte", value: "timeToFirstByteMs"},
	{ key: "totalTimeMs", text: "Total Time", value: "totalTimeMs" },
];

const metricMap = {
	dnsLookupMs: "DNS Lookup",
	connectMs: "Connect",
	tlsHandshakeMs: "TLS Handshake",
	timeToFirstByteMs: "Time to First Byte",
	totalTimeMs: "Total Time",
};

const colorMap = {
	green: "#408A71",
	yellow: "#FFD700",
	red: "#DC143C",
};

const getAccentFunc = (name) => {
	switch (name) {
		case "DNS Lookup":
			return accents.dnsAccent;
		case "Connect":
			return accents.connectAccent;
		case "TLS Handshake":
			return accents.tlsAccent;
		case "Time to First Byte":
			return accents.tfbAccent;
		case "Total Time":
			return accents.ttAccent;
		default:
			return () => "green";
	}
};

export default {
	metricOptions,
	metricMap,
	colorMap,
	getAccentFunc,
};
