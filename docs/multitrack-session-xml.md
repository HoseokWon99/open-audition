# Multitrack Session XML

Open Audition stores project-level information separately from multitrack session data. A project can include many multitrack sessions, so the project file should reference session files instead of embedding all timeline data.

Open Audition parses and validates `.oasx` files on the Rust/Tauri side. Frontend code should consume the parsed camelCase `Multitrack` DTO returned by Tauri commands instead of parsing XML directly.

This document describes the multitrack session file format only.

## File Type

Recommended multitrack session extension:

```text
.oasx
```

The file extension identifies the file as an Open Audition multitrack session. The file content is XML and must start with an XML declaration and doctype.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE multitrack>
```

## Root Element

```xml
<multitrack
  version="1.0"
  id="session-main-sfx"
  name="Main SFX"
  sampleRate="48000"
  bitDepth="24"
  createdAt="2026-05-18T10:15:00+09:00"
  updatedAt="2026-05-18T11:20:00+09:00"
  duration="92.5">
</multitrack>
```

Rules:

- `version` is required. Initial supported version is `1.0`.
- `id` identifies this multitrack session.
- Times are seconds as decimal numbers unless the field name ends in `At`.
- Date/time fields are ISO strings with an explicit offset.
- The session file is nondestructive. It references media and stores edits, not rendered audio.
- The session file must not serialize Web Audio nodes, waveform peak caches, transport state, or UI layout.

## Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE multitrack>
<multitrack
  version="1.0"
  id="session-main-sfx"
  name="Main SFX"
  sampleRate="48000"
  bitDepth="24"
  createdAt="2026-05-18T10:15:00+09:00"
  updatedAt="2026-05-18T11:20:00+09:00"
  duration="92.5">
  <media>
    <mediaAsset
      id="asset-thunder"
      name="Thunder Roll"
      path="../media/thunder.wav"
      duration="31.25"
      sampleRate="48000"
      channelCount="2"
      hash="sha256:abc123" />
  </media>
  <tracks>
    <track
      index="0"
      name="SFX"
      locked="false"
      muted="false"
      solo="false"
      gainDb="-3"
      pan="0">
      <clips>
        <clip
          id="clip-thunder-1"
          assetId="asset-thunder"
          timelineStart="12.5"
          sourceStart="2"
          duration="8.25"
          gainDb="-1.5">
          <fadeIn duration="0.75" curve="equalPower" />
          <fadeOut duration="1.25" curve="linear" />
          <keyframes>
            <keyframe target="gainDb">
              <point time="0" value="-8" curve="linear" />
              <point time="2.5" value="0" curve="linear" />
            </keyframe>
          </keyframes>
          <effects>
            <effect index="0" type="filter" enabled="true">
              <param name="mode" type="string">lowpass</param>
              <param name="frequencyHz" type="number">8000</param>
              <param name="q" type="number">0.707</param>
            </effect>
          </effects>
        </clip>
      </clips>
    </track>
  </tracks>
</multitrack>
```

## Elements

### `media`

The session owns the media references needed by its timeline.

```xml
<mediaAsset
  id="asset-thunder"
  name="Thunder Roll"
  path="../media/thunder.wav"
  duration="31.25"
  sampleRate="48000"
  channelCount="2"
  hash="sha256:abc123" />
```

`path` is stored as imported or normalized by the project layer. Missing-file resolution should happen above the XML parser.

### `tracks`

Tracks are timeline lanes, not full DAW mixer channels.

```xml
<track
  index="0"
  name="SFX"
  color="#5B8DEF"
  height="1"
  locked="false"
  muted="false"
  solo="false"
  gainDb="-3"
  pan="0">
  <clips>
  </clips>
</track>
```

Track fields:

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `index` | yes | integer | Zero-based track index and visible top-to-bottom order in the multitrack editor. Lower numbers appear higher. |
| `name` | yes | string | User-visible track name. |
| `color` | no | CSS hex color | UI color used for the track header and clips unless a clip overrides it. |
| `height` | no | decimal | Timeline lane display height as a positive numeric ratio. |
| `locked` | yes | boolean | Prevents accidental clip movement, trimming, and deletion on this track. |
| `muted` | yes | boolean | Excludes this track from playback and render unless explicitly overridden by export options. |
| `solo` | yes | boolean | Plays this track while muting non-solo tracks during preview. |
| `gainDb` | yes | decimal | Track gain in decibels, applied after clip gain, clip fades, and clip keyframes. |
| `pan` | yes | decimal | Stereo pan from `-1` left to `1` right. Use `0` for center. |

All tracks are audio tracks. The format does not define bus, folder, MIDI, or instrument track types.

Track child elements:

| Child | Required | Description |
| --- | --- | --- |
| `clips` | yes | Ordered list of clips placed on the track. |
| `effects` | no | Track-level effects. Reserved for later; clip-level effects should come first. |
| `automation` | no | Track-level automation lanes. Reserved for later. |

Track-level `effects` and `automation` are intentionally optional and not part of the first editing workflow. Open Audition should prioritize clip-level editing, fades, and reliable playback before adding mixer-like behavior.

### `clips`

Clips reference media assets and describe nondestructive timeline placement.

