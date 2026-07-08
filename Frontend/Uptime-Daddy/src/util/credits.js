/** Synk: discord-worker `footerCredits` i `slash_commands.go` (kommandoen /daddy-skudud). */

export const DEV_YOUTUBE_URL = "https://youtu.be/Hbqz2iEZN10?t=248";

/** Overordnede dele af UptimeDaddy — bruges på /developers. */
export const PLATFORM_PARTS = [
	{
		id: "frontend",
		title: "Web-dashboard",
		stack: "React · Vite · Semantic UI",
		description:
			"Det du logger ind på: dashboard med overvågede sites, incident-log, dashboard-builder til offentlige boards og indstillinger for Discord-integration.",
	},
	{
		id: "api",
		title: "Backend API",
		stack: "C# · .NET · PostgreSQL · MQTT",
		description:
			"Hjertet i systemet — gemmer websites og målinger, validerer JWT-tokens, sender scan-anmodninger via MQTT og modtager resultater fra workerne.",
	},
	{
		id: "service",
		title: "Servicekonti & Discord",
		stack: "Go",
		description:
			"Håndterer login og konti samt Discord-botten med slash-kommandoer som /daddy-report og /daddy-skudud, så status kan deles direkte i serveren.",
	},
	{
		id: "worker",
		title: "HTTP-monitor",
		stack: "Ruby",
		description:
			"Background-service der henter targets fra API'et, laver periodiske HTTP-checks og sender statuskoder, svartider og favicons tilbage via MQTT.",
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
			"Daniel har bygget det meste af React-dashboardet — fra monitor-tabellen og søgning til incidents og builder — og har samtidig bidraget til Go-delen med servicekonti og Discord-worker.",
	},
	{
		slug: "kevin",
		name: "Kevin",
		github: "https://github.com/KevinNielsen00",
		roles: ["C#", "Backend API"],
		partIds: ["api"],
		tagline: ".NET API'et bag kulisserne",
		shoutout:
			"Kevin har stået for C#-backenden: websites, målinger, JWT, EF Core mod PostgreSQL og MQTT-kommunikationen der binder frontend og workerne sammen.",
	},
	{
		slug: "kim",
		name: "Kim",
		github: "https://github.com/krixzy",
		roles: ["Ruby", "HTTP-monitor"],
		partIds: ["worker"],
		tagline: "Ruby-worker der tjekker jeres sites",
		shoutout:
			"Kim har lavet Ruby HTTP-requesteren — den der faktisk pinger jeres URLs, måler svartid og rapporterer tilbage via MQTT, så dashboardet altid har friske data.",
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
			"Mathias (migs / mags) holder programmet kørende — nye features, Docker/deploy, Discord-emojis, polish på tværs af stacken og den løbende vedligeholdelse der får det hele til at hænge sammen.",
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
