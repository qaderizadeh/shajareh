import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./theme";
import { AuthProvider } from "./auth";
import { ActiveFamilyProvider } from "./activeFamily";
import { ToastProvider } from "./components/ui";
import App from "./App";
import "./styles/global.css";
import "./styles/tokens.css";
import "./components/ui.css";
import "./components/layout.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <ActiveFamilyProvider>
              <App />
            </ActiveFamilyProvider>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
