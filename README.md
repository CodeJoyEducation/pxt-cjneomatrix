# CJ NeoMatrix (8×32)

MakeCode extension for **horizontal text** on an **8×32 NeoPixel matrix** (x=8, y=32).

- Static text (single color, per-character colors, or **gradient**)
- **Scrolling** text (single, per-character, or **gradient**) with loop + gap
- **Brightness** on init
- Panel **gradients** (background)
- **Swirling** color effect over static text
- Works in **Blocks** and **JavaScript**

## Install

In MakeCode (micro:bit):

1. **Extensions** → search `github:CodeJoyEducation/pxt-cjneomatrix`  
   *(or import the repo URL)*

> Requires extension **NeoPixel** (this package depends on it).

## Quick Start (Blocks)

- **Init**: `init 8×32 at P0 serpentine true brightness 60`
- **Static**: `show text "HELLO" in color`
- **Gradient text**: `show text "HELLO" as gradient from (red) to (cyan) horizontal`
- **Scroll**: `scroll loop "MARQUEE " in (orange) 35 ms/col gap 300 ms loops -1`
- **Stop**: `stop animations`
- **Panel gradient**: `fill panel gradient from (navy) to (teal) horizontal`
- **Swirl**: `swirl colors over text "JOY" frame 40 ms duration 4000 ms hue speed 160 scale 12`

## APIs (JS)

```ts
cjneomatrix.init(DigitalPin.P0, true, 60)
cjneomatrix.showText("HELLO", cjneomatrix.rgb(0,255,120))
cjneomatrix.showTextColors("Hi!", [cjneomatrix.rgb(255,0,0), cjneomatrix.rgb(255,165,0)])
cjneomatrix.showTextGradient("HELLO", cjneomatrix.rgb(255,0,0), cjneomatrix.rgb(0,200,255), cjneomatrix.GradientMode.Horizontal)

cjneomatrix.scrollOnce("CODE", cjneomatrix.rgb(0,200,255), 35)
cjneomatrix.scrollOnceColors("CODE", [cjneomatrix.rgb(255,0,0), cjneomatrix.rgb(255,165,0)], 35)
cjneomatrix.scrollOnceGradient("CODE", cjneomatrix.rgb(255,0,0), cjneomatrix.rgb(255,255,0), cjneomatrix.GradientMode.Diag, 35)

control.inBackground(function () {
  cjneomatrix.scrollLoopGradient("MARQUEE ", cjneomatrix.rgb(0,150,255), cjneomatrix.rgb(255,0,200), cjneomatrix.GradientMode.Horizontal, 35, 300, -1)
})
// cancel:
cjneomatrix.stopAnimations()
