// import { StatusBar } from 'expo-status-bar';
// import { StyleSheet, Text, Image, View, SafeAreaView, Button, ImageBackground } from 'react-native';



// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './screens/HomeScreen';
import LightControlScreen from './screens/LightControlScreen';

//globals
//globalThis.__HA_URL__   = 'http://homeassistant.local:8123'; // or http://<LAN-IP>:8123
//globalThis.__HA_URL__ = "http://192.168.1.104:8123"; Nicks for testing
globalThis.__HA_URL__ = "http://192.168.1.239:8123";  // HA_SETUP IP

globalThis.__HA_TOKEN__ =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkNWQxNTE2NDQ4OTQ0MDI4YjIyM2M3MWJhMTU2ZWZmNyIsImlhdCI6MTc1NzU1NDUyMCwiZXhwIjoyMDcyOTE0NTIwfQ.9Rf_J74l6gCTQCZ7NOy8aIuoo2fyYZjMBREQKYxQFmk";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home"
        screenOptions={{ headerTitleAlign: 'center' }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="LightControl" component={LightControlScreen} options={{ title: 'Smart Lamp' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}










// old app.js 
//edits for now

// export default function App() {
//   return (
//     <View style={styles.container}>
//       <Text>Welcome!</Text>
//       <Button
//         title='Calm'
//         onPress={() => alert("Calm Mode function")}
//         style={styles.button}
//         color="blue"
//       />
//       <Button
//         title='Wind Down'
//         onPress={() => alert("Wind Down Function")}
//         style={styles.button1}
//         color = "purple"
//       />
//       <Button
//         title='Focus'
//         onPress={() => alert("Focus Function")}
//         style={styles.button}
//         color="red"
//       />
//       <Button
//         title='Wake'
//         onPress={() => alert("Wake Function")}
//         style={styles.button}
//         color = "yellow"
//       />
//       <ImageBackground
//         style = {styles.background}
//         source={require('./assets/charmander_at_a_campfire_.jpg')}
//       ></ImageBackground>
//       {/* <SafeAreaView>
//         <Text>Open your app!</Text>
//         <Button
//           title='Click Me'
//           color={orange}
//           onPress={() => alert("Button pressed")}
//         />
//       </SafeAreaView> */}
//       <StatusBar style="auto" />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     //backgroundColor: 'black',
//     // alignItems: 'center',
//     // justifyContent: 'center',
    
//   },
//   button: {
//     alignItems: 'center',
//     justifyContent: 'center',
    
//   },
//   button1: {
//     //backgroundColor: 'black'
//   },
//   background: {
//       //flex:1
//     }
// });
