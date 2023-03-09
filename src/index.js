import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import "./index.css";
import IndexApp from "./IndexApp";
import IngestApp from "./IngestApp";
import EgressApp from "./EgressApp";

const darkTheme = createTheme({ palette: { mode: "dark" } });

const root = ReactDOM.createRoot(document.getElementById("root"));

function Root() {
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const [path, setPath] = React.useState(hash);

  function checkPath() {
    if (window.location.hash === path) return;
    setPath(window.location.hash);
    root.render(<Root />);
  }
  window.addEventListener("hashchange", checkPath);
  window.addEventListener("popstate", checkPath);

  return (
    <React.StrictMode>
      <ThemeProvider theme={darkTheme}>
        {path === "#ingest" ? (
          <IngestApp />
        ) : path === "#watch" ? (
          <EgressApp />
        ) : (
          <IndexApp />
        )}
      </ThemeProvider>
    </React.StrictMode>
  );
}

root.render(<Root />);
