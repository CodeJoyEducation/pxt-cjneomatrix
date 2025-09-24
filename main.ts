/**
 * CJ NeoMatrix – 8×32 horizontal text on NeoPixel (static / scrolling / gradients / effects)
 * Requires the official "neopixel" extension.
 * MIT © 2025 CodeJoyEducation
 */

//% color="#00BCD4" icon="\uf00a" block="CJ NeoMatrix"
namespace cjneomatrix {

    // --- fixed matrix config (8×32; x=8, y=32) ---
    const W = 8
    const H = 32

    let strip: neopixel.Strip = null
    let serpentine = true
    let effectsRunning = false

    // ---------- Simulator guard ----------
    function isSim(): boolean {
        // In MakeCode, simulator uses serial 0; real hardware is non-zero.
        return control.deviceSerialNumber() === 0
    }
    function ensureStrip(): void {
        if (strip) return
        if (isSim()) {
            // Minimal no-op mock so simulator never crashes
            // @ts-ignore
            strip = <any>{
                setBrightness: (_: number) => {},
                clear: () => {},
                show: () => {},
                setPixelColor: (_: number, __: number) => {}
            }
        }
    }


    // ---------- Enums for dropdowns ----------
    export enum GradientMode {
        //% block="horizontal (along 32)"
        Horizontal = 0,
        //% block="vertical (along 8)"
        Vertical = 1,
        //% block="diagonal"
        Diag = 2
    }

    // ---------- Helpers ----------
    function ok(): boolean { return !!strip }

    function idx(x: number, y: number): number {
        if (x < 0 || y < 0 || x >= W || y >= H) return -1
        const rowStart = y * W
        return serpentine && (y % 2 === 1) ? rowStart + (W - 1 - x) : rowStart + x
    }

    function lerp(a:number,b:number,t:number){ return Math.floor(a + (b - a) * t) }

    function rgbLerp(c1:number,c2:number,t:number){
        const r1=(c1>>16)&255, g1=(c1>>8)&255, b1=c1&255
        const r2=(c2>>16)&255, g2=(c2>>8)&255, b2=c2&255
        return neopixel.rgb(
            lerp(r1,r2,t),
            lerp(g1,g2,t),
            lerp(b1,b2,t)
        )
    }

