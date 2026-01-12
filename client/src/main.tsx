import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initSecurityProtection } from "./lib/security";

// Initialize security protection (DevTools restriction)
initSecurityProtection();

createRoot(document.getElementById("root")!).render(<App />);
