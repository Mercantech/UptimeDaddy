import { Link, Navigate, useParams } from "react-router-dom";
import { Container, Header, Segment, Icon } from "semantic-ui-react";
import Navbar from "../../molecules/navbar/navbar";
import GitHubMark from "../../components/GitHubMark";
import { getDeveloperBySlug, PLATFORM_PARTS } from "../../util/credits";
import "./style.css";

export default function DeveloperDetailPage() {
	const { slug } = useParams();
	const developer = getDeveloperBySlug(slug);

	if (!developer) {
		return <Navigate to="/developers" replace />;
	}

	const parts = PLATFORM_PARTS.filter((p) => developer.partIds.includes(p.id));

	return (
		<>
			<Navbar />
			<Container className="developers-page-container">
				<Link to="/developers" className="developer-detail-back">
					<Icon name="arrow left" />
					Tilbage til holdet
				</Link>

				<Header as="h1" className="developers-title developer-detail-header">
					{developer.name}
					{developer.aliases?.length ? (
						<Header.Subheader>aka {developer.aliases.join(" · ")}</Header.Subheader>
					) : null}
				</Header>

				<Segment className="developer-shoutout">
					<div className="developer-shoutout__label">Skud ud</div>
					<p className="developer-shoutout__text">{developer.shoutout}</p>
					{developer.github ? (
						<a
							href={developer.github}
							target="_blank"
							rel="noopener noreferrer"
							className="developer-detail-github"
						>
							<GitHubMark />
							GitHub-profil
						</a>
					) : null}
				</Segment>

				<div className="developer-card__roles" style={{ marginBottom: "1.25rem" }}>
					{developer.roles.map((role) => (
						<span key={role} className="developer-card__role">
							{role}
						</span>
					))}
				</div>

				<Header as="h2" className="developers-panel__heading">
					{developer.name}s bidrag til platformen
				</Header>
				{parts.map((part) => (
					<Segment key={part.id} className="developers-panel">
						<Header as="h3" className="developers-panel__heading">
							{part.title}
						</Header>
						<span className="developers-panel__stack">{part.stack}</span>
						<p className="developers-panel__text">{part.description}</p>
					</Segment>
				))}
			</Container>
		</>
	);
}
