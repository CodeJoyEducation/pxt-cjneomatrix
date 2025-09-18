// CJ NeoMatrix - fixed-height panels (8x32, 8x16, 8x8) using neopixel dependency
// Blocks/JS/Python for MakeCode micro:bit. Draw arrays, 5x8 text (with descenders), scrolling.
// MIT © 2025

//% color="#00bcd4" icon="\uf00a" block="CJ NeoMatrix"
namespace neomatrix {
    // Restrict to known-good panel widths (height is always 8)
    export enum PanelWidth {
        //% block="8×32"
        W32 = 32,
        //% block="8×16"
        W16 = 16,
        //% block="8×8"
        W8 = 8
    }

    let strip: neopixel.Strip = null
    let W = 0
    const H = 8
    let serpentine = false

    // ===== 5x8 FONT (columns, bit0=top .. bit7=bottom) =====
    // ASCII subset with clear 5x8 glyphs; distinct descenders for g/j/p/q/y.
    const FONT: { [key: string]: number[] } = (function () {
        const m: { [key: string]: number[] } = {}
        const d = (c: string, a: number[]) => m[c] = a

        // Space & punctuation
        d(" ", [0x00,0x00,0x00,0x00,0x00])
        d("!", [0x00,0x00,0x5F,0x00,0x00])
        d("\"",[0x00,0x07,0x00,0x07,0x00])
        d("#", [0x14,0x7F,0x14,0x7F,0x14])
        d("$", [0x24,0x2A,0x7F,0x2A,0x12])
        d("%", [0x23,0x13,0x08,0x64,0x62])
        d("&", [0x36,0x49,0x55,0x22,0x50])
        d("'", [0x00,0x05,0x03,0x00,0x00])
        d("(", [0x00,0x1C,0x22,0x41,0x00])
        d(")", [0x00,0x41,0x22,0x1C,0x00])
        d("*", [0x14,0x08,0x3E,0x08,0x14])
        d("+", [0x08,0x08,0x3E,0x08,0x08])
        d(",", [0x00,0x50,0x30,0x00,0x00])
        d("-", [0x08,0x08,0x08,0x08,0x08])
        d(".", [0x00,0x60,0x60,0x00,0x00])
        d("/", [0x20,0x10,0x08,0x04,0x02])

        // Digits 0-9 (5x8)
        d("0",[0x3E,0x51,0x49,0x45,0x3E])
        d("1",[0x00,0x42,0x7F,0x40,0x00])
        d("2",[0x42,0x61,0x51,0x49,0x46])
        d("3",[0x21,0x41,0x45,0x4B,0x31])
        d("4",[0x18,0x14,0x12,0x7F,0x10])
        d("5",[0x27,0x45,0x45,0x45,0x39])
        d("6",[0x3C,0x4A,0x49,0x49,0x30])
        d("7",[0x01,0x71,0x09,0x05,0x03])
        d("8",[0x36,0x49,0x49,0x49,0x36])
        d("9",[0x06,0x49,0x49,0x29,0x1E])

        d(":",[0x00,0x36,0x36,0x00,0x00])
        d(";",[0x00,0x56,0x36,0x00,0x00])
        d("<",[0x08,0x14,0x22,0x41,0x00])
        d("=",[0x14,0x14,0x14,0x14,0x14])
        d(">",[0x00,0x41,0x22,0x14,0x08])
        d("?",[0x02,0x01,0x51,0x09,0x06])
        d("@",[0x32,0x49,0x79,0x41,0x3E])

        // A-Z (5x8)
        d("A",[0x7E,0x11,0x11,0x11,0x7E])
        d("B",[0x7F,0x49,0x49,0x49,0x36])
        d("C",[0x3E,0x41,0x41,0x41,0x22])
        d("D",[0x7F,0x41,0x41,0x22,0x1C])
        d("E",[0x7F,0x49,0x49,0x49,0x41])
        d("F",[0x7F,0x09,0x09,0x09,0x01])
        d("G",[0x3E,0x41,0x49,0x49,0x7A])
        d("H",[0x7F,0x08,0x08,0x08,0x7F])
        d("I",[0x00,0x41,0x7F,0x41,0x00])
        d("J",[0x20,0x40,0x41,0x3F,0x01])
        d("K",[0x7F,0x08,0x14,0x22,0x41])
        d("L",[0x7F,0x40,0x40,0x40,0x40])
        d("M",[0x7F,0x02,0x0C,0x02,0x7F])
        d("N",[0x7F,0x04,0x08,0x10,0x7F])
        d("O",[0x3E,0x41,0x41,0x41,0x3E])
        d("P",[0x7F,0x09,0x09,0x09,0x06])
        d("Q",[0x3E,0x41,0x51,0x21,0x5E])
        d("R",[0x7F,0x09,0x19,0x29,0x46])
        d("S",[0x46,0x49,0x49,0x49,0x31])
        d("T",[0x01,0x01,0x7F,0x01,0x01])
        d("U",[0x3F,0x40,0x40,0x40,0x3F])
        d("V",[0x1F,0x20,0x40,0x20,0x1F])
        d("W",[0x7F,0x20,0x18,0x20,0x7F])
        d("X",[0x63,0x14,0x08,0x14,0x63])
        d("Y",[0x03,0x04,0x78,0x04,0x03])
        d("Z",[0x61,0x51,0x49,0x45,0x43])

        // punctuation
        d("[",[0x00,0x7F,0x41,0x41,0x00])
        d("\\",[0x02,0x04,0x08,0x10,0x20])
        d("]",[0x00,0x41,0x41,0x7F,0x00])
        d("^",[0x04,0x02,0x01,0x02,0x04])
        d("_",[0x40,0x40,0x40,0x40,0x40])
        d("`",[0x00,0x01,0x02,0x04,0x00])

        // a-z: mostly derived from uppercase; add descenders where appropriate
        // Simple legible set; tweak later if you want a stylized look.
        d("a",[0x20,0x54,0x54,0x54,0x78])       // 'a'
        d("b",[0x7F,0x48,0x44,0x44,0x38])
        d("c",[0x38,0x44,0x44,0x44,0x28])
        // 'd' (upright, no descender)
        d("d",[0x38,0x44,0x44,0x48,0x7F])
        d("e",[0x38,0x54,0x54,0x54,0x18])
        d("f",[0x08,0x7E,0x09,0x01,0x02])

        // 'g' with descender (bit7 set on middle columns)
        d("g",[0x3E,0xC9,0xC9,0xC9,0x3E])       // 0x80 added on cols 1..3

        // 'h'
        d("h",[0x7F,0x08,0x04,0x04,0x78])
        // 'i'
        d("i",[0x00,0x44,0x7D,0x40,0x00])
        // 'j' descender
        d("j",[0x00,0x40,0x40,0xBD,0x00])       // bit7 in column 3

        d("k",[0x7F,0x10,0x28,0x44,0x00])
        d("l",[0x00,0x41,0x7F,0x40,0x00])
        d("m",[0x7C,0x04,0x18,0x04,0x78])
        d("n",[0x7C,0x08,0x04,0x04,0x78])
        d("o",[0x38,0x44,0x44,0x44,0x38])

        // 'p' descender
        d("p",[0xFC,0x24,0x24,0x24,0x18])       // bottom stroke (bit7 set via 0xFC)

        // 'q' descender
        d("q",[0x18,0x24,0x24,0x24,0xFC])

        d("r",[0x7C,0x08,0x04,0x04,0x08])
        d("s",[0x48,0x54,0x54,0x54,0x20])
        d("t",[0x04,0x3F,0x44,0x40,0x20])

        d("u",[0x3C,0x40,0x40,0x20,0x7C])
        // 'v'
        d("v",[0x1C,0x20,0x40,0x20,0x1C])
        d("w",[0x3C,0x40,0x30,0x40,0x3C])
        d("x",[0x44,0x28,0x10,0x28,0x44])

        // 'y' descender
        d("y",[0x1C,0xA0,0xA0,0xA0,0x7C])       // 0xA0 sets bit5+7-ish tail feel

        d("z",[0x44,0x64,0x54,0x4C,0x44])

        // map any missing lowercases to uppercases
        const lowers = "abcdefghijklmnopqrstuvwxyz"
        for (let i = 0; i < lowers.length; i++) {
            const lc = lowers[i], uc = lowers[i].toUpperCase()
            if (!m[lc] && m[uc]) m[lc] = m[uc]
        }
        return m
    })();

