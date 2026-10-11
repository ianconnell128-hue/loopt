# Shorts Mobile App (YouTube Shorts Clone)

A cross-platform short-form vertical video feed mobile application built with React Native, Expo, `expo-video`, and Supabase.

---

## Features

- **Full-Screen Vertical Paging Feed:** Snappy 60fps vertical swipe between short videos.
- **Auto Play / Pause Engine:** Hardware-accelerated playback with `expo-video` that automatically plays the active video in viewport and pauses offscreen videos to save memory and battery.
- **Gestures & Animations:**
  - Single tap to toggle Play/Pause.
  - Double tap anywhere on screen to trigger the animated heart like burst.
- **Social Overlays:**
  - Dynamic like counter with instant heart toggle.
  - Interactive Comments sheet modal with live commenting.
  - Share sheet trigger.
  - Rotating audio disc & music track metadata.
  - Creator profile info and Subscribe/Follow toggle.
- **Video Uploader:**
  - Select vertical MP4 videos directly from device gallery (`expo-image-picker`).
  - Preview before posting.
  - Add custom title, hashtags, description, and audio title.
  - Uploads straight to Supabase Storage and updates the live feed immediately (with automatic offline persistence fallback).
- **Backend Ready (Supabase):**
  - PostgreSQL schema and Storage bucket setup included in `supabase-schema.sql`.

---

## Quick Start

### 1. Run the App
From the project directory:

```bash
cd /home/ian/shorts-app
npm start
```

- **Run in Android Emulator:** Press `a` in the terminal (uses the installed `medium_phone` emulator).
- **Run in Web Browser:** Press `w` in the terminal or run `npm run web`.
- **Run on your real phone:** Open the **Expo Go** app on your phone and scan the QR code displayed in the terminal.

---

### 2. Supabase Cloud Setup (Optional)
The app is immediately functional without any backend setup (it uses local persistence and offline storage). To connect your real cloud database and cloud storage:

1. Create a project at [https://supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard and run the script in `supabase-schema.sql`.
3. Add your Supabase credentials in `.env`:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Restart Expo (`npm start -c`).
