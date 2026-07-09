/** Synk: discord-worker `footerCredits` i `slash_commands.go` (kommandoen /daddy-skudud). */

/** Easter egg: linket sidder diskret i overskriften "Skud ud til udviklerne" (også i Discord /daddy-skudud). */
export const DEV_YOUTUBE_URL = "https://youtu.be/Hbqz2iEZN10?t=248";

/** Fra produktrapporten (Produkt_Rapport_Uptime_Daddy.pdf, H5, afleveret 16. april 2026). */
export const REPORT_META = {
	title: "Uptime Daddy – Webbaseret Monitoreringssystem",
	delivered: "16. april 2026",
	school: "H5 Mercantec",
	originalAuthors: ["Daniel Steenberg", "Kevin Nielsen", "Kim Mortensen"],
};

export const PROJECT_VISION =
	"En brugervenlig platform hvor brugeren selv vælger hvilke hjemmesider der overvåges — og hurtigt får overblik over oppetid, svartider og historik via tabeller og grafer.";

/** Kort opsummering fra rapportens krav og arkitektur. */
export const REPORT_HIGHLIGHTS = [
	{
		title: "Microservice-arkitektur",
		text: "Frontend, backend og IoT/worker er adskilt — hvert lag med det sprog der passede bedst til opgaven (React, Go, .NET, Ruby).",
	},
	{
		title: "MQTT som nervebanen",
		text: "Mosquitto binder API, worker og preview-ping sammen. Worker-enheder kan skaleres uden at ændre API-strukturen.",
	},
	{
		title: "Sikkerhed & session",
		text: "JWT på beskyttede ruter, access- og refresh-tokens fra account-servicen, bcrypt på passwords — så dashboardet kan stå åbent uden konstant re-login.",
	},
	{
		title: "Målinger i dybden",
		text: "Ikke bare op/ned: DNS lookup, connect, TLS, time to first byte og total tid — præcis som rapporten beskriver med curl på worker-siden.",
	},
];

/** Overordnede dele af UptimeDaddy — bruges på /developers. */
export const PLATFORM_PARTS = [
	{
		id: "frontend",
		title: "Web-dashboard",
		stack: "React · Vite · Semantic UI · Recharts",
		description:
			"Det du logger ind på: dashboard med overvågede sites, preview-modal ved tilføjelse, incident-log, dashboard-builder og Discord-indstillinger.",
		reportNote:
			"I rapporten: React med Atomic Design (atoms/molecules), Semantic UI til komponenter og Recharts til grafer — preview-ping før en site gemmes.",
	},
	{
		id: "api",
		title: "Backend API",
		stack: "C# · .NET · PostgreSQL · MQTT",
		description:
			"Hjertet i systemet — gemmer websites og målinger, validerer JWT, sender scan-anmodninger via MQTT og modtager resultater fra workerne.",
		reportNote:
			"Kevin beskrev lagdelt ASP.NET Core: Controllers → Services → EF Core. Account → Website → Measurement. Preview-ping med 10 sek. timeout og MQTT-topics som uptime/measurements.",
	},
	{
		id: "service",
		title: "Servicekonti & Discord",
		stack: "Go",
		description:
			"Håndterer login, Mercantec OAuth og konti samt Discord-botten med slash-kommandoer, så status kan deles direkte i serveren.",
		reportNote:
			"Daniels Go-service i rapporten: register/login/refresh, GORM mod PostgreSQL, bcrypt på passwords og JWT med access + refresh token.",
	},
	{
		id: "worker",
		title: "HTTP-monitor",
		stack: "Ruby · Docker",
		description:
			"Background-service der henter targets fra API'et, laver periodiske HTTP-checks og sender statuskoder, svartider og favicons tilbage via MQTT.",
		reportNote:
			"Kims Ruby HTTP Requester på Raspberry Pi: Faraday til API-kald, curl til præcise ping-målinger, threads + MQTT state/queue — inkl. quick ping til frontend-preview.",
	},
	{
		id: "infra",
		title: "Infrastruktur & drift",
		stack: "Docker · Mosquitto · PostgreSQL · Ubuntu",
		description:
			"Server, message broker, database og netværksadgang — det der får Pi, API og worker til at tale sammen stabilt.",
		reportNote:
			"Kim dokumenterede Ubuntu-server, Mosquitto som systemd-service, PostgreSQL + pgAdmin i Docker, SSH-nøgler, autossh-tunnel til Pi og port-forward til MQTT/API.",
	},
];

