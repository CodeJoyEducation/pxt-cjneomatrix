// editor/pixelpicker.ts
/// <reference path="../pxteditor.d.ts" />
/// <reference path="../pxtpackages.d.ts" />

namespace pxtblockly {
    interface NeoPaintOptions extends Blockly.FieldCustomOptions {
        columns?: number; // default from value header, fallback 8
        rows?: number;    // default from value header, fallback 32
    }

    // Value format: "WxH;#RRGGBB,#RRGGBB,...|#RRGGBB,..."
    export class FieldCjNeoPaint extends Blockly.Field implements Blockly.FieldCustom {
        public isFieldCustom_ = true;
        protected columns = 8;
        protected rows = 32;
        protected color = "#ff0000";
        protected grid: HTMLDivElement;
        protected palette: HTMLInputElement;

        constructor(value: string, params?: NeoPaintOptions, validator?: Function) {
            super(value, validator);
            this.parseHeader(value);
            if (params) {
                if (params.columns) this.columns = +params.columns;
                if (params.rows) this.rows = +params.rows;
            }
        }

        private parseHeader(v: string) {
            if (!v) return;
            const semi = v.indexOf(";");
            if (semi > 0) {
                const head = v.substring(0, semi);
                const xIdx = head.indexOf("x");
                if (xIdx > 0) {
                    const w = parseInt(head.substring(0, xIdx));
                    const h = parseInt(head.substring(xIdx + 1));
                    if (w > 0) this.columns = w;
                    if (h > 0) this.rows = h;
                }
            }
        }

        initView() {
            // Compact text preview on the block
            this.setText("🎨 Pixel Art");
        }

        showEditor_() {
            const WidgetDiv = (Blockly as any).WidgetDiv as any;
            WidgetDiv.show(this, this.sourceBlock_.RTL, () => { });

            const div = document.createElement("div");
            div.style.padding = "8px";
            div.style.background = "white";
            div.style.border = "1px solid #ccc";
            div.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
            div.style.userSelect = "none";

            const top = document.createElement("div");
            top.style.display = "flex";
            top.style.alignItems = "center";
            top.style.gap = "8px";

            const sizeSel = document.createElement("select");
            ["8x8", "8x16", "8x32"].forEach(s => {
                const o = document.createElement("option");
                o.textContent = s; o.value = s;
                if (s === `${this.columns}x${this.rows}`) o.selected = true;
                sizeSel.appendChild(o);
            });

            const color = document.createElement("input");
            color.type = "color";
            color.value = this.color;
            this.palette = color;

            const clrBtn = document.createElement("button");
            clrBtn.textContent = "Clear";
            clrBtn.onclick = () => this.paintAll("#000000");

            top.appendChild(sizeSel);
            top.appendChild(document.createTextNode("Color:"));
            top.appendChild(color);
            top.appendChild(clrBtn);

            this.grid = document.createElement("div");
            this.grid.style.display = "grid";
            this.grid.style.gridTemplateColumns = `repeat(${this.columns}, 14px)`;
            this.grid.style.gridAutoRows = "14px";
            this.grid.style.gap = "2px";
            this.grid.style.marginTop = "8px";

            // Build grid from current value
            const data = this.deserialize(this.getValue());
            for (let y = 0; y < this.rows; y++) {
                for (let x = 0; x < this.columns; x++) {
                    const pix = document.createElement("div");
                    pix.style.width = "14px"; pix.style.height = "14px";
                    pix.style.background = data[y] && data[y][x] ? data[y][x] : "#000000";
                    pix.style.border = "1px solid #e0e0e0";
                    pix.style.cursor = "pointer";
                    pix.onmousedown = (ev) => {
                        const col = (ev.buttons & 1) ? color.value : "#000000";
                        (ev.currentTarget as HTMLDivElement).style.background = col;
                    };
                    pix.onmousemove = (ev) => {
                        if (ev.buttons & 1) {
                            (ev.currentTarget as HTMLDivElement).style.background = color.value;
                        } else if (ev.buttons & 2) {
                            (ev.currentTarget as HTMLDivElement).style.background = "#000000";
                        }
                    };
                    pix.oncontextmenu = (ev) => { ev.preventDefault(); }
                    this.grid.appendChild(pix);
                }
            }

            const btnRow = document.createElement("div");
            btnRow.style.display = "flex";
            btnRow.style.justifyContent = "flex-end";
            btnRow.style.gap = "8px";
            btnRow.style.marginTop = "8px";

            const cancel = document.createElement("button");
            cancel.textContent = "Cancel";
            cancel.onclick = () => WidgetDiv.hide();

            const ok = document.createElement("button");
            ok.textContent = "OK";
            ok.onclick = () => {
                // Resize if size changed
                const nv = sizeSel.value;
                const [nw, nh] = nv.split("x").map(s => parseInt(s));
                if (nw !== this.columns || nh !== this.rows) {
                    this.columns = nw; this.rows = nh;
                    this.grid.style.gridTemplateColumns = `repeat(${nw}, 14px)`;
                    // Rebuild blank
                    while (this.grid.firstChild) this.grid.removeChild(this.grid.firstChild);
                    for (let y = 0; y < nh; y++) {
                        for (let x = 0; x < nw; x++) {
                            const pix = document.createElement("div");
                            pix.style.width = "14px"; pix.style.height = "14px";
                            pix.style.background = "#000000";
                            pix.style.border = "1px solid #e0e0e0";
                            pix.style.cursor = "pointer";
                            pix.onmousedown = (ev) => {
                                const col = (ev.buttons & 1) ? color.value : "#000000";
                                (ev.currentTarget as HTMLDivElement).style.background = col;
                            };
                            pix.onmousemove = (ev) => {
                                if (ev.buttons & 1) (ev.currentTarget as HTMLDivElement).style.background = color.value;
                                else if (ev.buttons & 2) (ev.currentTarget as HTMLDivElement).style.background = "#000000";
                            };
                            pix.oncontextmenu = (ev) => { ev.preventDefault(); }
                            this.grid.appendChild(pix);
                        }
                    }
                }
                const serialized = this.serialize();
                this.setValue(serialized);
                WidgetDiv.hide();
            };

            btnRow.appendChild(cancel);
            btnRow.appendChild(ok);

            div.appendChild(top);
            div.appendChild(this.grid);
            div.appendChild(btnRow);

            WidgetDiv.DIV.appendChild(div);
        }

