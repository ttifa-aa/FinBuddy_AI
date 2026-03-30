// Import createRoot from React DOM for rendering the app
import { createRoot } from "react-dom/client";

// Import the main App component that contains all the application logic
import App from "./App.tsx";

// Import global CSS styles including Tailwind and custom theme variables
import "./index.css";

// Create the React root and render the App component
// This is the entry point of the React application
createRoot(document.getElementById("root")!).render(<App />);
