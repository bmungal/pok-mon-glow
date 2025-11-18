// ColorWheelModal.jsx
// import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import React, { useCallback, useMemo, useState } from 'react';
// import { Modal, View, Text, Pressable, Platform, useWindowDimensions,ScrollView } from 'react-native';
// import ColorPicker, { HueCircular, Panel1 } from 'reanimated-color-picker';

// HEX → RGB helper for your Kasa bulb call
// function hexToRgb(hex) {
//   const h = hex.replace('#', '');
//   const i = h.length === 3
//     ? h.split('').map(c => c + c).join('')
//     : h;
//   const r = parseInt(i.slice(0, 2), 16);
//   const g = parseInt(i.slice(2, 4), 16);
//   const b = parseInt(i.slice(4, 6), 16);
//   return { r, g, b };
// }



// export default function ColorWheelModal({
//   visible,
//   initialColor = '#ff8a00',
//   onCancel,
//   onConfirm,  // format of (payload: { hex: string, rgb: {r,g,b} }) => void
//   title = 'Choose Color',
// }) {
//     const [hex, setHex] = useState(initialColor);
//     const { width } = useWindowDimensions();
//     // two columns side-by-side:
//     const COL = Math.floor((width - 32 - 32) / 2);
//     const WHEEL = Math.max(160, Math.min(240, COL));   // wheel size
//     const PANEL = Math.max(160, Math.min(240, COL));   // SV panel size

//   // Keep the incoming initialColor when modal opens
//   React.useEffect(() => {
//     if (visible) setHex(initialColor);
//   }, [visible, initialColor]);

//   const handleChange = useCallback(({ hex: h }) => {
//     if (h) setHex(h);
//   }, []);

//   const previewStyle = useMemo(() => ({
//     width: 48,
//     height: 48,
//     borderRadius: 12,
//     backgroundColor: hex,
//     borderWidth: 1,
//     borderColor: 'rgba(0,0,0,0.15)',
//   }), [hex]);

//   const confirm = useCallback(() => {
//     const rgb = hexToRgb(hex);
//     onConfirm?.({ hex, rgb });
//   }, [hex, onConfirm]);

//   return (
//   <Modal
//     visible={visible}
//     animationType="slide"
//     transparent
//     statusBarTranslucent
//   >
//     <GestureHandlerRootView style={{ flex: 1 }}>
//       {/* Backdrop (tap outside to close) */}
//       <Pressable
//         style={{
//           flex: 1,
//           backgroundColor: 'rgba(0,0,0,0.45)',
//           justifyContent: 'flex-end',
//         }}
//         onPress={onCancel}
//       >
//         {/* Stop taps from bubbling when pressing inside the sheet */}
//         <Pressable
//           onPress={() => {}}
//           style={({ pressed }) => [
//             sheet,
//             pressed && Platform.select({ ios: { opacity: 0.98 }, android: {} }),
//           ]}
//         >
//           {/* Header */}
//           <View style={headerRow}>
//             <Text style={titleText}>{title}</Text>
//             <View style={previewStyle} />
//           </View>

//           {/* Color Picker */}
//           <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
//             <ColorPicker
//               style={{ alignItems: 'center', gap: 12, flex: 1 }}
//               value={hex}
//               onChange={handleChange}
//               keepWheelWithinViewBox
//             >
//               <HueCircular
//                 style={{ width: WHEEL, height: WHEEL }}
//                 strokeWidth={24}
//                 thumbSize={24}
//               />
//             </ColorPicker>

//             <ColorPicker
//               style={{ alignItems: 'center', gap: 12, flex: 1 }}
//               value={hex}
//               onChange={handleChange}
//             >
//               <Panel1 style={{ width: PANEL, height: PANEL, borderRadius: 16 }} />
//             </ColorPicker>
//           </View>

//           {/* Action buttons */}
//           <View style={buttonRow}>
//             <Pressable style={[btn, btnGhost]} onPress={onCancel}>
//               <Text style={[btnText, btnGhostText]}>Cancel</Text>
//             </Pressable>
//             <Pressable style={btn} onPress={confirm}>
//               <Text style={btnText}>Set Color</Text>
//             </Pressable>
//           </View>
//         </Pressable>
//       </Pressable>
//     </GestureHandlerRootView>
//   </Modal>
//   );
// }

// /* Styles similar to timer modal */
// const sheet = {
//   marginTop: 'auto',
//   marginBottom: 24,
//   marginHorizontal: 16,
//   borderRadius: 20,
//   paddingHorizontal: 16,
//   paddingTop: 16,
//   paddingBottom: 8,
//   backgroundColor: '#fff',
//   // height behavior like timer modal:
//   minHeight: 360,
//   maxHeight: '80%',
//   ...(Platform.OS === 'web'
//     // shading
//   ? { boxShadow: '0 12px 16px rgba(0,0,0,0.12)' }
//     : {
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 12 },
//         shadowOpacity: 0.12,
//         shadowRadius: 16,
//         elevation: 8,
//       }),
// };

// const headerRow = {
//   flexDirection: 'row',
//   alignItems: 'center',
//   justifyContent: 'space-between',
//   marginBottom: 12,
// };

// const titleText = {
//   fontSize: 18,
//   fontWeight: '600',
// };

// const buttonRow = {
//   flexDirection: 'row',
//   gap: 12,
//   justifyContent: 'flex-end',
//   marginTop: 16,
// };

