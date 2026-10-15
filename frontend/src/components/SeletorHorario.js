import React, { useEffect, useRef, useState } from 'react';
import { Platform, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

export default function SeletorHorario({ label, value, onChange, disabled }) {
    const [aberto, setAberto] = useState(false);
    const androidAberto = useRef(false);
    useEffect(() => () => {
        if (androidAberto.current) DateTimePickerAndroid.dismiss('time');
    }, []);

    const selecionar = (_, data) => {
        androidAberto.current = false;
        onChange(String(data.getHours()).padStart(2, '0') + ':' + String(data.getMinutes()).padStart(2, '0'));
    };
    const abrir = () => {
        if (disabled || androidAberto.current) return;
        const [horas, minutos] = (value || '00:00').split(':').map(Number);
        const data = new Date();
        data.setHours(horas, minutos, 0, 0);
        if (Platform.OS === 'android') {
            androidAberto.current = true;
            DateTimePickerAndroid.open({
                value: data, mode: 'time', is24Hour: true,
                onValueChange: selecionar,
                onDismiss: () => { androidAberto.current = false; },
                onError: () => { androidAberto.current = false; },
                positiveButton: { label: 'Confirmar' }, negativeButton: { label: 'Cancelar' },
            });
        } else {
            setAberto((anterior) => !anterior);
        }
    };
    const [horas, minutos] = (value || '00:00').split(':').map(Number);
    const data = new Date();
    data.setHours(horas, minutos, 0, 0);

    return (
        <View>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity onPress={abrir} disabled={disabled} style={styles.campo}
                accessibilityRole="button" accessibilityLabel={label + ': ' + (value || 'Selecionar horário')}
                accessibilityState={{ disabled: !!disabled, expanded: aberto }}>
                <Text style={styles.valor}>{value || 'Selecionar'}</Text>
            </TouchableOpacity>
            {aberto && Platform.OS === 'ios' && (
                <DateTimePicker value={data} mode="time" display="spinner" themeVariant="light"
                    disabled={disabled} onValueChange={selecionar} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    label: { color: '#4D6041', fontSize: 14, marginBottom: 8 },
    campo: { backgroundColor: '#F0F5E6', borderRadius: 16, padding: 16, minHeight: 56 },
    valor: { color: '#253D17', fontSize: 22, fontWeight: '700' },
});
