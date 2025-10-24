import React from "react";
import { View, Button, StyleSheet, ImageBackground } from "react-native";

export default function HomeScreen({ navigation }) {
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
        onPress={() => navigation.navigate("LightControl", { preset: "calm" })}
      />
      <Button
        title="Wind Down"
        color="purple"
        onPress={() =>
          navigation.navigate("LightControl", { preset: "wind_down" })
        }
      />
      <Button
        title="Focus"
        color="red"
        onPress={() => navigation.navigate("LightControl", { preset: "focus" })}
      />
      <Button
        title="Wake"
        color="orange"
        onPress={() => navigation.navigate("LightControl", { preset: "wake" })}
      />
      {/* make a settings screen */}
      <Button
        title="SETTINGS"
        onPress={() => navigation.navigate("LightControl", { preset: "calm" })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 12, padding: 20, justifyContent: "center" },
  bg: { ...StyleSheet.absoluteFillObject, opacity: 0.2 },
});
