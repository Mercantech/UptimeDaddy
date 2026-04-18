import "./style.css";
import { Menu, Container, Button, Image }   from "semantic-ui-react";
import { useNavigate }                      from "react-router-dom";
import logo                                 from "../../assets/logo.png";
import { AUTH_TOKEN_KEY }                   from "../../util/auth";

function Navbar() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        navigate("/login");
    };

    return (
        <Menu fixed="top" className="app-navbar">
            <Container>
                <Menu.Item header style={{ display: "flex", alignItems: "center", fontSize: "1.75rem", fontWeight: "bold"}}>
                    <Image src={logo} alt="Uptime Daddy Logo" style={{ marginRight: "0.25rem", height: '60px', width: 'auto' }} />
                    <span style={{color: '#B0E4CC'}}>Uptime</span><span style={{ marginLeft: "0.5rem", color:"" }}>Daddy</span>
                </Menu.Item>
                <Menu.Menu position="right">
                    <Menu.Item>
                        <Button compact onClick={() => navigate("/")}>Dashboard</Button>
                    </Menu.Item>
                    <Menu.Item>
                        <Button compact onClick={() => navigate("/incidents")}>Incident-log</Button>
                    </Menu.Item>
                    <Menu.Item>
                        <Button compact onClick={() => navigate("/dashboard-builder")}>Dashboard-builder</Button>
                    </Menu.Item>
                    <Menu.Item>
                        <Button compact onClick={() => navigate("/settings")}>Settings</Button>
                    </Menu.Item>
                    <Menu.Item>
                        <Button compact negative onClick={handleLogout}>Logout</Button>
                    </Menu.Item>
                </Menu.Menu>
            </Container>
        </Menu>
    );
}

export default Navbar;