import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
// Core Monaco API (no language contributions).
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
// Each contribution import also pulls in _.contribution.js, which registers
// all editor features (find, fold, bracket-match, etc.). The actual tokenizer
// for each language is a separate lazy chunk loaded only when first needed.
import "monaco-editor/esm/vs/basic-languages/ini/ini.contribution";
import "monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution";
import "monaco-editor/esm/vs/basic-languages/shell/shell.contribution";
import "monaco-editor/esm/vs/basic-languages/bat/bat.contribution";
import "monaco-editor/esm/vs/basic-languages/python/python.contribution";
import { loader } from "@monaco-editor/react";

// TOML shares INI syntax close enough; register it as an alias.
monaco.languages.register({
  id: "toml",
  extensions: [".toml"],
  aliases: ["TOML"],
});
monaco.languages.onLanguage("toml", async () => {
  const { language, conf } = await import(
    "monaco-editor/esm/vs/basic-languages/ini/ini.js"
  );
  monaco.languages.setMonarchTokensProvider("toml", language);
  monaco.languages.setLanguageConfiguration("toml", conf);
});

// Provide the editor worker via webpack 5's native worker bundling.
// Python uses a Monarch tokenizer on the main thread, so only the base
// editor worker (for diff, folding, etc.) is needed.
window.MonacoEnvironment = {
  getWorker() {
    return new Worker(
      new URL("monaco-editor/esm/vs/editor/editor.worker", import.meta.url),
    );
  },
};

loader.config({ monaco });

function AppWithTheme() {
  // Initialize dark mode from system preference
  const prefersDarkMode =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [isDarkMode, setIsDarkMode] = useState(prefersDarkMode);

  const theme = createTheme({
    palette: {
      mode: isDarkMode ? "dark" : "light",
      primary: {
        main: isDarkMode ? "#1976d2" : "#0d2b4e",
      },
      secondary: {
        main: "#dc004e",
      },
    },
  });

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App isDarkMode={isDarkMode} onThemeToggle={handleThemeToggle} />
    </ThemeProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AppWithTheme />
  </React.StrictMode>,
);
