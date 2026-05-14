import React from "react";
import { createRoot } from "react-dom/client";
import YianLandingPage from "../yian_product_landing_page.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <YianLandingPage />
  </React.StrictMode>,
);
