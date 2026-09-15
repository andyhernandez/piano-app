/* @ds-bundle: {"format":4,"namespace":"KeyCadenceDesignSystem_017ec9","components":[{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Panel","sourcePath":"components/core/Panel.jsx"},{"name":"Pill","sourcePath":"components/core/Pill.jsx"},{"name":"SectionLabel","sourcePath":"components/core/SectionLabel.jsx"},{"name":"Toggle","sourcePath":"components/core/Toggle.jsx"},{"name":"LogTable","sourcePath":"components/data/LogTable.jsx"},{"name":"MeterRow","sourcePath":"components/data/MeterRow.jsx"},{"name":"SegmentBar","sourcePath":"components/data/SegmentBar.jsx"},{"name":"StatTile","sourcePath":"components/data/StatTile.jsx"},{"name":"Waveform","sourcePath":"components/data/Waveform.jsx"},{"name":"WeekStrip","sourcePath":"components/data/WeekStrip.jsx"},{"name":"FormatBadge","sourcePath":"components/music/FormatBadge.jsx"},{"name":"NotationGlyph","sourcePath":"components/music/NotationGlyph.jsx"},{"name":"NotationPair","sourcePath":"components/music/NotationGlyph.jsx"},{"name":"PieceRow","sourcePath":"components/music/PieceRow.jsx"},{"name":"QueueRow","sourcePath":"components/practice/QueueRow.jsx"},{"name":"ChordChart","sourcePath":"components/sheet/ChordChart.jsx"},{"name":"LeadSheet","sourcePath":"components/sheet/LeadSheet.jsx"},{"name":"SheetPanel","sourcePath":"components/sheet/SheetPanel.jsx"},{"name":"Staff","sourcePath":"components/sheet/Staff.jsx"},{"name":"Header","sourcePath":"ui_kits/app/Chrome.jsx"},{"name":"InputStatus","sourcePath":"ui_kits/app/Chrome.jsx"},{"name":"Screen","sourcePath":"ui_kits/app/Chrome.jsx"},{"name":"LeadSheetScreen","sourcePath":"ui_kits/app/LeadSheetScreen.jsx"},{"name":"LibraryScreen","sourcePath":"ui_kits/app/LibraryScreen.jsx"},{"name":"PracticeScreen","sourcePath":"ui_kits/app/PracticeScreen.jsx"},{"name":"ProgressScreen","sourcePath":"ui_kits/app/ProgressScreen.jsx"},{"name":"SettingsScreen","sourcePath":"ui_kits/app/SettingsScreen.jsx"},{"name":"TodayScreen","sourcePath":"ui_kits/app/TodayScreen.jsx"}],"sourceHashes":{"components/core/Button.jsx":"a8d3cee1dc6e","components/core/IconButton.jsx":"4320e0deab79","components/core/Panel.jsx":"81fcbf6b4d0a","components/core/Pill.jsx":"8209e3b06e2e","components/core/SectionLabel.jsx":"a0a6a6282808","components/core/Toggle.jsx":"d3b2c6a18b2f","components/data/LogTable.jsx":"2c95f62809cf","components/data/MeterRow.jsx":"d6c4ef736668","components/data/SegmentBar.jsx":"ab9a6a65fb5c","components/data/StatTile.jsx":"5daef5ee9c48","components/data/Waveform.jsx":"7dcdf20c6e97","components/data/WeekStrip.jsx":"416da033a8a9","components/music/FormatBadge.jsx":"ebdf70bd3b24","components/music/NotationGlyph.jsx":"cb73da429f05","components/music/PieceRow.jsx":"bc1f69226614","components/practice/QueueRow.jsx":"b7198e24b802","components/sheet/ChordChart.jsx":"1eb75f3068f8","components/sheet/LeadSheet.jsx":"9b5f4855eea9","components/sheet/SheetPanel.jsx":"7d3109ddd4c8","components/sheet/Staff.jsx":"a2e93ce103b1","ui_kits/app/Chrome.jsx":"a18a6caddb83","ui_kits/app/LeadSheetScreen.jsx":"d44c431137bc","ui_kits/app/LibraryScreen.jsx":"6c4736b69123","ui_kits/app/PracticeScreen.jsx":"384c6361192a","ui_kits/app/ProgressScreen.jsx":"e5887ef6f8c2","ui_kits/app/SettingsScreen.jsx":"9d631cf1c162","ui_kits/app/TodayScreen.jsx":"763e3a923262"},"inlinedExternals":[],"unexposedExports":[{"name":"beatsOf","sourcePath":"components/sheet/Staff.jsx"}]} */

(() => {

const __ds_ns = (window.KeyCadenceDesignSystem_017ec9 = window.KeyCadenceDesignSystem_017ec9 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Button({
  variant = "primary",
  size = "primary",
  icon,
  disabled = false,
  children,
  style,
  ...rest
}) {
  const heights = {
    primary: 48,
    control: 40,
    pill: 32
  };
  const height = heights[size] ?? heights.primary;
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height,
    padding: size === "pill" ? "0 12px" : "0 20px",
    borderRadius: size === "pill" ? "var(--kc-radius-pill)" : "var(--kc-radius-control)",
    fontFamily: "var(--kc-font-sans)",
    fontSize: size === "primary" ? 16 : 14,
    lineHeight: 1,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: "background 140ms ease-out, border-color 140ms ease-out, color 140ms ease-out"
  };
  const variants = {
    primary: {
      background: "var(--kc-mint)",
      color: "var(--kc-mint-ink)",
      border: "none",
      fontWeight: 700
    },
    secondary: {
      background: "transparent",
      color: "var(--kc-ink-muted)",
      border: "1px solid var(--kc-border-active)",
      fontWeight: 600
    },
    quiet: {
      background: "var(--kc-raised)",
      color: "var(--kc-ink-muted)",
      border: "none",
      fontWeight: 600
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    style: {
      ...base,
      ...variants[variant],
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--kc-font-icon)",
      fontSize: 20,
      lineHeight: 1
    }
  }, icon), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function IconButton({
  icon,
  shape = "circle",
  size = 34,
  label,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    "aria-label": label,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      borderRadius: shape === "circle" ? "50%" : "var(--kc-radius-control)",
      background: "transparent",
      border: "1px solid var(--kc-border-active)",
      color: "var(--kc-ink-muted)",
      cursor: "pointer",
      padding: 0,
      transition: "border-color 140ms ease-out, color 140ms ease-out",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--kc-font-icon)",
      fontSize: Math.round(size * 0.5),
      lineHeight: 1
    }
  }, icon));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Panel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Panel({
  padding = "panel",
  state = "resting",
  children,
  style,
  ...rest
}) {
  const pads = {
    card: "16px 18px",
    panel: "20px 22px",
    roomy: "24px 26px"
  };
  const states = {
    resting: {
      background: "var(--kc-panel)",
      border: "1px solid var(--kc-border)"
    },
    current: {
      background: "var(--kc-mint-wash)",
      border: "1.5px solid var(--kc-mint)"
    },
    cleared: {
      background: "var(--kc-mint-wash)",
      border: "1px solid var(--kc-mint-edge)"
    },
    empty: {
      background: "transparent",
      border: "1px dashed var(--kc-border-dashed)"
    }
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      borderRadius: "var(--kc-radius-panel)",
      padding: pads[padding],
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: 14,
      minWidth: 0,
      ...states[state],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Panel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Panel.jsx", error: String((e && e.message) || e) }); }

// components/core/Pill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Pill({
  tone = "neutral",
  icon,
  children,
  style,
  ...rest
}) {
  const tones = {
    neutral: {
      background: "var(--kc-raised)",
      color: "var(--kc-ink-muted)",
      border: "none"
    },
    mint: {
      background: "var(--kc-mint-wash)",
      color: "var(--kc-mint)",
      border: "1px solid var(--kc-mint-edge)"
    },
    amber: {
      background: "#3a2a12",
      color: "var(--kc-amber)",
      border: "1px solid #7a5f2a"
    },
    clay: {
      background: "transparent",
      color: "var(--kc-clay)",
      border: "1px solid #6b4a3f"
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      flex: "none",
      whiteSpace: "nowrap",
      height: 32,
      padding: "0 12px",
      borderRadius: "var(--kc-radius-pill)",
      fontFamily: "var(--kc-font-mono)",
      fontSize: 12,
      letterSpacing: "0.1em",
      lineHeight: 1,
      ...tones[tone],
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--kc-font-icon)",
      fontSize: 15,
      lineHeight: 1
    }
  }, icon), children);
}
Object.assign(__ds_scope, { Pill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Pill.jsx", error: String((e && e.message) || e) }); }

// components/core/SectionLabel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SectionLabel({
  size = "label",
  children,
  style,
  ...rest
}) {
  const sizes = {
    label: {
      fontSize: 12,
      letterSpacing: "0.12em",
      color: "var(--kc-ink-dim)"
    },
    meta: {
      fontSize: 10,
      letterSpacing: "0.07em",
      color: "var(--kc-ink-faint)"
    }
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontFamily: "var(--kc-font-mono)",
      lineHeight: 1,
      textTransform: "uppercase",
      ...sizes[size],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { SectionLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SectionLabel.jsx", error: String((e && e.message) || e) }); }

// components/core/Toggle.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Toggle({
  checked = false,
  onChange,
  label,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    role: "switch",
    "aria-checked": checked,
    "aria-label": label,
    onClick: () => onChange && onChange(!checked),
    style: {
      width: 46,
      height: 26,
      flex: "none",
      borderRadius: 13,
      boxSizing: "border-box",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: checked ? "flex-end" : "flex-start",
      padding: checked ? "0 4px" : "0 3px",
      background: checked ? "var(--kc-mint)" : "var(--kc-base)",
      border: checked ? "none" : "1px solid var(--kc-border-active)",
      cursor: "pointer",
      transition: "background 140ms ease-out",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      borderRadius: "50%",
      background: checked ? "var(--kc-mint-ink)" : "var(--kc-ink-muted)"
    }
  }));
}
Object.assign(__ds_scope, { Toggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Toggle.jsx", error: String((e && e.message) || e) }); }

// components/data/LogTable.jsx
try { (() => {
/* The mono session log. Columns are spaced by justify-content, not fixed
   widths, because every value is mono and already aligns. */
function LogTable({
  rows,
  emphasize = 1,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 7,
      fontFamily: "var(--kc-font-mono)",
      fontSize: 12,
      color: "var(--kc-ink-dim)",
      ...style
    }
  }, rows.map((row, r) => /*#__PURE__*/React.createElement("div", {
    key: r,
    style: {
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      borderBottom: "1px solid var(--kc-border)",
      paddingBottom: 6
    }
  }, row.cells.map((cell, c) => /*#__PURE__*/React.createElement("span", {
    key: c,
    style: {
      color: row.marked && c === row.cells.length - 1 ? "var(--kc-mint)" : c === emphasize ? "var(--kc-ink)" : "inherit"
    }
  }, cell)))));
}
Object.assign(__ds_scope, { LogTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/LogTable.jsx", error: String((e && e.message) || e) }); }

// components/data/MeterRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function MeterRow({
  label,
  value,
  max = 100,
  tone = "mint",
  suffix,
  labelWidth = 62,
  style,
  ...rest
}) {
  const tones = {
    mint: "var(--kc-mint)",
    amber: "var(--kc-amber)",
    clay: "var(--kc-clay)"
  };
  const pct = Math.max(0, Math.min(100, value / max * 100));
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      gap: 11,
      fontSize: 14,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: labelWidth,
      flex: "none",
      color: "var(--kc-ink-muted)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 7,
      background: "var(--kc-raised)",
      borderRadius: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: pct + "%",
      height: "100%",
      background: tones[tone],
      borderRadius: 4
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--kc-font-mono)",
      fontSize: 13,
      width: 28,
      textAlign: "right",
      color: tone === "mint" ? "var(--kc-ink)" : tones[tone]
    }
  }, value), suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 110,
      fontSize: 13,
      color: "var(--kc-ink-dim)"
    }
  }, suffix));
}
Object.assign(__ds_scope, { MeterRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/MeterRow.jsx", error: String((e && e.message) || e) }); }

// components/data/SegmentBar.jsx
try { (() => {
/* Discrete progress: twelve weeks in a key, six exercises in a session. The
   current segment is outlined, never filled — same language as a current row. */
function SegmentBar({
  total,
  filled,
  current,
  height = 6,
  radius = 2,
  gap = 4,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap,
      ...style
    }
  }, Array.from({
    length: total
  }).map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      height,
      borderRadius: radius,
      boxSizing: "border-box",
      background: i < filled ? "var(--kc-mint)" : "var(--kc-raised)",
      border: i === current ? "1.5px solid var(--kc-mint)" : "none"
    }
  })));
}
Object.assign(__ds_scope, { SegmentBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/SegmentBar.jsx", error: String((e && e.message) || e) }); }

// components/data/StatTile.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function StatTile({
  label,
  value,
  unit,
  delta,
  tone = "default",
  style,
  ...rest
}) {
  const colors = {
    default: "var(--kc-ink)",
    mint: "var(--kc-mint)",
    amber: "var(--kc-amber)",
    clay: "var(--kc-clay)"
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: "var(--kc-panel)",
      border: "1px solid var(--kc-border)",
      borderRadius: "var(--kc-radius-panel)",
      padding: "16px 18px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: 4,
      minWidth: 0,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--kc-font-mono)",
      fontSize: 11,
      letterSpacing: "0.12em",
      color: "var(--kc-ink-faint)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--kc-font-mono)",
      fontSize: 32,
      lineHeight: 1.1,
      color: colors[tone]
    }
  }, value, unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      color: "var(--kc-ink-faint)"
    }
  }, " ", unit), delta && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      color: "var(--kc-mint)"
    }
  }, " ", delta)));
}
Object.assign(__ds_scope, { StatTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatTile.jsx", error: String((e && e.message) || e) }); }

// components/data/Waveform.jsx
try { (() => {
/* A recording drawn as its own amplitude, so a lo-fi loop and a waltz look
   different from each other. Never a generic sound-wave icon. */
function Waveform({
  bars,
  height = 26,
  tone = "resting",
  style
}) {
  const fill = tone === "mint" ? "var(--kc-mint)" : "var(--kc-border-active)";
  return /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      gap: 2,
      height,
      minWidth: 0,
      ...style
    }
  }, bars.map((b, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      flex: 1,
      height: b + "%",
      minWidth: 2,
      borderRadius: 1,
      background: fill
    }
  })));
}
Object.assign(__ds_scope, { Waveform });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Waveform.jsx", error: String((e && e.message) || e) }); }

