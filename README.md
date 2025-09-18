# NeoMatrix (micro:bit MakeCode)

A helper extension to treat a NeoPixel strip as a 2D matrix with width/height.  

## Features
- Works in **Blocks**, JavaScript, and Python.
- Up to **256 total pixels** (e.g. 8×32).
- Draw full-color scenes from an array.
- Upper/lowercase text (lowercase mapped to uppercase glyphs).
- Smooth **scrolling text** with adjustable speed.
- **Text fit to height** toggle to stretch 5×7 glyphs to 8 rows (for 8×N panels).
- Optional **serpentine wiring**.

## Example (JavaScript)
```ts
neomatrix.init(DigitalPin.P0, 32, 8, true)
neomatrix.textFitToHeight(true)
neomatrix.brightness(40)
neomatrix.scrollText("Hello world!", neomatrix.rgb(255, 120, 0), 35)
