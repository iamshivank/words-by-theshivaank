-- Default site settings. Everything here is editable from /desk/settings.
INSERT INTO site_settings (data) VALUES ('{
  "siteName": "Words",
  "byline": "By theshivaank",
  "tagline": "A quiet place to think in sentences.",
  "displayName": "Shivank",
  "about": "",
  "social": [],
  "hero": { "imageUrl": null, "overlayDarkness": 0.55, "grainIntensity": 0.06 },
  "appearance": { "theme": "noir", "accentHue": null, "bodyFont": "serif", "baseFontSize": 19 },
  "writing": { "dailyWordGoal": 500, "reminderText": "A few honest sentences are enough." },
  "landing": { "sections": [
    { "id": "hero", "enabled": true },
    { "id": "latest", "enabled": true },
    { "id": "about", "enabled": true }
  ] }
}'::jsonb);