    function hsv(h:number,s:number,v:number){
        h=(h%360+360)%360
        const c=v*s, x=c*(1-Math.abs((h/60)%2-1)), m=v-c
        let r=0,g=0,b=0
        if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}
        else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}
        return neopixel.rgb(Math.floor((r+m)*255),Math.floor((g+m)*255),Math.floor((b+m)*255))
    }

    function gradientAt(x:number, y:number, c1:number, c2:number, mode: GradientMode) {
        let t = 0
        if (mode === GradientMode.Vertical) {
            t = W <= 1 ? 0 : x / (W - 1)
        } else if (mode === GradientMode.Diag) {
            t = (x + y) / (W - 1 + H - 1)
        } else {
            // horizontal along long axis (your fix)
            t = H <= 1 ? 0 : y / (H - 1)
        }
        if (t < 0) t = 0; else if (t > 1) t = 1
        return rgbLerp(c1, c2, t)
    }

    // ---------- Public: Setup ----------
    /**
     * Initialize the 8×32 matrix on a pin.
     * @param pin data pin for NeoPixel
     * @param serp true if rows snake back and forth (zig-zag)
     * @param brightness 0..255
     */
    //% block="init 8×32 at %pin serpentine %serp brightness %brightness"
    //% pin.defl=DigitalPin.P0 serp.defl=true brightness.min=0 brightness.max=255
    //% group="Setup" weight=100
    export function init(pin: DigitalPin, serp: boolean = true, brightness: number = 60) {
        serpentine = !!serp
        if (isSim()) {
            ensureStrip()
        } else {
            strip = neopixel.create(pin, W * H, NeoPixelMode.RGB)
            strip.setBrightness(Math.clamp(0, 255, Math.floor(brightness)))
            strip.clear(); strip.show()
        }

        // serpentine = !!serp
        // strip = neopixel.create(pin, W * H, NeoPixelMode.RGB)
        // strip.setBrightness(Math.clamp(0, 255, Math.floor(brightness)))
        // strip.clear(); strip.show()
    }

    /**
     * Set brightness (0..255)
     */
    //% block="set brightness %value"
    //% value.min=0 value.max=255
    //% group="Setup" weight=99
    export function setBrightness(value: number) {
        ensureStrip()
        if (!ok()) return
        strip.setBrightness(Math.clamp(0, 255, Math.floor(value)))
        strip.show()
    }

    /**
     * Clear the panel
     */
    //% block="clear"
    //% group="Setup" weight=98
    export function clear() {
        ensureStrip()
        if (!ok()) return
        strip.clear(); strip.show()
    }


    /**
     * Make an RGB color
     */
    //% block="rgb red %r green %g blue %b"
    //% r.min=0 r.max=255 g.min=0 g.max=255 b.min=0 b.max=255
    //% group="Setup" weight=97
    export function rgb(r:number,g:number,b:number):number { return neopixel.rgb(Math.floor(r),Math.floor(g),Math.floor(b)) }

    // ---------- Text Core (5×8 font, horizontal layout across 32) ----------
    const CHAR_W = 5
    const CHAR_H = 8
    const HSPACE = 1

    // Pack lit pixels for static centered text; optional callback for color choice
    function drawCentered(text: string, colorOf: (x:number,y:number,i:number)=>number) {
        strip.clear()

        const n = text.length
        const totalW = n > 0 ? n * CHAR_W + (n - 1) * HSPACE : 0

        // center along 32 (y axis)
        let y0 = Math.idiv(H - totalW, 2)
        if (y0 < 0) y0 = 0

        // center vertically (x axis)
        const x0 = Math.idiv(W - CHAR_H, 2)

        for (let i = 0; i < n; i++) {
            const g = glyph(text.charAt(i))
            const baseY = y0 + i * (CHAR_W + HSPACE)
            for (let gx = 0; gx < CHAR_W; gx++) {
                const bits = g[gx] || 0
                const yy = baseY + gx
                if (yy < 0 || yy >= H) continue
                for (let gy = 0; gy < CHAR_H; gy++) {
                    if (((bits >> gy) & 1) === 0) continue
                    const xx = x0 + gy
                    const j = idx(xx, yy)
                    if (j >= 0) strip.setPixelColor(j, colorOf(xx, yy, i))
                }
            }
        }
        strip.show()
    }

    // Build a stream of columns (bits) for scrolling a string
    function buildCols(text: string) {
        const cols: number[] = []
        for (let i = 0; i < text.length; i++) {
            const g = glyph(text.charAt(i))
            for (let gx = 0; gx < CHAR_W; gx++) cols.push(g[gx] || 0)
            cols.push(0) // spacer
        }
        return cols
    }

    // ---------- Public: Static Text ----------
    /**
     * Show centered text in a single color.
     */
    //% block="show text %text in color %color"
    //% color.shadow="colorNumberPicker"
    //% group="Text (Static)" weight=90
    export function showText(text: string, color: number) {
        ensureStrip()
        if (!ok()) return
        drawCentered(text || "", (_x,_y,_i)=>color)
    }

    /**
     * Show centered text with per-character colors.
     * If colors list is shorter, the last color is reused.
     */
    //% block="show text %text with colors %colors"
    //% group="Text (Static)" weight=89
    export function showTextColors(text: string, colors: number[]) {
        ensureStrip()
        if (!ok()) return
        const arr = colors || []
        drawCentered(text || "", (_x,_y,i)=> (i < arr.length ? arr[i] : (arr.length ? arr[arr.length-1] : rgb(255,255,255))))
    }

    /**
     * Show centered text with a gradient (panel-relative).
     */
    //% block="show text %text as gradient from %c1 to %c2 | %mode"
    //% c1.shadow="colorNumberPicker" c2.shadow="colorNumberPicker"
    //% mode.defl=GradientMode.Horizontal
    //% group="Text (Static)" weight=88
    export function showTextGradient(text: string, c1: number, c2: number, mode: GradientMode = GradientMode.Horizontal) {
        ensureStrip()
        if (!ok()) return
        drawCentered(text || "", (x,y,_i)=> gradientAt(x,y,c1,c2,mode))
    }

    /**
     * Animate a swirling rainbow over the centered text for a duration.
     */
    //% block="swirl colors over text %text | frame %msPerFrame ms | duration %durationMs ms | hue speed %hueSpeed | scale %scale"
    //% msPerFrame.defl=40 durationMs.defl=3000 hueSpeed.defl=120 scale.defl=10
    //% group="Effects (Static)" weight=80
    export function swirlText(text: string, msPerFrame: number = 40, durationMs: number = 3000, hueSpeed: number = 120, scale: number = 10) {
        if (!ok()) return

        const coords: number[] = []
        strip.clear()

        const n = text.length
        const totalW = n > 0 ? n*CHAR_W + (n-1)*HSPACE : 0
        let y0 = Math.idiv(H - totalW, 2); if (y0 < 0) y0 = 0
        const x0 = Math.idiv(W - CHAR_H, 2)

        for (let i = 0; i < n; i++) {
            const g = glyph(text.charAt(i))
            const baseY = y0 + i*(CHAR_W + HSPACE)
            for (let gx = 0; gx < CHAR_W; gx++) {
                const bits = g[gx] || 0
                const yy = baseY + gx; if (yy < 0 || yy >= H) continue
                for (let gy = 0; gy < CHAR_H; gy++) {
                    if (((bits >> gy) & 1) === 0) continue
                    const xx = x0 + gy
                    coords.push((xx<<8) | yy)
                }
            }
        }

        effectsRunning = true
        const cx = (W-1)/2
        const cy = (H-1)/2
        const frames = Math.max(1, Math.idiv(durationMs, Math.max(1, Math.floor(msPerFrame))))

        for (let f = 0; f < frames && effectsRunning; f++) {
            strip.clear()
            const t = control.millis() / 1000
            for (let k = 0; k < coords.length; k++) {
                const packed = coords[k]
                const x = (packed>>8)&255
                const y = packed&255
                const dx = (x - cx)
                const dy = (y - cy)
                const ang = Math.atan2(dy, dx)
                const dist = Math.sqrt(dx*dx + dy*dy)
                const hue = (ang*180/Math.PI) + t*hueSpeed + dist*scale
                const col = hsv(hue, 1, 1)
                const j = idx(x, y)
                if (j >= 0) strip.setPixelColor(j, col)
            }
            strip.show()
            basic.pause(Math.max(1, Math.floor(msPerFrame)))
        }
        effectsRunning = false
    }

    // ---------- Public: Scrolling ----------
    /**
     * Scroll text once (right→left) in a single color.
     */
    //% block="scroll once %text in %color speed %msPerCol ms/col"
    //% color.shadow="colorNumberPicker" msPerCol.defl=40
    //% group="Scrolling" weight=70
    export function scrollOnce(text: string, color: number, msPerCol: number = 40) {
        ensureStrip()
        if (!ok()) return
        scrollSolid(text || "", [], color, Math.max(1, Math.floor(msPerCol)))
    }

    /**
     * Scroll text once (per-character colors). If list is short, last color repeats.
     */
    //% block="scroll once %text with colors %colors speed %msPerCol ms/col"
    //% msPerCol.defl=40
    //% group="Scrolling" weight=69
    export function scrollOnceColors(text: string, colors: number[], msPerCol: number = 40) {
        ensureStrip()
        if (!ok()) return
        scrollSolid(text || "", colors || [], rgb(255,255,255), Math.max(1, Math.floor(msPerCol)))
    }

    /**
     * Scroll gradient text once (gradient fixed to panel).
     */
    //% block="scroll once %text as gradient from %c1 to %c2 | %mode | %msPerCol ms/col"
    //% c1.shadow="colorNumberPicker" c2.shadow="colorNumberPicker"
    //% mode.defl=GradientMode.Horizontal msPerCol.defl=40
    //% group="Scrolling" weight=68
    export function scrollOnceGradient(text: string, c1: number, c2: number, mode: GradientMode = GradientMode.Horizontal, msPerCol: number = 40) {
        ensureStrip()
        if (!ok()) return
        scrollGradient(text || "", c1, c2, mode, Math.max(1, Math.floor(msPerCol)))
    }

    /**
     * Scroll repeatedly (loops < 0 for infinite). Optional pause between loops.
     */
    //% block="scroll loop %text in %color | %msPerCol ms/col | gap %gapMs ms | loops %loops"
    //% color.shadow="colorNumberPicker" msPerCol.defl=40 gapMs.defl=0 loops.defl=-1
    //% group="Scrolling" weight=67
    export function scrollLoop(text: string, color: number, msPerCol: number = 40, gapMs: number = 0, loops: number = -1) {
        ensureStrip()
        if (!ok()) return
        effectsRunning = true
        let k = 0
        const ms = Math.max(1, Math.floor(msPerCol))
        const gap = Math.max(0, Math.floor(gapMs))
        while (effectsRunning && (loops < 0 || k < loops)) {
            scrollSolid(text || "", [], color, ms)
            if (!effectsRunning) break
            if (gap > 0) basic.pause(gap)
            k++
        }
    }

    /**
     * Scroll repeatedly with per-character colors.
     */
    //% block="scroll loop %text with colors %colors | %msPerCol ms/col | gap %gapMs ms | loops %loops"
    //% msPerCol.defl=40 gapMs.defl=0 loops.defl=-1
    //% group="Scrolling" weight=66
    export function scrollLoopColors(text: string, colors: number[], msPerCol: number = 40, gapMs: number = 0, loops: number = -1) {
        ensureStrip()
        if (!ok()) return
        effectsRunning = true
        let k = 0
        const ms = Math.max(1, Math.floor(msPerCol))
        const gap = Math.max(0, Math.floor(gapMs))
        while (effectsRunning && (loops < 0 || k < loops)) {
            scrollSolid(text || "", colors || [], rgb(255,255,255), ms)
            if (!effectsRunning) break
            if (gap > 0) basic.pause(gap)
            k++
        }
    }

    /**
     * Scroll repeatedly with gradient text.
     */
    //% block="scroll loop %text as gradient from %c1 to %c2 | %mode | %msPerCol ms/col | gap %gapMs ms | loops %loops"
    //% c1.shadow="colorNumberPicker" c2.shadow="colorNumberPicker"
    //% mode.defl=GradientMode.Horizontal msPerCol.defl=40 gapMs.defl=0 loops.defl=-1
    //% group="Scrolling" weight=65
    export function scrollLoopGradient(text: string, c1: number, c2: number, mode: GradientMode = GradientMode.Horizontal, msPerCol: number = 40, gapMs: number = 0, loops: number = -1) {
        ensureStrip()
        if (!ok()) return
        effectsRunning = true
        let k = 0
        const ms = Math.max(1, Math.floor(msPerCol))
        const gap = Math.max(0, Math.floor(gapMs))
        while (effectsRunning && (loops < 0 || k < loops)) {
            scrollGradient(text || "", c1, c2, mode, ms)
            if (!effectsRunning) break
            if (gap > 0) basic.pause(gap)
            k++
        }
    }

    /**
     * Stop any ongoing scroll/animation ASAP.
     */
    //% block="stop animations"
    //% group="Scrolling" weight=60
    export function stopAnimations() { effectsRunning = false }

    // ---------- Public: Panel Effects ----------
    /**
     * Fill the whole panel with a gradient.
     */
    //% block="fill panel gradient from %c1 to %c2 | %mode"
    //% c1.shadow="colorNumberPicker" c2.shadow="colorNumberPicker"
    //% mode.defl=GradientMode.Horizontal
    //% group="Panel" weight=50
    export function fillGradient(c1: number, c2: number, mode: GradientMode = GradientMode.Horizontal) {
        ensureStrip()
        if (!ok()) return
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const j = idx(x,y)
                if (j >= 0) strip.setPixelColor(j, gradientAt(x, y, c1, c2, mode))
            }
        }
        strip.show()
    }

    // ---------- Internal scroll cores ----------
    function scrollSolid(text: string, colors: number[], fallbackColor: number, msPerCol: number) {
        const cols = buildCols(text)
        if (cols.length === 0) return
        effectsRunning = true
        const x0 = Math.idiv(W - CHAR_H, 2)

        const endOffset = isSim() ? -Math.min(cols.length, 40) : -cols.length
        for (let offset = H; offset > -cols.length && effectsRunning; offset--) {
            strip.clear()
            for (let sy = 0; sy < H; sy++) {
                const ci = sy - offset
                if (ci < 0 || ci >= cols.length) continue
                const bits = cols[ci]
                const colr = (ci < 0) ? 0 : (colors.length ? (colors[Math.min(colors.length-1, Math.idiv(ci, CHAR_W+1))] || fallbackColor) : fallbackColor)
                if (!bits || colr === 0) continue
                for (let gy = 0; gy < CHAR_H; gy++) {
                    if (((bits >> gy) & 1) === 0) continue
                    const xx = x0 + gy
                    const j = idx(xx, sy)
                    if (j >= 0) strip.setPixelColor(j, colr)
                }
            }
            strip.show()
            basic.pause(msPerCol)
        }
    }

    function scrollGradient(text: string, c1: number, c2: number, mode: GradientMode, msPerCol: number) {
        const cols = buildCols(text)
        if (cols.length === 0) return
        effectsRunning = true
        const x0 = Math.idiv(W - CHAR_H, 2)

        const endOffset = isSim() ? -Math.min(cols.length, 40) : -cols.length
        for (let offset = H; offset > -cols.length && effectsRunning; offset--) {
            strip.clear()
            for (let sy = 0; sy < H; sy++) {
                const ci = sy - offset
                if (ci < 0 || ci >= cols.length) continue
                const bits = cols[ci]
                if (!bits) continue
                const col = gradientAt(x0, sy, c1, c2, mode) // panel-relative
                for (let gy = 0; gy < CHAR_H; gy++) {
                    if (((bits >> gy) & 1) === 0) continue
                    const xx = x0 + gy
                    const j = idx(xx, sy)
                    if (j >= 0) strip.setPixelColor(j, col)
                }
            }
            strip.show()
            basic.pause(msPerCol)
        }
    }

    // ---------- 5×8 font (columns; bit0=top .. bit7=bottom) ----------
    const FONT: { [key: string]: number[] } = (function () {
        const m: { [k: string]: number[] } = {}
        const d = (c: string, a: number[]) => m[c] = a

        // space & punctuation
        d(" ",[0,0,0,0,0])
        d("!",[0x00,0x00,0x5F,0x00,0x00])
        d("\"",[0x00,0x07,0x00,0x07,0x00])
        d("#",[0x14,0x7F,0x14,0x7F,0x14])
        d("$",[0x24,0x2A,0x7F,0x2A,0x12])
        d("%",[0x23,0x13,0x08,0x64,0x62])
        d("&",[0x36,0x49,0x55,0x22,0x50])
        d("'",[0x00,0x05,0x03,0x00,0x00])
        d("(",[0x00,0x1C,0x22,0x41,0x00])
        d(")",[0x00,0x41,0x22,0x1C,0x00])
        d("*",[0x14,0x08,0x3E,0x08,0x14])
        d("+",[0x08,0x08,0x3E,0x08,0x08])
        d(",",[0x00,0x50,0x30,0x00,0x00])
        d("-",[0x08,0x08,0x08,0x08,0x08])
        d(".",[0x00,0x60,0x60,0x00,0x00])
        d("/",[0x20,0x10,0x08,0x04,0x02])
        // backslash needs escaping
        d("\\",[0x02,0x04,0x08,0x10,0x20])
        d(":",[0x00,0x36,0x36,0x00,0x00])
        d(";",[0x00,0x56,0x36,0x00,0x00])
        d("<",[0x08,0x14,0x22,0x41,0x00])
        d("=", [0x14,0x14,0x14,0x14,0x14])
        d(">",[0x00,0x41,0x22,0x14,0x08])
        d("?",[0x02,0x01,0x51,0x09,0x06])
        d("@",[0x32,0x49,0x79,0x41,0x3E])

        // digits
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

        // A–Z
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

        // punctuation tails
        d("[",[0x00,0x7F,0x41,0x41,0x00])
        d("]",[0x00,0x41,0x41,0x7F,0x00])
        d("^",[0x04,0x02,0x01,0x02,0x04])
        d("_",[0x40,0x40,0x40,0x40,0x40])
        d("`",[0x00,0x01,0x02,0x04,0x00])

        // a–z (descenders for g j p q y)
        d("a",[0x20,0x54,0x54,0x54,0x78])
        d("b",[0x7F,0x48,0x44,0x44,0x38])
        d("c",[0x38,0x44,0x44,0x44,0x28])
        d("d",[0x38,0x44,0x44,0x48,0x7F])
        d("e",[0x38,0x54,0x54,0x54,0x18])
        d("f",[0x08,0x7E,0x09,0x01,0x02])
        d("g",[0x3E,0xC9,0xC9,0xC9,0x3E])
        d("h",[0x7F,0x08,0x04,0x04,0x78])
        d("i",[0x00,0x44,0x7D,0x40,0x00])
        d("j",[0x00,0x40,0x40,0xBD,0x00])
        d("k",[0x7F,0x10,0x28,0x44,0x00])
        d("l",[0x00,0x41,0x7F,0x40,0x00])
        d("m",[0x7C,0x04,0x18,0x04,0x78])
        d("n",[0x7C,0x08,0x04,0x04,0x78])
        d("o",[0x38,0x44,0x44,0x44,0x38])
        d("p",[0xFC,0x24,0x24,0x24,0x18])
        d("q",[0x18,0x24,0x24,0x24,0xFC])
        d("r",[0x7C,0x08,0x04,0x04,0x08])
        d("s",[0x48,0x54,0x54,0x54,0x20])
        d("t",[0x04,0x3F,0x44,0x40,0x20])
        d("u",[0x3C,0x40,0x40,0x20,0x7C])
        d("v",[0x1C,0x20,0x40,0x20,0x1C])
        d("w",[0x3C,0x40,0x30,0x40,0x3C])
        d("x",[0x44,0x28,0x10,0x28,0x44])
        d("y",[0x1C,0xA0,0xA0,0xA0,0x7C])
        d("z",[0x44,0x64,0x54,0x4C,0x44])

        // map missing lowercases to uppercase
        const lowers = "abcdefghijklmnopqrstuvwxyz"
        for (let i = 0; i < lowers.length; i++) {
            const lc = lowers[i], uc = lowers[i].toUpperCase()
            if (!m[lc] && m[uc]) m[lc] = m[uc]
        }
        return m
    })()

    function glyph(ch: string): number[] { return FONT[ch] || FONT[" "] }

} // namespace