```xml
<clip
  id="clip-thunder-1"
  assetId="asset-thunder"
  name="Thunder Hit"
  locked="false"
  muted="false"
  timelineStart="12.5"
  sourceStart="2"
  duration="8.25"
  gainDb="-1.5"
  pan="0"
  playbackRate="1">
  <fadeIn duration="0.75" curve="equalPower" />
  <fadeOut duration="1.25" curve="linear" />
  <keyframes>
  </keyframes>
  <effects>
  </effects>
</clip>
```

Clip fields:

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | yes | string | Stable clip identifier. |
| `assetId` | yes | string | Referenced `mediaAsset` id. |
| `name` | no | string | User-visible clip label. If omitted, the app can display the media asset name. |
| `locked` | yes | boolean | Prevents accidental movement, trimming, deletion, and edit changes for this clip. |
| `muted` | yes | boolean | Excludes this clip from playback and render. |
| `timelineStart` | yes | decimal seconds | Clip start in multitrack session time. |
| `sourceStart` | yes | decimal seconds | Start offset into the referenced media asset. |
| `duration` | yes | decimal seconds | Audible duration after trimming. |
| `gainDb` | yes | decimal | Clip gain in decibels before track gain. |
| `pan` | yes | decimal | Clip pan from `-1` left to `1` right. Use `0` for center. |
| `playbackRate` | yes | decimal | Playback speed multiplier. Use `1` for normal speed. |

Clip child elements:

| Child | Required | Description |
| --- | --- | --- |
| `fadeIn` | no | Clip fade-in settings. |
| `fadeOut` | no | Clip fade-out settings. |
| `keyframes` | no | Clip-local automation lanes. |
| `effects` | no | Clip-level effects applied before track gain and pan. |

Crossfades are represented as overlapping clips with complementary fades. There is no separate crossfade element in the first format version.

`playbackRate` is a data field for time stretching or speed changes. The first implementation may only support `1`, but the field should exist so saved sessions can represent stretched clips later without changing the clip shape.

### `fadeIn` and `fadeOut`

Fades are clip-local gain ramps. They do not change the source media and do not move the clip boundary.

```xml
<fadeIn duration="0.75" curve="equalPower" />
<fadeOut duration="1.25" curve="linear" />
```

`fadeIn` fields:

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `duration` | yes | decimal seconds | Fade-in length from the clip start. Use `0` for no fade-in. |
| `curve` | yes | enum | Gain curve used for the fade-in. |

`fadeOut` fields:

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `duration` | yes | decimal seconds | Fade-out length ending at the clip end. Use `0` for no fade-out. |
| `curve` | yes | enum | Gain curve used for the fade-out. |

Initial curve values:

- `linear`
- `equalPower`
- `exponential`
- `logarithmic`

Fade rules:

- `fadeIn.duration + fadeOut.duration` should not exceed the clip `duration`.
- Crossfades are represented by overlapping clips with complementary fades.
- Equal-power fades are preferred for crossfades because they avoid an apparent level dip.

### `keyframes`

Keyframe times are clip-local seconds.

```xml
<keyframe target="gainDb">
  <point time="0" value="-8" curve="linear" />
  <point time="2.5" value="0" curve="linear" />
</keyframe>
```

Initial targets:

- `gainDb`
- `pan`

The keyframe point `curve` attribute is always `linear`. The parsed frontend DTO omits keyframe curve because it is not variable.

### `effects`

Effects are stored as data, not audio-node state.

```xml
<effects>
  <effect index="0" type="filter" enabled="true">
    <param name="mode" type="string">lowpass</param>
    <param name="frequencyHz" type="number">8000</param>
    <param name="q" type="number">0.707</param>
  </effect>
</effects>
```

`effect` fields:

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `index` | yes | integer | Zero-based effect order inside the clip effect chain. Effects run from lowest index to highest index. |
| `type` | yes | enum | Effect processor type. |
| `enabled` | yes | boolean | If `false`, preserve the effect settings but bypass processing. |

`param` fields:

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `name` | yes | string | Parameter name for the effect type. |
| `type` | yes | enum | Serialized value type. Initial values are `number`, `string`, and `boolean`. |
| text value | yes | typed scalar | The parameter value. It is parsed according to the `type` attribute. |

Effect params use explicit `type` attributes so values can round-trip without guessing. Unknown params should be preserved when possible, so newer effect settings are not destroyed by an older app version.

Initial effect types:

- `gain`
- `eq`
- `filter`
- `reverb`
- `delay`
- `pitchShift`
- `timeStretch`
- `noiseReduction`
- `normalize`

Effect rules:

- Clip-level effects run after source trimming and clip fades.
- Clip-level effects run before track gain and pan.
- Effects must not store Web Audio node state, impulse response binary data, or generated analysis caches.
- Large external resources, such as reverb impulse responses, should be referenced by media or resource id rather than embedded inline.

## Project Reference

The project file should reference a multitrack session with a path ending in `.oasx`.

```xml
<multitrackSession
  id="session-main-sfx"
  name="Main SFX"
  path="sessions/main-sfx.oasx"
  sampleRate="48000"
  duration="92.5" />
```

The project file owns the list of sessions. The multitrack session file owns one editable timeline.
