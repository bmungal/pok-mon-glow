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
} from "react-native";
import { callService, pingHA } from "./lib/ha";

// MQTT topic Pi B listens to
const TOPIC = "led/control";

// Example colors for fun
const PRESET_COLORS = [
  { name: "Warm White", rgb: { r: 255, g: 214, b: 170 } },
  { name: "Cool White", rgb: { r: 200, g: 220, b: 255 } },
  { name: "Sunset", rgb: { r: 255, g: 94, b: 19 } },
  { name: "Sky", rgb: { r: 64, g: 156, b: 255 } },
  { name: "Aqua", rgb: { r: 64, g: 224, b: 208 } },
  { name: "Lime", rgb: { r: 120, g: 220, b: 40 } },
  { name: "Forest", rgb: { r: 34, g: 139, b: 34 } },
  { name: "Rose", rgb: { r: 255, g: 99, b: 132 } },
  { name: "Lavender", rgb: { r: 181, g: 126, b: 220 } },
  { name: "Magenta", rgb: { r: 255, g: 0, b: 144 } },
  { name: "Amber", rgb: { r: 255, g: 191, b: 0 } },
  { name: "Ice", rgb: { r: 180, g: 255, b: 255 } },
];

const TIMER_OPTIONS = [5, 10, 15, 30, 45, 60]; // time in minutes 

export default function LightControlScreen({ route }) {
  const presetFromRoute = route?.params?.preset;
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(PRESET_COLORS[0]);

  // TIMER
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(null); // null = no timer

  // CUSTOM COLOR MODAL
  const [customOpen, setCustomOpen] = useState(false);
  const [customR, setCustomR] = useState("255");
  const [customG, setCustomG] = useState("214");
  const [customB, setCustomB] = useState("170");

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
      Alert.alert("Home Assistant", ok ? "Online" : "No response");
    } catch (e) {
      Alert.alert("HA Ping Error", e?.message ?? "Unknown");
    } finally {
      setBusy(false);
    }
  }

  function payloadBase() {
    return {
      source: "LightControlScreen",
      preset: presetFromRoute || null,
      ts: Date.now(),
    };
  }

  async function sendColor(rgb) {
    try {
      setBusy(true);
      const payload = {
        ...payloadBase(),
        action: "set_color",
        color: rgb,
        timerMinutes: timerMinutes ?? null,
      };
      await callService("mqtt", "publish", {
        topic: TOPIC,
        payload: JSON.stringify(payload),
        qos: 0,
        retain: false,
      });
      Alert.alert(
        "Sent",
        `Color set${timerMinutes ? `, timer: ${timerMinutes} min` : ""}`
      );
    } catch (e) {
      Alert.alert("Error", e?.message ?? "Failed to send color");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    try {
      setBusy(true);
      const payload = { ...payloadBase(), action: "OFF" };
      await callService("mqtt", "publish", {
        topic: TOPIC,
        payload: JSON.stringify(payload),
        qos: 0,
        retain: false,
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
       const payload = { ...payloadBase(), action: "ON" };
       await callService("mqtt", "publish", {
         topic: TOPIC,
         payload: JSON.stringify(payload),
         qos: 0,
         retain: false,
       });
       Alert.alert("Sent", "Turned on");
     } catch (e) {
       Alert.alert("Error", e?.message ?? "Failed to send off");
     } finally {
       setBusy(false);
     }
  }

  function applyCustom() {
    // sanitize numbers 0..255
    const clamp = (n) => Math.min(255, Math.max(0, Number.isFinite(n) ? n : 0));
    const r = clamp(parseInt(customR, 10));
    const g = clamp(parseInt(customG, 10));
    const b = clamp(parseInt(customB, 10));
    const custom = { name: "Custom", rgb: { r, g, b } };
    setSelected(custom);
    setCustomOpen(false);
  }

  return (
    <View style={styles.container}>
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

      {/* Color palette */}
      <Text style={styles.sectionLabel}>Choose a color</Text>
      <View style={styles.paletteGrid}>
        {PRESET_COLORS.map((c, idx) => (
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
          onPress={() => setCustomOpen(true)}
          style={[styles.swatch, styles.customSwatch]}
        >
          <Text style={styles.customText}>Custom</Text>
        </Pressable>
      </View>

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
        <Pressable
          style={[styles.button, styles.ghost]}
          onPress={onPingHA}
          disabled={busy}
        >
          <Text style={styles.ghostText}>Ping HA</Text>
        </Pressable>
      </View>

      {busy && (
        <View style={styles.busyOverlay} pointerEvents="none">
          <ActivityIndicator size="large" />
        </View>
      )}

      {/* Custom color modal */}
      <Modal
        visible={customOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCustomOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Custom RGB</Text>
            <View style={styles.rgbRow}>
              <View style={styles.rgbCol}>
                <Text style={styles.rgbLabel}>R</Text>
                <TextInput
                  keyboardType="number-pad"
                  value={customR}
                  onChangeText={setCustomR}
                  placeholder="0-255"
                  style={styles.input}
                  maxLength={3}
                />
              </View>
              <View style={styles.rgbCol}>
                <Text style={styles.rgbLabel}>G</Text>
                <TextInput
                  keyboardType="number-pad"
                  value={customG}
                  onChangeText={setCustomG}
                  placeholder="0-255"
                  style={styles.input}
                  maxLength={3}
                />
              </View>
              <View style={styles.rgbCol}>
                <Text style={styles.rgbLabel}>B</Text>
                <TextInput
                  keyboardType="number-pad"
                  value={customB}
                  onChangeText={setCustomB}
                  placeholder="0-255"
                  style={styles.input}
                  maxLength={3}
                />
              </View>
            </View>
            <View
              style={[
                styles.preview,
                {
                  alignSelf: "center",
                  marginTop: 12,
                  width: 160,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: `rgb(${parseInt(customR || 0, 10) || 0}, ${
                    parseInt(customG || 0, 10) || 0
                  }, ${parseInt(customB || 0, 10) || 0})`,
                },
              ]}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.button, styles.primary]}
                onPress={applyCustom}
              >
                <Text style={styles.buttonText}>Use Color</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.ghost]}
                onPress={() => setCustomOpen(false)}
              >
                <Text style={styles.ghostText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Timer modal */}
      <Modal
        visible={timerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setTimerOpen(false)}
      >
        {/* Backdrop — tap to close */}
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setTimerOpen(false)}
        />

        {/* Bottom sheet */}
        <View style={styles.modalSheet}>
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
                    setTimerMinutes(m);
                    setTimerOpen(false);
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
            onPress={() => setTimerOpen(false)}
            style={[
              styles.button,
              styles.ghost,
              { marginTop: 10, alignSelf: "center", paddingHorizontal: 16 },
            ]}
          >
            <Text style={styles.ghostText}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#0b0c10" },
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
  modalCard: {
    width: "100%",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#0f121a",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  rgbRow: { flexDirection: "row", gap: 8 },
  rgbCol: { flex: 1 },
  rgbLabel: { color: "#c7c9d1", marginBottom: 6 },
  input: {
    backgroundColor: "#1f232e",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: "#e4e6eb",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    justifyContent: "flex-end",
  },
});
