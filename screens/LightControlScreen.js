// import React, { useState } from "react";
// import { View, Button, StyleSheet, Text, Alert } from "react-native";
// import { callService, pingHA } from "./lib/ha";

// const TOPIC = "led/control"; // make sure Pi B subscribes to this exact topic

// export default function LightControlScreen({ route }) {
//   const [busy, setBusy] = useState(false);
//   const preset = route.params?.preset;

//   // LightControlScreen.js
//   const checkHA = async () => {
//     try {
//       setBusy(true);
//       console.log("[UI] Check HA clicked");
//       const r = await pingHA();
//       console.log("[UI] Check HA result", r);
//       Alert.alert("HA Ping", `ok=${r.ok} status=${r.status}\n${r.body}`);
//     } catch (e) {
//       console.log("[UI] Check HA error", e);
//       Alert.alert("HA Ping Error", e?.message ?? "Unknown");
//     } finally {
//       setBusy(false);
//     }
//   };

//   const sendToHA = async (payload) => {
//     try {
//       setBusy(true);
//       await callService("mqtt", "publish", {
//         topic: TOPIC,
//         payload, // "ON" | "OFF" | "BLUE" | "#4A90E2" etc.
//         qos: 1,
//         retain: true,
//       });
//       Alert.alert("Sent to HA", String(payload));
//     } catch (e) {
//       Alert.alert("HA Error", e?.message ?? "Unknown error");
//     } finally {
//       setBusy(false);
//     }
//   };

//   const chooseColor = (value) => sendToHA(value); // send a plain string

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>
//         Light Control {preset ? `(${preset})` : ""}
//       </Text>

//       <Button title="Check HA" onPress={checkHA} disabled={busy} />

//       <Button title="Turn ON" onPress={() => sendToHA("ON")} disabled={busy} />
//       <Button
//         title="Turn OFF"
//         onPress={() => sendToHA("OFF")}
//         disabled={busy}
//       />

//       {/* color names OR hex; must match what Pi-B expects */}
//       <Button
//         title="Blue"
//         onPress={() => chooseColor("BLUE")}
//         disabled={busy}
//       />
//       <Button
//         title="Purple"
//         onPress={() => chooseColor("PURPLE")}
//         disabled={busy}
//       />
//       <Button title="Red" onPress={() => chooseColor("RED")} disabled={busy} />
//       <Button
//         title="Warm White"
//         onPress={() => chooseColor("WARM_WHITE")}
//         disabled={busy}
//       />
      
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, gap: 12, padding: 20, justifyContent: "center" },
//   title: {
//     fontSize: 18,
//     fontWeight: "600",
//     marginBottom: 8,
//     textAlign: "center",
//   },
// });

// ----------------^^old code/ testing code above ^^------------------

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { callService, pingHA } from "./lib/ha";
import ColorWheelModal from "./ColorWheelModal";
import AsyncStorage from '@react-native-async-storage/async-storage';

   const STORAGE_KEYS = {
     PRESETS: "presetsByMode_v1",
     MODE: "lastMode_v1",
     SCHEDULES: "modeSchedules_v1",
     SCHEDULE_DEFAULTS: "modeScheduleDefaults_v1",
   };
import Slider from "@react-native-community/slider";
// color wheel helper
const rgbToHex = ({ r, g, b }) =>
  "#" +
  [r, g, b]
    .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0"))
    .join("");

// tiny helper to define presets in HEX
const hexToRgb = (hex) => {
  const h = hex.replace('#','');
  const s = h.length === 3 ? h.split('').map(c => c+c).join('') : h;
  return {
    r: parseInt(s.slice(0,2),16),
    g: parseInt(s.slice(2,4),16),
    b: parseInt(s.slice(4,6),16),
  };
};


// Mode names (keys from HomeScreen: calm, wind_down, focus, wake)
const MODE_TITLE = {
  calm: "Calm",
  wind_down: "Wind Down",
  focus: "Focus",
  wake: "Wake Up",
};

