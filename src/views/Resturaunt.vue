<template>
    <div>
        <h3>Restaurant Map</h3>
        <div id="map" style="height: 500px; aspect-ratio: 16/9;"></div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import "leaflet/dist/leaflet.css";
import * as L from 'leaflet';

// ── Icon config: maps each type to an emoji + background color ──
const TYPE_ICONS = {
  // Home
  'home':        { emoji: '🏠', bg: '#4A90E2', label: 'Home' },

  // Restaurant types from your list
  'fancy date':  { emoji: '🕯️', bg: '#9B59B6' },
  'cocktail':    { emoji: '🍸', bg: '#E74C3C' },
  'bbq':         { emoji: '🔥', bg: '#E67E22' },
  'brunch':      { emoji: '🥞', bg: '#F39C12' },
  'pasta':       { emoji: '🍝', bg: '#D35400' },
  'bar':         { emoji: '🍺', bg: '#27AE60' },
  'italian':     { emoji: '🍕', bg: '#C0392B' },
  'fusion':      { emoji: '🌏', bg: '#8E44AD' },
  'seafood':     { emoji: '🦞', bg: '#2980B9' },
  'cafe':        { emoji: '☕', bg: '#795548' },
  'ramen':       { emoji: '🍜', bg: '#E53935' },
  'hawaiian':    { emoji: '🍍', bg: '#F9A825' },
  'burger':      { emoji: '🍔', bg: '#FF5722' },
  'burgers':     { emoji: '🍔', bg: '#FF5722' },
  'thai':        { emoji: '🌶️', bg: '#E53935' },
  'hotpot':      { emoji: '🫕', bg: '#B71C1C' },
  'insta':       { emoji: '📸', bg: '#E1306C' },
  'chinese':     { emoji: '🥡', bg: '#D32F2F' },
  'teriyaki':    { emoji: '🍱', bg: '#388E3C' },
  'hot chicken': { emoji: '🍗', bg: '#FF6D00' },
  'japanese':    { emoji: '🍣', bg: '#AD1457' },
  'bakery':      { emoji: '🥐', bg: '#6D4C41' },
  'default':     { emoji: '🍽️', bg: '#607D8B' },
};

/**
 * Build a circular divIcon for a given restaurant type (or 'home').
 * @param {string} type  - e.g. 'Ramen', 'BBQ', 'home'
 * @param {number} size  - icon diameter in px (default 36)
 */
function makeIcon(type, size = 36) {
  const key   = (type || '').toLowerCase();
  const cfg   = TYPE_ICONS[key] ?? TYPE_ICONS['default'];
  const half  = size / 2;
  const fs    = Math.round(size * 0.52);   // emoji font-size scales with icon

  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${cfg.bg};
      border: 2px solid rgba(255,255,255,0.85);
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${fs}px;
      line-height: 1;
      cursor: pointer;
    ">${cfg.emoji}</div>
  `;

  return L.divIcon({
    html,
    className: '',          // clear Leaflet's default white box
    iconSize:     [size, size],
    iconAnchor:   [half, half],
    popupAnchor:  [0, -(half + 4)],
  });
}

const initialMap = ref(null);

onMounted(() => {
  initialMap.value = L.map('map').setView([47.50346892264011, -122.23075261558346], 14);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(initialMap.value);

  // ── Home marker (larger, distinct) ──
  L.marker([47.50346892264011, -122.23075261558346], { icon: makeIcon('home', 44) })
    .addTo(initialMap.value)
    .bindPopup('🏠 This is our house')
    .openPopup();

  // ── Example restaurant markers — replace coords with your real data ──
  const restaurants = [
    { name: 'Fancy Dinner',    type: 'Fancy Date',  lat: 47.506, lng: -122.228 },
    { name: 'Happy Hour Bar',  type: 'Cocktail',    lat: 47.501, lng: -122.235 },
    { name: 'Smoke & Barrel',  type: 'BBQ',         lat: 47.498, lng: -122.240 },
    { name: 'Morning Table',   type: 'Brunch',      lat: 47.503, lng: -122.220 },
    { name: 'Noodle House',    type: 'Ramen',       lat: 47.507, lng: -122.245 },
    { name: 'Sushi Corner',    type: 'Japanese',    lat: 47.495, lng: -122.230 },
    { name: 'Spice Garden',    type: 'Thai',        lat: 47.510, lng: -122.225 },
  ];

  restaurants.forEach(({ name, type, lat, lng }) => {
    L.marker([lat, lng], { icon: makeIcon(type) })
      .addTo(initialMap.value)
      .bindPopup(`<b>${name}</b><br>${type}`);
  });
});
</script>