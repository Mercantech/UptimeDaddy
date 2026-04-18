function statusAccent(code) {
    if (code >= 200 && code < 300) return "green";
    if (code >= 300 && code < 400) return "yellow";
    return "red";
}

function dnsAccent(dnsTime) {
    if (dnsTime < 50) return "green";
    if (dnsTime < 150) return "yellow";
    return "red";
}

function connectAccent(connectTime) {
    if (connectTime < 100) return "green";
    if (connectTime < 300) return "yellow";
    return "red";
}

function tlsAccent(tlsTime) {
    if (tlsTime < 100) return "green";
    if (tlsTime < 300) return "yellow";
    return "red";
}

function tfbAccent(tfbTime) {
    if (tfbTime < 200) return "green";
    if (tfbTime < 500) return "yellow";
    return "red";
}

function ttAccent(ttMS) {
    if (ttMS < 300) return "green";
    if (ttMS < 1000) return "yellow";
    return "red";
}

export default {
    statusAccent,
    dnsAccent,
    connectAccent,
    tlsAccent,
    tfbAccent,
    ttAccent
};