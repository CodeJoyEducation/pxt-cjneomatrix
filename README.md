# NeoMatrix (micro:bit MakeCode)

A tiny helper to treat a NeoPixel strip as a 2D matrix with width/height. It supports:
- Blocks **and** JavaScript/Python
- Up to **256** total pixels
- Drawing full-color scenes from an array
- Upper/lowercase text (lowercase accepted; rendered with uppercase glyphs for compactness)
- Smooth **scrolling** text with adjustable speed
- Optional **serpentine** wiring
- **Text fit to height** option to stretch 5×7 glyphs up to 8 rows (great for 8×N matrices)

> Requires the standard `neopixel` extension (declared in `pxt.json`).

## Blocks
- **init matrix** – choose pin, width, height, and whether wiring is *serpentine*
- **text fit to height** – stretch glyphs to fill up to 8 rows
- **set brightness**
- **clear matrix**
- **fill color**
- **set pixel x,y to color**
- **draw from color array** (row-major array of length width×height)
- **show text** (static)
- **scroll text** (animated)
- **rgb** helper

## Examples

### JavaScript
```ts
neomatrix.init(DigitalPin.P0, 32, 8, true)
neomatrix.textFitToHeight(true)
neomatrix.brightness(40)
neomatrix.scrollText("Hello, world!", neomatrix.rgb(255, 120, 0), 35)
```
