import "./style.css";
import { useState } from "react";
import { Menu, Container, Button, Image, Icon } from "semantic-ui-react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import { AUTH_TOKEN_KEY } from "../../util/auth";

function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    navigate("/login");
  };

  const go = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <Menu fixed="top" className={`app-navbar ${menuOpen ? "app-navbar--open" : ""}`}>
      <Container className="app-navbar__inner">
        <Menu.Item header className="app-navbar__brand">
          <Image src={logo} alt="Uptime Daddy Logo" className="app-navbar__logo" />
          <span className="app-navbar__title">
            <span className="app-navbar__title-accent">Uptime</span>
            <span className="app-navbar__title-main">Daddy</span>
          </span>
        </Menu.Item>

        <Menu.Item className="app-navbar__toggle-item">
          <Button
            icon
            className="app-navbar__toggle"
            aria-label={menuOpen ? "Luk menu" : "Åbn menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? "close" : "sidebar"} />
          </Button>
        </Menu.Item>

        <Menu.Menu position="right" className="app-navbar__links">
          <Menu.Item>
            <Button compact onClick={() => go("/")}>Dashboard</Button>
          </Menu.Item>
          <Menu.Item>
            <Button compact onClick={() => go("/incidents")}>Incident-log</Button>
          </Menu.Item>
          <Menu.Item>
            <Button compact onClick={() => go("/dashboard-builder")}>Dashboard-builder</Button>
          </Menu.Item>
          <Menu.Item>
            <Button compact onClick={() => go("/settings")}>Settings</Button>
          </Menu.Item>
          <Menu.Item>
            <Button
              compact
              icon
              aria-label="Skud ud til udviklerne"
              title="Skud ud til udviklerne"
              className="navbar-dev-icon"
              onClick={() => go("/developers")}
            >
              <Icon name="code" />
            </Button>
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
