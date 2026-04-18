import logo from "../../assets/logo.png";

function Loader({ isLoading, text = "" }) {
    if (!isLoading) return null;

    return (
        <div className="global-spinner-overlay">
            <img
                src={logo}
                alt="Loading"
                className="global-spinner-logo"
            />
            <span className="global-spinner-text">{text}</span>
        </div>
    );
}

export default Loader;