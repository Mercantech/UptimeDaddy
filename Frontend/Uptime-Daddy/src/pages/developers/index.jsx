import { Link } from "react-router-dom";
import { Container, Header, Segment } from "semantic-ui-react";
import Navbar from "../../molecules/navbar/navbar";
import CreditsBanner from "../../components/CreditsBanner";
import { DEVELOPERS, PLATFORM_PARTS } from "../../util/credits";
import "./style.css";

export default function DevelopersPage() {
	return (
		<>
			<Navbar />
			<Container className="developers-page-container">
				<Header as="h1" className="developers-title">
					Skud ud til udviklerne
				</Header>
				<p className="developers-lead">
					UptimeDaddy er en uptime-monitoreringsplatform fra H5 Mercantec. Fire dele arbejder sammen —
					web-dashboard, .NET API, Go-services og en Ruby-worker — og bag hver del står et navn.
				</p>

				<CreditsBanner compact />

				<Header as="h2" className="developers-panel__heading" style={{ marginTop: "2.25rem" }}>
					Sådan hænger det sammen
				</Header>
				{PLATFORM_PARTS.map((part) => (
					<Segment key={part.id} className="developers-panel">
						<Header as="h3" className="developers-panel__heading">
							{part.title}
						</Header>
						<span className="developers-panel__stack">{part.stack}</span>
						<p className="developers-panel__text">{part.description}</p>
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
