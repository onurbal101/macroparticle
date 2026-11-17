import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/dm-sans/latin-ext-400.css";
import "@fontsource/dm-sans/latin-ext-500.css";
import "@fontsource/dm-sans/latin-ext-600.css";
import "@fontsource/dm-sans/latin-ext-700.css";
import App from "./App";
import "./styles.css";

const application = (
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
const root = document.getElementById("root")!;
const path = window.location.pathname.replace(/\/+$/, "") || "/";
if (root.hasChildNodes() && root.dataset.page === path) {
  ReactDOM.hydrateRoot(root, application);
} else {
  ReactDOM.createRoot(root).render(application);
}
