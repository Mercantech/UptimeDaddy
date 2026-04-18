function statusIcon(code) {
    if (code >= 200 && code < 300) return "check circle";
    if (code >= 300 && code < 400) return "arrow right";
    return "times circle";
}

export default statusIcon;