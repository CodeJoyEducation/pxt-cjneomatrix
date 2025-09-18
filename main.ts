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

    // 5x7 font: each char is an array of 5 columns (LSB at top, 7 rows used)
    // For compactness, letters a-z reuse A-Z glyphs (lowercase supported as input).
    // Digits and some punctuation included; unknown -> blank.
    const FONT: { [key: string]: number[] } = (function () {
        const map: { [key: string]: number[] } = {}

        function def(c: string, cols: number[]) { map[c] = cols }

        // Space and punctuation
        def(" ", [0,0,0,0,0])
        def("!", [0x00,0x00,0x5F,0x00,0x00])
        def("\"",[0x00,0x07,0x00,0x07,0x00])
        def("#",[0x14,0x7F,0x14,0x7F,0x14])
        def("$",[0x24,0x2A,0x7F,0x2A,0x12])
        def("%",[0x23,0x13,0x08,0x64,0x62])
        def("&",[0x36,0x49,0x55,0x22,0x50])
        def("'",[0x00,0x05,0x03,0x00,0x00])
        def("(",[0x00,0x1C,0x22,0x41,0x00])
        def(")",[0x00,0x41,0x22,0x1C,0x00])
        def("*",[0x14,0x08,0x3E,0x08,0x14])
        def("+",[0x08,0x08,0x3E,0x08,0x08])
        def(",",[0x00,0x50,0x30,0x00,0x00])
        def("-",[0x08,0x08,0x08,0x08,0x08])
        def(".",[0x00,0x60,0x60,0x00,0x00])
        def("/",[0x20,0x10,0x08,0x04,0x02])

        // Digits 0-9
        def("0",[0x3E,0x51,0x49,0x45,0x3E])
        def("1",[0x00,0x42,0x7F,0x40,0x00])
        def("2",[0x42,0x61,0x51,0x49,0x46])
        def("3",[0x21,0x41,0x45,0x4B,0x31])
        def("4",[0x18,0x14,0x12,0x7F,0x10])
        def("5",[0x27,0x45,0x45,0x45,0x39])
        def("6",[0x3C,0x4A,0x49,0x49,0x30])
        def("7",[0x01,0x71,0x09,0x05,0x03])
        def("8",[0x36,0x49,0x49,0x49,0x36])
        def("9",[0x06,0x49,0x49,0x29,0x1E])

        def(":",[0x00,0x36,0x36,0x00,0x00])
        def(";",[0x00,0x56,0x36,0x00,0x00])
        def("<",[0x08,0x14,0x22,0x41,0x00])
        def("=",[0x14,0x14,0x14,0x14,0x14])
        def(">",[0x00,0x41,0x22,0x14,0x08])
        def("?",[0x02,0x01,0x51,0x09,0x06])
        def("@",[0x32,0x49,0x79,0x41,0x3E])

        // A-Z
        def("A",[0x7E,0x11,0x11,0x11,0x7E])
        def("B",[0x7F,0x49,0x49,0x49,0x36])
        def("C",[0x3E,0x41,0x41,0x41,0x22])
        def("D",[0x7F,0x41,0x41,0x22,0x1C])
        def("E",[0x7F,0x49,0x49,0x49,0x41])
        def("F",[0x7F,0x09,0x09,0x09,0x01])
        def("G",[0x3E,0x41,0x49,0x49,0x7A])
        def("H",[0x7F,0x08,0x08,0x08,0x7F])
        def("I",[0x00,0x41,0x7F,0x41,0x00])
        def("J",[0x20,0x40,0x41,0x3F,0x01])
        def("K",[0x7F,0x08,0x14,0x22,0x41])
        def("L",[0x7F,0x40,0x40,0x40,0x40])
        def("M",[0x7F,0x02,0x0C,0x02,0x7F])
        def("N",[0x7F,0x04,0x08,0x10,0x7F])
        def("O",[0x3E,0x41,0x41,0x41,0x3E])
        def("P",[0x7F,0x09,0x09,0x09,0x06])
        def("Q",[0x3E,0x41,0x51,0x21,0x5E])
        def("R",[0x7F,0x09,0x19,0x29,0x46])
        def("S",[0x46,0x49,0x49,0x49,0x31])
        def("T",[0x01,0x01,0x7F,0x01,0x01])
        def("U",[0x3F,0x40,0x40,0x40,0x3F])
        def("V",[0x1F,0x20,0x40,0x20,0x1F])
        def("W",[0x7F,0x20,0x18,0x20,0x7F])
        def("X",[0x63,0x14,0x08,0x14,0x63])
        def("Y",[0x03,0x04,0x78,0x04,0x03])
        def("Z",[0x61,0x51,0x49,0x45,0x43])

        // basic punctuation
        def("[",[0x00,0x7F,0x41,0x41,0x00])
        def("\\",[0x02,0x04,0x08,0x10,0x20])
        def("]",[0x00,0x41,0x41,0x7F,0x00])
        def("^",[0x04,0x02,0x01,0x02,0x04])
        def("_",[0x40,0x40,0x40,0x40,0x40])
        def("`",[0x00,0x01,0x02,0x04,0x00])
        def("{",[0x08,0x36,0x41,0x41,0x00])
        def("|",[0x00,0x00,0x7F,0x00,0x00])
        def("}",[0x00,0x41,0x41,0x36,0x08])

        // map lowercase to uppercase glyphs (still accepts lowercase input)
        const lowers = "abcdefghijklmnopqrstuvwxyz"
        for (let i = 0; i < lowers.length; i++) {
            const lc = lowers[i]
            const uc = lowers[i].toUpperCase()
            map[lc] = map[uc]
        }
        return map
    })();

    function idx(x: number, y: number): number {
        if (x < 0 || y < 0 || x >= W || y >= H) return -1
        const rowStart = y * W
        if (serpentine && (y % 2 == 1)) {
            return rowStart + (W - 1 - x)
        } else {
            return rowStart + x
        }
    }

    function ensure(): void {
        if (!strip) basic.fail("NeoMatrix not initialized")
    }

    /**
     * Initialize the NeoPixel matrix.
     * @param pin the pin the strip is connected to
     * @param width number of columns (pixels)
     * @param height number of rows (pixels)
     * @param serpentine wired in zig-zag rows (true) or straight rows (false)
     */
    //% block="init matrix at %pin with width %width height %height serpentine %serp"
    //% pin.defl=DigitalPin.P0 width.min=1 width.max=32 height.min=1 height.max=32
    //% serp.defl=false
    //% blockGap=8
    //% weight=100
    //% help=neomatrix/init
    export function init(pin: DigitalPin, width: number, height: number, serp: boolean = false): void {
        if (width < 1 || height < 1) return
        if (width * height > 256) basic.fail("Max 256 pixels")
        W = width
        H = height
        serpentine = serp
        strip = neopixel.create(pin, W * H, NeoPixelMode.RGB)
        strip.clear()
        strip.show()
    }

    /**
     * Set overall brightness 0..255
     */
    //% block="set brightness %value"
    //% value.min=0 value.max=255 value.defl=40
    //% blockGap=8
    //% weight=95
    //% help=neomatrix/brightness
    export function brightness(value: number): void {
        ensure()
        strip.setBrightness(Math.clamp(0, 255, value))
        strip.show()
    }

    /**
     * Clear the matrix (turn all pixels off)
     */
    //% block="clear matrix"
    //% blockGap=8
    //% weight=94
    //% help=neomatrix/clear
    export function clear(): void {
        ensure()
        strip.clear()
        strip.show()
    }

    /**
     * Fill the entire matrix with a single color.
     * @param color the color to fill
     */
    //% block="fill color %color"
    //% color.shadow="colorNumberPicker"
    //% blockGap=8
    //% weight=93
    //% help=neomatrix/fill
    export function fill(color: number): void {
        ensure()
        strip.showColor(color)
    }

    /**
     * Set a single pixel at (x,y) to a color.
     * @param x column (0..width-1)
     * @param y row (0..height-1)
     * @param color the color to set
     */
    //% block="set pixel x %x y %y to %color"
    //% x.min=0 y.min=0
    //% color.shadow="colorNumberPicker"
    //% blockGap=8
    //% weight=92
    //% help=neomatrix/set-pixel
    export function setPixel(x: number, y: number, color: number): void {
        ensure()
        const i = idx(x, y)
        if (i >= 0) strip.setPixelColor(i, color)
        strip.show()
    }

    /**
     * Draw from an array of RGB colors (row-major).
     * Array length must be width*height. Values are color numbers (use color picker or neopixel.rgb).
     * @param colors the array of colors
     */
    //% block="draw from color array %colors"
    //% colors.defl=createListWith()
    //% blockGap=8
    //% weight=90
    //% help=neomatrix/draw-array
    export function drawArray(colors: number[]): void {
        ensure()
        if (!colors || colors.length != W * H) {
            basic.fail("Array must be width*height")
            return
        }
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const src = y * W + x
                const i = idx(x, y)
                if (i >= 0) strip.setPixelColor(i, colors[src])
            }
        }
        strip.show()
    }

    /**
     * When enabled, 5×7 glyphs are stretched vertically to fill the matrix height (up to 8 rows).
     * Useful for 8×N matrices so text uses the full 8px height.
     * @param on turn fit-to-height on/off
     */
    //% block="text fit to height %on"
    //% on.defl=true
    //% weight=91
    //% help=neomatrix/text-fit-to-height
    export function textFitToHeight(on: boolean): void {
        fitToHeight = !!on
    }

    /**
     * Show static text at the left of the matrix (no scrolling). If text is wider than the matrix, it will be clipped.
     * Lowercase letters are accepted (rendered with uppercase glyphs).
     * @param text text to draw
     * @param color color of text
     * @param xOffset start column (default 0)
     * @param yOffset top row offset (default 0)
     */
    //% block="show text %text in %color || at x %xOffset y %yOffset"
    //% expandableArgumentMode="toggle"
    //% color.shadow="colorNumberPicker"
    //% xOffset.defl=0 yOffset.defl=0
    //% blockGap=8
    //% weight=80
    //% help=neomatrix/show-text
    export function showText(text: string, color: number, xOffset: number = 0, yOffset: number = 0): void {
        ensure()
        drawTextInternal(text, color, xOffset, yOffset, false, 0)
        strip.show()
    }

    /**
     * Scroll text across the matrix from right to left.
     * @param text text to scroll
     * @param color color of text
     * @param speed delay per column shift in ms (lower is faster)
     */
    //% block="scroll text %text in %color at speed %speed ms/col"
    //% color.shadow="colorNumberPicker"
    //% speed.min=1 speed.max=200 speed.defl=40
    //% blockGap=8
    //% weight=79
    //% help=neomatrix/scroll-text
    export function scrollText(text: string, color: number, speed: number = 40): void {
        ensure()
        drawTextInternal(text, color, 0, 0, true, Math.max(1, speed))
    }

    // ================ internals ================

    function getGlyph(ch: string): number[] {
        const g = FONT[ch]
        return g ? g : FONT[" "] // fallback
    }

    function drawTextInternal(text: string, color: number, x0: number, y0: number, scroll: boolean, speed: number): void {
        // Build a virtual buffer of columns for the whole string: char(5 cols) + 1 col space
        let columns: number[] = []
        for (let n = 0; n < text.length; n++) {
            const c = text.charAt(n)
            const glyph = getGlyph(c)
            for (let col = 0; col < glyph.length; col++) columns.push(glyph[col])
            columns.push(0x00) // spacer column
        }

        // Decide how many rows we will target for rendering the 7 source rows
        // We never render more than 8 rows (so 8×32 panels work perfectly).
        const targetRows = Math.min(H, fitToHeight ? 8 : 7)

        // Maps a source 7-row y (0..6) into 0..targetRows-1
        function mapY(y7: number): number {
            if (targetRows <= 7) return y7 // no scaling needed (<=7 tall)
            // integer stretch from 7 -> targetRows (e.g., 7 -> 8)
            return Math.idiv(y7 * targetRows, 7)
        }

        if (!scroll) {
            // static draw: place starting at x0
            for (let x = 0; x < Math.min(columns.length, W - x0); x++) {
                const bits = columns[x]
                for (let sy = 0; sy < 7; sy++) {
                    const on = ((bits >> sy) & 0x01) != 0
                    const ty = mapY(sy) + y0
                    if (ty < 0 || ty >= H) continue
                    const xx = x + x0
                    if (xx < 0 || xx >= W) continue
                    const i = idx(xx, ty)
                    if (i >= 0) strip.setPixelColor(i, on ? color : 0)
                }
            }
            return
        }

        // scrolling draw
        const totalCols = columns.length
        // Start off-screen on right
        for (let offset = W; offset > -totalCols; offset--) {
            strip.clear()
            for (let colx = 0; colx < totalCols; colx++) {
                const screenX = colx + offset
                if (screenX < 0 || screenX >= W) continue
                const bits = columns[colx]
                for (let sy = 0; sy < 7; sy++) {
                    if (((bits >> sy) & 0x01) == 0) continue
                    const ty = mapY(sy)
                    if (ty >= H) break
                    const i = idx(screenX, ty)
                    if (i >= 0) strip.setPixelColor(i, color)
                }
            }
            strip.show()
            basic.pause(speed)
        }
    }

    // ============= convenience helpers =============

    /**
     * Converts 0..255 RGB values to a color number.
     * @param r red 0..255, @param g green 0..255, @param b blue 0..255
     */
    //% block="rgb red %r green %g blue %b"
    //% r.min=0 r.max=255 g.min=0 g.max=255 b.min=0 b.max=255
    //% weight=70
    //% help=neomatrix/rgb
    export function rgb(r: number, g: number, b: number): number {
        return neopixel.rgb(r, g, b)
    }

    /**
     * Return the underlying strip (advanced)
     */
    //% blockHidden=true
    export function stripRef(): neopixel.Strip {
        ensure()
        return strip
    }
}
