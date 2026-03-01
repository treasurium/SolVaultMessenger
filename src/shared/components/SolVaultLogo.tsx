/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/shared/components/SolVaultLogo.tsx
import React from 'react';
import {SvgXml} from 'react-native-svg';

const logoXml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="solanaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#9945FF"/>
      <stop offset="50%" style="stop-color:#14F195"/>
      <stop offset="100%" style="stop-color:#00C2FF"/>
    </linearGradient>
    <linearGradient id="innerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#0d0d1a"/>
    </linearGradient>
  </defs>
  <circle cx="256" cy="256" r="248" fill="#0a0a14"/>
  <circle cx="256" cy="256" r="240" fill="none" stroke="url(#solanaGrad)" stroke-width="3" opacity="0.6"/>
  <path d="M256 68 L406 148 L406 288 C406 368 340 432 256 456 C172 432 106 368 106 288 L106 148 Z" fill="url(#innerGrad)" stroke="url(#solanaGrad)" stroke-width="4"/>
  <path d="M256 92 L386 162 L386 282 C386 352 328 410 256 432 C184 410 126 352 126 282 L126 162 Z" fill="none" stroke="url(#solanaGrad)" stroke-width="1.5" opacity="0.3"/>
  <rect x="168" y="195" rx="16" ry="16" width="130" height="62" fill="url(#solanaGrad)" opacity="0.85"/>
  <polygon points="178,257 168,280 198,257" fill="#9945FF" opacity="0.85"/>
  <rect x="218" y="272" rx="16" ry="16" width="130" height="62" fill="url(#solanaGrad)" opacity="0.6"/>
  <polygon points="338,334 348,357 318,334" fill="#00C2FF" opacity="0.6"/>
  <rect x="216" y="218" rx="4" ry="4" width="30" height="24" fill="#0a0a14" opacity="0.9"/>
  <path d="M221 218 L221 210 C221 202 226 197 231 197 C236 197 241 202 241 210 L241 218" fill="none" stroke="#0a0a14" stroke-width="4" stroke-linecap="round" opacity="0.9"/>
  <circle cx="231" cy="228" r="3.5" fill="url(#solanaGrad)"/>
  <rect x="229.5" y="228" width="3" height="6" rx="1" fill="url(#solanaGrad)"/>
  <rect x="180" y="210" rx="2" ry="2" width="24" height="4" fill="#0a0a14" opacity="0.5"/>
  <rect x="180" y="220" rx="2" ry="2" width="18" height="4" fill="#0a0a14" opacity="0.5"/>
  <rect x="180" y="230" rx="2" ry="2" width="22" height="4" fill="#0a0a14" opacity="0.5"/>
  <rect x="180" y="240" rx="2" ry="2" width="14" height="4" fill="#0a0a14" opacity="0.5"/>
  <rect x="232" y="286" rx="2" ry="2" width="24" height="4" fill="#0a0a14" opacity="0.5"/>
  <rect x="232" y="296" rx="2" ry="2" width="30" height="4" fill="#0a0a14" opacity="0.5"/>
  <rect x="232" y="306" rx="2" ry="2" width="18" height="4" fill="#0a0a14" opacity="0.5"/>
  <rect x="232" y="316" rx="2" ry="2" width="26" height="4" fill="#0a0a14" opacity="0.5"/>
  <rect x="274" y="288" rx="3" ry="3" width="24" height="20" fill="#0a0a14" opacity="0.7"/>
  <path d="M278 288 L278 282 C278 276 282 272 286 272 C290 272 294 276 294 282 L294 288" fill="none" stroke="#0a0a14" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
  <circle cx="286" cy="296" r="2.5" fill="url(#solanaGrad)" opacity="0.8"/>
  <rect x="285" y="296" width="2" height="5" rx="1" fill="url(#solanaGrad)" opacity="0.8"/>
  <line x1="186" y1="380" x2="326" y2="380" stroke="url(#solanaGrad)" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
  <line x1="196" y1="394" x2="316" y2="394" stroke="url(#solanaGrad)" stroke-width="2.5" stroke-linecap="round" opacity="0.35"/>
  <line x1="210" y1="408" x2="302" y2="408" stroke="url(#solanaGrad)" stroke-width="2.5" stroke-linecap="round" opacity="0.2"/>
  <circle cx="145" cy="180" r="3" fill="#14F195" opacity="0.5"/>
  <circle cx="370" cy="200" r="2.5" fill="#9945FF" opacity="0.4"/>
  <circle cx="380" cy="350" r="2" fill="#00C2FF" opacity="0.3"/>
  <circle cx="130" cy="330" r="2.5" fill="#14F195" opacity="0.35"/>
  <g transform="translate(365, 155) rotate(-30)" opacity="0.4">
    <circle cx="0" cy="0" r="6" fill="none" stroke="#14F195" stroke-width="2"/>
    <line x1="6" y1="0" x2="18" y2="0" stroke="#14F195" stroke-width="2"/>
    <line x1="15" y1="0" x2="15" y2="5" stroke="#14F195" stroke-width="2"/>
    <line x1="18" y1="0" x2="18" y2="4" stroke="#14F195" stroke-width="2"/>
  </g>
