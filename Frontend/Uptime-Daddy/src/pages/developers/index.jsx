import { Link } from "react-router-dom";
import { Container, Header, Segment } from "semantic-ui-react";
import Navbar from "../../molecules/navbar/navbar";
import CreditsBanner from "../../components/CreditsBanner";
import {
	DEV_YOUTUBE_URL,
	DEVELOPERS,
	PLATFORM_PARTS,
	PROJECT_VISION,
	REPORT_HIGHLIGHTS,
	REPORT_META,
} from "../../util/credits";
import "./style.css";

export default function DevelopersPage() {
	return (
		<>
			<Navbar />
			<Container className="developers-page-container">
				<Header as="h1" className="developers-title">
					<a
						href={DEV_YOUTUBE_URL}
						target="_blank"
						rel="noopener noreferrer"
						className="credits-easter-egg-link"
					>
						Skud ud til udviklerne
					</a>
				</Header>
				<p className="developers-lead">{PROJECT_VISION}</p>
				<p className="developers-report-meta">
					{REPORT_META.school} · {REPORT_META.title} · afleveret {REPORT_META.delivered}
				</p>

				<CreditsBanner compact />

				<Segment className="developers-panel developers-report-panel">
					<Header as="h2" className="developers-panel__heading">
						Fra projektrapporten
					</Header>
					<p className="developers-panel__text">{REPORT_META.originalAuthors.join(", ")} startede som H5-hold — platformen lever videre med udvidelser og vedligehold.</p>
					<div className="developers-report-grid">
						{REPORT_HIGHLIGHTS.map((item) => (
							<div key={item.title} className="developers-report-card">
								<h3 className="developers-report-card__title">{item.title}</h3>
								<p className="developers-report-card__text">{item.text}</p>
							</div>
						))}
					</div>
				</Segment>

				<Header as="h2" className="developers-panel__heading" style={{ marginTop: "2rem" }}>
					Sådan hænger det sammen
				</Header>
				{PLATFORM_PARTS.map((part) => (
					<Segment key={part.id} className="developers-panel">
						<Header as="h3" className="developers-panel__heading">
							{part.title}
						</Header>
						<span className="developers-panel__stack">{part.stack}</span>
						<p className="developers-panel__text">{part.description}</p>
						{part.reportNote ? (
							<p className="developers-panel__report-note">{part.reportNote}</p>
						) : null}
					</Segment>
				))}

				<Header as="h2" className="developers-panel__heading" style={{ marginTop: "2rem" }}>
					Holdet bag
				</Header>
				<div className="developers-grid">
					{DEVELOPERS.map((dev) => (
						<Link key={dev.slug} to={`/developers/${dev.slug}`} className="developer-card">
							<span className="developer-card__name">{dev.name}</span>
							{dev.aliases?.length ? (
								<span className="developer-card__alias">aka {dev.aliases.join(" · ")}</span>
							) : null}
							<span className="developer-card__tagline">{dev.tagline}</span>
							<div className="developer-card__roles">
								{dev.roles.map((role) => (
									<span key={role} className="developer-card__role">
										{role}
									</span>
								))}
							</div>
							<span className="developer-card__more">Læs shoutout →</span>
						</Link>
					))}
				</div>
			</Container>
		</>
	);
}