    // ===== internals =====
    function idx(x: number, y: number): number {
        if (x < 0 || y < 0 || x >= W || y >= H) return -1
        const rowStart = y * W
        return serpentine && (y % 2 == 1) ? rowStart + (W - 1 - x) : rowStart + x
    }
    function ok(): boolean { return !!strip }

    // ===== API =====

    /**
     * Initialize an 8-row NeoPixel matrix at a given pin and size.
     * @param panelWidth one of 8×32, 8×16, 8×8
     * @param pin data pin
     * @param serp serpentine (zig-zag) wiring
     */
    //% block="init %panelWidth panel at %pin serpentine %serp"
    //% panelWidth.defl=PanelWidth.W32
    //% pin.defl=DigitalPin.P0
    //% serp.defl=true
    //% weight=100 blockGap=8
    export function init(panelWidth: PanelWidth, pin: DigitalPin, serp: boolean = true): void {
        W = panelWidth | 0
        serpentine = !!serp
        strip = neopixel.create(pin, W * H, NeoPixelMode.RGB)
        strip.clear()
        strip.show()
    }

    /**
     * Set brightness 0..255
     */
    //% block="set brightness %value"
    //% value.min=0 value.max=255 value.defl=40
    //% weight=95 blockGap=8
    export function brightness(value: number): void {
        if (!ok()) return
        strip.setBrightness(Math.clamp(0, 255, value | 0))
        strip.show()
    }