// const btn = {
//   paddingVertical: 12,
//   paddingHorizontal: 16,
//   borderRadius: 12,
//   backgroundColor: '#111827',
// };

// const btnText = {
//   color: '#fff',
//   fontWeight: '600',
//   fontSize: 16,
// };

// const btnGhost = {
//   backgroundColor: 'transparent',
//   borderWidth: 1,
//   borderColor: 'rgba(0,0,0,0.12)',
// };

// const btnGhostText = {
//   color: '#111827',
// };

//original color picker... research and testing shows unexpected crashes/ instability ^^

// ColorWheelModal.jsx
import React, { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Slider from '@react-native-community/slider';

// HEX → RGB helper
function hexToRgb(hex) {
  if (!hex) return { r: 255, g: 255, b: 255 };
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('');
  }
  const num = parseInt(h, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// RGB → HEX helper
function rgbToHex({ r, g, b }) {
  const toHex = (v) => {
    const n = Math.max(0, Math.min(255, Math.round(v)));
    const h = n.toString(16);
    return h.length === 1 ? '0' + h : h;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

export default function ColorWheelModal({
  visible,
  initialColor = '#ffffff',
  title = 'Choose a color',
  onCancel,
  onConfirm,
}) {
  const { width } = useWindowDimensions();

  const [rgb, setRgb] = useState(() => hexToRgb(initialColor));

  // Reset when modal opens or initialColor changes
  useEffect(() => {
    if (visible) {
      setRgb(hexToRgb(initialColor));
    }
  }, [visible, initialColor]);

  const hex = useMemo(() => rgbToHex(rgb), [rgb]);

  const previewStyle = useMemo(
    () => ({
      width: 40,
      height: 40,
      borderRadius: 999,
      backgroundColor: hex,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.2)',
    }),
    [hex]
  );

  const confirm = () => {
    onConfirm?.({
      hex,
      rgb,
    });
  };

  const sheetWidth = Math.min(width - 32, 480);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Backdrop */}
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'flex-end',
          }}
          onPress={onCancel}
        >
          {/* Bottom sheet */}
          <Pressable
            onPress={() => {}}
            style={({ pressed }) => [
              sheet,
              { width: sheetWidth, alignSelf: 'center' },
              pressed &&
                Platform.select({
                  ios: { opacity: 0.97 },
                  android: {},
                  default: {},
                }),
            ]}
          >
            {/* Header */}
            <View style={headerRow}>
              <View>
                <Text style={titleText}>{title}</Text>
                <Text style={subtitleText}>{hex.toUpperCase()}</Text>
              </View>
              <View style={previewStyle} />
            </View>

            {/* Sliders */}
            <View style={{ marginTop: 12 }}>
              <ColorSlider
                label="Red"
                value={rgb.r}
                onChange={(v) => setRgb(prev => ({ ...prev, r: v }))}
                trackColor="#ef4444"
              />
              <ColorSlider
                label="Green"
                value={rgb.g}
                onChange={(v) => setRgb(prev => ({ ...prev, g: v }))}
                trackColor="#22c55e"
              />
              <ColorSlider
                label="Blue"
                value={rgb.b}
                onChange={(v) => setRgb(prev => ({ ...prev, b: v }))}
                trackColor="#3b82f6"
              />
            </View>

            {/* Buttons */}
            <View style={buttonRow}>
              <Pressable style={[btn, btnGhost]} onPress={onCancel}>
                <Text style={[btnText, btnGhostText]}>Cancel</Text>
              </Pressable>
              <Pressable style={btn} onPress={confirm}>
                <Text style={btnText}>Set Color</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}

function ColorSlider({ label, value, onChange, trackColor }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={sliderLabel}>{label}</Text>
        <Text style={sliderValue}>{Math.round(value)}</Text>
      </View>
      <Slider
        minimumValue={0}
        maximumValue={255}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={trackColor}
        maximumTrackTintColor="rgba(0,0,0,0.15)"
        thumbTintColor={trackColor}
      />
    </View>
  );
}

/* Styles (roughly matched to your existing modal) */
const sheet = {
  marginTop: 'auto',
  marginBottom: 24,
  marginHorizontal: 16,
  borderRadius: 20,
  paddingHorizontal: 16,
  paddingTop: 16,
  paddingBottom: 12,
  backgroundColor: '#ffffff',
  minHeight: 260,
  maxHeight: '80%',
  ...(Platform.OS === 'web'
    ? { boxShadow: '0 12px 16px rgba(0,0,0,0.12)' }
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
      }),
};

const headerRow = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 12,
};

const titleText = {
  fontSize: 18,
  fontWeight: '600',
  color: '#111827',
};

const subtitleText = {
  marginTop: 4,
  fontSize: 14,
  color: '#6b7280',
};

const sliderLabel = {
  fontSize: 14,
  fontWeight: '500',
  color: '#374151',
};

const sliderValue = {
  fontSize: 14,
  fontVariant: ['tabular-nums'],
  color: '#4b5563',
};

const buttonRow = {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  gap: 12,
  marginTop: 16,
};

const btn = {
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 999,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#111827',
  minWidth: 96,
};

const btnText = {
  color: '#fff',
  fontWeight: '600',
  fontSize: 16,
};

const btnGhost = {
  backgroundColor: 'transparent',
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.15)',
};

const btnGhostText = {
  color: '#111827',
};