// Research-backed defaults for each mode
const MODE_PRESETS = {
  "Wake Up": [
    { name: "Peach",       rgb: hexToRgb("#FFB36B") },
    { name: "Sunrise",     rgb: hexToRgb("#FFDFA8") },
    { name: "Daylight",    rgb: hexToRgb("#F2F2E9") },
    { name: "Cool Sky",    rgb: hexToRgb("#D9ECFF") },
  ],
  "Focus": [
    { name: "Cool White",  rgb: hexToRgb("#F1F6FF") },
    { name: "Blue-White",  rgb: hexToRgb("#E3F0FF") },
    { name: "Crisp Sky",   rgb: hexToRgb("#CFE7FF") },
    { name: "Blue Boost",  rgb: hexToRgb("#B9D9FF") },
  ],
  "Calm": [
    { name: "Warm Sand",   rgb: hexToRgb("#FFE4C7") },
    { name: "Candle Wash", rgb: hexToRgb("#F7E9DA") },
    { name: "Muted Sage",  rgb: hexToRgb("#E7F2EC") },
    { name: "Lavender",    rgb: hexToRgb("#EAE7F5") },
  ],
  "Wind Down": [
    { name: "Ember Peach", rgb: hexToRgb("#FFB076") },
    { name: "Warm Amber",  rgb: hexToRgb("#FF9C5B") },
    { name: "Sunset",      rgb: hexToRgb("#FF7A3A") },
    { name: "Soft Red",    rgb: hexToRgb("#E14B4B") },
  ],
};

// default schedules 
const DEFAULT_SCHEDULES = {
  "Wake Up": { start: "07:00", end: "07:45" },
  Focus: { start: "09:00", end: "11:00" },
  Calm: { start: "19:00", end: "20:30" },
  "Wind Down": { start: "21:00", end: "22:30" },
};

const DEFAULT_TIME_PRESETS = {
  "Wake Up": [
    { start: "06:30", end: "07:00" },
    { start: "07:00", end: "07:45" },
    { start: "07:30", end: "08:15" },
  ],
  Focus: [
    { start: "09:00", end: "11:00" },
    { start: "10:00", end: "12:00" },
    { start: "13:00", end: "15:00" },
  ],
  Calm: [
    { start: "18:30", end: "19:30" },
    { start: "19:00", end: "20:30" },
    { start: "20:00", end: "21:00" },
  ],
  "Wind Down": [
    { start: "21:00", end: "22:00" },
    { start: "21:30", end: "23:00" },
    { start: "22:00", end: "23:30" },
  ],
};

// Home Assistant light entity to control
const LAMP_ENTITY_ID = "light.smart_lamp"; // <-- change to light entity_id