    /**
     * Clear the matrix.
     */
    //% block="clear matrix"
    //% weight=94 blockGap=8
    export function clear(): void {
        if (!ok()) return
        strip.clear()
        strip.show()
    }

    /**
     * Fill whole matrix with a color.
     */
    //% block="fill color %color"
    //% color.shadow="colorNumberPicker"
    //% weight=93 blockGap=8
    export function fill(color: number): void {
        if (!ok()) return
        strip.showColor(color)
    }

    /**
     * Set one pixel (x,y).
     */
    //% block="set pixel x %x y %y to %color"
    //% x.min=0 y.min=0 color.shadow="colorNumberPicker"
    //% weight=92 blockGap=8
    export function setPixel(x: number, y: number, color: number): void {
        if (!ok()) return
        const i = idx(x | 0, y | 0)
        if (i >= 0) strip.setPixelColor(i, color)
        strip.show()
    }

    /**
     * Draw from a row-major color array (length = width*8).
     */
    //% block="draw from color array %colors"
    //% colors.defl=createListWith()
    //% weight=90 blockGap=8
    export function drawArray(colors: number[]): void {
        if (!ok() || !colors || colors.length != W * H) return
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const i = idx(x, y)
                if (i >= 0) strip.setPixelColor(i, colors[y * W + x])
            }
        }
        strip.show()
    }

    /**
     * Show 5x8 text starting at (x,y). Clipped to panel.
     */
    //% block="show text %text in %color || at x %xOffset y %yOffset"
    //% expandableArgumentMode="toggle"
    //% color.shadow="colorNumberPicker"
    //% xOffset.defl=0 yOffset.defl=0
    //% weight=80 blockGap=8
    export function showText(text: string, color: number, xOffset: number = 0, yOffset: number = 0): void {
        if (!ok()) return
        drawTextInternal(text || "", color, xOffset | 0, yOffset | 0, false, 0)
        strip.show()
    }

    /**
     * Scroll 5x8 text R→L. Speed = ms per column.
     */
    //% block="scroll text %text in %color at speed %speed ms/col"
    //% color.shadow="colorNumberPicker"
    //% speed.min=1 speed.max=200 speed.defl=40
    //% weight=79 blockGap=8
    export function scrollText(text: string, color: number, speed: number = 40): void {
        if (!ok()) return
        drawTextInternal(text || "", color, 0, 0, true, Math.max(1, speed | 0))
    }

    /**
     * RGB helper (0..255 each).
     */
    //% block="rgb red %r green %g blue %b"
    //% r.min=0 r.max=255 g.min=0 g.max=255 b.min=0 b.max=255
    //% weight=70
    export function rgb(r: number, g: number, b: number): number {
        return neopixel.rgb(r | 0, g | 0, b | 0)
    }

    // ===== text internals =====
    function glyph(ch: string): number[] { return FONT[ch] || FONT[" "] }

    function drawTextInternal(text: string, color: number, x0: number, y0: number, scroll: boolean, speed: number): void {
        // Build columns: 5 per char + 1 space column
        let cols: number[] = []
        for (let i = 0; i < text.length; i++) {
            const g = glyph(text.charAt(i))
            for (let c = 0; c < g.length; c++) cols.push(g[c])
            cols.push(0x00)
        }

        if (!scroll) {
            const usable = Math.min(cols.length, Math.max(0, W - x0))
            for (let x = 0; x < usable; x++) {
                const bits = cols[x]
                for (let y = 0; y < H; y++) {
                    if (((bits >> y) & 1) == 0) continue
                    const i = idx(x + x0, y + y0)
                    if (i >= 0) strip.setPixelColor(i, color)
                }
            }
            return
        }

        // scroll right to left
        const total = cols.length
        for (let off = W; off > -total; off--) {
            strip.clear()
            for (let cx = 0; cx < total; cx++) {
                const sx = cx + off
                if (sx < 0 || sx >= W) continue
                const bits = cols[cx]
                for (let y = 0; y < H; y++) {
                    if (((bits >> y) & 1) == 0) continue
                    const i = idx(sx, y)
                    if (i >= 0) strip.setPixelColor(i, color)
                }
            }
            strip.show()
            basic.pause(speed)
        }
    }
}
