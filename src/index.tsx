import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import "./index.css";
import IndexApp from "./IndexApp";
import EgressApp from "./EgressApp";
import { CssBaseline, useMediaQuery } from "@mui/material";

const IngestApp = React.lazy(() => import("./IngestApp"));
const IngestDesktopApp = React.lazy(() => import("./IngestDesktop/App"));

const lightTheme = createTheme({ palette: { mode: "light" } });
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
  const prefersDarkTheme = useMediaQuery("(prefers-color-scheme: dark)");
  return (
    <React.StrictMode>
      <ThemeProvider theme={prefersDarkTheme ? darkTheme : lightTheme}>
        <CssBaseline />
        <Router />
      </ThemeProvider>
    </React.StrictMode>
  );
}

root.render(<Root />);
