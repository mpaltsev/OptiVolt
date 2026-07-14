import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App.js";
import { LocaleProvider } from "./ui/LocaleContext.js";
import "./ui/styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

createRoot(root).render(
  <StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </StrictMode>,
);
