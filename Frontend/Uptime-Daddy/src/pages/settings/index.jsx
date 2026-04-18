import { useState }                                     from "react";
import { Button, Container, Form, Header, Segment }     from "semantic-ui-react";
import Navbar                                           from "../../molecules/navbar/navbar";
import { getAuthPayload }                               from "../../util/auth";
import                                                       "./style.css";

function getfullNameFromPayload(payload) {
    if (!payload) return "-";
    return payload.fullName ?? "";
}

function getEmailFromPayload(payload) {
    if (!payload) return "-";
    return payload.email ?? "";
}

function Settings() {
    const authPayload = getAuthPayload();
    const [fullName, setFullName] = useState(getfullNameFromPayload(authPayload));
    const [email, setEmail] = useState(getEmailFromPayload(authPayload));

    return (
        <>
            <Navbar />
            <Container className="settings-page-container">
                <Segment className="settings-panel">
                    <Header as="h2" className="settings-title">User Settings</Header>
                    <p className="settings-subtitle">Simple account preferences for your dashboard.</p>

                    <Form className="settings-form">
                        <Form.Input
                            label="Display Name"
                            placeholder="Your display name"
                            value={fullName}
                            onChange={(event) => setFullName(event.target.value)}
                        />

                        <Form.Input
                            type="email"
                            label="Email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />

                        <div className="settings-actions">
                            <Button>Save</Button>
                        </div>

                    </Form>
                </Segment>
            </Container>
        </>
    );
}

export default Settings;