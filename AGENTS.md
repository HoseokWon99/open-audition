# AGENTS

## Overview

- **Name**: Open Audition
- **Description**: Simple desktop audio editor focused on theatre/play sound design highly inspired by adobe audition.

### Features

- Multitrack editing
- Precise waveform editing
- Fade/crossfade editing
- Essential effects: gain, eq, filter, reverb, delay, pitch shift, time stretching, noise reduction, normalization ...
- Keyframe for clip
- Save multitrack as xml

**This is NOT a DAW for music production. Priority is reliable theatrical sound editing workflow.**


## Skills

- **Languages**: TypeScript, Rust
- **Package Manager**: Pnpm, Cargo
- **Desktop**: Tauri
- **Frontend**: React, Tailwind, Zustand, Wavesurfer.js(audio visualization)
- **Time formatting**: Temporal API
- **Error Handling**: neverthrow
- **XML Parsing**: fast-xml-parser
- **Audio**: Web Audio API

## Commands

- `pnpm install` - Install frontend and Tauri CLI dependencies.
- `pnpm add <package>` - Add a runtime dependency.
- `pnpm add -D <package>` - Add a development dependency.
- `pnpm remove <package>` - Remove a dependency.
- `pnpm dev` - Start the Vite frontend dev server at `http://localhost:1420`.
- `pnpm tauri dev` - Run the desktop app in Tauri development mode.
- `pnpm build` - Type-check TypeScript and build the frontend into `dist/`.
- `pnpm tauri build` - Build the production desktop app bundle.
- `pnpm preview` - Preview the built frontend locally.
- `cd src-tauri && cargo check` - Check the Rust/Tauri backend.
- `cd src-tauri && cargo test` - Run Rust tests.
- `cd src-tauri && cargo fmt` - Format Rust code.
- `cd src-tauri && cargo clippy` - Run Rust lints.

## Conventions

## Rules

## References
