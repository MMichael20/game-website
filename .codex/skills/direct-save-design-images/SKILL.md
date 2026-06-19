---
name: direct-save-design-images
description: Generate and save project design images as real files for this repo. Use when the user asks Codex to create, generate, save, revise, or manage game design images, concept art, character turnaround sheets, UI mockups, map/phone/airport/restaurant references, or any design asset that should be kept under assets/design-examples.
---

# Direct Save Design Images

## Overview

Use this skill for final design-image assets in `C:\Learning\game-website`. A chat-rendered image preview is not enough: final assets must exist as image files in the repo and must be visually verified before reporting completion.

## Default Destination

Save final project design images to:

```text
C:\Learning\game-website\assets\design-examples
```

Use another folder only when the user explicitly names one, such as `assets/character-reference`.

## Required Workflow

1. Choose a clear filename before generating.
2. Prefer a direct file-writing generation path for final assets.
3. Save the final image into the destination folder.
4. Open the saved image with visual inspection.
5. Confirm the saved image matches the requested design quality and subject.
6. Report the exact saved path.

Do not say an image is saved, done, or ready until steps 3-5 have succeeded.

## Direct-Save Rule

For final assets, avoid relying on image previews that only appear in chat. If the image generator produces a nice preview but does not expose a local file path, do one of these:

- Use a direct file-writing image generation path that can write the PNG to the project folder.
- Ask the user to enable or provide the missing direct-save capability, such as setting `OPENAI_API_KEY` for the imagegen CLI workflow.
- Clearly explain that the preview cannot be saved exactly from the current tool output.

Do not silently replace a high-quality preview with a lower-quality locally drawn image. Do not use a screenshot as the final source unless the user explicitly says that screenshot is the desired asset.

## File Naming

Use short descriptive filenames with version numbers:

```text
male-character-turnaround-v1.png
female-character-turnaround-v1.png
airport-exterior-v1.png
restaurant-street-v1.png
phone-ui-map-v1.png
```

If revising an existing asset, create the next version unless the user explicitly asks to overwrite.

## Verification

After saving:

- Check that the file exists and has nonzero size.
- Use `view_image` on the saved path.
- Verify subject, style, labels/text, and composition.
- If the saved file is wrong, do not present it as final; regenerate or explain the blocker.

## Reporting

Final responses for saved assets should include:

- The exact saved path.
- A brief note that the file was visually verified.
- An inline image preview when useful.
