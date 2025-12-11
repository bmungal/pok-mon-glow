import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { callService } from "./lib/ha";

// Keys for reuse
const STORAGE_KEYS = {
  SCHEDULES: "modeSchedules_v1", // { Wake Up: {start:"07:00", end:"07:45"}, ... }
  SCHEDULE_DEFAULTS: "modeScheduleDefaults_v1", // 3 defaults per mode
};

const MODES = ["Wake Up", "Focus", "Calm", "Wind Down"];

// helpers
// Date → "HH:MM" (24h) for storage / HA
const toHHMM = (d) => d.toTimeString().slice(0, 5);

// "HH:MM" (24h) → Date for the native picker
const fromHHMM = (hhmm) => {
  const [h, m] = (hhmm || "07:00").split(":").map(Number);
  const d = new Date();
  d.setHours(h);
  d.setMinutes(m);
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d;
};

// "HH:MM" (24h) → { hour12, minute, period }
const parse24 = (hhmm) => {
  const [hStr, mStr] = (hhmm || "07:00").split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour12, minute: mStr, period };
};

// 12-hour → "HH:MM" (24h)
const to24 = (hour12, minute, period) => {
  let h = parseInt(hour12, 10);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

// "HH:MM" (24h) → "h:MM AM/PM"
const format12 = (hhmm) => {
  const { hour12, minute, period } = parse24(hhmm);
  return `${hour12}:${minute} ${period}`;
};


// Convert "HH:MM" (24h) → "h:MM AM/PM"
const format12h = (hhmm) => {
  if (!hhmm) return "--:--";
  const [hStr, mStr] = hhmm.split(":");
  let h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr} ${period}`;
};

// Toggle AM/PM 
const togglePeriod = (hhmm) => {
  if (!hhmm) return hhmm;
  const [hStr, mStr] = hhmm.split(":");
  let h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return hhmm;
  if (h >= 12) h -= 12;
  else h += 12;
  return `${String(h).padStart(2, "0")}:${mStr}`;
};

//time parsing for user inputs
const parseUserTimeInput = (input, currentPeriod, fallbackHHMM) => {
  const raw = (input || "").trim();
  if (!raw) return null;

  // 3–4 digit military style: "900", "0930", "1300"
  let m = raw.match(/^(\d{3,4})$/);
  if (m) {
    const num = parseInt(m[1], 10);
    let h = Math.floor(num / 100);
    let min = num % 100;
    if (
      Number.isNaN(h) ||
      Number.isNaN(min) ||
      h < 0 ||
      h > 23 ||
      min < 0 ||
      min > 59
    ) {
      return null;
    }
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }

  // Just an hour: "9", "13"
  m = raw.match(/^(\d{1,2})$/);
  if (m) {
    const h = parseInt(m[1], 10);
    if (Number.isNaN(h) || h < 0 || h > 23) return null;

    if (h > 12) {
      // treat as 24h directly (13 -> 13:00)
      return `${String(h).padStart(2, "0")}:00`;
    }
    const period =
      currentPeriod || (fallbackHHMM ? parse24(fallbackHHMM).period : "AM");
    return to24(h, "00", period);
  }

  // h:mm / hh:mm
  m = raw.match(/^(\d{1,2}):(\d{1,2})$/);
  if (m) {
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (
      Number.isNaN(h) ||
      Number.isNaN(min) ||
      h < 0 ||
      h > 23 ||
      min < 0 ||
      min > 59
    ) {
      return null;
    }
    const minuteStr = String(min).padStart(2, "0");

    if (h > 12) {
      // treat as 24h hour (19:30)
      return `${String(h).padStart(2, "0")}:${minuteStr}`;
    }

    const period =
      currentPeriod || (fallbackHHMM ? parse24(fallbackHHMM).period : "AM");
    return to24(h, minuteStr, period);
  }

  // anything else is considered invalid
  return null;
};

const DEFAULT_SCHEDULES = {
  "Wake Up": { start: "07:00", end: "07:45" },
  Focus: { start: "09:00", end: "11:00" },
  Calm: { start: "19:00", end: "20:30" },
  "Wind Down": { start: "21:00", end: "22:30" },
};

// 3 default start/end options for each mode
const DEFAULT_TIME_PRESETS = {
  "Wake Up": [
    { start: "06:30", end: "07:00" }, // Default 1
    { start: "07:00", end: "07:45" }, // Default 2
    { start: "07:30", end: "08:15" }, // Default 3
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



export default function ModeScheduleScreen({ navigation }) {
  const [sched, setSched] = useState(DEFAULT_SCHEDULES);
  const [timeDefaults, setTimeDefaults] = useState(DEFAULT_TIME_PRESETS);
  const [picker, setPicker] = useState({ mode: null, field: null }); // {mode:'Wake Up', field:'start'|'end'}

  // text the user is currently typing
  const [draftTimes, setDraftTimes] = useState({});

  // which default slot (0,1,2) is currently selected for each mode
  const [defaultIndexByMode, setDefaultIndexByMode] = useState(() =>
    MODES.reduce((acc, m) => ({ ...acc, [m]: 0 }), {})
  );

  // Load saved schedules
  // useEffect(() => {
  //   (async () => {
  //     try {
  //       const schedJson = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULES);
  //       if (schedJson) {
  //         setSched((prev) => ({ ...prev, ...JSON.parse(schedJson) }));
  //       }

  //       const defaultsJson = await AsyncStorage.getItem(
  //         STORAGE_KEYS.SCHEDULE_DEFAULTS
  //       );
  //       if (defaultsJson) {
  //         setTimeDefaults((prev) => ({
  //           ...prev,
  //           ...JSON.parse(defaultsJson),
  //         }));
  //       }
  //     } catch {}
  //   })();
  // }, []);

useEffect(() => {
  (async () => {
    try {
      // --- SCHEDULES ---
      const schedJson = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULES);

      if (schedJson && schedJson !== "undefined") {
        try {
          const parsed = JSON.parse(schedJson);
          setSched((prev) => ({ ...prev, ...parsed }));
        } catch (e) {
          console.warn("Bad schedule JSON, clearing STORAGE_KEYS.SCHEDULES", e);
          await AsyncStorage.removeItem(STORAGE_KEYS.SCHEDULES);
        }
      }

      // --- DEFAULT PRESETS ---
      const defaultsJson = await AsyncStorage.getItem(
        STORAGE_KEYS.SCHEDULE_DEFAULTS
      );

      if (defaultsJson && defaultsJson !== "undefined") {
        try {
          const parsedDefaults = JSON.parse(defaultsJson);
          setTimeDefaults((prev) => ({
            ...prev,
            ...parsedDefaults,
          }));
        } catch (e) {
          console.warn(
            "Bad defaults JSON, clearing STORAGE_KEYS.SCHEDULE_DEFAULTS",
            e
          );
          await AsyncStorage.removeItem(STORAGE_KEYS.SCHEDULE_DEFAULTS);
        }
      }
    } catch (e) {
      console.warn("Failed to reload schedules", e);
    }
  })();
}, []);


  const saveAll = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(sched));
      Alert.alert("Saved", "Mode schedules updated");
    } catch (e) {
      Alert.alert("Error", "Could not save schedules");
    }
  };

  //sends info to HA automations
  const sendToHA = async () => {
    try {
      const map = {
        "Wake Up": ["input_datetime.wake_start", "input_datetime.wake_end"],
        Focus: ["input_datetime.focus_start", "input_datetime.focus_end"],
        Calm: ["input_datetime.calm_start", "input_datetime.calm_end"],
        "Wind Down": [
          "input_datetime.wind_down_start",
          "input_datetime.wind_down_end",
        ],
      };
      for (const mode of MODES) {
        const [startEnt, endEnt] = map[mode];
        const { start, end } = sched[mode];
        // Home Assistant service to set time on input_datetime:
        await callService("input_datetime", "set_datetime", {
          entity_id: startEnt,
          time: `${start}:00`,
        });
        await callService("input_datetime", "set_datetime", {
          entity_id: endEnt,
          time: `${end}:00`,
        });
      }
      Alert.alert("Pushed", "Schedules sent to Home Assistant");
    } catch (e) {
      Alert.alert("HA Error", e?.message ?? "Failed pushing schedules to HA");
    }
  };

const handleApplyDefault = (mode, index) => {
  const def = timeDefaults[mode]?.[index];
  if (!def) return;
  setSched((prev) => ({
    ...prev,
    [mode]: { start: def.start, end: def.end },
  }));
};

const handleChangeDefault = async (mode) => {
  // 1) Commit any drafts for this mode into sched
  const drafts = draftTimes[mode];
  let newModeSched = { ...sched[mode] };

  if (drafts) {
    // Start
    if (drafts.start != null && drafts.start !== "") {
      const hhmmStart = parseUserTimeInput(
        drafts.start,
        parse24(sched[mode].start).period,
        sched[mode].start
      );
      if (!hhmmStart) {
        Alert.alert(
          "Invalid time",
          `Please enter a valid START time for ${mode}.`
        );
        return; // don't change default
      }
      newModeSched.start = hhmmStart;
    }

    // End
    if (drafts.end != null && drafts.end !== "") {
      const hhmmEnd = parseUserTimeInput(
        drafts.end,
        parse24(sched[mode].end).period,
        sched[mode].end
      );
      if (!hhmmEnd) {
        Alert.alert(
          "Invalid time",
          `Please enter a valid END time for ${mode}.`
        );
        return;
      }
      newModeSched.end = hhmmEnd;
    }

    // commit to sched + clear drafts for this mode
    setSched((prev) => ({ ...prev, [mode]: newModeSched }));
    setDraftTimes((prev) => ({ ...prev, [mode]: {} }));
  }

  // 2) Update the chosen default using the *new* sched values
  const i = defaultIndexByMode[mode] ?? 0;

  const updated = {
    ...timeDefaults,
    [mode]: timeDefaults[mode].map((d, idx) =>
      idx === i ? { ...newModeSched } : d
    ),
  };

  setTimeDefaults(updated);
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.SCHEDULE_DEFAULTS,
      JSON.stringify(updated)
    );
    Alert.alert(
      "Defaults Updated",
      `Saved current ${mode} times into Default ${i + 1}`
    );
  } catch {
    Alert.alert("Error", "Could not save default times");
  }
    };
    
    const acceptChanges = async () => {
      try {
        // save schedules AND the three defaults per mode
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.SCHEDULES, JSON.stringify(sched)],
          [STORAGE_KEYS.SCHEDULE_DEFAULTS, JSON.stringify(timeDefaults)],
        ]);
        Alert.alert("Saved", "Mode schedules and defaults updated");
      } catch (e) {
        Alert.alert("Error", "Could not save schedules");
      } finally {
        // go back to LightControlScreen, preserving the current mode
        navigation.goBack();
      }
    };



  return (
    <ScrollView style={s.wrap}>
      <Text style={s.h1}>Mode Scheduling</Text>

      {MODES.map((m) => (
        <View key={m} style={s.row}>
          <Text style={s.label}>{m}</Text>

          {/* Default time presets (D1 / D2 / D3) */}
          <View style={s.defaultsSection}>
            <View style={s.defaultTimesRow}>
              {timeDefaults[m].map((def, idx) => (
                <Pressable
                  key={idx}
                  style={s.defaultTimeBlock}
                  onPress={() => handleApplyDefault(m, idx)}
                >
                  <Text style={s.defaultTitle}>{`Default ${idx + 1}`}</Text>
                  <Text style={s.defaultTimeText}>
                    {format12(def.start)} – {format12(def.end)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={s.defaultControlsRow}>
              <Pressable
                style={s.defaultSelect}
                onPress={() =>
                  setDefaultIndexByMode((prev) => {
                    const current = prev[m] ?? 0;
                    const next = (current + 1) % 3; // cycle 1→2→3
                    return { ...prev, [m]: next };
                  })
                }
              >
                <Text style={s.defaultSelectText}>
                  {`Editing Default ${(defaultIndexByMode[m] ?? 0) + 1}`}
                </Text>
              </Pressable>

              <Pressable
                style={s.defaultChangeButton}
                onPress={() => handleChangeDefault(m)}
              >
                <Text style={s.defaultChangeButtonText}>Change Default</Text>
              </Pressable>
            </View>
          </View>

          {/* START time */}
          <View style={s.timeRow}>
            <Text style={s.timeLabel}>Start</Text>
            <View style={s.timeInputWrap}>
              <TextInput
                value={
                  draftTimes[m]?.start ?? format12(sched[m].start).slice(0, -3) // fallback when no draft
                }
                onChangeText={(txt) => {
                  setDraftTimes((prev) => ({
                    ...prev,
                    [m]: { ...(prev[m] || {}), start: txt },
                  }));
                }}
                keyboardType="number-pad"
                placeholder="h:MM"
                style={s.input}
              />
              <Pressable
                style={s.ampmBtn}
                onPress={() => {
                  const { hour12, minute, period } = parse24(sched[m].start);
                  const newPeriod = period === "AM" ? "PM" : "AM";
                  setSched((p) => ({
                    ...p,
                    [m]: { ...p[m], start: to24(hour12, minute, newPeriod) },
                  }));
                }}
              >
                <Text style={s.ampmText}>{parse24(sched[m].start).period}</Text>
              </Pressable>
            </View>
          </View>
          {/* END time */}
          <View style={s.timeRow}>
            <Text style={s.timeLabel}>End</Text>
            <View style={s.timeInputWrap}>
                <TextInput
  value={
    draftTimes[m]?.end ??
    format12(sched[m].end).slice(0, -3)
  }
  onChangeText={(txt) => {
    setDraftTimes((prev) => ({
      ...prev,
      [m]: { ...(prev[m] || {}), end: txt },
    }));
  }}
  keyboardType="number-pad"
  placeholder="h:MM"
  style={s.input}
/>
              <Pressable
                style={s.ampmBtn}
                onPress={() => {
                  const { hour12, minute, period } = parse24(sched[m].end);
                  const newPeriod = period === "AM" ? "PM" : "AM";
                  setSched((p) => ({
                    ...p,
                    [m]: { ...p[m], end: to24(hour12, minute, newPeriod) },
                  }));
                }}
              >
                <Text style={s.ampmText}>{parse24(sched[m].end).period}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ))}

      <View style={s.actions}>
        <Pressable style={[s.btn, s.primary]} onPress={sendToHA}>
          <Text style={s.btnText}>Send to Home Assistant</Text>
        </Pressable>
      </View>
      <Pressable
        style={[s.btn, s.primary, { marginTop: 8 }]}
        onPress={acceptChanges}
      >
        <Text style={s.btnText}>Accept Changes</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 16, gap: 12, backgroundColor: "#0f1218" },
  h1: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 8 },
  row: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#151925",
    marginBottom: 8,
    gap: 8,
  },
  label: { color: "#fff", fontWeight: "700", marginBottom: 6 },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  timeLabel: { color: "#c7c9d1", width: 56 },
  timeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#2f333d",
  },
  timeText: { color: "#fff", fontWeight: "600" },
  input: {
    backgroundColor: "#2f333d",
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 90,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
  },
  primary: { backgroundColor: "#5b8cff" },
  secondary: { backgroundColor: "#2f333d" },
  btnText: { color: "#fff", fontWeight: "600" },

  input: {
    backgroundColor: "#2f333d",
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 90,
  },
  timeInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ampmBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#1f232e",
  },
  ampmText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  defaultsSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  defaultTimesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  defaultTimeBlock: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#1f232e",
  },
  defaultTitle: {
    color: "#c7c9d1",
    fontSize: 11,
    marginBottom: 2,
  },
  defaultTimeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "500",
  },
  defaultControlsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  defaultSelect: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#1f232e",
  },
  defaultSelectText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "500",
  },
  defaultChangeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#3c7cff",
  },
  defaultChangeButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
});
