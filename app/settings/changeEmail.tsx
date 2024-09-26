import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';

const ChangeEmail: React.FC = () => {
    const [email, setEmail] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [message, setMessage] = useState('');

    const handleChangeEmail = () => {
        // Add your email change logic here
        if (email && newEmail) {
            setMessage('Email changed successfully!');
        } else {
            setMessage('Please fill in both fields.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Current Email:</Text>
            <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter current email"
                keyboardType="email-address"
            />
            <Text style={styles.label}>New Email:</Text>
            <TextInput
                style={styles.input}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="Enter new email"
                keyboardType="email-address"
            />
            <Button title="Change Email" onPress={handleChangeEmail} />
            {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    message: {
        marginTop: 16,
        fontSize: 16,
        color: 'green',
    },
});

export default ChangeEmail;