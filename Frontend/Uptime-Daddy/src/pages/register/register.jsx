import { useState } 													from "react";
import { Link } 														from "react-router-dom";
import { Grid, Segment, Form, Button, Header, Divider, Image, Message} 	from "semantic-ui-react";
import registerImage 													from "../../assets/loginImage.png";
import logo 															from "../../assets/logo.png";
import { ACCOUNTS_URL } 												from "../../util/api.jsx";
import { useNavigate }                                                  from "react-router-dom";



function Register() {
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");
	const navigate = useNavigate();

	const handleRegister = async () => {
		setLoading(true);
		setErrorMessage("");
		setSuccessMessage("");

		try {
			const payload = {
				fullName,
				email,
				password,
			};

			const response = await fetch(`${ACCOUNTS_URL}/register`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				throw new Error(
					`Request failed with status ${response.status}`,
				);
			}

			setSuccessMessage("Account data sent successfully.");
			setFullName("");
			setEmail("");
			setPassword("");
		} catch (error) {
			if (error instanceof TypeError) {
				setErrorMessage(
					"Network error. Check that the API is running on port 6969.",
				);
			} else {
				setErrorMessage(
					error.message || "Failed to send account data.",
				);
			}
		} finally {
			setLoading(false);
			navigate("/login");
		}
	};

	return (
		<Grid
			columns={2}
			stackable={false}
			style={{ minHeight: "100vh", margin: 0 }}
			verticalAlign="middle"
		>
			<Grid.Column
				style={{
					width: "50%",
					minHeight: "100vh",
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					padding: "2rem",
					backgroundColor: "#091413",
				}}
			>
				<Segment basic style={{ width: "100%", margin: 0 }}>
					<div style={{ textAlign: "left", marginBottom: "1.5rem" }}>
						<Image
							src={logo}
							alt="Uptime Daddy Logo"
							size="medium"
							centered
						/>
					</div>

					<Header
						as="h1"
						textAlign="left"
						style={{ marginBottom: "0.25rem", color: "#408A71", fontWeight: "700", fontSize: "2.5rem" }}
					>
						Welcome to Uptime Daddy!
					</Header>

					<Divider horizontal style={{ color: "#B0E4CC" }}>
						<Link
							to="/login"
							style={{ color: "#B0E4CC", textDecoration: "underline", fontWeight: 600 }}
						>
							Already have an account? Click here to login
						</Link>
					</Divider>

					<Form
						className="register-form"
						style={{ margin: "0 auto" }}
						onSubmit={handleRegister}
					>
						{" "}
						<Form.Input
							label="Full Name"
							placeholder="Full Name"
							value={fullName}
							onChange={(_, data) => setFullName(data.value)}
							required
							style={{ color: "#408A71" }}
						/>
						<Form.Input
							label="Email"
							placeholder="Email"
							type="email"
							value={email}
							onChange={(_, data) => setEmail(data.value)}
							required
						/>
						<Form.Input
							label="Password"
							placeholder="Password"
							type="password"
							value={password}
							onChange={(_, data) => setPassword(data.value)}
							required
						/>
						{errorMessage && (
							<Message negative content={errorMessage} />
						)}
						{successMessage && (
							<Message positive content={successMessage} />
						)}
						<Button
							type="submit"
							fluid
							primary
							loading={loading}
							disabled={loading}
							content="Create account"
							style={{
								marginTop: "1rem",
								color: "white",
								backgroundColor: "#408A71",
							}}
						/>
					</Form>
				</Segment>
			</Grid.Column>

			<Grid.Column
				style={{
					width: "50%",
					minHeight: "100vh",
					padding: 0,
					margin: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Image
					src={registerImage}
					alt="Welcome"
					style={{
						width: "100%",
						height: "100vh",
						objectFit: "contain",
						display: "block",
						backgroundColor: "#408A71",
					}}
				/>
			</Grid.Column>
		</Grid>
	);
}

export default Register;
