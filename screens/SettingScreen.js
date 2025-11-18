import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { pingHA } from "./lib/ha";

export default function SettingsScreen({ navigation }) {
  const [busy, setBusy] = useState(false);

  const onPing = async () => {
    try {
      setBusy(true);
      const ok = await pingHA();
      console.log(ok)
      Alert.alert("Ping Successful", "Home Assistant connection is active.");
    } catch (e) {
      Alert.alert("Ping Failed", e?.message ?? "Unable to reach Home Assistant.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>Settings</Text>

      <Pressable style={[s.btn, s.primary]} onPress={() => navigation.navigate("ModeSchedule")}>
        <Text style={s.btnText}>Mode Scheduling</Text>
      </Pressable>

      <Pressable style={[s.btn, s.secondary]} onPress={onPing} disabled={busy}>
        <Text style={s.btnText}>{busy ? "Pinging..." : "Ping Home Assistant"}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 16, gap: 12, backgroundColor: "#0f1218" },
  h1: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 8 },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: "center" },
  primary: { backgroundColor: "#5b8cff" },
  secondary: { backgroundColor: "#2f333d" },
  btnText: { color: "#fff", fontWeight: "600" },
});