</svg>`;

const appIconXml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f0f1e"/>
      <stop offset="100%" style="stop-color:#0a0a14"/>
    </linearGradient>
    <linearGradient id="s" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#9945FF"/>
      <stop offset="50%" style="stop-color:#14F195"/>
      <stop offset="100%" style="stop-color:#00C2FF"/>
    </linearGradient>
    <linearGradient id="d" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#16162a"/>
      <stop offset="100%" style="stop-color:#0d0d1a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="108" fill="url(#bg)"/>
  <rect x="4" y="4" width="504" height="504" rx="106" fill="none" stroke="url(#s)" stroke-width="2" opacity="0.25"/>
  <path d="M256 56 L416 142 L416 296 C416 382 344 440 256 466 C168 440 96 382 96 296 L96 142 Z" fill="url(#d)" stroke="url(#s)" stroke-width="4.5"/>
  <path d="M256 82 L396 158 L396 288 C396 364 332 416 256 440 C180 416 116 364 116 288 L116 158 Z" fill="none" stroke="url(#s)" stroke-width="1" opacity="0.15"/>
  <rect x="152" y="180" rx="18" ry="18" width="150" height="72" fill="url(#s)" opacity="0.9"/>
  <polygon points="164,252 150,280 192,252" fill="#9945FF" opacity="0.9"/>
  <rect x="210" y="268" rx="18" ry="18" width="150" height="72" fill="url(#s)" opacity="0.55"/>
  <polygon points="348,340 362,368 320,340" fill="#00C2FF" opacity="0.55"/>
  <rect x="207" y="203" rx="5" ry="5" width="38" height="30" fill="#0a0a14" opacity="0.9"/>
  <path d="M214 203 L214 193 C214 183 220 177 226 177 C232 177 238 183 238 193 L238 203" fill="none" stroke="#0a0a14" stroke-width="5" stroke-linecap="round" opacity="0.9"/>
  <circle cx="226" cy="216" r="4.5" fill="url(#s)"/>
  <rect x="224" y="216" width="4" height="8" rx="2" fill="url(#s)"/>
  <rect x="166" y="198" rx="2" ry="2" width="28" height="5" fill="#0a0a14" opacity="0.4"/>
  <rect x="166" y="210" rx="2" ry="2" width="20" height="5" fill="#0a0a14" opacity="0.4"/>
  <rect x="166" y="222" rx="2" ry="2" width="24" height="5" fill="#0a0a14" opacity="0.4"/>
  <rect x="166" y="234" rx="2" ry="2" width="16" height="5" fill="#0a0a14" opacity="0.4"/>
  <rect x="224" y="284" rx="2" ry="2" width="30" height="5" fill="#0a0a14" opacity="0.4"/>
  <rect x="224" y="296" rx="2" ry="2" width="22" height="5" fill="#0a0a14" opacity="0.4"/>
  <rect x="224" y="308" rx="2" ry="2" width="28" height="5" fill="#0a0a14" opacity="0.4"/>
  <rect x="224" y="320" rx="2" ry="2" width="18" height="5" fill="#0a0a14" opacity="0.4"/>
  <rect x="268" y="286" rx="4" ry="4" width="30" height="24" fill="#0a0a14" opacity="0.65"/>
  <path d="M274 286 L274 278 C274 270 279 266 283 266 C287 266 292 270 292 278 L292 286" fill="none" stroke="#0a0a14" stroke-width="4" stroke-linecap="round" opacity="0.65"/>
  <circle cx="283" cy="296" r="3.5" fill="url(#s)" opacity="0.7"/>
  <rect x="281.5" y="296" width="3" height="6" rx="1.5" fill="url(#s)" opacity="0.7"/>
  <line x1="176" y1="390" x2="336" y2="390" stroke="url(#s)" stroke-width="3" stroke-linecap="round" opacity="0.35"/>
  <line x1="196" y1="406" x2="316" y2="406" stroke="url(#s)" stroke-width="3" stroke-linecap="round" opacity="0.2"/>
  <line x1="216" y1="422" x2="296" y2="422" stroke="url(#s)" stroke-width="3" stroke-linecap="round" opacity="0.1"/>
</svg>`;

const wordmarkXml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 120" width="800" height="120">
  <defs>
    <linearGradient id="wg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#9945FF"/>
      <stop offset="40%" style="stop-color:#14F195"/>
      <stop offset="100%" style="stop-color:#00C2FF"/>
    </linearGradient>
  </defs>
  <text x="400" y="52" font-family="System, -apple-system, sans-serif" font-weight="800" font-size="52" fill="url(#wg)" text-anchor="middle" letter-spacing="-1">Sol<tspan fill="#ffffff">Vault</tspan></text>
  <text x="400" y="85" font-family="System, -apple-system, sans-serif" font-weight="300" font-size="20" fill="#ffffff" opacity="0.45" text-anchor="middle" letter-spacing="6">MESSENGER</text>
  <text x="400" y="110" font-family="System, -apple-system, sans-serif" font-weight="400" font-size="10" fill="#14F195" opacity="0.5" text-anchor="middle" letter-spacing="2.5">ENCRYPTED ON-CHAIN MESSAGING</text>
</svg>`;

interface LogoProps {
  width?: number;
  height?: number;
}

export function SolVaultLogo({width = 120, height = 120}: LogoProps) {
  return <SvgXml xml={logoXml} width={width} height={height} />;
}

export function SolVaultAppIcon({width = 80, height = 80}: LogoProps) {
  return <SvgXml xml={appIconXml} width={width} height={height} />;
}

export function SolVaultWordmark({width = 200, height = 30}: LogoProps) {
  return <SvgXml xml={wordmarkXml} width={width} height={height} />;
}