// "HH:MM" (24h) → "h:MM AM/PM"
const format12h = (hhmm) => {
  if (!hhmm) return "--:--";
  const [hStr, mStr] = hhmm.split(":");
  let h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr} ${period}`;
};

// MQTT topic Pi B listens to
//const TOPIC = "led/control";

// Old set of colors for RGB presentation... would appear on each mode
// Example colors for fun
// const PRESET_COLORS = [
//   { name: "Warm White", rgb: { r: 255, g: 214, b: 170 } },
//   { name: "Cool White", rgb: { r: 200, g: 220, b: 255 } },
//   { name: "Sunset", rgb: { r: 255, g: 94, b: 19 } },
//   { name: "Sky", rgb: { r: 64, g: 156, b: 255 } },
//   { name: "Aqua", rgb: { r: 64, g: 224, b: 208 } },
//   { name: "Lime", rgb: { r: 120, g: 220, b: 40 } },
//   { name: "Forest", rgb: { r: 34, g: 139, b: 34 } },
//   { name: "Rose", rgb: { r: 255, g: 99, b: 132 } },
//   { name: "Lavender", rgb: { r: 181, g: 126, b: 220 } },
//   { name: "Magenta", rgb: { r: 255, g: 0, b: 144 } },
//   { name: "Amber", rgb: { r: 255, g: 191, b: 0 } },
//   { name: "Ice", rgb: { r: 180, g: 255, b: 255 } },
// ];

const TIMER_OPTIONS = [5, 10, 15, 30, 45, 60]; // time in minutes

// removed for updated LightControlScreen with proper mode presets
// export default function LightControlScreen({ route }) {
//   const presetFromRoute = route?.params?.preset;
//   const [busy, setBusy] = useState(false);
//   const [selected, setSelected] = useState(PRESET_COLORS[0]);

export default function LightControlScreen({ route, navigation }) {
  const presetFromRoute = route?.params?.preset; // "calm"|"wind_down"|"focus"|"wake" from HomeScreen
  const payload = route?.params?.presetsPayload || null;
  const [busy, setBusy] = useState(false);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);

  // fallback to Calm
  const initialModeTitle = MODE_TITLE[presetFromRoute] ?? "Calm";

  // mode presets & current mode
  const [presetsByMode, setPresetsByMode] = useState(
    payload ? { ...MODE_PRESETS, ...payload } : MODE_PRESETS
  );
  const [modeSchedules, setModeSchedules] = useState(DEFAULT_SCHEDULES);
  const [mode, setMode] = useState(initialModeTitle);
  const [scheduleDefaults, setScheduleDefaults] =
    useState(DEFAULT_TIME_PRESETS);

  const presets = presetsByMode[mode];
  const [selected, setSelected] = useState(presets[0]);

  // Load saved user presets
  React.useEffect(() => {
    if (payload) return;
    (async () => {
      try {
        const savedMode = await AsyncStorage.getItem(STORAGE_KEYS.MODE);
        if (savedMode) setMode(savedMode);

        // presets
        const json = await AsyncStorage.getItem(STORAGE_KEYS.PRESETS);
        if (json) {
          const parsed = JSON.parse(json);
          if (parsed && typeof parsed === "object") {
            setPresetsByMode((prev) => ({ ...prev, ...parsed }));
          }
        }

        // schedules
        const schedJson = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULES);
        if (schedJson) {
          const parsed = JSON.parse(schedJson);
          if (parsed && typeof parsed === "object") {
            setModeSchedules((prev) => ({ ...prev, ...parsed }));
          }
        }

        // default time presets
        const defaultsJson = await AsyncStorage.getItem(
          STORAGE_KEYS.SCHEDULE_DEFAULTS
        );
        if (defaultsJson) {
          const parsed = JSON.parse(defaultsJson);
          if (parsed && typeof parsed === "object") {
            setScheduleDefaults((prev) => ({ ...prev, ...parsed }));
          }
        }
      } catch (e) {
        console.warn("Failed to load presets/mode/schedules", e);
      }
    })();
  }, []);

  React.useEffect(() => {
    const unsub = navigation.addListener("focus", async () => {
      try {
        const schedJson = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULES);
        if (schedJson) {
          const parsed = JSON.parse(schedJson);
          if (parsed && typeof parsed === "object") {
            setModeSchedules((prev) => ({ ...prev, ...parsed }));
          }
        }

        const defaultsJson = await AsyncStorage.getItem(
          STORAGE_KEYS.SCHEDULE_DEFAULTS
        );
        if (defaultsJson) {
          const parsed = JSON.parse(defaultsJson);
          if (parsed && typeof parsed === "object") {
            setScheduleDefaults((prev) => ({ ...prev, ...parsed }));
          }
        }
      } catch (e) {
        console.warn("Failed to reload schedules", e);
      }
    });

    return unsub;
  }, [navigation]);

  React.useEffect(() => {
    // Write last mode to storage whenever it changes
    AsyncStorage.setItem(STORAGE_KEYS.MODE, mode).catch(() => {});
  }, [mode]);

  // when user switches modes, select its first preset
  React.useEffect(() => {
    if (presets?.length) setSelected(presets[0]);
  }, [mode, presetsByMode]); // or [mode, presets]

  // TIMER
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(null); // null = no timer

  //brightness slider
  const [brightness, setBrightness] = useState(100); // 0–100 %
  // CUSTOM COLOR MODAL (old code for class presentation, would display a set of custom colors)
  // const [customOpen, setCustomOpen] = useState(false);
  // const [customR, setCustomR] = useState("255");
  // const [customG, setCustomG] = useState("214");
  // const [customB, setCustomB] = useState("170");

  // Replaced by color wheel below

  const [colorWheelOpen, setColorWheelOpen] = useState(false);

  const previewColor = useMemo(
    () => selected?.rgb ?? { r: 255, g: 214, b: 170 },
    [selected]
  );
  const previewStyle = useMemo(
    () => ({
      backgroundColor: `rgb(${previewColor.r}, ${previewColor.g}, ${previewColor.b})`,
    }),
    [previewColor]
  );

  async function onPingHA() {
    try {
      setBusy(true);
      const ok = await pingHA();
      console.log(ok)
      Alert.alert("Home Assistant", ok.baseUrlPresent ? "Online" : "No response");
    } catch (e) {
      Alert.alert("HA Ping Error", e?.message ?? "Unknown");
    } finally {
      setBusy(false);
    }
  }

 async function sendColor(rgb) {
   try {
     setBusy(true);

     await callService("light", "turn_on", {
       entity_id: LAMP_ENTITY_ID,
       rgb_color: [rgb.r, rgb.g, rgb.b],
     });

     Alert.alert("Sent", "Color set.");
   } catch (e) {
     Alert.alert("Error", e?.message ?? "Failed to send color");
   } finally {
     setBusy(false);
   }
 }

  async function sendTimerToHA(minutes) {
    if (!minutes) {
      Alert.alert("Timer", "Please pick a duration first.");
      return;
    }

    try {
      setBusy(true);
      // Option A: call a HA script (recommended)
      await callService("script", "smart_lamp_turn_off_after", {
        minutes,
      });
      Alert.alert("Timer Sent", `Turn-off timer set to ${minutes} minutes`);
    } catch (e) {
      Alert.alert("Timer Error", e?.message ?? "Failed to send timer");
    } finally {
      setBusy(false);
    }
  }

async function turnOff() {
  try {
    setBusy(true);

    await callService("light", "turn_off", {
      entity_id: LAMP_ENTITY_ID,
    });

    Alert.alert("Sent", "Turned off");
  } catch (e) {
    Alert.alert("Error", e?.message ?? "Failed to send off");
  } finally {
    setBusy(false);
  }
}
  //       <Button title="Turn ON" onPress={() => sendToHA("ON")} disabled={busy} />
  //       <Button
  //         title="Turn OFF"
  //         onPress={() => sendToHA("OFF")}
  //         disabled={busy}
  //       />
async function turnon() {
  try {
    setBusy(true);

    await callService("light", "turn_on", {
      entity_id: LAMP_ENTITY_ID,
    });

    Alert.alert("Sent", "Turned on");
  } catch (e) {
    Alert.alert("Error", e?.message ?? "Failed to send on");
  } finally {
    setBusy(false);
  }
}

 const applyBrightness = async () => {
   try {
     setBusy(true);

     await callService("light", "turn_on", {
       entity_id: LAMP_ENTITY_ID,
       brightness_pct: brightness, // HA expects 0–100 here
     });

     Alert.alert("Sent", `Brightness set to ${brightness}%`);
   } catch (e) {
     Alert.alert(
       "Error",
       e?.message ?? "Failed to send brightness to Home Assistant"
     );
   } finally {
     setBusy(false);
   }
 };
 

  // function applyCustom() {
  //   // sanitize numbers 0..255
  //   const clamp = (n) => Math.min(255, Math.max(0, Number.isFinite(n) ? n : 0));
  //   const r = clamp(parseInt(customR, 10));
  //   const g = clamp(parseInt(customG, 10));
  //   const b = clamp(parseInt(customB, 10));
  //   const custom = { name: "Custom", rgb: { r, g, b } };
  //   setSelected(custom);
  //   setCustomOpen(false);
  // }

  const openColorWheel = () => setColorWheelOpen(true);
  const closeColorWheel = () => setColorWheelOpen(false);
  const handleConfirmWheel = ({ hex, rgb }) => {
    setSelected({ name: "Custom", rgb }); // keep your existing shape
    closeColorWheel();
  };
  const saveIntoSlot = async (index, rgb) => {
    let snapshot; // capture exactly what we saved
    setPresetsByMode((prev) => {
      const next = { ...prev };
      const arr = [...next[mode]];
      arr[index] = { name: `Default ${index + 1}`, rgb };
      next[mode] = arr;
      snapshot = next;
      return next;
    });
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.PRESETS,
        JSON.stringify(snapshot)
      );
      Alert.alert(
        "Preset Saved",
        `Updated Default ${index + 1} in ${mode} mode.`,
        [{ text: "OK", style: "default" }]
      );
    } catch (e) {
      console.warn("Failed to save presets", e);
    }
  };

const resetCurrentModeToDefaults = async () => {
  try {
    // 1) reset color presets for this mode
    setPresetsByMode((prev) => {
      const next = { ...prev, [mode]: MODE_PRESETS[mode] };
      AsyncStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(next)).catch(
        () => {}
      );
      return next;
    });

    // 2) reset the currently selected swatch & preview bar
    const firstDefault = MODE_PRESETS[mode][0];
    if (firstDefault) {
      setSelected(firstDefault);
    }

    // 3) reset this mode’s schedule back to the defaults
    setModeSchedules((prev) => ({
      ...prev,
      [mode]: DEFAULT_SCHEDULES[mode],
    }));

    Alert.alert(
      "Mode Reset",
      `${mode} presets and schedule have been reset to defaults.`
    );
  } catch (e) {
    Alert.alert("Error", "Failed to reset this mode.");
  }
};

  //more send to HA helper functions.. need to make automations
  const sendCurrentScheduleToHA = async () => {
    const entityMap = {
      "Wake Up": ["input_datetime.wake_start", "input_datetime.wake_end"],
      Focus: ["input_datetime.focus_start", "input_datetime.focus_end"],
      Calm: ["input_datetime.calm_start", "input_datetime.calm_end"],
      "Wind Down": [
        "input_datetime.wind_down_start",
        "input_datetime.wind_down_end",
      ],
    };

    const [startEnt, endEnt] = entityMap[mode] || [];
    const current = modeSchedules[mode];

    if (!startEnt || !endEnt || !current?.start || !current?.end) {
      Alert.alert("Schedule", "No valid schedule found for this mode to send.");
      return;
    }

    try {
      setBusy(true);

      await callService("input_datetime", "set_datetime", {
        entity_id: startEnt,
        time: `${current.start}:00`, // "HH:MM:SS"
      });
      await callService("input_datetime", "set_datetime", {
        entity_id: endEnt,
        time: `${current.end}:00`,
      });

      Alert.alert(
        "Sent to Home Assistant",
        `${mode} schedule pushed: ${format12h(current.start)} – ${format12h(
          current.end
        )}`
      );
    } catch (e) {
      Alert.alert("HA Error", e?.message ?? "Failed to send schedule");
    } finally {
      setBusy(false);
    }
  };

  //anywhere above here is inside of the component... because i keep forgetting
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Smart Lamp</Text>
      {/* Live preview swatch */}
      <View style={[styles.preview, previewStyle]} />
      <Text style={styles.previewLabel}>
        {selected?.name || "Custom"} — rgb({previewColor.r},{previewColor.g},
        {previewColor.b})
      </Text>
      {/* Modal Timer */}
      <View style={styles.timerRow}>
        <Text style={styles.sectionLabel}>Timer</Text>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => setTimerOpen(true)}
          style={styles.timerButton}
        >
          <Text style={styles.timerButtonText}>
            {timerMinutes ? `${timerMinutes} minutes` : "Set Timer"}
          </Text>
        </Pressable>
      </View>

      {/* Brightness */}
      <View style={styles.brightnessRow}>
        <Text style={styles.sectionLabel}>Brightness</Text>

        <View style={styles.brightnessControls}>
          <Slider
            style={styles.brightnessSlider}
            minimumValue={0}
            maximumValue={100}
            step={1}
            value={brightness}
            onValueChange={setBrightness}
          />
          <Text style={styles.brightnessValue}>{brightness}%</Text>
        </View>

        <Pressable
          onPress={applyBrightness}
          style={styles.timerButton}
          disabled={busy}
        >
          <Text style={styles.timerButtonText}>Apply</Text>
        </Pressable>
      </View>

      {/* removed for updated color palette header */}
      {/* Color palette */}
      {/* <Text style={styles.sectionLabel}>Choose a color 123</Text> */}

      {/* Mode tabs */}
      <View style={styles.modeTabs}>
        {["Wake Up", "Focus", "Calm", "Wind Down"].map((m) => {
          const active = m === mode;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={[styles.modeTab, active && styles.modeTabActive]}
            >
              <Text
                style={[styles.modeTabText, active && styles.modeTabTextActive]}
              >
                {m}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Color palette header */}
      <Text style={styles.sectionLabel}>Choose a color — {mode}</Text>
      <View style={styles.paletteGrid}>
        {presets.map((c, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => setSelected(c)}
            style={[
              styles.swatch,
              { backgroundColor: `rgb(${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b})` },
              selected?.name === c.name ? styles.swatchSelected : null,
            ]}
          />
        ))}
        <Pressable
          // onPress={() => setCustomOpen(true)}
          onPress={openColorWheel}
          style={[styles.swatch, styles.customSwatch]}
        >
          <Text style={styles.customText}>RGB</Text>
        </Pressable>
      </View>

      <View style={styles.swatchRow}>
        {/* {presets.map((c, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => setSelected(c)}
            style={[
              styles.swatch,
              { backgroundColor: `rgb(${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b})` },
              selected?.name === c.name ? styles.swatchSelected : null,
            ]}
          />
        ))} */}
        {/* <Pressable
          onPress={openColorWheel}
          style={[styles.swatch, styles.customSwatch]}
        >
          <Text style={styles.customText}>RGB</Text>
        </Pressable> */}
      </View>

      {/* This block adds default times to the lightcontrolscreen */}
      {/* Scheduling summary */}
      {/* <View style={styles.scheduleSection}> */}
      {/* Top line: label + mode + current default + Scheduling button */}
      <View style={styles.scheduleHeaderRow}>
        <View style={styles.scheduleTitleGroup}>
          <Text style={styles.scheduleLabel}>
            Schedule your light selection —
          </Text>
          <Text style={styles.scheduleModeText}>{mode}</Text>
          <Text style={styles.scheduleCurrentDefaultText}>
            {"  "}Current Default: {format12h(modeSchedules[mode]?.start)} –{" "}
            {format12h(modeSchedules[mode]?.end)}
          </Text>
        </View>

        <View style={styles.scheduleHeaderButtons}>
          <Pressable
            style={styles.scheduleButton}
            onPress={sendCurrentScheduleToHA}
            disabled={busy}
          >
            <Text style={styles.scheduleButtonText}>Send to HA</Text>
          </Pressable>

          <Pressable
            style={styles.scheduleButton}
            onPress={() => navigation.navigate("ModeSchedule")}
            disabled={busy}
          >
            <Text style={styles.scheduleButtonText}>Scheduling</Text>
          </Pressable>
        </View>
      </View>

      {/* Centered defaults underneath */}
      <View style={styles.scheduleDefaultsRow}>
        {(scheduleDefaults[mode] || []).map((def, idx) => (
          <View key={idx} style={styles.scheduleDefaultCol}>
            <Text style={styles.scheduleDefaultLabel}>
              {`Default ${idx + 1}`}
            </Text>
            <Text style={styles.scheduleDefaultTimeText}>
              {format12h(def.start)} – {format12h(def.end)}
            </Text>
          </View>
        ))}
      </View>
      {/* /</View> */}

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.primary]}
          onPress={() => sendColor(previewColor)}
          disabled={busy}
        >
          <Text style={styles.buttonText}>
            {busy ? "Sending..." : "Apply Color"}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={() => setSaveMenuOpen(true)}
          disabled={busy}
        >
          <Text style={styles.buttonText}>Save color to Preset</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={resetCurrentModeToDefaults}
          disabled={busy}
        >
          <Text style={styles.ghostText}>Reset {mode}</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={turnOff}
          disabled={busy}
        >
          <Text style={styles.buttonText}>Turn Off</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={turnon}
          disabled={busy}
        >
          <Text style={styles.buttonText}>Turn On</Text>
        </Pressable>
      </View>

      {busy && (
        <View style={styles.busyOverlay} pointerEvents="none">
          <ActivityIndicator size="large" />
        </View>
      )}

      {/* Color Wheel modal */}

      <ColorWheelModal
        visible={colorWheelOpen}
        initialColor={rgbToHex(previewColor)} // seed with current selection
        onCancel={closeColorWheel} // backdrop tap + Cancel button
        onConfirm={handleConfirmWheel} // gets { hex, rgb }
        title="Choose Color"
      />

      {/* Save-to-preset dropdown */}
      <Modal
        visible={saveMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveMenuOpen(false)}
      >
        {/* Backdrop closes on tap */}
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSaveMenuOpen(false)}
        >
          {/* Bottom sheet */}
          <Pressable onPress={() => {}} style={styles.saveSheet}>
            <Text style={styles.modalTitle}>Save to Preset Slot</Text>
            {presets.map((c, i) => (
              <Pressable
                key={i}
                style={styles.option}
                onPress={() => {
                  // overwrite slot i in the CURRENT MODE with the current previewColor
                  saveIntoSlot(i, previewColor);
                  setSaveMenuOpen(false);
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={styles.optionText}>
                    {`Default ${i + 1}${c?.name ? ` — ${c.name}` : ""}`}
                  </Text>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      backgroundColor: `rgb(${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b})`,
                      borderWidth: 1,
                      borderColor: "#2f333d",
                    }}
                  />
                </View>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setSaveMenuOpen(false)}
              style={[
                styles.button,
                styles.ghost,
                { marginTop: 10, alignSelf: "center", paddingHorizontal: 16 },
              ]}
            >
              <Text style={styles.ghostText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      {/* Timer modal */}
      <Modal
        visible={timerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setTimerOpen(false)}
      >
        {/* Backdrop closes on tap */}
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setTimerOpen(false)}
        >
          {/* Sheet; stop backdrop close when tapping inside */}
          <Pressable onPress={() => {}} style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Timer Duration</Text>

            {/* Time Options */}
            <View>
              <Pressable
                style={styles.option}
                onPress={() => {
                  setTimerMinutes(null);
                  setTimerOpen(false);
                }}
              >
                <Text style={styles.optionText}>No timer</Text>
              </Pressable>

              {TIMER_OPTIONS.map((m) => {
                const selected = m === timerMinutes;
                return (
                  <Pressable
                    key={m}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => {
                      setTimerMinutes(m); // highlight it, but keep modal open
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {m} minutes
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={async () => {
                await sendTimerToHA(timerMinutes);
                // if it succeeded, you probably want to close the modal:
                setTimerOpen(false);
              }}
              style={[
                styles.button,
                styles.primary,
                { marginTop: 10, alignSelf: "center", paddingHorizontal: 16 },
              ]}
            >
              <Text style={styles.buttonText}>
                Send Timer to Home Assistant
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setTimerOpen(false)}
              style={[
                styles.button,
                styles.ghost,
                { marginTop: 10, alignSelf: "center", paddingHorizontal: 16 },
              ]}
            >
              <Text style={styles.ghostText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0b0c10",
  },
  container: { flexGrow: 1, padding: 16, backgroundColor: "#0b0c10" },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 12,
  },

  preview: {
    width: "100%",
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2f333d",
  },
  previewLabel: { marginTop: 8, color: "#c7c9d1" },

  sectionLabel: {
    color: "#c7c9d1",
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },

  paletteGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchSelected: { borderColor: "#ffffff" },
  customSwatch: {
    backgroundColor: "#1f232e",
    alignItems: "center",
    justifyContent: "center",
  },
  customText: { color: "#e4e6eb", fontSize: 12, fontWeight: "600" },

  /* Timer row + button */
  timerRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  timerButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#1f232e",
  },
  timerButtonText: { color: "#e4e6eb", fontWeight: "600" },

  /* Actions */
  actions: { marginTop: 20, gap: 10 },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: "#5b8cff" },
  secondary: { backgroundColor: "#2f333d" },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#2f333d",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  ghostText: { color: "#c7c9d1", fontWeight: "600" },

  //brightness slider
  brightnessRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  brightnessControls: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
  },
  brightnessSlider: {
    flex: 1,
  },
  brightnessValue: {
    width: 50,
    textAlign: "right",
    color: "#ffffff",
    fontSize: 12,
  },

  /* Scheduling section */
  scheduleSection: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#2f333d",
  },
  scheduleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  scheduleTitleGroup: {
    flexDirection: "row",
    flexShrink: 1,
    flexWrap: "wrap",
    alignItems: "baseline",
  },
  scheduleLabel: {
    color: "#c7c9d1",
    fontSize: 13,
  },
  scheduleModeText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
  scheduleCurrentDefaultText: {
    color: "#c7c9d1",
    fontSize: 13,
    marginLeft: 6,
  },
  scheduleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#1f232e",
  },
  scheduleButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },

  // Centered defaults row
  scheduleDefaultsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
    gap: 24,
  },
  scheduleDefaultCol: {
    alignItems: "center",
  },
  scheduleDefaultLabel: {
    color: "#c7c9d1",
    fontSize: 11,
    marginBottom: 2,
  },
  scheduleDefaultTimeText: {
    color: "#ffffff",
    fontSize: 12,
  },
  scheduleHeaderButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  /* Busy overlay */
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Shared modal stuff */
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },

  /* Timer modal sheet */
  modalSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#1f232e",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    elevation: 12,
  },
  saveSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#1f232e",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    elevation: 12,
  },
  option: {
    backgroundColor: "#2a2f3a",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginVertical: 4,
  },
  optionSelected: { backgroundColor: "#3a4250" },
  optionText: { color: "#e4e6eb", fontSize: 16 },
  optionTextSelected: { fontWeight: "700" },

  /* Custom color card */
  // modalCard: {
  //   width: "100%",
  //   borderRadius: 14,
  //   padding: 16,
  //   backgroundColor: "#0f121a",
  // },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  //Styling for mode tabs
  modeTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  modeTab: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1f232e",
    borderWidth: 1,
    borderColor: "#2f333d",
  },
  modeTabActive: {
    backgroundColor: "#2f333d",
    borderColor: "#5b8cff",
  },
  modeTabText: { color: "#c7c9d1", fontWeight: "600", fontSize: 12 },
  modeTabTextActive: { color: "#ffffff" },
  // rgbRow: { flexDirection: "row", gap: 8 },
  // rgbCol: { flex: 1 },
  // rgbLabel: { color: "#c7c9d1", marginBottom: 6 },
  // input: {
  //   backgroundColor: "#1f232e",
  //   borderRadius: 8,
  //   paddingHorizontal: 10,
  //   paddingVertical: 10,
  //   color: "#e4e6eb",
  // },
  // modalActions: {
  //   flexDirection: "row",
  //   gap: 10,
  //   marginTop: 16,
  //   justifyContent: "flex-end",
  // },
});
