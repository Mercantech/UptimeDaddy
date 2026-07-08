import { Link } from "react-router-dom";
import { Button, Icon } from "semantic-ui-react";
import GitHubMark from "./GitHubMark";
import { DEV_YOUTUBE_URL, FOOTER_CREDITS } from "../util/credits";
import "./CreditsBanner.css";

/** Fremhævet shoutout-banner — bruges på dashboard og kan genbruges andre steder. */
export default function CreditsBanner({ compact = false }) {
	return (
		<section className={`credits-banner${compact ? " credits-banner--compact" : ""}`}>
			<div className="credits-banner__glow" aria-hidden />
			<div className="credits-banner__inner">
				<div className="credits-banner__head">
					<Icon name="heart" className="credits-banner__icon" />
					<div>
						<h2 className="credits-banner__title">Skud ud til udviklerne</h2>
						<p className="credits-banner__lead">
							UptimeDaddy er bygget på H5 — se hvem der står bag hver del af platformen.
						</p>
					</div>
				</div>

				<div className="credits-banner__names">
					{FOOTER_CREDITS.map(({ name, href }) => (
						<span key={href} className="credits-banner__dev-link">
							<Link to={`/developers/${name.toLowerCase()}`} className="credits-banner__dev-name">
								{name}
							</Link>
							<a
								href={href}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={`${name} på GitHub`}
								className="credit-github-link"
							>
								<GitHubMark />
							</a>
						</span>
					))}
					<Link to="/developers/mathias" className="credits-banner__dev-link credits-banner__dev-name">
						Mathias
					</Link>
				</div>

				<div className="credits-banner__actions">
					<Button as={Link} to="/developers" primary className="credits-banner__cta">
						Mød holdet
					</Button>
					<a
						href={DEV_YOUTUBE_URL}
						target="_blank"
						rel="noopener noreferrer"
						className="credits-banner__yt-link"
					>
						<Icon name="youtube" />
						Se shoutout-video
					</a>
				</div>
			</div>
		</section>
	);
}
