import React from "react";
import { View, Button, StyleSheet, ImageBackground } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
   PRESETS: 'presetsByMode_v1',
   MODE: 'lastMode_v1',
 };

export default function HomeScreen({ navigation }) {
  const [hydratedPresets, setHydratedPresets] = React.useState(null);
  const [lastModeKey, setLastModeKey] = React.useState(null); 

  React.useEffect(() => {
    (async () => {
      try {
        const m = await AsyncStorage.getItem(STORAGE_KEYS.MODE);
        if (m) setLastModeKey(m);
        const json = await AsyncStorage.getItem(STORAGE_KEYS.PRESETS);
        if (json) setHydratedPresets(JSON.parse(json));
      } catch {}
    })();
  }, []);
  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../assets/charmander_at_a_campfire_.jpg")}
        style={styles.bg}
        pointerEvents="none"
      />

      <Button
        title="Calm"
        color="blue"
        //onPress={() => navigation.navigate("LightControl", { preset: "calm" })}
        onPress={() =>
          navigation.navigate("LightControl", {
            preset: "calm",
            presetsPayload: hydratedPresets,
          })
        }
      />
      <Button
        title="Wind Down"
        color="purple"
        // onPress={() =>
        //   navigation.navigate("LightControl", { preset: "wind_down" })
        // }
        onPress={() =>
          navigation.navigate("LightControl", {
            preset: "wind_down",
            presetsPayload: hydratedPresets,
          })
        }
      />
      <Button
        title="Focus"
        color="red"
        // onPress={() => navigation.navigate("LightControl", { preset: "focus" })}
        onPress={() =>
          navigation.navigate("LightControl", {
            preset: "focus",
            presetsPayload: hydratedPresets,
          })
        }
      />
      <Button
        title="Wake"
        color="orange"
        // onPress={() => navigation.navigate("LightControl", { preset: "wake" })}
        onPress={() =>
          navigation.navigate("LightControl", {
            preset: "wake",
            presetsPayload: hydratedPresets,
          })
        }
      />
      {/* make a settings screen */}
      <Button
        title="SETTINGS"
        // onPress={() => navigation.navigate("LightControl", { preset: "calm" })}

        //fix an actual settings screen
        onPress={() =>
          navigation.navigate("Settings", {
            preset: "Settings",
            presetsPayload: hydratedPresets,
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 12, padding: 20, justifyContent: "center" },
  bg: { ...StyleSheet.absoluteFillObject, opacity: 0.2 },
});
