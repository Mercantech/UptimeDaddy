import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader, Message, Button, Segment, Header, Image } from "semantic-ui-react";
import logo from "../../assets/logo.png";
import { setAuthTokens } from "../../util/auth.js";
import {
  MERCANTEC_EXCHANGE_URL,
  consumeStoredPkce,
  getRedirectUri,
} from "../../util/mercantec.js";

function MercantecCallback() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  const hasRun = useRef(false);

  useEffect(() => {
    // Undgå dobbelt-kørsel (React StrictMode) — koden kan kun indløses én gang.
    if (hasRun.current) return;
    hasRun.current = true;

    const completeLogin = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const returnedState = params.get("state");
      const oauthError = params.get("error");

      const { state: savedState, codeVerifier } = consumeStoredPkce();

      if (oauthError) {
        setErrorMessage(`Mercantec afviste login: ${oauthError}`);
        return;
      }

      if (!code || !returnedState) {
        setErrorMessage("Ugyldigt svar fra Mercantec (manglende code/state).");
        return;
      }

      if (!savedState || !codeVerifier) {
        setErrorMessage("Login-sessionen udløb. Prøv at logge ind igen.");
        return;
      }

      if (returnedState !== savedState) {
        setErrorMessage("Sikkerhedstjek fejlede (state matcher ikke). Prøv igen.");
        return;
      }

      try {
        const response = await fetch(MERCANTEC_EXCHANGE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            codeVerifier,
            redirectUri: getRedirectUri(),
          }),
        });

        if (!response.ok) {
          throw new Error("Kunne ikke fuldføre login mod Mercantec.");
        }

        const data = await response.json().catch(() => ({}));
        const accessToken = data?.accessToken ?? data?.token;
        const refreshToken = data?.refreshToken ?? data?.refresh;

        if (!accessToken) {
          throw new Error("Login lykkedes, men der kom intet token retur.");
        }

        setAuthTokens({ accessToken, refreshToken });
        navigate("/", { replace: true });
      } catch (error) {
        if (error instanceof TypeError) {
          setErrorMessage("Netværksfejl. Tjek at accounts-tjenesten kører.");
        } else {
          setErrorMessage(error.message || "Login mislykkedes.");
        }
      }
    };

    completeLogin();
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#091413",
        padding: "2rem",
      }}
    >
      <Segment
        basic
        style={{ maxWidth: 420, width: "100%", textAlign: "center" }}
      >
        <Image src={logo} alt="Uptime Daddy Logo" size="small" centered />
        {errorMessage ? (
          <>
            <Header as="h3" style={{ color: "#B0E4CC", marginTop: "1.5rem" }}>
              Login mislykkedes
            </Header>
            <Message negative content={errorMessage} />
            <Button
              primary
              content="Tilbage til login"
              style={{ backgroundColor: "#408A71", color: "white" }}
              onClick={() => navigate("/login", { replace: true })}
            />
          </>
        ) : (
          <>
            <Header as="h3" style={{ color: "#B0E4CC", marginTop: "1.5rem" }}>
              Logger ind med Mercantec…
            </Header>
            <Loader active inline size="large" style={{ marginTop: "1rem" }} />
          </>
        )}
      </Segment>
    </div>
  );
}

export default MercantecCallback;
