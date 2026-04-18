import { useState }                                                                   from "react";
import { Link }                                                                       from "react-router-dom";
import { useNavigate }                                                                from "react-router-dom";
import { Grid, Segment, Form, Button, Header, Divider, Image, Modal, Input, Message } from "semantic-ui-react";
import registerImage                                                                  from "../../assets/loginImage.png";
import logo                                                                           from "../../assets/logo.png";
import { ACCOUNTS_URL }                                                               from "../../util/api.jsx";
import { setAuthTokens }                                                              from "../../util/auth.js";

function Login() {
  const navigate = useNavigate();
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const sendReset = () => {
    setResetMode(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = { email, password };

      const response = await fetch(`${ACCOUNTS_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Invalid email or password.");
      }

      const data = await response.json().catch(() => ({}));
      const accessToken = data?.accessToken ?? data?.token;
      const refreshToken = data?.refreshToken ?? data?.refresh;

      if (!accessToken) {
        throw new Error("Login succeeded but no token was returned.");
      }

      setAuthTokens({ accessToken, refreshToken });
      setSuccessMessage("Logged in successfully.");
      setPassword("");
      navigate("/");
    } catch (error) {
      if (error instanceof TypeError) {
        setErrorMessage("Network error. Check that the API is running on port 6969.");
      } else {
        setErrorMessage(error.message || "Login failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid columns={2} stackable={false} style={{ minHeight: "100vh", margin: 0 }} verticalAlign="middle">
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
            <Image src={logo} alt="Uptime Daddy Logo" size="medium" centered />
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
              to="/register"
              style={{ color: "#B0E4CC", textDecoration: "underline", fontWeight: 600 }}
            >
              New here? Create an account
            </Link>
          </Divider>

          <Form style={{ margin: "0 auto" }} className="register-form" onSubmit={handleLogin}>
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

            {errorMessage && <Message negative content={errorMessage} />}
            {successMessage && <Message positive content={successMessage} />}

            <span
              onClick={() => setResetMode(true)}
              style={{
                color: "#5ac17c",
                textDecoration: "underline",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              Forgot password?
            </span>

            <Button
              type="submit"
              fluid
              primary
              loading={loading}
              disabled={loading}
              content="Login"
              style={{
                marginTop: "1rem",
                color: "white",
                backgroundColor: "#408A71",
              }}
            />
          </Form>

          <Modal onClose={() => setResetMode(false)} onOpen={() => setResetMode(true)} open={resetMode} size="tiny">
            <Modal.Header>Reset your password</Modal.Header>
            <Modal.Content>
              <p>Enter your email and we’ll send reset instructions.</p>
              <Input
                fluid
                placeholder="Email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </Modal.Content>
            <Modal.Actions>
              <Button onClick={() => setResetMode(false)}>Cancel</Button>
              <Button positive onClick={sendReset} disabled={!resetEmail}>
                Send reset link
              </Button>
            </Modal.Actions>
          </Modal>
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

export default Login;