// components/data/WeekStrip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function WeekStrip({
  days,
  height = 44,
  target,
  style,
  ...rest
}) {
  const cell = (d, i) => {
    const box = {
      width: "100%",
      height,
      borderRadius: "var(--kc-radius-cell)",
      boxSizing: "border-box",
      display: "flex",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden"
    };
    let tile;
    if (d.state === "played" || d.state === "playing") {
      const pct = target ? Math.min(100, d.minutes / target * 100) : 100;
      tile = /*#__PURE__*/React.createElement("div", {
        style: {
          ...box,
          alignItems: "flex-end",
          background: "var(--kc-mint-wash)",
          border: d.state === "playing" ? "1.5px solid var(--kc-mint)" : "1px solid var(--kc-mint-edge)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: pct + "%",
          background: "var(--kc-mint)"
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          position: "relative",
          fontFamily: "var(--kc-font-mono)",
          fontSize: 10,
          fontWeight: 600,
          color: "var(--kc-mint-ink)",
          paddingBottom: 3
        }
      }, d.minutes));
    } else if (d.state === "today") {
      tile = /*#__PURE__*/React.createElement("div", {
        style: {
          ...box,
          alignItems: "center",
          background: "var(--kc-mint-wash)",
          border: "1.5px solid var(--kc-mint)"
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: "var(--kc-font-music)",
          fontSize: 17,
          lineHeight: 1,
          color: "var(--kc-mint)"
        }
      }, "\u{1D160}"));
    } else if (d.state === "rest") {
      tile = /*#__PURE__*/React.createElement("div", {
        style: {
          ...box,
          alignItems: "center",
          background: "transparent",
          border: "1px dashed var(--kc-border-dashed)"
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 12,
          height: 1.5,
          borderRadius: 1,
          background: "var(--kc-cell-dash-mark)"
        }
      }));
    } else {
      tile = /*#__PURE__*/React.createElement("div", {
        style: {
          ...box,
          background: "var(--kc-cell-future)",
          border: "1px solid var(--kc-cell-future-bd)"
        }
      });
    }
    const lit = d.state === "played" || d.state === "today" || d.state === "playing";
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6
      }
    }, tile, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--kc-font-mono)",
        fontSize: 10,
        letterSpacing: "0.06em",
        color: lit ? "var(--kc-ink-muted)" : "var(--kc-cell-letter)",
        fontWeight: d.state === "today" ? 700 : 500
      }
    }, d.letter));
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      gap: 6,
      ...style
    }
  }, rest), days.map(cell));
}
Object.assign(__ds_scope, { WeekStrip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/WeekStrip.jsx", error: String((e && e.message) || e) }); }

// components/music/NotationGlyph.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const GLYPHS = {
  "clef-treble": "\u{1D11E}",
  "clef-bass": "\u{1D122}",
  "clef-alto": "\u{1D121}",
  "clef-percussion": "\u{1D125}",
  "note-whole": "\u{1D15D}",
  "note-half": "\u{1D15E}",
  "note-quarter": "\u{1D15F}",
  "note-eighth": "\u{1D160}",
  "note-sixteenth": "\u{1D161}",
  "rest-whole": "\u{1D13B}",
  "rest-half": "\u{1D13C}",
  "rest-quarter": "\u{1D13D}",
  "rest-eighth": "\u{1D13E}",
  "rest-sixteenth": "\u{1D13F}",
  flat: "\u266D",
  natural: "\u266E",
  sharp: "\u266F",
  "double-flat": "\u{1D12B}",
  "double-sharp": "\u{1D12A}",
  "time-common": "\u{1D134}",
  "time-cut": "\u{1D135}",
  "repeat-open": "\u{1D106}",
  "repeat-close": "\u{1D107}",
  "bar-final": "\u{1D102}",
  fermata: "\u{1D110}",
  pedal: "\u{1D1AE}"
};

// Per-glyph sizes for UI contexts. On a staff every glyph is one size and the
// apparent differences are correct; in a tile they must be matched by eye.
const UI_SIZES = {
  badge: {
    "clef-treble": 21,
    "clef-bass": 24,
    "clef-alto": 24,
    "clef-percussion": 21,
    pedal: 19,
    _default: 21
  },
  cell: {
    _default: 17
  },
  inline: {
    _default: 15
  }
};
function NotationGlyph({
  name,
  context = "staff",
  color,
  size,
  style,
  ...rest
}) {
  const char = GLYPHS[name];
  const resolved = size ?? (context === "staff" ? 28 : UI_SIZES[context][name] ?? UI_SIZES[context]._default);
  return /*#__PURE__*/React.createElement("span", _extends({
    role: "img",
    "aria-label": name.replace(/-/g, " "),
    style: {
      fontFamily: "var(--kc-font-music)",
      fontSize: resolved,
      lineHeight: 1,
      color: color ?? "var(--kc-glyph)",
      ...style
    }
  }, rest), char);
}
function NotationPair({
  name = "clef-treble",
  context = "badge",
  color,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(NotationGlyph, {
    name: name,
    context: context,
    size: 14,
    color: color
  }), /*#__PURE__*/React.createElement(NotationGlyph, {
    name: name,
    context: context,
    size: 14,
    color: color
  }));
}
Object.assign(__ds_scope, { NotationGlyph, NotationPair });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/music/NotationGlyph.jsx", error: String((e && e.message) || e) }); }

// components/music/FormatBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function LeadSheetMark({
  color,
  dim
}) {
  const head = (left, top) => /*#__PURE__*/React.createElement("span", {
    key: left,
    style: {
      position: "absolute",
      left,
      top,
      width: 7,
      height: 5,
      borderRadius: "50%",
      background: color,
      transform: "rotate(-18deg)"
    }
  });
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 7,
      fontFamily: "var(--kc-font-mono)",
      fontSize: 11,
      fontWeight: 600,
      lineHeight: 1,
      color
    }
  }, /*#__PURE__*/React.createElement("span", null, "G"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: dim
    }
  }, "C")), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      width: 30,
      height: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 5,
      height: 1,
      background: dim
    }
  }), head(2, 1), head(12, 6), head(22, 3)));
}
function ChordChartMark({
  color,
  dim
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 6px)",
      gap: 5
    }
  }, [1, 0, 1, 0, 1, 0].map((on, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: on ? color : dim
    }
  })));
}
function RhythmMark({
  color,
  dim
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, [1, 0, 1, 0].map((on, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: on ? color : dim
    }
  })));
}
function StaffMark({
  color,
  dim,
  lines,
  heads,
  width
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      width,
      height: 22
    }
  }, lines.map(top => /*#__PURE__*/React.createElement("span", {
    key: top,
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      top,
      height: 1,
      background: dim
    }
  })), heads.map(([l, t]) => /*#__PURE__*/React.createElement("span", {
    key: l,
    style: {
      position: "absolute",
      left: l,
      top: t,
      width: 7,
      height: 5,
      borderRadius: "50%",
      background: color,
      transform: "rotate(-18deg)"
    }
  })));
}
function WaveMark({
  color
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 2,
      height: 20
    }
  }, [30, 62, 40, 88, 54, 74, 36].map((h, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 3,
      height: h + "%",
      borderRadius: 1,
      background: color
    }
  })));
}
function FormatBadge({
  format,
  assigned = false,
  size = 54,
  style,
  ...rest
}) {
  const color = assigned ? "var(--kc-mint)" : "var(--kc-glyph)";
  const dim = assigned ? "var(--kc-mint-edge)" : "var(--kc-glyph-dim)";
  const marks = {
    "full-notation": /*#__PURE__*/React.createElement(__ds_scope.NotationGlyph, {
      name: "clef-treble",
      context: "badge",
      color: color
    }),
    "single-staff": /*#__PURE__*/React.createElement(StaffMark, {
      color: color,
      dim: dim,
      width: 32,
      lines: [4, 10, 16],
      heads: [[3, 7], [13, 1], [23, 13]]
    }),
    "letter-notes": /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--kc-font-mono)",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.08em",
        color
      }
    }, "CDE"),
    "lead-sheet": /*#__PURE__*/React.createElement(LeadSheetMark, {
      color: color,
      dim: dim
    }),
    "chord-chart": /*#__PURE__*/React.createElement(ChordChartMark, {
      color: color,
      dim: dim
    }),
    "rhythm-only": /*#__PURE__*/React.createElement(RhythmMark, {
      color: color,
      dim: dim
    }),
    "right-hand": /*#__PURE__*/React.createElement(__ds_scope.NotationGlyph, {
      name: "clef-treble",
      context: "badge",
      size: 19,
      color: color
    }),
    "left-hand": /*#__PURE__*/React.createElement(__ds_scope.NotationGlyph, {
      name: "clef-bass",
      context: "badge",
      size: 19,
      color: color
    }),
    "by-ear": /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--kc-font-icon)",
        fontSize: 26,
        lineHeight: 1,
        color
      }
    }, "hearing"),
    duet: /*#__PURE__*/React.createElement(__ds_scope.NotationPair, {
      color: color
    }),
    "backing-track": /*#__PURE__*/React.createElement(WaveMark, {
      color: color
    }),
    "scale-exercise": /*#__PURE__*/React.createElement(StaffMark, {
      color: color,
      dim: dim,
      width: 34,
      lines: [3, 19],
      heads: [[0, 15], [8, 11], [16, 7], [24, 3]]
    })
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      flex: "none",
      width: size,
      height: size,
      borderRadius: "var(--kc-radius-tile)",
      overflow: "hidden",
      background: assigned ? "var(--kc-mint-wash)" : "var(--kc-base)",
      border: "1px solid " + (assigned ? "var(--kc-mint-edge)" : "var(--kc-border)"),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      ...style
    }
  }, rest), marks[format]);
}
Object.assign(__ds_scope, { FormatBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/music/FormatBadge.jsx", error: String((e && e.message) || e) }); }

// components/music/PieceRow.jsx
try { (() => {
/* One piece in the Library. Assigned rows sit on the mint wash — the same
   "in today" signal as a cleared queue row, never a separate accent. */
function PieceRow({
  title,
  meta,
  format,
  assigned = false,
  pill,
  actionLabel = "Open",
  onOpen,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      background: assigned ? "var(--kc-mint-wash)" : "var(--kc-panel)",
      border: "1px solid " + (assigned ? "var(--kc-mint-edge)" : "var(--kc-border)"),
      borderRadius: "var(--kc-radius-panel)",
      padding: "14px 18px",
      height: 84,
      boxSizing: "border-box",
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.FormatBadge, {
    format: format,
    assigned: assigned
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      fontWeight: 600,
      color: "var(--kc-ink)"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--kc-ink-dim)"
    }
  }, meta)), pill && /*#__PURE__*/React.createElement(__ds_scope.Pill, {
    tone: "mint"
  }, pill), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "control",
    onClick: onOpen
  }, actionLabel));
}
Object.assign(__ds_scope, { PieceRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/music/PieceRow.jsx", error: String((e && e.message) || e) }); }

// components/practice/QueueRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function QueueRow({
  index,
  title,
  detail,
  duration,
  state = "pending",
  settings = [],
  draggable = true,
  style,
  ...rest
}) {
  const states = {
    pending: {
      background: "var(--kc-panel)",
      border: "1px solid var(--kc-border)"
    },
    current: {
      background: "var(--kc-mint-wash)",
      border: "1.5px solid var(--kc-mint)"
    },
    done: {
      background: "var(--kc-mint-wash)",
      border: "1px solid var(--kc-mint-edge)"
    }
  };
  const numberColor = state === "pending" ? "var(--kc-ink-faint)" : "var(--kc-mint)";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      borderRadius: "var(--kc-radius-panel)",
      padding: "16px 20px",
      boxSizing: "border-box",
      minHeight: 84,
      ...states[state],
      ...style
    }
  }, rest), draggable && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--kc-font-icon)",
      fontSize: 20,
      color: "var(--kc-ink-faint)",
      cursor: "grab"
    }
  }, "drag_indicator"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--kc-font-mono)",
      fontSize: 14,
      color: numberColor,
      width: 20
    }
  }, String(index).padStart(2, "0")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      fontWeight: 600,
      color: "var(--kc-ink)"
    }
  }, title), detail && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--kc-ink-dim)"
    }
  }, detail)), settings.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 5,
      flexWrap: "wrap",
      maxWidth: 150
    }
  }, settings.map(s => /*#__PURE__*/React.createElement("span", {
    key: s,
    style: {
      fontFamily: "var(--kc-font-mono)",
      fontSize: 11,
      background: state === "pending" ? "var(--kc-raised)" : "rgba(90,209,192,0.12)",
      color: state === "pending" ? "var(--kc-ink-muted)" : "var(--kc-mint)",
      padding: "3px 7px",
      borderRadius: 3
    }
  }, s))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--kc-font-mono)",
      fontSize: 16,
      color: "var(--kc-ink)"
    }
  }, duration), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--kc-font-icon)",
      fontSize: 20,
      color: "var(--kc-ink-faint)"
    }
  }, "more_vert"));
}
Object.assign(__ds_scope, { QueueRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/practice/QueueRow.jsx", error: String((e && e.message) || e) }); }

// components/sheet/ChordChart.jsx
try { (() => {
/* Chords only, no staff — the play-along format. A grid of bars, four to a
   row, because that is how a student counts them. */
function ChordChart({
  bars,
  perRow = 4,
  cellHeight = 64,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))`,
      gap: 6,
      width: "100%",
      ...style
    }
  }, bars.map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      height: cellHeight,
      borderRadius: "var(--kc-radius-control)",
      border: "1px solid " + (b.current ? "#2f9f77" : "var(--kc-paper-ink-dim)"),
      borderWidth: b.current ? "1.5px" : "1px",
      background: b.current ? "rgba(90,209,192,.28)" : "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--kc-font-mono)",
      fontSize: 22,
      fontWeight: 600,
      color: "var(--kc-paper-ink)"
    }
  }, b.chord)));
}
Object.assign(__ds_scope, { ChordChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/sheet/ChordChart.jsx", error: String((e && e.message) || e) }); }

// components/sheet/SheetPanel.jsx
try { (() => {
/* The reading page. Cream, because a dark staff is unreadable at a stand and
   because the one light surface in the app is always the thing you play from. */
function SheetPanel({
  children,
  padding = 18,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      background: "var(--kc-paper)",
      borderRadius: "var(--kc-radius-panel)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { SheetPanel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/sheet/SheetPanel.jsx", error: String((e && e.message) || e) }); }

// components/sheet/Staff.jsx
try { (() => {
const CLEFS = {
  treble: {
    glyph: "\u{1D11E}",
    size: 88,
    dy: -20,
    left: 6,
    width: 0.711
  },
  bass: {
    glyph: "\u{1D122}",
    size: 62,
    dy: -10,
    left: 10,
    width: 0.66
  },
  alto: {
    glyph: "\u{1D121}",
    size: 62,
    dy: -10,
    left: 10,
    width: 0.66
  }
};
/* Baseline offsets in em, measured from Noto Music itself: where the glyph's
   baseline must sit relative to the staff line it belongs to. */
const ACCIDENTALS = {
  sharp: {
    glyph: "\u266F",
    baseline: 0.131,
    width: 0.325
  },
  flat: {
    glyph: "\u266D",
    baseline: 0.07,
    width: 0.299
  },
  natural: {
    glyph: "\u266E",
    baseline: 0.1325,
    width: 0.276
  }
};
const RESTS = {
  whole: {
    glyph: "\u{1D13B}",
    anchor: 3
  },
  half: {
    glyph: "\u{1D13C}",
    anchor: 3
  },
  quarter: {
    glyph: "\u{1D13D}",
    anchor: 4
  },
  eighth: {
    glyph: "\u{1D13E}",
    anchor: 4
  },
  sixteenth: {
    glyph: "\u{1D13F}",
    anchor: 4
  }
};
const TIME_GLYPHS = {
  common: "\u{1D134}",
  cut: "\u{1D135}"
};
const BARLINES = {
  final: "\u{1D102}",
  "repeat-open": "\u{1D106}",
  "repeat-close": "\u{1D107}"
};
const BASELINE_IN_BOX = 0.994;
const HEAD_RATIO_W = 26 / 22;
const HEAD_RATIO_H = 19 / 22;
const HOLLOW = {
  whole: true,
  half: true
};
const FLAGS = {
  eighth: 1,
  sixteenth: 2,
  "thirty-second": 3
};
const BEATS = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
  "thirty-second": 0.125
};

/* Clefs, accidentals, rests, meter and repeat marks are Noto Music, placed
   from the font's own metrics. Noteheads, stems, beams, ledger lines and slurs
   are drawn, because they must be positioned and recolored per note. */
function Staff({
  systems = [{
    clef: "treble"
  }],
  notes = [],
  rests = [],
  barlines = [],
  regions = [],
  slurs = [],
  layout,
  width = 830,
  height = 280,
  lineGap = 22,
  stepUnit = lineGap / 2,
  stemLen = lineGap * 3.5,
  style
}) {
  const laid = systems.map((s, i) => ({
    ...s,
    top: s.top ?? (i === 0 ? 36 : 180)
  }));
  const headW = lineGap * HEAD_RATIO_W;
  const headH = lineGap * HEAD_RATIO_H;
  const stemW = Math.max(1, lineGap * 0.073);
  const beamH = lineGap * 0.5;
  const beamStep = lineGap * 0.78;
  const em = lineGap * 4;
  const glyphTop = (sys, anchor) => sys.top + anchor * lineGap - BASELINE_IN_BOX * em;

  /* ---- Music-time spacing. With `layout` you write bar and beat; x is
     derived, barlines are drawn for you, and the furniture at the left is
     measured from the glyphs actually present. ---- */
  const beatsPerBar = layout?.beatsPerBar ?? 4;
  const furniture = () => {
    const s = laid[0] || {};
    let x = 12;
    if (CLEFS[s.clef]) x = CLEFS[s.clef].left + CLEFS[s.clef].width * em + lineGap * 0.5;
    (s.keySignature || []).forEach(a => {
      x += (ACCIDENTALS[a.accidental] || ACCIDENTALS.sharp).width * em * 0.9;
    });
    if (s.timeSignature) x += em * 0.62;
    return x + lineGap;
  };
  const leftPad = layout ? layout.left ?? furniture() : 0;
  const rightPad = layout?.right ?? lineGap * 1.2;
  const barWidth = layout ? (width - leftPad - rightPad) / layout.bars : 0;
  const rawX = item => item.x != null ? item.x : leftPad + (item.bar + (item.beat || 0) / beatsPerBar) * barWidth;

  /* Time-proportional placement alone collides as soon as two onsets are closer
     than a notehead — a run of sixteenths in a narrow bar. Engravers space
     short values wider than their duration; this keeps musical order and time
     but never lets two onsets sit on top of each other. */
  const nudged = new Map();
  if (layout) {
    const minGap = headW * 1.35;
    laid.forEach((_, si) => {
      const items = [...notes, ...rests].filter(i => (i.system ?? 0) === si && i.x == null);
      /* An accidental is drawn to the LEFT of its head, so it belongs to the
         onset's left extent — otherwise it lands on the previous notehead. */
      const leftExtent = new Map();
      items.forEach(i => {
        const spec = i.accidental && (ACCIDENTALS[i.accidental] || ACCIDENTALS.sharp);
        const w = spec ? spec.width * em + lineGap * 0.18 : 0;
        const x = rawX(i);
        leftExtent.set(x, Math.max(leftExtent.get(x) || 0, w));
      });
      const onsets = [...leftExtent.keys()].sort((a, b) => a - b);
      let prev = -Infinity;
      onsets.forEach(x => {
        const next = Math.max(x, prev + minGap + leftExtent.get(x));
        nudged.set(si + "@" + x, next);
        prev = next;
      });
    });
  }
  const xOf = item => {
    if (item.x != null) return item.x;
    const x = rawX(item);
    return nudged.get((item.system ?? 0) + "@" + x) ?? x;
  };
  const autoBars = layout ? Array.from({
    length: layout.bars - 1
  }, (_, i) => i + 1).flatMap(b => laid.map((_, si) => ({
    x: leftPad + b * barWidth,
    system: si
  }))).concat(laid.map((_, si) => ({
    x: width - 0.358 * em,
    system: si,
    type: "final"
  }))) : [];
  const allBarlines = [...autoBars, ...barlines];
  const ink = state => state === "missed" ? "var(--kc-clay)" : state === "current" ? "var(--kc-mint)" : state === "upcoming" ? "var(--kc-paper-ink-dim)" : "var(--kc-paper-ink)";
  const placed = notes.map(n => {
    const sys = laid[n.system ?? 0];
    const value = n.value || "quarter";
    const x = xOf(n);
    const centerY = n.y != null ? n.y + headH / 2 : sys.top + n.step * stepUnit;
    const stepOf = (centerY - sys.top) / stepUnit;
    return {
      ...n,
      sys,
      value,
      x,
      centerY,
      stepOf,
      cx: x + headW / 2,
      color: ink(n.state)
    };
  });
  const groups = {};
  placed.forEach(n => {
    if (n.beam == null || !FLAGS[n.value]) return;
    (groups[n.beam] = groups[n.beam] || []).push(n);
  });
  const stems = [];
  const beams = [];
  const flags = [];
  const stemDir = n => n.stem || (n.stepOf >= 4 ? "up" : "down");
  const stemX = (n, dir) => dir === "up" ? n.x + headW - stemW : n.x;
  placed.forEach(n => {
    if (n.value === "whole") return;
    if (n.beam != null && groups[n.beam] && groups[n.beam].length > 1) return;
    const dir = stemDir(n);
    const tipY = dir === "up" ? n.centerY - stemLen : n.centerY + stemLen;
    stems.push({
      key: "s" + n.x + n.centerY,
      x: stemX(n, dir),
      top: Math.min(n.centerY, tipY),
      height: stemLen,
      color: n.color
    });
    for (let i = 0; i < (FLAGS[n.value] || 0); i++) {
      flags.push({
        key: "f" + n.x + n.centerY + i,
        x: stemX(n, dir) + (dir === "up" ? stemW : 0),
        y: tipY + (dir === "up" ? i * beamStep : -i * beamStep - beamH),
        dir,
        color: n.color
      });
    }
  });
  Object.entries(groups).forEach(([id, group]) => {
    if (group.length < 2) return;
    const sorted = [...group].sort((a, b) => a.cx - b.cx);
    const avg = sorted.reduce((t, n) => t + n.stepOf, 0) / sorted.length;
    const dir = sorted[0].stem || (avg >= 4 ? "up" : "down");
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const x0 = stemX(first, dir) + stemW / 2;
    const x1 = stemX(last, dir) + stemW / 2;
    const span = x1 - x0 || 1;
    const maxSlope = 0.25;
    const slope = Math.max(-maxSlope, Math.min(maxSlope, (last.centerY - first.centerY) / span));
    const rel = sorted.map(n => n.centerY - slope * (stemX(n, dir) + stemW / 2 - x0));
    const base = dir === "up" ? Math.min(...rel) - stemLen : Math.max(...rel) + stemLen;
    const at = x => base + slope * (x - x0);
    const y0 = at(x0);
    const y1 = at(x1);
    sorted.forEach(n => {
      const sx = stemX(n, dir);
      const endY = at(sx + stemW / 2);
      stems.push({
        key: "gs" + id + n.x,
        x: sx,
        top: Math.min(n.centerY, endY),
        height: Math.abs(endY - n.centerY),
        color: n.color
      });
    });
    const count = Math.min(...sorted.map(n => FLAGS[n.value] || 1));
    for (let i = 0; i < count; i++) {
      const off = dir === "up" ? i * beamStep : -i * beamStep - beamH;
      beams.push({
        key: "bm" + id + i,
        x0,
        y0: y0 + off,
        x1,
        y1: y1 + off,
        color: sorted[0].color
      });
    }
  });

  /* Ledger lines: one per even step outside the staff, a head and a half wide. */
  const ledgers = [];
  placed.forEach((n, i) => {
    const w = headW * 1.6;
    const left = n.cx - w / 2;
    /* Round toward the staff: a note in the first space outside it sits between
       ledger positions and gets none. */
    const lastAbove = 2 * Math.ceil(n.stepOf / 2);
    for (let s = -2; s >= lastAbove; s -= 2) {
      ledgers.push({
        key: "lg" + i + s,
        left,
        w,
        top: n.sys.top + s * stepUnit,
        color: n.color
      });
    }
    const lastBelow = 2 * Math.floor(n.stepOf / 2);
    for (let s = 10; s <= lastBelow; s += 2) {
      ledgers.push({
        key: "lg" + i + s,
        left,
        w,
        top: n.sys.top + s * stepUnit,
        color: n.color
      });
    }
  });

  /* Slurs and ties: a curve between two notes, by index into `notes`. */
  const curves = slurs.map((s, i) => {
    const a = placed[s.from];
    const b = placed[s.to];
    if (!a || !b) return null;
    const above = s.above ?? stemDir(a) === "down";
    const lift = s.kind === "tie" ? lineGap * 0.55 : lineGap * 1.25;
    const edge = n => n.centerY + (above ? -headH / 2 : headH / 2);
    const x0 = a.cx + (s.kind === "tie" ? headW * 0.3 : 0);
    const x1 = b.cx - (s.kind === "tie" ? headW * 0.3 : 0);
    const y0 = edge(a);
    const y1 = edge(b);
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2 + (above ? -lift * 2 : lift * 2);
    return {
      key: "sl" + i,
      d: `M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`,
      color: a.color
    };
  }).filter(Boolean);
  const boxHeight = Math.max(height, ...laid.map(s => s.top + 4 * lineGap + lineGap * 0.6));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height: boxHeight,
      position: "relative",
      ...style
    }
  }, laid.map((sys, si) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: "sys" + si
  }, [0, 1, 2, 3, 4].map(n => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      top: sys.top + n * lineGap,
      height: 1,
      background: "var(--kc-paper-ink)"
    }
  })), CLEFS[sys.clef] && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: CLEFS[sys.clef].left,
      top: sys.top + CLEFS[sys.clef].dy * lineGap / 22,
      fontFamily: "var(--kc-font-music)",
      fontSize: CLEFS[sys.clef].size * lineGap / 22,
      lineHeight: 1,
      color: "var(--kc-paper-ink)"
    }
  }, CLEFS[sys.clef].glyph), (sys.keySignature || []).map((a, ai) => {
    const spec = ACCIDENTALS[a.accidental] || ACCIDENTALS.sharp;
    return /*#__PURE__*/React.createElement("div", {
      key: ai,
      style: {
        position: "absolute",
        left: a.left,
        top: sys.top + (a.step ?? 0) * stepUnit + (spec.baseline - BASELINE_IN_BOX) * em,
        fontFamily: "var(--kc-font-music)",
        fontSize: em,
        lineHeight: 1,
        color: "var(--kc-paper-ink)"
      }
    }, spec.glyph);
  }), sys.timeSignature && (Array.isArray(sys.timeSignature) ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: sys.timeLeft ?? 116,
      top: sys.top - lineGap * 0.15,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      lineHeight: 1.08,
      fontFamily: "var(--kc-font-sans)",
      fontWeight: 600,
      fontSize: lineGap * 1.9,
      color: "var(--kc-paper-ink)"
    }
  }, /*#__PURE__*/React.createElement("span", null, sys.timeSignature[0]), /*#__PURE__*/React.createElement("span", null, sys.timeSignature[1])) : /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: sys.timeLeft ?? 116,
      top: glyphTop(sys, 4),
      fontFamily: "var(--kc-font-music)",
      fontSize: em,
      lineHeight: 1,
      color: "var(--kc-paper-ink)"
    }
  }, TIME_GLYPHS[sys.timeSignature])))), regions.map((r, i) => {
    const sys = laid[r.system ?? 0];
    return /*#__PURE__*/React.createElement("div", {
      key: "r" + i,
      style: {
        position: "absolute",
        left: xOf(r),
        width: r.width ?? (layout ? barWidth * (r.bars ?? 1) : 40),
        top: r.top ?? sys.top - 14,
        height: r.height ?? 4 * lineGap + 28,
        background: "rgba(90,209,192,.28)",
        border: "1px solid #2f9f77",
        borderRadius: 3
      }
    });
  }), allBarlines.map((b, i) => {
    const sys = laid[b.system ?? 0];
    const x = xOf(b);
    if (b.type && BARLINES[b.type]) {
      return /*#__PURE__*/React.createElement("div", {
        key: "bl" + i,
        style: {
          position: "absolute",
          left: x,
          top: glyphTop(sys, 4),
          fontFamily: "var(--kc-font-music)",
          fontSize: em,
          lineHeight: 1,
          color: "var(--kc-paper-ink)"
        }
      }, BARLINES[b.type]);
    }
    return /*#__PURE__*/React.createElement("div", {
      key: "bl" + i,
      style: {
        position: "absolute",
        left: x,
        top: sys.top,
        width: 1,
        height: 4 * lineGap,
        background: "var(--kc-paper-ink)"
      }
    });
  }), rests.map((r, i) => {
    const sys = laid[r.system ?? 0];
    const spec = RESTS[r.value] || RESTS.quarter;
    return /*#__PURE__*/React.createElement("div", {
      key: "rest" + i,
      style: {
        position: "absolute",
        left: xOf(r),
        top: glyphTop(sys, spec.anchor) + (r.step != null ? (r.step - 4) * stepUnit : 0),
        fontFamily: "var(--kc-font-music)",
        fontSize: em,
        lineHeight: 1,
        color: ink(r.state)
      }
    }, spec.glyph);
  }), ledgers.map(l => /*#__PURE__*/React.createElement("div", {
    key: l.key,
    style: {
      position: "absolute",
      left: l.left,
      top: l.top,
      width: l.w,
      height: 1,
      background: "var(--kc-paper-ink)"
    }
  })), stems.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.key,
    style: {
      position: "absolute",
      left: s.x,
      top: s.top,
      width: stemW,
      height: s.height,
      background: s.color
    }
  })), beams.map(b => {
    const dx = b.x1 - b.x0;
    const dy = b.y1 - b.y0;
    return /*#__PURE__*/React.createElement("div", {
      key: b.key,
      style: {
        position: "absolute",
        left: b.x0,
        top: b.y0,
        width: Math.sqrt(dx * dx + dy * dy),
        height: beamH,
        background: b.color,
        transform: `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`,
        transformOrigin: "left top"
      }
    });
  }), flags.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.key,
    style: {
      position: "absolute",
      left: f.x,
      top: f.y,
      width: lineGap * 1.15,
      height: beamH,
      background: f.color,
      borderRadius: beamH / 2,
      transform: `rotate(${f.dir === "up" ? 32 : -32}deg)`,
      transformOrigin: "left top"
    }
  })), curves.length > 0 && /*#__PURE__*/React.createElement("svg", {
    width: width,
    height: boxHeight,
    style: {
      position: "absolute",
      left: 0,
      top: 0,
      overflow: "visible",
      pointerEvents: "none"
    }
  }, curves.map(c => /*#__PURE__*/React.createElement("path", {
    key: c.key,
    d: c.d,
    fill: "none",
    stroke: c.color,
    strokeWidth: Math.max(1.2, lineGap * 0.09),
    strokeLinecap: "round"
  }))), placed.map((n, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: "n" + i
  }, n.accidental && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: n.x - (ACCIDENTALS[n.accidental] || ACCIDENTALS.sharp).width * em - lineGap * 0.18,
      top: n.centerY - n.sys.top + n.sys.top + ((ACCIDENTALS[n.accidental] || ACCIDENTALS.sharp).baseline - BASELINE_IN_BOX) * em,
      fontFamily: "var(--kc-font-music)",
      fontSize: em,
      lineHeight: 1,
      color: n.color
    }
  }, (ACCIDENTALS[n.accidental] || ACCIDENTALS.sharp).glyph), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: n.x,
      top: n.centerY - headH / 2,
      width: headW,
      height: headH,
      borderRadius: "50%",
      background: HOLLOW[n.value] ? "var(--kc-paper)" : n.color,
      border: HOLLOW[n.value] ? Math.max(2, lineGap * 0.14) + "px solid " + n.color : "none",
      boxSizing: "border-box",
      transform: "rotate(-18deg)"
    }
  }), n.dotted && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: n.x + headW + lineGap * 0.22,
      top: n.centerY - (n.stepOf % 2 === 0 ? stepUnit : 0) - lineGap * 0.14,
      width: lineGap * 0.28,
      height: lineGap * 0.28,
      borderRadius: "50%",
      background: n.color
    }
  }))));
}

/** Beats a value occupies — exported so callers can lay out a bar without guessing. */
function beatsOf(value, dotted) {
  const b = BEATS[value] ?? 1;
  return dotted ? b * 1.5 : b;
}
Object.assign(__ds_scope, { Staff, beatsOf });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/sheet/Staff.jsx", error: String((e && e.message) || e) }); }

// components/sheet/LeadSheet.jsx
try { (() => {
/* Chord symbols over a single staff — what a student above their reading level
   gets instead of the full score. Chords are mono, because they are read as
   symbols, not words. The staff itself is a Staff, so note values, beams and
   states behave exactly as they do on the full page. */
function LeadSheet({
  bars,
  melody = [],
  beatsPerBar = 4,
  width = 830,
  height = 150,
  style
}) {
  const barWidth = width / bars.length;
  const hasLyrics = bars.some(b => b.lyric);

  /* Rows, top to bottom: chord symbols, room for the melody's stems, the
     staff itself, lyrics. Everything is derived from height so the page always
     fits — a lead sheet is usually given a shallow strip. */
  const chordSize = Math.max(11, Math.min(20, height / 6.5 * 1.1));
  const chordRow = chordSize + 8;
  const lyricSize = Math.max(11, Math.min(15, chordSize * 0.8));
  const lyricRow = hasLyrics ? lyricSize + 8 : 6;
  const lineGap = Math.max(8, (height - chordRow - lyricRow) / 5.6);
  const stemLen = lineGap * 2.8;
  const staffTop = chordRow + lineGap * 1.6;
  const staffBottom = staffTop + 4 * lineGap;
  const notes = melody.map(m => ({
    x: (m.bar + m.beat / beatsPerBar) * barWidth + Math.min(10, barWidth * 0.1),
    step: m.step,
    value: m.value || "quarter",
    dotted: m.dotted,
    beam: m.beam,
    /* Melody stems point up by default: the chord row is above and the lyric
       row below, so a down stem would land in the words. */
    stem: m.stem || "up",
    state: m.state
  }));
  const barlines = bars.map((b, i) => ({
    x: i * barWidth
  })).concat([{
    x: width - 1
  }]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      position: "relative",
      ...style
    }
  }, bars.map((b, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: "b" + i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: i * barWidth + 2,
      top: 0,
      fontFamily: "var(--kc-font-mono)",
      fontSize: chordSize,
      fontWeight: 600,
      lineHeight: 1,
      color: b.dim ? "var(--kc-paper-ink-dim)" : "var(--kc-paper-ink)"
    }
  }, b.chord), b.lyric && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: i * barWidth + 2,
      top: staffBottom + 8,
      fontFamily: "var(--kc-font-sans)",
      fontSize: lyricSize,
      lineHeight: 1,
      color: "var(--kc-paper-ink)"
    }
  }, b.lyric))), /*#__PURE__*/React.createElement(__ds_scope.Staff, {
    width: width,
    height: height,
    lineGap: lineGap,
    stemLen: stemLen,
    systems: [{
      clef: "none",
      top: staffTop
    }],
    notes: notes,
    barlines: barlines,
    style: {
      position: "absolute",
      left: 0,
      top: 0
    }
  }));
}
Object.assign(__ds_scope, { LeadSheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/sheet/LeadSheet.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Chrome.jsx
try { (() => {
function Header({
  active,
  onNavigate,
  right
}) {
  const items = [{
    id: "today",
    label: "Today"
  }, {
    id: "progress",
    label: "Progress"
  }, {
    id: "library",
    label: "Library"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 72,
      flex: "none",
      borderBottom: "1px solid var(--kc-border)",
      display: "flex",
      alignItems: "center",
      gap: 28,
      padding: "0 34px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 17,
      fontWeight: 600,
      letterSpacing: "-0.01em"
    }
  }, "KeyCadence"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      fontSize: 15
    }
  }, items.map(it => /*#__PURE__*/React.createElement("span", {
    key: it.id,
    onClick: () => onNavigate(it.id),
    style: {
      padding: "9px 16px",
      borderRadius: "var(--kc-radius-control)",
      cursor: "pointer",
      background: active === it.id ? "var(--kc-raised)" : "transparent",
      color: active === it.id ? "var(--kc-ink)" : "var(--kc-ink-dim)",
      fontWeight: active === it.id ? 600 : 400
    }
  }, it.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, right, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "settings",
    shape: "square",
    size: 38,
    label: "Settings",
    onClick: () => onNavigate && onNavigate("settings")
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: "50%",
      background: "var(--kc-raised)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 15,
      fontWeight: 600
    }
  }, "M")));
}
function InputStatus({
  mode = "midi",
  device = "Roland FP-30X"
}) {
  const label = {
    midi: device,
    mic: "Microphone",
    timer: "Timer only"
  }[mode];
  const icon = {
    midi: "piano",
    mic: "mic",
    timer: "timer"
  }[mode];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontSize: 14,
      color: mode === "midi" ? "var(--kc-mint)" : "var(--kc-ink-dim)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--kc-font-icon)",
      fontSize: 20
    }
  }, icon), label);
}
function Screen({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1194,
      height: 834,
      background: "var(--kc-base)",
      border: "1px solid var(--kc-border)",
      borderRadius: "var(--kc-radius-screen)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      color: "var(--kc-ink)",
      fontFamily: "var(--kc-font-sans)",
      boxShadow: "var(--kc-shadow-screen)"
    }
  }, children);
}
Object.assign(__ds_scope, { Header, InputStatus, Screen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Chrome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/LeadSheetScreen.jsx
try { (() => {
const BARS = [{
  chord: "G",
  lyric: "Fif - teen"
}, {
  chord: "G",
  lyric: "men on"
}, {
  chord: "C",
  lyric: "a dead"
}, {
  chord: "G",
  lyric: "man's chest"
}, {
  chord: "Em",
  lyric: "yo ho ho"
}, {
  chord: "C",
  lyric: "and a"
}, {
  chord: "D7",
  lyric: "bottle of"
}, {
  chord: "G",
  dim: true,
  lyric: "rum"
}];
const MELODY = [{
  bar: 0,
  beat: 0,
  step: 6,
  value: "quarter"
}, {
  bar: 0,
  beat: 1,
  step: 5,
  value: "eighth",
  beam: "a"
}, {
  bar: 0,
  beat: 1.5,
  step: 4,
  value: "eighth",
  beam: "a"
}, {
  bar: 0,
  beat: 2,
  step: 3,
  value: "half"
}, {
  bar: 1,
  beat: 0,
  step: 4,
  value: "quarter"
}, {
  bar: 1,
  beat: 1,
  step: 5,
  value: "quarter"
}, {
  bar: 1,
  beat: 2,
  step: 6,
  value: "half"
}, {
  bar: 2,
  beat: 0,
  step: 5,
  value: "quarter",
  state: "current"
}, {
  bar: 2,
  beat: 1,
  step: 4,
  value: "quarter",
  state: "upcoming"
}, {
  bar: 2,
  beat: 2,
  step: 3,
  value: "half",
  state: "upcoming"
}, {
  bar: 3,
  beat: 0,
  step: 4,
  value: "whole",
  state: "upcoming"
}];

/**
 * The other reading page: a piece above the student's level, so the lead sheet
 * stands in for the full score. Same chrome as a practice block — nothing is
 * locked, and the format is stated rather than apologised for.
 */
function LeadSheetScreen({
  onBack,
  view = "lead-sheet",
  onView
}) {
  return /*#__PURE__*/React.createElement(__ds_scope.Screen, null, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      flex: "none",
      borderBottom: "1px solid var(--kc-border)",
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "0 30px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: onBack,
    style: {
      fontFamily: "var(--kc-font-icon)",
      fontSize: 26,
      color: "var(--kc-ink-dim)",
      cursor: "pointer"
    }
  }, "chevron_left"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 17,
      fontWeight: 600
    }
  }, "Pirate Ship Theme"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--kc-ink-dim)"
    }
  }, "Two levels above your reading \xB7 G major \xB7 ", /*#__PURE__*/React.createElement(__ds_scope.NotationGlyph, {
    name: "note-quarter",
    context: "inline",
    size: 13
  }), "84"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Pill, {
    tone: "mint"
  }, "\uD834\uDD06 BARS 5\u20138 \uD834\uDD07"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--kc-font-mono)",
      fontSize: 20
    }
  }, "02:48"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "control"
  }, "Pause"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      padding: "20px 30px 0",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.FormatBadge, {
    format: view === "lead-sheet" ? "lead-sheet" : "chord-chart",
    assigned: true,
    size: 44
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 16,
      color: "var(--kc-ink-muted)",
      maxWidth: 620
    }
  }, "The melody with chord symbols. Play the tune, or comp the chords and sing it \u2014 both count."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: view === "lead-sheet" ? "quiet" : "secondary",
    size: "control",
    onClick: () => onView && onView("lead-sheet")
  }, "Lead sheet"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: view === "chord-chart" ? "quiet" : "secondary",
    size: "control",
    onClick: () => onView && onView("chord-chart")
  }, "Chords only"))), view === "lead-sheet" ? /*#__PURE__*/React.createElement(__ds_scope.SheetPanel, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 20,
      width: 980
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.LeadSheet, {
    width: 980,
    height: 160,
    bars: BARS.slice(0, 4),
    melody: MELODY
  }), /*#__PURE__*/React.createElement(__ds_scope.LeadSheet, {
    width: 980,
    height: 160,
    bars: BARS.slice(4),
    melody: MELODY.map(m => ({
      ...m,
      state: "upcoming"
    }))
  }))) : /*#__PURE__*/React.createElement(__ds_scope.SheetPanel, null, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 860
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.ChordChart, {
    cellHeight: 92,
    bars: BARS.map((b, i) => ({
      chord: b.chord,
      current: i === 2
    }))
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--kc-border)",
      padding: "16px 30px 20px",
      display: "flex",
      alignItems: "center",
      gap: 28,
      flex: "none",
      background: "var(--kc-panel)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 26
    }
  }, [["TEMPO", "84 bpm"], ["LOOP", "bars 5–8"], ["TIMES THROUGH", "3"]].map(([l, v]) => /*#__PURE__*/React.createElement("div", {
    key: l
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionLabel, {
    size: "meta"
  }, l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--kc-font-mono)",
      fontSize: 20,
      marginTop: 4
    }
  }, v)))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--kc-ink-dim)",
      maxWidth: 300
    }
  }, "Ms. Rivera asked for this at 84 before the full score."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "control"
  }, "Slower"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "control"
  }, "Full score anyway"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "control",
    onClick: onBack
  }, "Done"))));
}
Object.assign(__ds_scope, { LeadSheetScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/LeadSheetScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/LibraryScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const PIECES = [{
  title: "Pirate Ship Theme",
  meta: "Learning · bars 5–8 · 84 bpm",
  format: "lead-sheet",
  assigned: true,
  pill: "IN TODAY"
}, {
  title: "Ode to Joy",
  meta: "Learning · both hands",
  format: "full-notation"
}, {
  title: "London Bridge",
  meta: "Polishing · from memory",
  format: "full-notation"
}, {
  title: "Autumn Leaves",
  meta: "Two levels above your reading",
  format: "lead-sheet"
}, {
  title: "Twelve-bar blues in G",
  meta: "Chords only · play along",
  format: "chord-chart"
}, {
  title: "Heart and Soul",
  meta: "Duet · with a parent or teacher",
  format: "duet"
}];
const WAVES = [{
  title: "Lo-fi loop in G",
  meta: "0:34 · SEP 12",
  bars: [22, 46, 34, 72, 55, 90, 62, 40, 78, 52, 34, 66, 44, 28, 58, 38, 24, 48, 30, 20]
}, {
  title: "Made-up waltz",
  meta: "1:02 · SEP 05",
  bars: [64, 30, 26, 70, 34, 28, 82, 38, 30, 74, 32, 26, 88, 42, 34, 68, 30, 24, 56, 28]
}];
function LibraryScreen({
  onNavigate,
  onOpen
}) {
  return /*#__PURE__*/React.createElement(__ds_scope.Screen, null, /*#__PURE__*/React.createElement(__ds_scope.Header, {
    active: "library",
    onNavigate: onNavigate
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: "grid",
      gridTemplateColumns: "1fr 340px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "32px 36px",
      display: "flex",
      flexDirection: "column",
      gap: 18,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 34,
      fontWeight: 600,
      letterSpacing: "-0.03em"
    }
  }, "Library"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "8px 0 0",
      fontSize: 15,
      color: "var(--kc-ink-muted)",
      maxWidth: 470
    }
  }, "Nothing is locked. Above your level, you get the lead sheet instead of the full score.")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "quiet",
    size: "control",
    icon: "search"
  }, "Search"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "quiet",
    size: "control"
  }, "In G major"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      minHeight: 0
    }
  }, PIECES.map(p => /*#__PURE__*/React.createElement(__ds_scope.PieceRow, _extends({
    key: p.title
  }, p, {
    onOpen: () => onOpen && onOpen(p)
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderLeft: "1px solid var(--kc-border)",
      background: "var(--kc-panel)",
      padding: "32px 28px",
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionLabel, null, "YOUR OWN RECORDINGS"), WAVES.map(w => /*#__PURE__*/React.createElement("div", {
    key: w.title,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 13
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "play_arrow",
    label: "Play " + w.title
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      width: 132
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600
    }
  }, w.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--kc-font-mono)",
      fontSize: 12,
      color: "var(--kc-ink-dim)"
    }
  }, w.meta)), /*#__PURE__*/React.createElement(__ds_scope.Waveform, {
    bars: w.bars
  })))), /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    padding: "panel",
    style: {
      marginTop: "auto"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionLabel, null, "SUGGESTED NEXT"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      fontWeight: 600
    }
  }, "Clair de Lune"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      lineHeight: 1.4,
      color: "var(--kc-ink-dim)"
    }
  }, "Two levels above your reading. Start it anyway \u2014 you'll get a simplified sheet.")))));
}
Object.assign(__ds_scope, { LibraryScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/LibraryScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/PracticeScreen.jsx
try { (() => {
/* The exercise on the reading page: eight bars of G major at the same x
   positions as the v14 screen, now with real note values and beamed pairs. */
const TREBLE = [{
  x: 150,
  step: 6,
  value: "quarter"
}, {
  x: 215,
  step: 5,
  value: "eighth",
  beam: "a"
}, {
  x: 280,
  step: 4,
  value: "eighth",
  beam: "a"
}, {
  x: 345,
  step: 5,
  value: "quarter",
  state: "missed"
}, {
  x: 462,
  step: 3,
  value: "half",
  state: "current"
}, {
  x: 530,
  step: 4,
  value: "eighth",
  beam: "b",
  state: "upcoming"
}, {
  x: 600,
  step: 5,
  value: "eighth",
  beam: "b",
  state: "upcoming"
}, {
  x: 720,
  step: 6,
  value: "quarter",
  dotted: true,
  state: "upcoming"
}, {
  x: 780,
  step: 5,
  value: "eighth",
  state: "upcoming"
}];
const BASS = [{
  x: 190,
  step: 5,
  value: "half"
}, {
  x: 320,
  step: 6,
  value: "quarter"
}, {
  x: 500,
  step: 4,
  value: "whole",
  state: "upcoming"
}, {
  x: 700,
  step: 6,
  value: "quarter",
  state: "upcoming"
}].map(n => ({
  ...n,
  system: 1
}));
const RESTS = [{
  x: 410,
  value: "quarter"
}, {
  x: 420,
  value: "half",
  system: 1
}];
function PracticeScreen({
  onFinish
}) {
  return /*#__PURE__*/React.createElement(Screen, null, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      flex: "none",
      borderBottom: "1px solid var(--kc-border)",
      display: "flex",
      alignItems: "center",
      gap: 18,
      padding: "0 30px"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionLabel, {
    size: "meta"
  }, "03 / 06"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 17,
      fontWeight: 600
    }
  }, "Sight reading"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--kc-ink-dim)"
    }
  }, "Level 4 \xB7 alternating hands \xB7 G major \xB7", " ", /*#__PURE__*/React.createElement(__ds_scope.NotationGlyph, {
    name: "note-quarter",
    context: "inline",
    size: 13
  }), "76"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Pill, {
    tone: "clay"
  }, "\u25CF REC"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--kc-font-mono)",
      fontSize: 20
    }
  }, "04:12"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "control"
  }, "Pause"))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 2,
      flex: "none",
      background: "var(--kc-raised)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "41%",
      height: "100%",
      background: "var(--kc-mint)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      padding: "22px 30px 0",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 17,
      color: "var(--kc-ink-muted)"
    }
  }, "Keep going through mistakes \u2014 don't stop to fix a note."), /*#__PURE__*/React.createElement(__ds_scope.SheetPanel, null, /*#__PURE__*/React.createElement(__ds_scope.Staff, {
    systems: [{
      clef: "treble",
      keySignature: [{
        accidental: "sharp",
        left: 88
      }]
    }, {
      clef: "bass"
    }],
    notes: [...TREBLE, ...BASS],
    rests: RESTS,
    barlines: [{
      x: 415
    }, {
      x: 415,
      system: 1
    }, {
      x: 828,
      type: "final"
    }],
    regions: [{
      x: 450,
      width: 48
    }]
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--kc-border)",
      padding: "18px 30px 22px",
      display: "flex",
      alignItems: "center",
      gap: 28,
      flex: "none",
      background: "var(--kc-panel)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 280,
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionLabel, null, "CONTINUITY"), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8,
      background: "var(--kc-raised)",
      borderRadius: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "88%",
      height: "100%",
      background: "var(--kc-mint)",
      borderRadius: 4
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--kc-ink-muted)"
    }
  }, "You held the pulse through bar 6")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 26
    }
  }, [["NOTES RIGHT", "18 / 20", "var(--kc-ink)"], ["AHEAD OF BEAT", "22 ms", "var(--kc-clay)"], ["CLEAN RUNS", "2 / 3", "var(--kc-ink)"]].map(([l, v, c]) => /*#__PURE__*/React.createElement("div", {
    key: l
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionLabel, {
    size: "meta"
  }, l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--kc-font-mono)",
      fontSize: 20,
      color: c,
      marginTop: 4
    }
  }, v)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "control"
  }, "Slower"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "control"
  }, "New exercise"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "control",
    onClick: onFinish
  }, "Next \u2014 harmony"))));
}
Object.assign(__ds_scope, { PracticeScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/PracticeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ProgressScreen.jsx
try { (() => {
function TempoChart() {
  const pts = "20,212 80,204 140,190 200,182 260,168 320,154 380,146 440,124 500,118 560,96 620,84 680,60";
  const markers = [{
    left: "28.6%",
    top: "75.8%",
    r: 9
  }, {
    left: "62.9%",
    top: "51.7%",
    r: 9
  }, {
    left: "97.1%",
    top: "25%",
    r: 12
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 700 240",
    preserveAspectRatio: "none",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%"
    }
  }, [20, 80, 140, 200].map(y => /*#__PURE__*/React.createElement("line", {
    key: y,
    x1: "0",
    y1: y,
    x2: "700",
    y2: y,
    stroke: "var(--kc-raised)",
    strokeWidth: "1"
  })), /*#__PURE__*/React.createElement("polyline", {
    points: pts,
    fill: "none",
    stroke: "var(--kc-mint)",
    strokeWidth: "2.5",
    vectorEffect: "non-scaling-stroke"
  })), markers.map(m => /*#__PURE__*/React.createElement("span", {
    key: m.left,
    style: {
      position: "absolute",
      left: m.left,
      top: m.top,
      width: m.r,
      height: m.r,
      borderRadius: "50%",
      background: "var(--kc-mint)",
      transform: "translate(-50%, -50%)"
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 0,
      top: 0,
      fontFamily: "var(--kc-font-mono)",
      fontSize: 11,
      color: "var(--kc-ink-dim)"
    }
  }, "120"), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 0,
      bottom: 0,
      fontFamily: "var(--kc-font-mono)",
      fontSize: 11,
      color: "var(--kc-ink-dim)"
    }
  }, "52"));
}
function ProgressScreen({
  onNavigate
}) {
  return /*#__PURE__*/React.createElement(__ds_scope.Screen, null, /*#__PURE__*/React.createElement(__ds_scope.Header, {
    active: "progress",
    onNavigate: onNavigate
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      padding: "32px 36px",
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 34,
      fontWeight: 600,
      letterSpacing: "-0.03em",
      lineHeight: 1.05,
      maxWidth: 560
    }
  }, "Twelve weeks in: faster, steadier, reading two levels higher."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 4px auto",
      fontSize: 14,
      lineHeight: 1.5,
      color: "var(--kc-ink-dim)",
      maxWidth: 300
    }
  }, "A record of what happened, not a score. Nothing here drops because of a missed day.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(5, minmax(0,1fr))",
      gap: 11
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.StatTile, {
    label: "DAYS PRACTICED",
    value: "41",
    unit: "of 55"
  }), /*#__PURE__*/React.createElement(__ds_scope.StatTile, {
    label: "TOTAL TIME",
    value: "13:40"
  }), /*#__PURE__*/React.createElement(__ds_scope.StatTile, {
    label: "WEEKS AT TARGET",
    value: "9",
    unit: "in a row",
    tone: "mint"
  }), /*#__PURE__*/React.createElement(__ds_scope.StatTile, {
    label: "READING LEVEL",
    value: "4",
    unit: "from 1"
  }), /*#__PURE__*/React.createElement(__ds_scope.StatTile, {
    label: "SCALE TEMPO",
    value: "96",
    unit: "bpm",
    delta: "+34"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: "grid",
      gridTemplateColumns: "1.5fr 1fr",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    padding: "panel",
    style: {
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 17,
      fontWeight: 600
    }
  }, "Clean scale tempo"), /*#__PURE__*/React.createElement(__ds_scope.SectionLabel, {
    size: "meta"
  }, "BPM \xB7 12 WEEKS \xB7 C \u2192 G MAJOR")), /*#__PURE__*/React.createElement(TempoChart, null), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      color: "var(--kc-ink-dim)"
    }
  }, "Up 34 bpm since June, with two plateaus \u2014 both the week a new key started.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    padding: "panel"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 17,
      fontWeight: 600
    }
  }, "Time by discipline"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 9
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.MeterRow, {
    label: "Reading",
    value: 35,
    labelWidth: 86
  }), /*#__PURE__*/React.createElement(__ds_scope.MeterRow, {
    label: "Timing",
    value: 20,
    labelWidth: 86
  }), /*#__PURE__*/React.createElement(__ds_scope.MeterRow, {
    label: "Technique",
    value: 15,
    labelWidth: 86
  }), /*#__PURE__*/React.createElement(__ds_scope.MeterRow, {
    label: "Pieces",
    value: 15,
    labelWidth: 86
  }), /*#__PURE__*/React.createElement(__ds_scope.MeterRow, {
    label: "Harmony",
    value: 10,
    labelWidth: 86
  }), /*#__PURE__*/React.createElement(__ds_scope.MeterRow, {
    label: "Own playing",
    value: 5,
    labelWidth: 86
  }))), /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    padding: "panel",
    style: {
      flex: 1,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 17,
      fontWeight: 600
    }
  }, "Recent sessions"), /*#__PURE__*/React.createElement(__ds_scope.LogTable, {
    rows: [{
      cells: ["FRI 12", "20:04", "6/6", "CLEAN SCALE"],
      marked: true
    }, {
      cells: ["THU 11", "18:12", "5/6", "MIC"]
    }, {
      cells: ["TUE 09", "20:31", "6/6", "TIMER"]
    }, {
      cells: ["MON 08", "22:48", "6/6", "L4 PROMOTION"],
      marked: true
    }]
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "auto 0 0",
      fontSize: 12,
      color: "var(--kc-ink-faint)"
    }
  }, "Same log the household and Ms. Rivera see."))))));
}
Object.assign(__ds_scope, { ProgressScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ProgressScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/SettingsScreen.jsx
try { (() => {
const {
  useState
} = React;
const DAYS = [{
  letter: "M",
  state: "played",
  minutes: 16
}, {
  letter: "T",
  state: "played",
  minutes: 22
}, {
  letter: "W",
  state: "rest"
}, {
  letter: "T",
  state: "today"
}, {
  letter: "F",
  state: "future"
}, {
  letter: "S",
  state: "future"
}, {
  letter: "S",
  state: "rest"
}];
function Row({
  title,
  detail,
  children,
  last
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 20,
      padding: "16px 0",
      borderBottom: last ? "none" : "1px solid var(--kc-border)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 600
    }
  }, title), detail && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--kc-ink-dim)",
      marginTop: 3
    }
  }, detail)), children);
}
function Choice({
  options,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, options.map(o => /*#__PURE__*/React.createElement(__ds_scope.Button, {
    key: o,
    size: "control",
    variant: value === o ? "quiet" : "secondary",
    onClick: () => onChange(o),
    style: value === o ? {
      borderColor: "var(--kc-mint)",
      color: "var(--kc-ink)"
    } : undefined
  }, o)));
}

/**
 * Settings: the mode switch, the session shape, what the app listens to, and
 * who else sees the record. Everything here is reversible, and the copy says
 * what each choice does rather than selling it.
 */
function SettingsScreen({
  onNavigate
}) {
  const [mode, setMode] = useState("Own plan");
  const [length, setLength] = useState("20 min");
  const [hardStop, setHardStop] = useState(true);
  const [input, setInput] = useState("MIDI keyboard");
  const [countIn, setCountIn] = useState(true);
  const [share, setShare] = useState(true);
  return /*#__PURE__*/React.createElement(__ds_scope.Screen, null, /*#__PURE__*/React.createElement(__ds_scope.Header, {
    active: "",
    onNavigate: onNavigate
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      padding: "32px 36px",
      display: "grid",
      gridTemplateColumns: "1fr 340px",
      gap: 26,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18,
      minHeight: 0,
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 34,
      fontWeight: 600,
      letterSpacing: "-0.03em"
    }
  }, "Settings"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "8px 0 0",
      fontSize: 15,
      color: "var(--kc-ink-muted)",
      maxWidth: 520
    }
  }, "Maya's profile. Every setting here can be changed back, and nothing you change deletes what already happened.")), /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    padding: "panel"
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionLabel, null, "THE SESSION"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Row, {
    title: "Mode",
    detail: "Guided shows one next action. Own plan shows the whole queue and the numbers."
  }, /*#__PURE__*/React.createElement(Choice, {
    options: ["Guided", "Own plan"],
    value: mode,
    onChange: setMode
  })), /*#__PURE__*/React.createElement(Row, {
    title: "Session length",
    detail: "The engine fits the six disciplines into whatever you pick."
  }, /*#__PURE__*/React.createElement(Choice, {
    options: ["10 min", "20 min", "30 min"],
    value: length,
    onChange: setLength
  })), /*#__PURE__*/React.createElement(Row, {
    title: "Hard stop",
    detail: hardStop ? "Practice ends at the length above." : "The timer keeps counting; nothing interrupts.",
    last: true
  }, /*#__PURE__*/React.createElement(__ds_scope.Toggle, {
    checked: hardStop,
    onChange: setHardStop,
    label: "Hard stop"
  })))), /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    padding: "panel"
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionLabel, null, "WHAT THE APP LISTENS TO"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Row, {
    title: "Input",
    detail: "A MIDI keyboard hears every note. The microphone hears timing. The timer just counts."
  }, /*#__PURE__*/React.createElement(Choice, {
    options: ["MIDI keyboard", "Microphone", "Timer only"],
    value: input,
    onChange: setInput
  })), /*#__PURE__*/React.createElement(Row, {
    title: "Count-in",
    detail: "Two bars of click before an exercise that measures timing.",
    last: true
  }, /*#__PURE__*/React.createElement(__ds_scope.Toggle, {
    checked: countIn,
    onChange: setCountIn,
    label: "Count-in"
  })))), /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    padding: "panel"
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionLabel, null, "HOUSEHOLD AND TEACHER"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Row, {
    title: "Ms. Rivera",
    detail: "Sees the same log you see. Can leave a note and assign a piece."
  }, /*#__PURE__*/React.createElement(__ds_scope.Pill, {
    tone: "mint"
  }, "LINKED")), /*#__PURE__*/React.createElement(Row, {
    title: "Share the weekly record at home",
    detail: share ? "Minutes and days, not scores." : "Nobody else sees the log.",
    last: true
  }, /*#__PURE__*/React.createElement(__ds_scope.Toggle, {
    checked: share,
    onChange: setShare,
    label: "Share weekly record"
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 22,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    padding: "panel"
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionLabel, null, "WEEKLY TARGET"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--kc-font-mono)",
      fontSize: 32,
      color: "var(--kc-mint)"
    }
  }, "5"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      color: "var(--kc-ink-dim)"
    }
  }, "days a week")), /*#__PURE__*/React.createElement(__ds_scope.WeekStrip, {
    days: DAYS,
    target: 22,
    height: 40
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      lineHeight: 1.45,
      color: "var(--kc-ink-dim)"
    }
  }, "Wednesday and Sunday are rest days. A missed day is a fact, not a failure \u2014 tap a day to plan it off.")), /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    padding: "panel"
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionLabel, null, "PROFILE"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: "50%",
      background: "var(--kc-raised)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 17,
      fontWeight: 600
    }
  }, "M"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 600
    }
  }, "Maya"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--kc-font-mono)",
      fontSize: 12,
      color: "var(--kc-ink-faint)"
    }
  }, "LEVEL 4 \xB7 12 WEEKS"))), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "control"
  }, "Switch profile")), /*#__PURE__*/React.createElement(__ds_scope.Panel, {
    padding: "panel",
    style: {
      marginTop: "auto"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionLabel, null, "YOUR RECORDINGS AND LOG"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      lineHeight: 1.45,
      color: "var(--kc-ink-dim)"
    }
  }, "Everything stays on this iPad unless you export it. Deleting the app deletes the log with it."), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "control"
  }, "Export everything")))));
}
Object.assign(__ds_scope, { SettingsScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/SettingsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/TodayScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const QUEUE = [{
  index: 1,
  title: "Warm-up — G major, two octaves",
  detail: "Hands separately, then together",
  duration: "3:00",
  settings: ["72BPM", "STACC"],
  state: "done"
}, {
  index: 2,
  title: "Timing — dotted rhythms",
  detail: "Level 6 · tap or play",
  duration: "4:00",
  settings: ["88BPM", "L6"],
  state: "done"
}, {
  index: 3,
  title: "Sight reading — level 4",
  detail: "Alternating hands · two clean runs from promotion",
  duration: "7:00",
  settings: ["76BPM", "8 BARS"],
  state: "current"
}, {
  index: 4,
  title: "Harmony — hear it, then find it",
  detail: "I, IV, V and vi in G",
  duration: "2:00",
  settings: ["L3"],
  state: "pending"
}, {
  index: 5,
  title: "Pieces — Pirate Ship Theme",
  detail: "Lead sheet · loop bars 5–8",
  duration: "3:00",
  settings: ["84BPM"],
  state: "pending"
}, {
  index: 6,
  title: "Play something of your own",
  detail: "Lo-fi loop in G",
  duration: "1:00",
  settings: [],
  state: "pending"
}];
const DAYS = [{
  letter: "M",
  state: "played",
  minutes: 16
}, {
  letter: "T",
  state: "played",
  minutes: 22
}, {
  letter: "W",
  state: "rest"
}, {
  letter: "T",
  state: "today"
}, {
  letter: "F",
  state: "future"
}, {
  letter: "S",
  state: "future"
}, {
  letter: "S",
  state: "future"
}];
function TodayScreen({
  mode = "own",
  onNavigate,
  onBegin,
  onToggleMode
}) {
  const guided = mode === "guided";
  const next = QUEUE.find(q => q.state === "current");
  return /*#__PURE__*/React.createElement(__ds_scope.Screen, null, /*#__PURE__*/React.createElement(__ds_scope.Header, {
    active: "today",
    onNavigate: onNavigate,
    right: /*#__PURE__*/React.createElement(__ds_scope.InputStatus, null)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: "grid",
      gridTemplateColumns: "1fr 336px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "36px 38px",
      display: "flex",
      flexDirection: "column",
      gap: 22,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(__ds_scope.SectionLabel, null, "THURSDAY, SEPTEMBER 17"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "8px 0 0",
      fontSize: 42,
      fontWeight: 600,
      letterSpacing: "-0.03em",
      lineHeight: 1.05
    }
  }, guided ? /*#__PURE__*/React.createElement(React.Fragment, null, "Start with the G major scale.") : /*#__PURE__*/React.createElement(React.Fragment, null, "Twenty minutes, in G major")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "10px 0 0",
      fontSize: 17,
      lineHeight: 1.5,
      color: "var(--kc-ink-muted)",
      maxWidth: 520
    }
  }, guided ? "Two octaves, hands separately first. Staccato today, with the click at 72." : "Weighted toward reading. Edit anything below — the shape is yours.")), guided ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.QueueRow, _extends({}, next, {
    draggable: false,
    settings: []
  })), /*#__PURE__*/React.createElement(__ds_scope.SegmentBar, {
    total: QUEUE.length,
    filled: QUEUE.filter(q => q.state !== "pending").length,
    radius: 3,
    gap: 6
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--kc-ink-dim)"
    }
  }, "Three of six done \xB7 about eleven minutes left")) : /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, QUEUE.map(q => /*#__PURE__*/React.createElement(__ds_scope.QueueRow, _extends({
    key: q.index
  }, q, {
    style: {
      flexShrink: 0
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px dashed var(--kc-border-dashed)",
      borderRadius: "var(--kc-radius-panel)",
      padding: "13px 20px",
      fontSize: 14,
      color: "var(--kc-ink-faint)",
      flexShrink: 0
    }
  }, "+ Add to today \xB7 drag to reorder \xB7 save as a routine")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      display: "flex",
      alignItems: "center",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    icon: "play_arrow",
    onClick: onBegin
  }, guided ? "Begin" : "Begin practice"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--kc-ink-dim)"
    }
  }, "Stops at 20 minutes unless you keep going."), /*#__PURE__*/React.createElement("span", {
    onClick: onToggleMode,
    style: {
      marginLeft: "auto",
      fontSize: 13,
      color: "var(--kc-ink-faint)",
      cursor: "pointer"
    }
  }, guided ? "Switch to own plan" : "Switch to guided"))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderLeft: "1px solid var(--kc-border)",
      padding: "32px 28px",
      display: "flex",
      flexDirection: "column",
      gap: 26,
      background: "var(--kc-panel)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionLabel, null, "THIS WEEK"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--kc-font-mono)",
      fontSize: 32,
      color: "var(--kc-mint)"
    }
  }, "3"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      color: "var(--kc-ink-dim)"
    }
  }, "of 5 days")), /*#__PURE__*/React.createElement(__ds_scope.WeekStrip, {
    days: DAYS,
    target: 22
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      lineHeight: 1.45,
      color: "var(--kc-ink-dim)"
    }
  }, "Rest day Wednesday. Bars show minutes played.")), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--kc-border)",
      paddingTop: 22,
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionLabel, null, "FROM MS. RIVERA \xB7 MONDAY"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 15,
      lineHeight: 1.5,
      color: "var(--kc-ink-muted)"
    }
  }, "Legato was lovely last week. Keep the left hand just as smooth in the scale, and take the Pirate chart at 84.")), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--kc-border)",
      paddingTop: 22,
      display: "flex",
      flexDirection: "column",
      gap: 11
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionLabel, null, "SKILL PROFILE \xB7 9 DAYS AGO"), /*#__PURE__*/React.createElement(__ds_scope.MeterRow, {
    label: "Ear",
    value: 78,
    labelWidth: 58
  }), /*#__PURE__*/React.createElement(__ds_scope.MeterRow, {
    label: "Reading",
    value: 42,
    tone: "clay",
    labelWidth: 58
  }), /*#__PURE__*/React.createElement(__ds_scope.MeterRow, {
    label: "Timing",
    value: 61,
    labelWidth: 58
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      borderTop: "1px solid var(--kc-border)",
      paddingTop: 22,
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.SectionLabel, null, "CURRENT KEY"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 600
    }
  }, "G major ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 400,
      color: "var(--kc-ink-dim)"
    }
  }, "\xB7 week 2")), /*#__PURE__*/React.createElement(__ds_scope.SegmentBar, {
    total: 12,
    filled: 2,
    current: 2
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      color: "var(--kc-ink-dim)",
      lineHeight: 1.4
    }
  }, "Move on when the scale is even at", " ", /*#__PURE__*/React.createElement(__ds_scope.NotationGlyph, {
    name: "note-quarter",
    context: "inline",
    size: 13
  }), "80 and reading holds at level 4.")))));
}
Object.assign(__ds_scope, { TodayScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/TodayScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Panel = __ds_scope.Panel;

__ds_ns.Pill = __ds_scope.Pill;

__ds_ns.SectionLabel = __ds_scope.SectionLabel;

__ds_ns.Toggle = __ds_scope.Toggle;

__ds_ns.LogTable = __ds_scope.LogTable;

__ds_ns.MeterRow = __ds_scope.MeterRow;

__ds_ns.SegmentBar = __ds_scope.SegmentBar;

__ds_ns.StatTile = __ds_scope.StatTile;

__ds_ns.Waveform = __ds_scope.Waveform;

__ds_ns.WeekStrip = __ds_scope.WeekStrip;

__ds_ns.FormatBadge = __ds_scope.FormatBadge;

__ds_ns.NotationGlyph = __ds_scope.NotationGlyph;

__ds_ns.NotationPair = __ds_scope.NotationPair;

__ds_ns.PieceRow = __ds_scope.PieceRow;

__ds_ns.QueueRow = __ds_scope.QueueRow;

__ds_ns.ChordChart = __ds_scope.ChordChart;

__ds_ns.LeadSheet = __ds_scope.LeadSheet;

__ds_ns.SheetPanel = __ds_scope.SheetPanel;

__ds_ns.Staff = __ds_scope.Staff;

__ds_ns.Header = __ds_scope.Header;

__ds_ns.InputStatus = __ds_scope.InputStatus;

__ds_ns.Screen = __ds_scope.Screen;

__ds_ns.LeadSheetScreen = __ds_scope.LeadSheetScreen;

__ds_ns.LibraryScreen = __ds_scope.LibraryScreen;

__ds_ns.PracticeScreen = __ds_scope.PracticeScreen;

__ds_ns.ProgressScreen = __ds_scope.ProgressScreen;

__ds_ns.SettingsScreen = __ds_scope.SettingsScreen;

__ds_ns.TodayScreen = __ds_scope.TodayScreen;

})();
