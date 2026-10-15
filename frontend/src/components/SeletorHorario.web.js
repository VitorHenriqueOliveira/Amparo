import React from 'react';
import { Text, View } from 'react-native';

export default function SeletorHorario({ label, value, onChange, disabled }) {
    return (
        <View style={{ gap: 8 }}>
            <Text style={{ color: '#4D6041', fontSize: 14 }}>{label}</Text>
            {React.createElement('input', {
                type: 'time', step: 60, value, disabled, 'aria-label': label,
                onInput: (evento) => onChange(evento.currentTarget.value),
                onChange: (evento) => onChange(evento.currentTarget.value),
                style: {
                    boxSizing: 'border-box', width: '100%', minHeight: 58, border: '1px solid #D4DFC6',
                    borderRadius: 16, padding: 14, color: '#253D17', background: '#F0F5E6',
                    fontFamily: 'inherit', fontSize: 22, fontWeight: 700,
                },
            })}
        </View>
    );
}
