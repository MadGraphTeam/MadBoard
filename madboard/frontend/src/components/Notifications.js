import React, { createContext, useCallback, useContext, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

const NotificationContext = createContext(() => {});

/**
 * Access the notification function: notify(message, severity), with severity
 * one of "error" (default), "warning", "info", "success".
 */
export function useNotify() {
  return useContext(NotificationContext);
}

/**
 * Shows messages from anywhere in the app as a snackbar. Failures of actions
 * the user triggered must end up here instead of in the browser console,
 * where nobody sees them.
 */
export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState(null);

  const notify = useCallback((message, severity = "error") => {
    setNotification({ message, severity, key: Date.now() });
  }, []);

  const handleClose = (event, reason) => {
    if (reason === "clickaway") return;
    setNotification(null);
  };

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <Snackbar
        key={notification?.key}
        open={notification !== null}
        autoHideDuration={notification?.severity === "error" ? 10000 : 5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleClose}
          severity={notification?.severity || "error"}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

/** Turn a failed response into the error message the backend sent, if any. */
export async function errorMessage(response, fallback) {
  try {
    const data = await response.json();
    if (data && data.error) return data.error;
  } catch {
    // response body was not json, fall through to the generic message
  }
  return fallback;
}
