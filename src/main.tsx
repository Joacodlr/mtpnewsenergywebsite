import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { startEmbed } from "./lib/embed";
import "./index.css";

startEmbed();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
