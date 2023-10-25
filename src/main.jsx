import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from "react-router-dom";
import './index.css';
import App from './Components/App/App';
import { inject } from '@vercel/analytics';

if (window.location.host === 'www.ridereadybike.com') {
  inject();
}

let cspContent = "";

const environment = import.meta.env.VITE_ENV;

const fontStylesCSP = "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; style-src 'self' https://fonts.googleapis.com";

if (environment === 'development') {
  cspContent = `default-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' http://localhost:5173; img-src 'self' http://localhost:5173; connect-src 'self' http://localhost:5173 http://localhost:5001 http://www.strava.com ; ${fontStylesCSP}`;
} else {
  cspContent = `default-src 'self'; script-src 'self' https://www.ridereadybike.com 'sha256-WjvV57CIhmLZyoSLYrfd3e+xHWTmqUKA4z7SJ8eHXIQ='; img-src 'self' https://www.ridereadybike.com; connect-src 'self' https://www.ridereadybike.com http://www.strava.com https://vercel.live/; frame-src https://vercel.live/ ; ${fontStylesCSP}`;
}

document.getElementById('csp-meta-tag').setAttribute('content', cspContent);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </BrowserRouter>
);

