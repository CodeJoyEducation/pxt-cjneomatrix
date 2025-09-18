// NeoMatrix - lightweight NeoPixel matrix helper for micro:bit
// Works in Blocks, JavaScript, and Python in MakeCode
// Supports: configurable width/height (max 256 pixels total), array drawing, text and scrolling
// © 2025 MIT License

//% color="#00bcd4" icon="\uf00a" block="NeoMatrix"
namespace neomatrix {
    let strip: neopixel.Strip = null
    let W = 0
    let H = 0
    let serpentine = false
    let fitToHeight = false

    // 5x7 font (truncated here for brevity)...
    const FONT: { [key: string]: number[] } = (function () {
        const map: { [key: string]: number[] } = {}
        function def(c: string, cols: number[]) { map[c] = cols }
        def("A",[0x7E,0x11,0x11,0x11,0x7E])
        // ... all other glyphs ...
        const lowers = "abcdefghijklmnopqrstuvwxyz"
        for (let i = 0; i < lowers.length; i++) {
            map[lowers[i]] = map[lowers[i].toUpperCase()]
        }
        return map
    })();

    function idx(x: number, y: number): number {
        if (x < 0 || y < 0 || x >= W || y >= H) return -1
        const rowStart = y * W
        if (serpentine && (y % 2 == 1)) return rowStart + (W - 1 - x)
        return rowStart + x
    }
    function ensure(): void { if (!strip) basic.fail("NeoMatrix not initialized") }

    //% block="init matrix at %pin with width %width height %height serpentine %serp"
    //% pin.defl=DigitalPin.P0 width.min=1 width.max=32 height.min=1 height.max=32
    export function init(pin: DigitalPin, width: number, height: number, serp: boolean = false): void {
        if (width * height > 256) basic.fail("Max 256 pixels")
        W = width; H = height; serpentine = serp
        strip = neopixel.create(pin, W * H, NeoPixelMode.RGB)
        strip.clear(); strip.show()
    }

    //% block="set brightness %value" value.min=0 value.max=255 value.defl=40
    export function brightness(value: number): void {
        ensure(); strip.setBrightness(Math.clamp(0, 255, value)); strip.show()
    }

    //% block="clear matrix"
    export function clear(): void { ensure(); strip.clear(); strip.show() }

    //% block="fill color %color" color.shadow="colorNumberPicker"
    export function fill(color: number): void { ensure(); strip.showColor(color) }

    //% block="set pixel x %x y %y to %color" color.shadow="colorNumberPicker"
    export function setPixel(x: number, y: number, color: number): void {
        ensure(); const i = idx(x, y); if (i >= 0) strip.setPixelColor(i, color); strip.show()
    }

    //% block="draw from color array %colors"
    export function drawArray(colors: number[]): void {
        ensure()
        if (!colors || colors.length != W * H) basic.fail("Array must be width*height")
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const src = y * W + x; const i = idx(x, y)
            if (i >= 0) strip.setPixelColor(i, colors[src])
        }
        strip.show()
    }

    //% block="text fit to height %on" on.defl=true
    export function textFitToHeight(on: boolean): void { fitToHeight = !!on }

    //% block="show text %text in %color || at x %xOffset y %yOffset" color.shadow="colorNumberPicker"
    export function showText(text: string, color: number, xOffset: number = 0, yOffset: number = 0): void {
        ensure(); drawTextInternal(text, color, xOffset, yOffset, false, 0); strip.show()
    }

    //% block="scroll text %text in %color at speed %speed ms/col" color.shadow="colorNumberPicker"
    export function scrollText(text: string, color: number, speed: number = 40): void {
        ensure(); drawTextInternal(text, color, 0, 0, true, Math.max(1, speed))
    }

    function getGlyph(ch: string): number[] { return FONT[ch] || FONT[" "] }

    function drawTextInternal(text: string, color: number, x0: number, y0: number, scroll: boolean, speed: number): void {
        let columns: number[] = []
        for (let n = 0; n < text.length; n++) { const g = getGlyph(text.charAt(n)); for (let col of g) columns.push(col); columns.push(0) }

        const targetRows = Math.min(H, fitToHeight ? 8 : 7)
        function mapY(y7: number): number { return targetRows <= 7 ? y7 : Math.idiv(y7 * targetRows, 7) }

        if (!scroll) {
            for (let x = 0; x < Math.min(columns.length, W - x0); x++) {
                const bits = columns[x]
                for (let sy = 0; sy < 7; sy++) {
                    if (((bits >> sy) & 1) == 0) continue
                    const ty = mapY(sy) + y0
                    if (ty < H) { const i = idx(x + x0, ty); if (i >= 0) strip.setPixelColor(i, color) }
                }
            }
            return
        }

        for (let offset = W; offset > -columns.length; offset--) {
            strip.clear()
            for (let colx = 0; colx < columns.length; colx++) {
                const screenX = colx + offset; if (screenX < 0 || screenX >= W) continue
                const bits = columns[colx]
                for (let sy = 0; sy < 7; sy++) {
                    if (((bits >> sy) & 1) == 0) continue
                    const ty = mapY(sy); if (ty < H) { const i = idx(screenX, ty); if (i >= 0) strip.setPixelColor(i, color) }
                }
            }
            strip.show(); basic.pause(speed)
        }
    }

    //% block="rgb red %r green %g blue %b"
    export function rgb(r: number, g: number, b: number): number { return neopixel.rgb(r, g, b) }

    //% blockHidden=true
    export function stripRef(): neopixel.Strip { ensure(); return strip }
}