        private paintAll(col: string) {
            const kids = this.grid.children;
            for (let i = 0; i < kids.length; i++) (kids[i] as HTMLDivElement).style.background = col;
        }

        private deserialize(v: string): string[][] {
            const rows: string[][] = [];
            if (!v) return rows;
            let body = v;
            const semi = v.indexOf(";");
            if (semi > 0) body = v.substring(semi + 1);
            const r = body.split("|");
            for (let y = 0; y < this.rows; y++) {
                const row = (r[y] || "").split(",");
                rows[y] = [];
                for (let x = 0; x < this.columns; x++) {
                    const token = (row[x] || "").trim();
                    rows[y][x] = token || "#000000";
                }
            }
            return rows;
        }

        private serialize(): string {
            const parts: string[] = [];
            const kids = this.grid.children;
            let i = 0;
            for (let y = 0; y < this.rows; y++) {
                const row: string[] = [];
                for (let x = 0; x < this.columns; x++) {
                    const col = (kids[i++] as HTMLDivElement).style.background || "#000000";
                    // normalize to #RRGGBB
                    const hex = this.cssToHex(col);
                    row.push(hex);
                }
                parts.push(row.join(","));
            }
            return `${this.columns}x${this.rows};` + parts.join("|");
        }

        private cssToHex(css: string): string {
            // css may be "rgb(r,g,b)" or "#rrggbb"
            if (css.charAt(0) === "#") {
                if (css.length === 4) {
                    // #rgb -> #rrggbb
                    const r = css[1], g = css[2], b = css[3];
                    return `#${r}${r}${g}${g}${b}${b}`;
                }
                return css.toLowerCase();
            }
            const m = /rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)/i.exec(css);
            if (m) {
                const r = parseInt(m[1]).toString(16).padStart(2, "0");
                const g = parseInt(m[2]).toString(16).padStart(2, "0");
                const b = parseInt(m[3]).toString(16).padStart(2, "0");
                return `#${r}${g}${b}`;
            }
            return "#000000";
        }
    }

    // Register the editor under the name used in the block annotation
    (pxt as any).blocks?.registerFieldEditor?.("cjneopaint", FieldCjNeoPaint as any);
}