export const DEVELOPERS = [
	{
		slug: "daniel",
		name: "Daniel",
		github: "https://github.com/Danielsteenberg-bot",
		roles: ["Frontend", "Go"],
		partIds: ["frontend", "service"],
		tagline: "Weboplevelsen og Go-services",
		shoutout:
			"Daniel har bygget det meste af React-dashboardet — Atomic Design, monitor-tabellen, preview-flow og grafer — og Go account-servicen med login, JWT og refresh tokens.",
		reportContribution: [
			"Frontend i React med Semantic UI og Recharts; struktur efter Atomic Design så komponenter kan genbruges.",
			"Go account-service: cmd/server, handlers pr. rute, GORM + bcrypt, access- og refresh-token til lange monitoreringssessioner.",
		],
	},
	{
		slug: "kevin",
		name: "Kevin",
		github: "https://github.com/KevinNielsen00",
		roles: ["C#", "Backend API"],
		partIds: ["api"],
		tagline: ".NET API'et bag kulisserne",
		shoutout:
			"Kevin har stået for C#-backenden: websites, målinger, JWT-validering, EF Core mod PostgreSQL og MQTT publish/subscribe der binder det hele.",
		reportContribution: [
			"ASP.NET Core API med Controllers, DTO'er, Services og healthchecks mod database og MQTT.",
			"PingPreviewService og MqttService — preview før oprettelse, målinger ind via uptime/measurements, projektioner for performance.",
		],
	},
	{
		slug: "kim",
		name: "Kim",
		github: "https://github.com/krixzy",
		roles: ["Ruby", "HTTP-monitor", "Infrastruktur"],
		partIds: ["worker", "infra"],
		tagline: "Ruby-worker, MQTT og serveropsætning",
		shoutout:
			"Kim har lavet Ruby HTTP-requesteren på Pi'en, Mosquitto-opsætningen, database/server-infrastrukturen og SSH-tunnellen der holder worker online.",
		reportContribution: [
			"HTTP Requester i Ruby: bootloader, MQTT broker-klasse med threads, PageHandler der deduplicerer ping på samme URL.",
			"Server (Ubuntu), Mosquitto, PostgreSQL Docker, Raspberry Pi som IoT-worker, autossh systemd-service til stabil tunnel.",
		],
	},
	{
		slug: "mathias",
		name: "Mathias",
		aliases: ["migs", "mags"],
		github: null,
		roles: ["Udvidelser", "Vedligehold"],
		partIds: ["frontend", "api", "service", "worker"],
		tagline: "Udvidelser og vedligehold af hele platformen",
		shoutout:
			"Mathias (migs / mags) holder programmet kørende efter H5 — Discord-integration, incidents, dashboard-builder, deploy/Docker og polish på tværs af stacken.",
		reportContribution: [
			"Ikke med i den oprindelige afleveringsrapport — har siden udvidet platformen med bl.a. Discord-worker, incident-log og produktions-deploy.",
		],
	},
];

/** Kort liste til footer og Discord (navn + GitHub). */
export const FOOTER_CREDITS = DEVELOPERS.filter((d) => d.github).map(({ name, github }) => ({
	name,
	href: github,
}));

export function getDeveloperBySlug(slug) {
	return DEVELOPERS.find((d) => d.slug === slug) ?? null;
}
