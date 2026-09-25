import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { serif } from '../theme/colors';

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeSlice(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export default function PieChart({ data, size = 260 }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  let cursor = 0;
  const slices = data.map((slice) => {
    const startAngle = cursor;
    const angle = (slice.value / 100) * 360;
    const endAngle = cursor + angle;
    cursor = endAngle;
    const mid = startAngle + angle / 2;
    const labelPos = polarToCartesian(cx, cy, r * 1.22, mid);
    return { ...slice, path: describeSlice(cx, cy, r, startAngle, endAngle), labelPos };
  });

  return (
    <View style={{ width: size, height: size, overflow: 'visible' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G>
          {slices.map((s) => (
            <Path key={s.label} d={s.path} fill={s.color} />
          ))}
        </G>
      </Svg>
      {slices.map((s) => (
        <View
          key={`label-${s.label}`}
          style={[
            styles.label,
            {
              left: s.labelPos.x - 34,
              top: s.labelPos.y - 16,
            },
          ]}
        >
          <Text style={styles.labelTitle}>{s.label}</Text>
          <Text style={styles.labelValue}>{s.value}%</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    width: 68,
    alignItems: 'center',
  },
  labelTitle: {
    color: '#1b3a0a',
    fontFamily: serif,
    fontSize: 14,
    textAlign: 'center',
  },
  labelValue: {
    color: '#1b3a0a',
    fontFamily: serif,
    fontSize: 14,
    textAlign: 'center',
  },
});
