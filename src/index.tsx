import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import "./index.css";
import IndexApp from "./IndexApp";
import EgressApp from "./EgressApp";
import { CssBaseline } from "@mui/material";

const IngestApp = React.lazy(() => import("./IngestApp"));
const IngestDesktopApp = React.lazy(() => import("./IngestDesktop/App"));

const darkTheme = createTheme({ palette: { mode: "dark" } });

const root = ReactDOM.createRoot(document.getElementById("root")!);

function Router() {
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const [path, setPath] = React.useState(hash);

  function checkPath() {
    if (window.location.hash === path) return;
    setPath(window.location.hash);
  }
  window.addEventListener("hashchange", checkPath);
  window.addEventListener("popstate", checkPath);

  return path === "#ingest" ? (
    <Suspense>
      <IngestApp />
    </Suspense>
  ) : path === "#studio" ? (
    <Suspense>
      <IngestDesktopApp />
    </Suspense>
  ) : path === "#watch" ? (
    <EgressApp />
  ) : (
    <IndexApp />
  );
}

function Root() {
  return (
    <React.StrictMode>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Router />
      </ThemeProvider>
    </React.StrictMode>
  );
}

root.render(<Root />);
