import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import "./index.css";
import IngestApp from "./IngestApp";
import EgressApp from "./EgressApp";

const darkTheme = createTheme({ palette: { mode: "dark" } });

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={darkTheme}>
      {typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("ingest") ? (
        <IngestApp />
      ) : (
        <EgressApp />
      )}
    </ThemeProvider>
  </React.StrictMode>
);
